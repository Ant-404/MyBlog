# 憨Ant的小站 · MyBlog

参考 [Mizuki](https://github.com/matsuzaka-yuki/Mizuki) 的视觉风格，使用 React 与 Spring Boot 构建的前后端分离个人博客。前端采用图片横幅、波浪收边、悬浮导航、圆角文章卡片与双侧栏，使用独立实现的 React 组件，并保留自己的个人资料和插图。

前台新增五色主题、跟随系统的明暗模式、正文字号、横幅开关、记忆文章视图、搜索联想、文章日历、回到顶部、正文图片放大和代码复制。图片位置、样式文件和组件说明见 [前台定制指南](docs/frontend-customization.md)。

## 技术栈

Mizuki 原项目使用 **Astro + Svelte + TypeScript + Tailwind CSS**，并使用 Swup、Pagefind、Markdown/MDX、KaTeX、Expressive Code 等处理过渡、静态搜索与内容。来源是原项目的 [package.json](https://github.com/matsuzaka-yuki/Mizuki/blob/master/package.json) 和 README，核实日期为 2026-10-14。

本项目使用：

| 部分 | 技术 |
| --- | --- |
| 前端 | React 19、TypeScript、Vite 6、React Router 7 |
| 样式与图标 | 原生 CSS、CSS 变量、Lucide React、本地 SVG 插图 |
| 文章展示 | Marked 解析 Markdown，DOMPurify 清理 HTML，Highlight.js 代码高亮 |
| 后端 | Java 21、Spring Boot 3.5.6、Spring MVC、Validation、Spring JDBC |
| 数据库 | MySQL 8.0.16+，utf8mb4，单文件 SQL 手动建库与升级 |
| 验证 | Spring Boot 集成测试、H2 MySQL 兼容模式、Playwright 浏览器测试 |

## 目录

```text
MyBlog/
├── frontend/                 # 独立 React 工程
│   ├── public/               # 无需构建的图片、favicon
│   ├── src/
│   │   ├── pages/            # 每个页面一个 XxxPage.tsx 文件
│   │   ├── components/       # common / blog / layout 公共组件
│   │   ├── layouts/          # 页面框架、横幅、侧栏、页脚
│   │   ├── router/           # 路由与页面按需加载
│   │   ├── api/              # HTTP 封装与博客接口
│   │   ├── hooks/            # 请求状态、主题、页面标题
│   │   ├── types/            # 接口数据类型
│   │   ├── config/           # 默认站点配置、导航
│   │   ├── contexts/         # 数据库站点设置在前台的共享状态
│   │   ├── data/             # 显式预览模式的演示数据
│   │   ├── styles/           # tokens.css 主题、global.css 样式
│   │   └── utils/            # 通用工具
│   └── tests/                # 浏览器测试
├── backend/                  # 独立 Maven / Spring Boot 工程
│   ├── src/main/java/com/myblog/
│   │   ├── common/           # 统一响应、分页、异常处理
│   │   ├── post/             # 文章 controller / service / repository / dto / entity
│   │   ├── taxonomy/         # 分类和标签模块
│   │   ├── friend/           # 友链模块
│   │   ├── media/            # 图片校验、存储、管理与公开读取
│   │   ├── comment/          # 评论提交、审核与限流
│   │   ├── statistics/       # 阅读去重与统计
│   │   ├── feed/             # RSS 与站点地图
│   │   └── site/             # 站点设置与内容计数
│   ├── src/main/resources/   # 应用配置，无自动数据库迁移
│   ├── src/test/             # 集成测试与独立 H2 配置
│   └── scripts/              # Windows 启动与 Java 格式脚本
├── database/MyBlog.sql       # 唯一 SQL，完整建库、兼容升级与更新备注
├── uploads/                  # 本机上传图片（不提交 Git）
└── docs/                     # 架构、API、部署与验证记录
```

## 快速运行（Windows PowerShell）

需要 Node.js 22、npm、JDK 21+、Maven 3.9+、MySQL 8.0.16+。

### 1. 创建数据库

在 Navicat、MySQL Workbench 或其他客户端中，**执行整个 `database/MyBlog.sql` 文件**。新库创建全部表并插入示例文章；已有库仅补齐缺失的表、列、索引和默认配置。可重复执行，不覆盖已有文章、密码、个人设置或歌单，也不会恢复你删除的示例文章。先停止后端并备份数据库，执行成功后再启动。执行账号需有建库、改表、索引和 CREATE ROUTINE 权限，客户端需支持 DELIMITER（Navicat 运行 SQL 文件或 MySQL SOURCE 均可）。

MySQL 命令行也可以这样操作：

```text
mysql -h 127.0.0.1 -u root -p --default-character-set=utf8mb4
mysql> SOURCE D:/MyBlog/database/MyBlog.sql;
```

本机已准备 `backend/.env`，包含你提供的连接密码，默认用户 `root`、地址 `127.0.0.1:3306`。此文件被 Git 忽略。其他机器复制 `backend/.env.example` 为 `.env` 后填入自己的连接信息。

数据库只维护 `database/MyBlog.sql`，顶部备注每次更新。项目已移除 Flyway 和自动建表：每次涉及数据库的更新，都由你手动执行这一个文件，再启动后端。原有 `flyway_schema_history` 表无需删除，应用不再使用它。

### 2. 启动后端

从根目录执行：

```powershell
cd D:\MyBlog
.\backend\scripts\Start-Backend.ps1
```

后端地址：`http://127.0.0.1:8080`，测试接口：`http://127.0.0.1:8080/api/v1/posts`。

也可以在 IDEA 中直接运行 `com.myblog.MyBlogApplication`。项目已配置从工作目录读取 `backend/.env` 或 `.env`，因此工作目录设置为项目根目录 `D:\MyBlog` 或后端目录 `D:\MyBlog\backend` 均可。运行配置使用 `myblog-backend` 模块。已有系统环境变量或 IDEA 环境变量优先级更高；如果其中配置了旧密码，应删除或更新。部署时也可以仅通过环境变量提供连接信息。

### 3. 启动前端

另开一个终端：

```powershell
cd D:\MyBlog\frontend
npm ci
npm run dev
```

访问 `http://127.0.0.1:5173`。Vite 将 `/api` 代理给后端，默认使用真实数据库数据。

仅预览前端时，在 `frontend/.env.local` 写入 `VITE_DEMO_MODE=true`，重启 Vite，页面会显示“界面预览”提示。正式连接后端时删除该设置或改为 `false`。请求失败会显示错误，不会自动切换为假数据。

## 页面文件与修改入口

| 页面 | 文件 |
| --- | --- |
| 首页、搜索、分类/标签结果 | `frontend/src/pages/HomePage.tsx` |
| 文章详情 | `frontend/src/pages/PostDetailPage.tsx` |
| 归档 | `frontend/src/pages/ArchivePage.tsx` |
| 分类 | `frontend/src/pages/CategoryPage.tsx` |
| 标签 | `frontend/src/pages/TagPage.tsx` |
| 友链 | `frontend/src/pages/FriendPage.tsx` |
| 关于 | `frontend/src/pages/AboutPage.tsx` |
| 404 / 页面异常 | `NotFoundPage.tsx` / `ErrorPage.tsx` |

站点名称、作者和菜单在 `frontend/src/config/site.ts` 修改；颜色在 `styles/tokens.css` 修改；公共布局在 `layouts/BlogLayout.tsx` 修改；样式布局在 `styles/global.css` 修改。

## 验证与构建

```powershell
cd D:\MyBlog\frontend
npm run build

cd D:\MyBlog\backend
mvn test
mvn package
```

浏览器测试使用真实 Spring Boot API 和独立内存 H2 库，自动启动 8081 后端与 5174 前端，不修改 MySQL：

```powershell
cd D:\MyBlog\frontend
npx playwright install chromium
npm run test:e2e
```

本机有 Edge 时，也可设置 `$env:PLAYWRIGHT_CHANNEL='msedge'` 后运行测试，不必下载 Chromium。

## 当前范围

七步开发路线已完成：公开阅读、管理员登录、文章管理、Markdown 编辑器、图片管理、分类/标签/友链/站点设置、阅读体验、评论审核、RSS、站点地图和阅读统计。随后增加了连续主题色、QQ 公开歌单播放器、独立追番页及对应后台。小站默认署名为憨Ant，可在后台修改个人资料。当前 React SPA 若后期特别重视搜索引擎收录，可另外加入预渲染或 SSR。

## 管理后台（第一步已完成）

启动前后端后访问 `http://127.0.0.1:5173/admin`，也可点击页脚“管理后台”。本机初始化账号为 `hanant`，随机生成的初始密码保存在 `backend/.env` 的 `ADMIN_PASSWORD`，与数据库密码无关。

先手动执行 `database/MyBlog.sql`，准备包括 `admin_users` 在内的全部表。仅当管理员表为空时，才用 ADMIN_USERNAME / ADMIN_PASSWORD 创建初始账号，密码经 BCrypt 加密写入数据库；重启不改密码。若需要自己指定初始密码，请在首次创建账号前修改 `.env`，密码须为 12–64 个字符且 UTF-8 编码不超过 72 字节。

后台使用 HttpOnly 会话 Cookie、30 分钟空闲超时、CSRF 校验与后端 ADMIN 权限校验。登录成功和退出后会更新 CSRF 状态。账号或密码错误统一返回 401，同一来源 15 分钟内累计失败 5 次后暂时限流。当前单实例本地限流状态不跨进程共享。

## 文章管理（第二步已完成）

登录后点击左侧“文章管理”，或访问 `/admin/posts`。支持搜索、状态筛选、分页、新建、编辑、保存草稿、发布、转回草稿、置顶与删除。编辑页面独立放在 `pages/admin/AdminPostEditorPage.tsx`，列表为 `AdminPostListPage.tsx`。

标题和唯一 slug 必填，slug 使用小写英文、数字和短横线；草稿允许正文暂时为空，发布前必须填写正文。可在编辑时选择或输入分类、添加标签、设置日期、阅读时长和封面地址。未来日期文章到当天才会出现在前台。已发布文章保存为草稿后会从前台隐藏。修改 slug 会使旧地址失效；删除有确认提示，并永久删除文章与标签关联。

V5 迁移增加文章版本字段，避免多个编辑窗口互相覆盖。出现 409 冲突时保留当前输入，请先复制需要保留的文字，再重新加载最新版本。离开未保存页面时会提醒。编辑器提供 Markdown 实时预览与已有草稿自动保存，使用方法见下文。

数据库更新时手动执行唯一 SQL 文件，再重新运行 MyBlogApplication。完成情况见 [`docs/roadmap.md`](docs/roadmap.md)。

## Markdown 编辑器（第三步已完成）

文章编辑页支持编辑、分栏和预览模式；桌面宽屏左右分栏，窄屏上下排列。工具栏可插入标题、加粗、斜体、引用、列表、链接、图片和代码块，选中文字后可直接套用格式。图片按钮插入图片地址，也可通过“上传 / 选择正文图片”使用站内图片库。编辑器预览与前台共用 `utils/markdown.ts`，使用 Marked 解析和 DOMPurify 清理危险 HTML。

新文章先填写标题、slug 等必填项并手动保存草稿一次。已有草稿默认在停止输入 3 秒后通过后台接口保存到 MySQL；可取消“自动保存草稿”。必填项无效时不发送自动保存请求。已发布文章需手动保存修改；自动保存不会发布文章或撤回已发布文章。保存期间暂时禁用输入，防止响应覆盖正在输入的内容。

保存失败或版本冲突会保留输入并暂停自动保存。网络恢复后手动保存成功即可恢复自动保存；版本冲突需先复制当前文字，再重新加载最新版本进行合并。未成功保存的内容仍受离开提醒保护，当前没有浏览器本地备份，也没有定时保存新建未提交文章。

此阶段复用现有文章接口和 V5 版本字段，无新增 SQL 或数据库迁移。

## 图片、设置与评论（第四至第七步已完成）

后台新增独立页面：

| 页面 | 地址 | 功能 |
| --- | --- | --- |
| 图片管理 | `/admin/media` | 上传、预览、复制地址、删除；编辑页选择封面或正文图片 |
| 分类与标签 | `/admin/taxonomy` | 新增、重命名、删除；使用中的项禁止删除 |
| 友链管理 | `/admin/friends` | 新增、编辑、删除、显隐、排序 |
| 站点设置 | `/admin/settings` | 名称、作者、简介、头像、关于正文、公开域名与评论开关 |
| 评论审核 | `/admin/comments` | 待审核、通过、拒绝、重新审核、永久删除、分页 |
| 阅读统计 | `/admin/statistics` | 累计/今日阅读、30 天趋势、文章排行、待审核评论数 |

图片支持 PNG/JPEG，最多 5MB、2000 万像素，重新编码后按随机文件名保存。本机 `UPLOAD_DIRECTORY` 已固定为 `D:/MyBlog/uploads`，数据库存储图片元数据和引用地址；列表显示最近 200 张。已有文章（包括草稿）或头像/关于正文正在引用的图片禁止删除。编辑器图片工具栏仍可手动填写外部地址，新增“上传 / 选择”按钮调用站内图片库。

前台文章提供目录、阅读进度、按发布日期排序的上一篇/下一篇，以及 Java、JavaScript、TypeScript、SQL、CSS、HTML/XML、Bash、JSON 代码高亮。Markdown 代码块需填写语言名。草稿和未来文章不会进入相邻文章、RSS 或站点地图。

访客可用昵称提交纯文字评论，默认待审核，后台通过后公开；无需填写邮箱。评论提交保留 CSRF 校验，并有来源限流与机器人诱捕字段。阅读计数按会话和上海日期对每篇文章去重，不能当作独立访客数；从功能启用开始累计，不补算历史阅读。

RSS 为 `/rss.xml`（最新 50 篇摘要），站点地图为 `/sitemap.xml`。上线时在站点设置填写自己的真实域名；本机默认 `http://127.0.0.1:5173`。生产代理与备份说明见部署文档。表结构已统一收录在 `database/MyBlog.sql`，数据库更新由用户手动执行。

## 代码格式

音乐播放器、独立追番页和连续主题调色已加入。后台入口分别为 `/admin/music`、`/admin/anime`，前台追番地址为 `/anime`。QQ 音乐支持公开歌单导入和公开主页链接，暂不支持账号登录或私密歌单同步。先手动执行 `database/MyBlog.sql` 补齐新表，再重启 `MyBlogApplication`。详细操作见 [`docs/leisure.md`](docs/leisure.md)。

前端执行 `npm run format`，检查用 `npm run format:check`。Java 执行根目录下的 `./backend/scripts/Format-Java.ps1`，检查加 `-Check`；首次运行会下载固定版本的 Google Java Format 至忽略的 target 目录。页面继续每页一个 `XxxPage.tsx`；后端按业务模块划分 controller / service / repository / dto。

更多说明：[`docs/architecture.md`](docs/architecture.md)、[`docs/api.md`](docs/api.md)、[`docs/deployment.md`](docs/deployment.md)、[`docs/verification.md`](docs/verification.md)。
