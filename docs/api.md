# API

基础路径 `/api/v1`，UTF-8 JSON。同源部署或 Vite 代理访问，不要求浏览器直接跨域连接 8080。

## 管理员认证

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | /auth/csrf | 返回 token 和 headerName，并建立用于 CSRF 的会话 |
| POST | /auth/login | JSON username/password，需附带上一步的 CSRF header |
| GET | /auth/me | 当前管理员 username/displayName；未登录返回 401 |
| POST | /auth/logout | 携带当前 CSRF header，销毁会话与 Cookie |
| GET | /admin/dashboard | 需 ADMIN 权限的站点统计 |

登录后服务端更新会话 ID 并轮换 CSRF token。前端每次 POST 前重新获取 token。会话由 HttpOnly Cookie 管理，不把认证 token 或密码放进 localStorage。公开阅读接口保持无需登录。

认证错误：401 UNAUTHORIZED / INVALID_CREDENTIALS，403 FORBIDDEN（权限或 CSRF 校验失败），429 LOGIN_THROTTLED（短时间多次失败）。返回的管理员对象不包含 password_hash。

## 后台文章管理

所有接口均需 ADMIN 会话，POST/PUT/PATCH/DELETE 还需要 CSRF header。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | /admin/posts | page/size/keyword/status，按更新时间与 ID 降序；包括草稿和未来日期文章 |
| GET | /admin/posts/options | 全部分类/标签名称，包含暂无公开文章的项 |
| GET | /admin/posts/{id} | 后台详情，包括 content、status、version、updatedAt |
| POST | /admin/posts | 新建，返回 201 和完整详情 |
| PUT | /admin/posts/{id} | 编辑，必须传当前 version |
| PATCH | /admin/posts/{id}/state | status、pinned、version，发布/转草稿/置顶 |
| DELETE | /admin/posts/{id}?version=N | 删除并清理关联，响应 data 为 null |

写入字段：title、slug、excerpt、content、cover、category、tags、publishedAt、readingMinutes、pinned、status、version。status 为 DRAFT/PUBLISHED；title 最长 200；slug 最长 160、格式 `[a-z0-9]+(?:-[a-z0-9]+)*`；excerpt 最长 500；content 最长 200000；cover 最长 500；分类/标签名最长 64，标签最多 12；readingMinutes 1–240；日期 YYYY-MM-DD。后台关键词搜索标题与摘要，分页默认 10 篇、最大 100 篇。

空正文可存草稿，不可发布。未来日期 PUBLISHED 内容在后台可见，在前台隐藏。分类和标签名称可在写文章时创建，标签自动去重。每次编辑或状态操作 version 加 1，旧版本写入或删除返回 409 CONFLICT；重复 slug 同样返回 409。参数或 JSON 格式不合法返回 400。

## 成功响应

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "items": [],
    "total": 0,
    "page": 1,
    "size": 4
  }
}
```

## 接口列表

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | /posts | 分页文章摘要，置顶优先，再按日期和 ID 降序 |
| GET | /posts/{slug} | 文章详情，增加 Markdown content 字段 |
| GET | /archives | 全部公开文章摘要，日期和 ID 降序 |
| GET | /categories | 有公开文章的分类及 count |
| GET | /tags | 有公开文章的标签及 count |
| GET | /friends | 可见友链，按 sort_order 与 ID 排序 |
| GET | /site/stats | posts、categories、tags 统计 |

`/posts` 参数：page 默认 1、范围 1–100000；size 默认 4、范围 1–100；keyword 最长 100，搜索标题、摘要、正文；category、tag 最长 64，按名称精确匹配。多个筛选条件取交集。页面无结果时返回空 items，total 为符合筛选的总数。

文章摘要字段：id、slug、title、excerpt、cover、category、tags、publishedAt（YYYY-MM-DD）、readingMinutes、pinned。详情另有 content。数据库 cover 默认保存前端静态资源路径 `/images/...`；部署时图片由前端服务提供。

分类/标签字段：name、count。友链字段：id、name、description、url。统计字段：posts、categories、tags。

## 错误响应

```json
{ "code": "NOT_FOUND", "message": "请求的资源不存在", "data": null }
```

| 状态 | code | 场景 |
| --- | --- | --- |
| 400 | INVALID_ARGUMENT | 参数越界、长度不合法或数字格式错误 |
| 404 | NOT_FOUND | 文章不存在、未公开或资源不存在 |
| 503 | DATABASE_UNAVAILABLE | 查询数据库失败 |
| 500 | INTERNAL_ERROR | 其他服务异常 |

生产响应不包含 SQL、数据库账号、内部异常栈。测试验证的接口契约与前端 `types/blog.ts` 对齐。

## 图片管理

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | /admin/media | 最近 200 张图片，按 ID 降序 |
| POST | /admin/media | multipart/form-data，file 字段，返回 201 |
| DELETE | /admin/media/{id} | 删除未被文章和站点设置引用的图片，引用中返回 409 |
| GET | /media/{filename} | 公开读取已登记图片；二进制响应，Content-Type 和 nosniff |

元数据为 id、url、originalName、contentType、sizeBytes、createdAt。上传仅接收实际可解码的 PNG/JPEG，最多 5MB、2000 万像素；格式伪装返回 400，请求超过上传上限返回 413 FILE_TOO_LARGE。管理操作需 ADMIN 与 CSRF，公开读取仅接受随机生成的合法文件名。

后台页面在上传前按真实文件头识别 PNG/JPEG；其他浏览器可解码的图片（如 WebP、GIF、BMP、AVIF）通过 Canvas 转成 PNG 后提交，保留透明通道，动图保存为静态图。文件头与扩展名不一致时修正文件名。原文件和转换结果均限制 5MB，转换图片最多 2000 万像素；HEIC/HEIF 等依赖浏览器解码能力，不保证支持。转换工具为 `frontend/src/utils/imageUpload.ts`，所有图片管理/选择入口共用，后端接口和数据库不变。

## 分类、标签、友链和设置

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET/POST | /admin/taxonomy/{kind} | 列表或新建；kind 仅 categories/tags；新建传 name/version |
| PUT | /admin/taxonomy/{kind}/{id} | name、version，重命名并保留文章关联 |
| DELETE | /admin/taxonomy/{kind}/{id}?version=N | 使用中的项或版本过期返回 409 |
| GET/POST | /admin/friends | 列表或新建友链 |
| PUT | /admin/friends/{id} | 编辑友链，携带 version |
| DELETE | /admin/friends/{id}?version=N | 删除友链 |
| GET | /site/settings | 公开站点展示设置，不含凭据 |
| GET/PUT | /admin/settings | 管理读取与版本保护的设置更新 |

分类/标签管理字段为 id、name、count、version；count 包含关联草稿。友链字段为 id、name、description、url、sortOrder、visible、version；URL 必须是 HTTP/HTTPS，公开接口仍只返回 visible=true 项。

设置字段为 name、title、subtitle、author、bio、description、aboutContent、avatar、publicUrl、commentsEnabled、version。publicUrl 为域名根地址，avatar 可为空、站内路径或 HTTP/HTTPS；aboutContent 为 Markdown，在前台清理 HTML 后显示。设置和友链的版本不匹配返回 409。

## 阅读、评论和订阅

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | /posts/{slug}/neighbors | previous/next 摘要或 null；按公开文章发布日期、ID 排序 |
| GET | /posts/{slug}/view | 阅读计数，data 为数字 |
| POST | /posts/{slug}/view | 同一会话同一天同一文章去重；需 CSRF，可匿名 |
| GET | /posts/{slug}/comments?page=N | 公开评论（含注册用户待审核评论），每页 20 条 |
| POST | /posts/{slug}/comments | content、website、可选 parentId；返回 202，默认待审核；需 CSRF，可匿名；注册用户先展示后审核，游客审核通过后展示，author/memberId 由服务端决定 |
| GET | /admin/comments?status=PENDING&page=1 | 审核列表，每页 20 条，status 可为空或 PENDING/APPROVED/REJECTED |
| PATCH | /admin/comments/{id} | status、version，版本过期返回 409 |
| DELETE | /admin/comments/{id}?version=N | 永久删除评论 |
| GET | /admin/statistics | totalReads、todayReads、pendingComments、daily、posts |
| GET | /feed.xml | RSS XML，最新 50 篇公开摘要；另有根路径 /rss.xml |
| GET | /sitemap.xml | XML 站点地图；另有根路径 /sitemap.xml |

表中除根路径说明外均以 `/api/v1` 为前缀。评论昵称来自账号，content 最长 2000，按纯文字展示；website 是应留空的诱捕字段。评论关闭时提交返回 400，每个来源地址和账号 10 分钟最多 5 次，超限返回 429 RATE_LIMITED。管理评论增加 slug、postTitle、status、version；公开评论返回 id、author、content、createdAt、memberId、avatar、parentId、replyTo，不含邮箱。历史游客 memberId 为 null，parentId 是同一文章内已通过审核的评论 ID。

阅读统计日期以 Asia/Shanghai 计算，daily 为近 30 天有数据的日期及 count；posts 为前 20 篇文章及 count。它不代表独立访客。所有文章关联公开接口对草稿和未来日期文章返回 404，RSS 和站点地图遵守同一公开范围。

## 音乐与追番

以下路径均以 `/api/v1` 为前缀；所有管理写操作需要管理员会话及 CSRF。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | /anime | 仅公开显示的追番记录 |
| GET / POST | /admin/anime | 查询全部 / 新建追番记录 |
| PUT | /admin/anime/{id} | 更新记录，携带 version |
| DELETE | /admin/anime/{id}?version=N | 删除记录 |
| GET | /music | 历史 QQ 歌单配置接口，当前前端不使用 |
| GET / PUT | /admin/music | 历史 QQ 配置接口，当前后台页面不使用 |
| POST | /admin/music/import | 历史 QQ 导入接口，当前后台页面不使用 |
| DELETE | /admin/music?version=N | 历史 QQ 清空接口，当前后台页面不使用 |

追番状态为 WATCHING、PLANNED、COMPLETED、ON_HOLD、DROPPED；总集数 0 表示未知，评分 0 表示未评分。已完成状态要求已知总集数且全部看完。本地播放器从构建时生成的 `virtual:local-music` 模块获取歌曲列表，读取 `/music/{文件名}` 静态资源，不调用上述历史音乐接口；数据库中的旧歌单和接口保留兼容。本次未改变历史接口的服务端行为。

## 项目、专题与说说

以下路径均以 `/api/v1` 为前缀，`section` 仅允许 `projects`、`series`、`moments`。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | /{section}?page=1&size=12&keyword= | 公开列表，只返回 visible=true 且已到发布日期的内容 |
| GET | /{section}/{id} | 公开详情，仅 projects、series；未公开或不存在返回 404 |
| GET | /admin/{section}?page=1&size=12&keyword= | 管理列表，包含隐藏内容 |
| POST | /admin/{section} | 新建内容 |
| PUT | /admin/{section}/{id} | 修改内容，携带当前 version |
| DELETE | /admin/{section}/{id}?version=N | 删除内容及关联 |

分页 size 为 1–50，keyword 最长 100 字。写请求字段：title、summary、content、cover、status、technologies（字符串数组）、sourceUrl、demoUrl、images（有序地址数组）、postIds（有序文章 ID 数组）、publishedAt（YYYY-MM-DD）、sortOrder、visible、version。响应将 postIds 展开为 posts（id、title、slug、published），并增加 id、section。前台 posts 只包含已经公开的文章。

项目状态 IN_PROGRESS / COMPLETED / ARCHIVED，专题 ONGOING / COMPLETED，说说为空字符串。标题最多 200 字，说说标题可为空；摘要最多 500 字；项目和专题正文最多 20000 字，说说正文为 1–5000 字；技术栈最多 20 项、每项 50 字，关联文章最多 100 篇且不能重复，说说图片最多 9 张。技术栈与源码、演示链接仅用于项目；多图仅用于说说，说说不支持文章关联。封面与图片沿用已有图片地址校验，项目外链仅允许 HTTP(S)。管理接口需管理员会话，写操作需 CSRF；版本过期返回 409 并保留数据库原内容。

## 会员与互动（V11）

以下均以 `/api/v1` 为前缀。写操作均需 CSRF；`/members/` 下除 config、session、email、register、login、reset 外需要 MEMBER 角色，`/admin/` 仍只允许 ADMIN。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | /members/config | mailEnabled；未启用不能申请邮件 |
| GET | /members/session | 当前用户资料或 null，游客/管理员/失效用户正常返回 null |
| POST | /members/email | email、purpose=REGISTER/RESET；发送验证码，统一成功提示，不返回验证码 |
| POST | /members/register | email、code（6 位数字字符串）、nickname、password；验证后建号，不自动登录 |
| POST | /members/login | email、password；轮换会话与 CSRF |
| POST | /members/reset | email、code（6 位数字字符串）、password；重置并使旧登录失效 |
| GET / PUT | /members/me | 读取/修改资料；写 nickname、avatar、bio、version |
| DELETE | /members/me | password；验证后注销并清除个人资料 |
| PUT | /members/password | currentPassword、password；改密后退出所有旧会话 |
| GET | /people/{id} | 公开 id、nickname、avatar、bio；封禁/注销账号不提供公开资料 |
| GET | /members/comments?page=1 | 本人评论，含审核状态和 version |
| DELETE | /members/comments/{id}?version=N | 只允许本人删除 |
| GET | /members/notifications?page=1 | 公开回复的通知（含注册用户待审核回复）；拒绝的回复、隐藏/未来文章不提供链接 |
| PATCH | /members/notifications/{id} | 仅本人标为已读 |
| POST | /comments/{id}/reports | reason 最多 500 字；需正常用户，同一用户同一评论不可重复举报 |
| GET | /admin/members?keyword=&page=1 | 管理用户列表，含邮箱与版本 |
| PATCH | /admin/members/{id} | status=ACTIVE/MUTED/BANNED、version |
| GET / PATCH | /admin/reports、/admin/reports/{id} | 举报列表 / 标为已处理 |
| GET / POST | /guestbook?page=1 | 公开便签列表 / 游客或正常注册用户提交待审核便签；POST 需 CSRF，content 最多 500 字、color、可选 website 诱捕字段；游客 memberId=null、author=匿名用户 |
| GET | /members/guestbook?page=1 | 本人所有审核状态的便签 |
| DELETE | /members/guestbook/{id}?version=N | 只允许本人删除 |
| GET | /admin/guestbook?page=1 | 所有便签及审核状态 |
| PATCH | /admin/guestbook/{id} | status=PENDING/APPROVED/REJECTED、version |
| DELETE | /admin/guestbook/{id}?version=N | 管理员永久删除 |

个人/管理用户资料为 id、email、nickname、avatar、bio、status、version，不含密码。所有分页每页 20 条。密码 10–72 字符且 UTF-8 编码最多 72 字节；邮箱最多 254 字符，统一去首尾空白并转为小写。便签写 content（1–500 字）、color（lavender/peach/mint/sky）。邮箱验证码为 6 位数字字符串（保留前导零），10 分钟有效，绑定申请邮箱与用途，数据库只存组合哈希且只用一次。邮件不含跳转链接，重新获取后旧码失效。每邮箱跨来源、跨用途十分钟最多验证 10 次。完整部署配置、限流与注销行为见 `docs/members.md`。

## 本地音乐上传与资料编辑

以下路径均以 `/api/v1` 为前缀。写操作仅 ADMIN 可用，并要求 CSRF。资料保存在音乐目录的 `library.json`，无需 SQL 变更。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | /music/local | 公开 name、enabled、tracks |
| GET | /admin/music/local | 管理歌曲列表 |
| POST | /admin/music/local | multipart file，音频最多 50MB，返回完整列表，201 |
| PUT | /admin/music/local/{id} | JSON title、artist（各最多120字，title必填）、version；过期409 |
| POST | /admin/music/local/{id}/cover?version=N | multipart file，封面 JPEG/PNG，最多5MB/2000万像素，重新编码；过期409 |
| GET | /music/local/{id}/audio | 音频 Resource，支持 Range/206 |
| GET | /music/local/{id}/cover?v=N | 歌曲封面；无封面404，v为缓存版本 |

歌曲字段为 id、title、artist、audioUrl、cover、version。文件路径由服务端根据 id 查找，不接受任意用户路径。后台读取/写入不再使用旧 QQ 接口，旧接口仅保留兼容。
