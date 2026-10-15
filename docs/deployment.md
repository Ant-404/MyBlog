# 部署

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

`mvn package` 生成 `backend/target/myblog-backend-0.1.0.jar`。设置 DB_HOST、DB_PORT、DB_NAME、DB_USERNAME、DB_PASSWORD 后执行 `java -jar ...`。本地也可直接运行 MyBlogApplication；工作目录为项目根目录或 backend 时会自动读取 `backend/.env` 或 `.env`。系统或运行配置中的环境变量优先。Windows 还可使用 `Start-Backend.ps1 -Packaged` 启动。

数据库名为 `MyBlog`。正式环境使用独立应用账号与环境变量管理密码。新建和升级均由用户手动执行唯一的 `database/MyBlog.sql`，成功后再启动应用；不使用 Flyway 或自动建表。已有数据库先备份，执行脚本的账号需有 CREATE ROUTINE、ALTER、INDEX 等权限；运行应用的账号不需要这些 DDL 权限。

## 部署检查

确认静态资源可访问；直接刷新文章地址仍能打开；`/api/v1/posts` 返回数据；VITE_DEMO_MODE 为 false；数据库保留 utf8mb4；仅服务端持有数据库连接信息。按实际域名配置 HTTPS。

后台登录同样使用 `/api` 反向代理，保留 Cookie。HTTPS 部署时设置 `SESSION_COOKIE_SECURE=true`；数据库密码与管理员初始化密码分别管理，不进入前端构建。ADMIN_PASSWORD 只初始化空表，不作为运行时数据库中的密码替代品。

## 图片、评论与订阅

配置 `UPLOAD_DIRECTORY` 为可写的绝对路径，例如 `/srv/myblog/uploads`。本机已固定为 `D:/MyBlog/uploads`，避免 IDEA 工作目录改变导致图片失效。备份时一起备份 MySQL 和图片目录；图片通过 `/api/v1/media/...` 提供，无需把整个上传目录公开为静态目录。仅支持 PNG/JPEG，单图 5MB，像素总数不超过 2000 万。

后台“站点设置”中的站点公开地址上线时改为真实域名根地址（例如 `https://blog.example.com`），RSS 与站点地图以该地址生成链接。`/rss.xml` 和 `/sitemap.xml` 需代理到后端，不能由 SPA 回退接管。

评论默认待审核，每个来源地址 10 分钟最多提交 5 次；登录和评论限流均为单实例内存状态。反向代理部署时设置 `FORWARD_HEADERS_STRATEGY=native`，后端只允许可信代理连接，由代理覆盖转发头；未使用可信代理时保留 `none`。上面的 Nginx 配置覆盖来源头，避免直接信任访客填写的地址。正式部署还需启用 TLS。

统计从功能启用时开始，不补算历史阅读。同一会话同一天对同一文章只计一次；清除 Cookie、新会话或机器人请求可能增加计数，因此不是独立访客或完整网站流量分析。日期以 Asia/Shanghai 计算。

## 音乐与追番

播放器使用后端本地音乐库。更新代码后重启后端，在 `/admin/music` 上传音乐（最多 50MB）、编辑歌名/歌手、替换封面（最多 5MB），保存后即可使用，无需再次构建前端。默认保存于 `${UPLOAD_DIRECTORY}/music`，可用 `MUSIC_DIRECTORY` 设置绝对路径；音频、封面和 `library.json` 必须一起备份。已有歌曲目录通过 `MUSIC_SOURCE_DIRECTORY` 指定，开发时默认识别项目的 `frontend/public/music/`；生产环境应设为服务器上的实际绝对路径。后端 `/api/v1/music/local/{id}/audio` 支持 Range/206，代理请保留 Range 请求头。Nginx 上传限制需至少 56m。仅运行一个后端实例写入此目录；多实例部署应改用共享的数据库/对象存储方案。无需修改 SQL，历史 QQ 接口保留兼容。
