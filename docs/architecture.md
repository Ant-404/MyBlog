# 架构与命名规范

## 职责边界

前端页面调用 `api/blog.ts`；该文件通过 `api/http.ts` 访问 `/api/v1`。请求状态由 `useAsyncData` 管理，包括加载、错误、空内容和过期请求结果隔离。页面保持独立文件，公共视觉元素放在 components，布局放在 layouts。

后端按业务模块组织，模块内部按职责分层：Controller → Service → Repository → MySQL。Controller 校验 HTTP 参数；Service 组织业务与只读事务；Repository 使用参数化 SQL；DTO 定义稳定的公开响应。暂不为每个单一 Service 增加接口和 Impl 文件，出现多种实现时再提取接口。

## 命名

| 对象 | 规范 | 示例 |
| --- | --- | --- |
| 工程目录 | 小写英文 | frontend、backend、database、docs |
| 前端职责目录 | 小写英文，按必要的业务子目录拆分 | pages、components/blog、hooks |
| 页面、组件、布局 | PascalCase | HomePage.tsx、PostCard.tsx、BlogLayout.tsx |
| Hook | use + PascalCase | useTheme.ts、useAsyncData.ts |
| 普通 TS 工具 | camelCase | date.ts、blog.ts |
| Java 包 | 小写英文 | com.myblog.post.service |
| Java 类 | PascalCase + 职责后缀 | PostController、PostService、PostRepository |
| API 数据对象 | XxxResponse | PostDetailResponse |
| SQL 表、字段、索引 | snake_case | post_tags、published_at、idx_posts_publication |
| 数据库名 | 用户指定 | MyBlog |
| 数据库脚本 | 仅一个文件，顶部按日期备注更新 | database/MyBlog.sql |
| 文档 | kebab-case 或简短小写 | architecture.md |

## 数据关系

`categories` 与 `posts` 是一对多；`posts` 与 `tags` 通过 `post_tags` 建立多对多关系；`friends` 独立保存友链。主键、唯一键、外键与索引统一定义在 `database/MyBlog.sql`。公开接口只查询已发布且发布日期不晚于当前日期的文章，分类、标签计数遵守相同规则。

文章 slug 是唯一稳定的路由标识。正文使用 Markdown；列表不传输完整正文；标签用一次批量查询附加，避免逐篇请求。搜索使用转义后的参数化 LIKE，输入 `%`、`_` 不会扩大为通配符查询。

## 新增一个页面

1. 在 pages 新增一个 `XxxPage.tsx`，只包含该页面的组织与业务展示。
2. 在 router/index.tsx 注册路由与懒加载。
3. 需要导航入口时修改 config/site.ts。
4. 接口类型放进 types，请求方法放进 api；真正共用的 UI 才提取成组件。

## 新增一个后端模块

1. 在 `com.myblog` 下新增业务包，例如 comment。
2. 按需要添加 controller、service、repository、dto、entity。
3. 更新唯一 `database/MyBlog.sql`：同步完整表结构、已有库兼容升级语句和顶部更新备注，保持重复执行不覆盖数据。
4. Controller 返回 ApiResponse，Service 管理事务，Repository 保持参数化 SQL。
5. 增加模块的行为测试，并更新接口文档。

`database/MyBlog.sql` 同时用于新库和已有库；使用 IF NOT EXISTS 及信息表检查避免重复建表、加列和创建索引。仅在首次创建 posts 表时导入示例，单例设置只在不存在时补充。后端不执行数据库初始化或迁移。测试专用配置从同一文件读取完整表结构，跳过 MySQL 建库和存储过程块，装载到 H2；生产包不包含此测试初始化器。

## 管理员模块

`auth` 模块负责账号仓储、BCrypt 校验、初始账号创建和认证接口；`config/SecurityConfig` 负责会话、CSRF 和后端权限边界；`admin` 提供受保护的工作台接口。管理页面使用独立 AdminLayout，不加载前台双侧栏。后端是权限判定的最终依据，前端路由跳转只负责体验。

系统环境变量优先于本地 `.env`；初始化密码仅在管理员表为空时使用。以后修改初始化配置不会覆盖已有数据库密码。所有新管理写入 API 均应置于 `/api/v1/admin/**` 并要求 CSRF header。

文章管理沿用 post 模块，新增 AdminPostController / AdminPostService / AdminPostRepository 及独立 DTO。写入使用事务将文章、分类、标签与关联作为一次完整操作；重复 slug 或版本冲突会回滚。V5 添加 version，用 `WHERE id = ? AND version = ?` 做并发检查，写入时递增。前台查询仍保持原公开过滤规则。

## Markdown 编辑器

编辑页保持为 `pages/admin/AdminPostEditorPage.tsx`，负责表单、版本状态、提交和自动保存；`components/admin/MarkdownEditor.tsx` 负责文本选区、格式工具栏及预览模式。`utils/markdown.ts` 统一编辑器与公开详情的 Markdown 解析和 HTML 清理。

自动保存仅作用于已手动创建的草稿：输入变化重置 3 秒计时器，提交前检查表单有效性；卸载或状态变化清理计时器。保存使用原有 CSRF 写接口并携带当前版本，保存成功更新表单基线与版本，失败保留输入并暂停自动提交。保存锁避免手动和自动提交重叠；已发布内容只接受手动提交，无新增后端接口或迁移。

## 图片与内容管理

`media` 模块通过 ImageIO 检查真实格式和尺寸，重新编码 PNG/JPEG 后保存于配置的绝对目录。数据库记录文件元数据；公开读取只允许已登记的随机文件名。删除前检查文章封面、正文、站点头像和关于正文的引用。数据库与文件目录必须一起备份。

`taxonomy` 和 `friend` 各自扩展管理层，SQL 动态表名仅来自固定白名单，名称和其他数据始终用绑定参数。分类、标签、友链和设置增加 version 防止并发覆盖。分类和标签仍被文章使用时禁止删除，外键保留数据库层的最终约束。

`SiteContext` 从公开设置接口加载展示资料，`config/site.ts` 只保留默认值和导航。后台保存后通过事件刷新共享状态，标题、横幅、侧栏和关于页面使用同一份设置。

## 阅读、评论与统计

`ArticleReadingTools` 根据清理后的标题生成目录、锚点和阅读进度；Markdown 公共工具只加载常用语言的 Highlight.js 语法。相邻文章由后端按发布日期和 ID 查询，仅返回公开文章。

`comment` 模块按文章查询公开评论，默认 PENDING，只有 APPROVED 才公开。后台状态修改和删除携带 version。提交保留匿名 CSRF、纯文字展示、长度限制、诱捕字段和来源限流；不保存邮箱与来源 IP。限流缓存仅在内存保存来源地址，最多 10000 个窗口，10 分钟后清理。

`statistics` 将每天的文章计数写入 post_views，HttpSession 维护本日已读文章（最多 1000 项），避免重复刷新计数。计数是近似阅读量，不提供独立访客推断。`feed` 使用 XMLStreamWriter 转义内容，并过滤非法 XML 控制字符，以设置中的 publicUrl 生成 RSS 和站点地图，不信任请求 Host 来生成链接。

历史 V6–V8 功能对应 media_files、site_settings、comments、post_views，现已合并到唯一 SQL；不再维护分散的版本迁移文件。

## 音乐与追番

2026-10-15（历史 V9 功能）新增 `anime_entries`、`music_settings`、`music_tracks`。后端 `anime`、`music` 模块各自按 controller/service/repository/dto 分层，管理写操作沿用会话、CSRF 和乐观版本校验。图片删除检查也覆盖追番封面和歌单封面。

`QqMusicClient` 只从固定配置的 Meting 服务解析 QQ 公开歌单，限制连接时间、响应大小及歌曲数量；导入失败保留原歌单。歌单和歌曲元数据保存在数据库，公开主页仅作为链接，不代表 QQ 登录授权。

前端 `AnimePage.tsx`、`AdminAnimePage.tsx`、`AdminMusicPage.tsx` 分别负责独立页面；`MusicPlayer.tsx` 挂载在公共布局中，站内公开页面切换时保留播放，离开公共布局时暂停。详细配置见 [leisure.md](leisure.md)。

## 扩展边界

目前是小型个人博客：归档一次加载全部公开摘要，搜索使用 LIKE；文章数增长后可将归档分页并引入全文搜索。图片管理显示最近 200 张，RSS 提供最新 50 篇摘要，统计显示前 20 篇排行。管理员写操作全部受会话与 CSRF 保护，匿名写接口仅限评论和阅读计数。多实例部署时需将限流与会话共享至 Redis 等存储，文件存储也可扩展为对象存储。当前没有 SSR、邮件通知、评论回复或独立访客追踪。
