# 持续优化 · 2026-10-19

本轮按草稿恢复、账号改密、全站备份、SEO、图片、批量操作、CI 和说明清理的顺序实施。无新增数据库表或字段；更新代码、前端依赖并重启后端即可启用新接口。

## 写文章

未提交修改会写入本机 localStorage，按管理员账号和文章 ID 隔离，新文章使用独立的新稿位置。刷新或重新进入编辑页后可选择恢复或放弃；恢复使用服务端当前版本号，保留本机文字，并暂停自动保存，核对后手动保存。恢复不会自动发布或改变服务端状态。浏览器禁用存储或容量不足时显示提示，请及时手动保存。

已有草稿停止输入三秒后自动保存；后台保存期间仍可继续输入。响应只确认已提交的内容，新输入保留，随后继续保存。手动保存/发布期间锁定输入。服务器返回版本冲突时暂停自动保存，保留本机内容，由作者核对合并。

本机备份留在当前浏览器用户数据中，不跨设备同步；同一篇文章的本机副本只有一份，不是多窗口版本历史。成功保存后清除对应副本。电脑共用时请分别使用浏览器配置文件。

## 账号安全

后台「账号安全」(`/admin/security`) 输入旧密码、新密码和确认值。新密码为 12–64 字符、UTF-8 不超过 72 字节，并与旧密码不同。成功后当前会话退出，其他已登录设备的会话在后续请求时被拒绝，需要新密码登录。旧密码失败有独立的账号级限流；接口保留 ADMIN 权限、CSRF 和密码更新的并发校验。

会话撤销目前针对单实例内存注册表。初始化配置 ADMIN_PASSWORD 不会随后台改密而更新，修改它也不会重置数据库中的现有密码。

## 全站备份与恢复

使用 **PowerShell 7** 和 MySQL 8 客户端。先停止后端，确保不会一边导出数据库一边上传或改写文件，然后从项目根目录运行：

```powershell
./backend/scripts/Backup-Site.ps1 -Destination D:/MyBlogBackups/site-20261019 -ApplicationStopped
```

目标目录必须尚不存在，且位于被备份目录之外。脚本按环境变量优先、backend/.env 次之读取连接配置；包含数据库 SQL、UPLOAD_DIRECTORY、MUSIC_DIRECTORY、MUSIC_SOURCE_DIRECTORY 和前端 public/images。默认音乐目录与上传目录有重叠时分别复制，便于按独立配置恢复。配置的目录应为绝对路径；.env 不进入备份，需要单独安全保管。脚本拒绝目录联接和符号链接，避免遗漏外部数据。manifest.json 记录逐文件 SHA256，只有导出和复制都成功才生成完整清单。

先只验证完整性，不写数据库：

```powershell
./backend/scripts/Restore-Site.ps1 -Backup D:/MyBlogBackups/site-20261019
```

恢复到新的空数据库和新目录：

```powershell
./backend/scripts/Restore-Site.ps1 -Backup D:/MyBlogBackups/site-20261019 `
  -Apply -ApplicationStopped -TargetDatabase MyBlog_Restored `
  -Destination D:/MyBlogRestored/site-20261019
```

恢复先校验文件和路径，拒绝当前配置的数据库、系统数据库、非空数据库及已存在的文件目录。导入出错会留下新数据库供检查，不覆盖现用库。成功后把 DB_NAME 指向恢复库，把 UPLOAD_DIRECTORY、MUSIC_DIRECTORY、MUSIC_SOURCE_DIRECTORY 分别指向恢复目录下的 uploads、music、sourceMusic；将 publicImages 内容恢复至前端 public/images，重新构建前端，再启动并检查文章、相册、图片、音乐和登录。

只对自己生成且可信的 SQL 备份执行恢复。备份目录含后台密码哈希和评论邮箱，请保存在受控目录；SHA256 用于发现意外损坏，不是签名或加密。

`Test-SiteBackup.ps1` 使用数据库导出测试替身验证目录复制、完整性、损坏和越界检测，不连接真实数据库。可选 `Test-SiteBackupMySql.ps1` 使用本机 mysqld/mysql/mysqldump/mysqladmin，在 target 下初始化独立数据目录并选择临时端口，完成真实导出/导入、中文内容、文件哈希和非空数据库拒绝测试，结束后关闭临时实例；不会连接现用 MySQL。本轮已执行该测试通过，仍应定期用自己的真实备份在独立库演练恢复。

## SEO 和分享信息

页面切换时更新标题、描述、canonical、Open Graph 和 Twitter 卡片。文章使用自己的摘要和封面，退出详情页后恢复站点信息；后台和带查询参数的筛选页标记 noindex。上线时先在站点设置中填入真实公开域名。

普通 `npm run build` 仍生成 React SPA。需要不执行 JavaScript 的分享抓取器读取文章信息时，在后端可用时运行：

```powershell
cd frontend
$env:PRERENDER_API_URL = 'http://127.0.0.1:8080/api/v1'
$env:PUBLIC_SITE_URL = 'https://blog.example.com'
npm run build:prerender
```

静态生成读取公开文章分页，不读取草稿/未来文章；为首页和 `/posts/{slug}/index.html` 写入标题、摘要、分享封面与 canonical。所有公开接口读取成功后才开始写文件。页面根节点提供标题和摘要，正文仍由 API 加载，**不是完整正文 SSR**。Nginx 配置沿用部署文档。发布、撤稿、删除、修改标题/域名后重新运行完整命令并替换整个 dist，不能叠加复制保留旧静态文章。未使用静态生成时，分享抓取器能否读取客户端标签取决于其 JavaScript 能力。

## 图片与批量操作

`npm run dev` 与 `npm run build` 会先执行 `images:optimize`。home 系列原图保留，Sharp 自动生成最多 640、1280、1920 像素宽的 WebP/AVIF，不放大原图；文件名包含内容摘要，重复运行复用已生成文件。横幅通过 picture/srcSet 按视口选择，以 WebP 优先，原图作为回退；轮播预加载也使用响应式版本。新增或替换横幅后重新执行 `images:optimize` 并重启开发服务，生产需重新构建。生成目录不提交 Git。

图片库支持一次选多个文件，逐张显示准备/转换/上传阶段和已完成数量，保留失败文件供重试。上传进度是文件完成数，不是字节百分比；网络超时请先核对列表是否已上传成功，避免重复文件。相册可跨图片库页多选，再统一添加，最多 200 张；照片顺序仍可逐项调整，添加后需保存相册。

音乐管理支持上移/下移、移出播放列表和恢复。操作保存至 library.json 并校验版本；移出只过滤公开播放列表，文件和资料仍保留，直接音频地址不属于权限控制范围。不删除原目录音频或上传文件。

## CI 与遗留说明

`.github/workflows/ci.yml` 在 push 和 pull_request 时执行依赖安装、前端格式和生产构建、后端验证打包、Java 格式、备份完整性检查及真实 API 浏览器测试。浏览器使用独立 H2，失败保留 trace 和报告；不会访问生产 MySQL。工作流需推送到启用 Actions 的 GitHub 仓库后才会在远端执行。

README、架构和部署说明已统一为当前访客即时评论、后台查看/删除、说说独立页面、图片分页和本地音乐规则。已被当前说明替代的旧路线图和后台检查文档已移除。旧会员表和 QQ 音乐接口保留兼容；它们不参与当前访客登录和本地播放，不以删除数据库或外部接口的方式清理历史。
