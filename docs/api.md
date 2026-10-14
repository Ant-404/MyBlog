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
| GET | /posts/{slug}/comments?page=N | 已通过评论，每页 20 条 |
| POST | /posts/{slug}/comments | author、content、website，返回 202，默认待审核；需 CSRF，可匿名 |
| GET | /admin/comments?status=PENDING&page=1 | 审核列表，每页 20 条，status 可为空或 PENDING/APPROVED/REJECTED |
| PATCH | /admin/comments/{id} | status、version，版本过期返回 409 |
| DELETE | /admin/comments/{id}?version=N | 永久删除评论 |
| GET | /admin/statistics | totalReads、todayReads、pendingComments、daily、posts |
| GET | /feed.xml | RSS XML，最新 50 篇公开摘要；另有根路径 /rss.xml |
| GET | /sitemap.xml | XML 站点地图；另有根路径 /sitemap.xml |

表中除根路径说明外均以 `/api/v1` 为前缀。评论 author 最长 64，content 最长 2000，按纯文字展示；website 是应留空的诱捕字段。评论关闭时提交返回 400，每个来源地址 10 分钟最多 5 次，超限返回 429 RATE_LIMITED。管理评论增加 slug、postTitle、status、version；公开评论仅返回 id、author、content、createdAt。

阅读统计日期以 Asia/Shanghai 计算，daily 为近 30 天有数据的日期及 count；posts 为前 20 篇文章及 count。它不代表独立访客。所有文章关联公开接口对草稿和未来日期文章返回 404，RSS 和站点地图遵守同一公开范围。
