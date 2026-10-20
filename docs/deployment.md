# 部署

## Windows / Linux 生产环境

同一份源码和后端 JAR 支持两个生产 Profile。只激活 `prod-windows` 或 `prod-linux`，会自动带上生产公共配置 `prod`；不要同时激活两个系统 Profile。

| 环境 | Profile | 外部配置（位于 backend） | 默认上传目录 |
| --- | --- | --- | --- |
| 本地开发 | 不设置，或 `default` | `.env` | `./uploads`，相对启动工作目录 |
| Windows 生产 | `prod-windows` | `.env.prod-windows` | `D:/MyBlog/uploads` |
| Linux 生产 | `prod-linux` | `.env.prod-linux` | `/srv/myblog/uploads` |

配置文件为 `application.yml`（公共）、`application-default.yml`（开发配置导入）、`application-prod.yml`（生产公共）、`application-prod-windows.yml`、`application-prod-linux.yml`。生产只导入所选环境文件，不读取开发 `.env`。系统环境变量优先于外部文件；启动脚本不会把 `.env` 内容写入进程环境变量。切换环境前也要清理系统中残留的 Windows 路径变量。

两个生产环境默认绑定 `127.0.0.1`，启用 Secure Cookie 和可信代理转发头，适用于同机 Nginx 终止 HTTPS 的部署。使用其他代理拓扑时按实际配置 `SERVER_ADDRESS` 和 `FORWARD_HEADERS_STRATEGY`。仅在临时 HTTP 验证时设置 `SESSION_COOKIE_SECURE=false`，正式上线恢复 HTTPS 和 Secure Cookie。

### Windows 生产

准备 Java 21、Maven、MySQL 8.0.16+；构建前端需要 Node.js 22。以下以项目位于 `D:/MyBlog` 为例：

```powershell
cd D:/MyBlog
Copy-Item backend/.env.prod-windows.example backend/.env.prod-windows
# 编辑 backend/.env.prod-windows，填写独立的数据库账号和密码。
# 如果项目不在 D:/MyBlog，修改 UPLOAD_DIRECTORY、MUSIC_SOURCE_DIRECTORY。
cd backend
mvn --batch-mode verify
cd ..
./backend/scripts/Start-Backend.ps1 -Packaged -Environment prod-windows
```

首次创建管理员前填写 `ADMIN_PASSWORD`，须为 12–64 个字符且 UTF-8 编码不超过 72 字节；已有管理员表不会被它改密。生产外部配置包含凭据，已由 Git 忽略，示例文件除外。示例只复制一次，后续更新保留实际配置。

### Linux 生产

将项目部署至 `/srv/myblog`，准备相同版本的 Java、MySQL 和构建工具：

```bash
cd /srv/myblog/backend
cp .env.prod-linux.example .env.prod-linux
chmod 600 .env.prod-linux
# 编辑 .env.prod-linux，填写数据库账号、密码及首次初始化管理员密码。
mvn --batch-mode verify
sh scripts/start-backend.sh
```

Shell 脚本默认使用 `prod-linux`，会自动切换至 backend；不需要 source `.env.prod-linux`。这些文件采用 Java properties 格式，值不要加 Shell 引号或 `export`；Windows 路径使用正斜杠，特殊字符按 Java properties 规则转义。直接启动也可以，但应固定工作目录：

```bash
cd /srv/myblog/backend
java -jar target/myblog-backend-0.1.0.jar --spring.profiles.active=prod-linux
```

长期运行可使用仓库中的 `deploy/linux/myblog.service`。先创建专用账号和可写目录，例如：

```bash
sudo useradd --system --home-dir /srv/myblog --shell /usr/sbin/nologin myblog
sudo install -d -o myblog -g myblog -m 750 /srv/myblog/uploads
sudo chown myblog:myblog /srv/myblog/backend/.env.prod-linux
# 确保该账号能遍历项目父目录、读取 JAR 和旧音乐目录。
# 按实际安装位置核对 service 中的 /usr/bin/java。
sudo cp /srv/myblog/deploy/linux/myblog.service /etc/systemd/system/myblog.service
sudo systemctl daemon-reload
sudo systemctl enable --now myblog
sudo systemctl status myblog
sudo journalctl -u myblog -n 100 --no-pager
```

专用账号已存在时跳过 `useradd`。数据库初始化和文件迁移应在启动服务前完成。更改安装位置时，同时修改 service 的工作目录、JAR 路径和生产配置中的存储路径。

### 前端和数据迁移

前端继续使用 `VITE_API_BASE_URL=/api/v1` 和 `VITE_DEMO_MODE=false`，同一份构建产物可由 Windows、Linux 的 Nginx 提供；Windows 的 Nginx `root` 使用 `D:/MyBlog/frontend/dist`，Linux 使用下文路径。构建时在 frontend 执行 `npm ci`、`npm run build`，不要跨系统复制 `node_modules`，其中包含 sharp 的平台依赖。

迁移前停止旧后端并备份数据库、整个 uploads（含 music 和 library.json）、旧 `frontend/public/music` 和自定义图片。保留文件名和目录大小写，Linux 的 `MyBlog` 数据库名也必须一致。将文件放入新配置指向的目录，并为后端运行账号授予必要读写权限。源码使用 Java / Node 的路径 API，不需要替换源码中的 `/`。

## 前端

执行 `npm ci` 与 `npm run build`，将 frontend/dist 部署为静态站点。默认 API 路径为 `/api/v1`；可在构建前用 `VITE_API_BASE_URL` 修改。

React Router 使用 History 路由，需要让 `/posts/...`、`/archives` 等非文件请求返回 index.html。Vite 的开发代理不会进入生产构建，生产必须另配 API 反向代理。

Nginx 示例（替换静态目录与域名）：

```nginx
server {
    listen 80;
    server_name blog.example.com;
    root /srv/myblog/frontend/dist;
    client_max_body_size 56m;

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /rss.xml {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
    }
    location = /sitemap.xml {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 后端

`mvn package` 生成 `backend/target/myblog-backend-0.1.0.jar`。设置 DB_HOST、DB_PORT、DB_NAME、DB_USERNAME、DB_PASSWORD 后执行 `java -jar ...`。本地开发可直接运行 MyBlogApplication；默认 Profile 在工作目录为项目根目录或 backend 时读取 `backend/.env` 或 `.env`。生产按上文选择对应 Profile 和配置文件。系统或运行配置中的环境变量优先。`Start-Backend.ps1 -Packaged` 保留本地开发行为；生产需显式传入 `-Environment prod-windows` 或 `prod-linux`。

数据库名为 `MyBlog`。正式环境使用独立应用账号与环境变量管理密码。新建和升级均由用户手动执行唯一的 `database/MyBlog.sql`，成功后再启动应用；不使用 Flyway 或自动建表。已有数据库先备份，执行脚本的账号需有 CREATE ROUTINE、ALTER、INDEX 等权限；运行应用的账号不需要这些 DDL 权限。

## 部署检查

确认静态资源可访问；直接刷新文章地址仍能打开；`/api/v1/posts` 返回数据；VITE_DEMO_MODE 为 false；数据库保留 utf8mb4；仅服务端持有数据库连接信息。按实际域名配置 HTTPS。

后台登录同样使用 `/api` 反向代理，保留 Cookie。HTTPS 部署时设置 `SESSION_COOKIE_SECURE=true`；数据库密码与管理员初始化密码分别管理，不进入前端构建。ADMIN_PASSWORD 只初始化空表，不作为运行时数据库中的密码替代品。

## 图片、评论与订阅

配置 `UPLOAD_DIRECTORY` 为可写的绝对路径，例如 `/srv/myblog/uploads`。本机已固定为 `D:/MyBlog/uploads`，避免 IDEA 工作目录改变导致图片失效。备份时一起备份 MySQL 和图片目录；图片通过 `/api/v1/media/...` 提供，无需把整个上传目录公开为静态目录。仅支持 PNG/JPEG，单图 5MB，像素总数不超过 2000 万。

后台“站点设置”中的站点公开地址上线时改为真实域名根地址（例如 `https://blog.example.com`），RSS 与站点地图以该地址生成链接。`/rss.xml` 和 `/sitemap.xml` 需代理到后端，不能由 SPA 回退接管。

评论无需访客账号，提交后立即公开，每个来源地址 10 分钟最多提交 5 次；登录和评论限流均为单实例内存状态。反向代理部署时设置 `FORWARD_HEADERS_STRATEGY=native`，后端只允许可信代理连接，由代理覆盖转发头；未使用可信代理时保留 `none`。上面的 Nginx 配置覆盖来源头，避免直接信任访客填写的地址。正式部署还需启用 TLS。

统计从功能启用时开始，不补算历史阅读。同一会话同一天对同一文章只计一次；清除 Cookie、新会话或机器人请求可能增加计数，因此不是独立访客或完整网站流量分析。日期以 Asia/Shanghai 计算。

## 音乐与追番

播放器使用后端本地音乐库。更新代码后重启后端，在 `/admin/music` 上传音乐（最多 50MB）、编辑歌名/歌手、替换封面（最多 5MB），保存后即可使用，无需再次构建前端。默认保存于 `${UPLOAD_DIRECTORY}/music`，可用 `MUSIC_DIRECTORY` 设置绝对路径；音频、封面和 `library.json` 必须一起备份。已有歌曲目录通过 `MUSIC_SOURCE_DIRECTORY` 指定，开发时默认识别项目的 `frontend/public/music/`；生产环境应设为服务器上的实际绝对路径。后端 `/api/v1/music/local/{id}/audio` 支持 Range/206，代理请保留 Range 请求头。Nginx 上传限制需至少 56m。仅运行一个后端实例写入此目录；多实例部署应改用共享的数据库/对象存储方案。无需修改 SQL，历史 QQ 接口保留兼容。


## 备份、SEO 和质量检查

全站备份和恢复使用 PowerShell 7 的 `backend/scripts/Backup-Site.ps1` 与 `Restore-Site.ps1`，Linux 也需安装 `pwsh` 和 MySQL 客户端。生产必须为脚本传入与应用相同的 `-Environment prod-windows` 或 `prod-linux`，它们读取对应的外部文件和目录默认值；未指定则保留开发 `.env` 行为。自定义存储路径请统一在所选环境文件或系统变量中配置，脚本不解析 YAML 中手动新增的路径。

```powershell
# 先停止应用。目标应为不存在的新目录；按实际磁盘修改。
pwsh -File backend/scripts/Backup-Site.ps1 -Environment prod-linux -Destination /srv/backups/myblog-new -ApplicationStopped
pwsh -File backend/scripts/Restore-Site.ps1 -Environment prod-linux -Backup /srv/backups/myblog-new
```

恢复命令默认只校验备份；实际恢复需按 [optimizations.md](optimizations.md) 指定新的数据库、目录和应用参数，核对后再切换配置。Windows 使用 `-Environment prod-windows` 和对应盘符路径。

可选 `npm run build:prerender` 为首页与公开文章生成静态分享信息；Nginx 的 `try_files $uri $uri/ /index.html` 可直接访问对应 index.html。发布、撤稿、改标题或域名后需重新构建并替换整个 dist，避免保留旧静态页面。GitHub Actions 已配置 Windows / Ubuntu 两个平台，使用独立 H2，不读取生产数据库。
