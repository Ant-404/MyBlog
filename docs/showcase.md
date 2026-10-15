# 项目展示、文章专题与说说

本阶段在现有 React / Spring Boot 工程内增加三个内容模块，均由后台维护并保存到数据库。没有预填虚构的个人项目或日常记录，尚未发布内容时前台显示空状态。

## 启用

1. 停止后端并备份数据库。
2. 在 MySQL 客户端执行整个 `database/MyBlog.sql`，其中 V10 增加 `showcase_entries`、`showcase_posts`、`showcase_images`。不需要另建迁移文件。
3. 重新启动后端；前端开发服务自动更新，正式部署需重新构建并发布前端。
4. 登录后台，从“项目展示”管理项目，从“内容组织 → 文章专题”整理系列文章。留言统一在“用户与社区 → 留言墙审核”管理。

本轮没有对本机 MySQL 执行 SQL，也没有重启当前正式连接 MySQL 的后端。自动化验证使用独立 H2 测试数据库。

## 页面与编辑

| 内容 | 前台 | 后台 | 功能 |
| --- | --- | --- | --- |
| 项目 | `/projects`、`/projects/:id` | `/admin/projects` | 封面、摘要、Markdown 介绍、技术栈、状态、源码与演示链接、关联文章 |
| 专题 | `/series`、`/series/:id` | 内容组织中的 `/admin/series` | 封面、Markdown 导读、连载状态、有序文章列表 |
| 历史说说 | `/moments` 跳转留言墙 | `/admin/moments` 跳转留言墙审核 | 已移除独立管理页面与导航入口，历史数据保留 |

新内容默认不公开。勾选“公开显示”且发布日期不晚于当天后，才进入前台列表；项目和专题详情也遵守这个范围。排序数字小的在前，同序号按发布日期和 ID 倒序排列。

项目和专题介绍最多 20000 字，说说最多 5000 字。技术栈用中英文逗号分隔，最多 20 项。项目状态为进行中、已完成、已归档；专题为连载中、已完结。说说按纯文字展示，项目与专题的 Markdown 使用现有 HTML 清理流程。

从图片库选择或上传封面和说说图片，也可填写图片地址。上下箭头调整图片顺序。被这些内容引用的上传图片（包括未公开内容）不能从图片库删除，需先移除引用。

专题和项目可搜索并关联已有文章，用上下箭头调整阅读顺序。后台能选择草稿和未来日期文章，前台只显示已经公开的文章；不公开其标题、链接等信息。文章删除后关联自动移除。

离开有未保存修改的编辑页会提示。并发编辑出现版本冲突时保留当前输入，需要自行核对后重新加载；本模块不提供文章编辑器的草稿自动保存。

列表支持关键词搜索和分页，前台条件保存在网址中。平板导航改为展开菜单，手机采用单列布局。站点地图包含三个列表页面及已公开项目、专题详情。

## 代码入口

- 前台共享展示：`frontend/src/components/blog/ShowcaseIndex.tsx`、`ShowcaseDetail.tsx`。
- 后台共享编辑：`frontend/src/components/admin/ShowcaseManager.tsx`。
- 页面样式：`frontend/src/styles/showcase.css`。
- API 与数据类型：`frontend/src/api/showcase.ts`、`frontend/src/types/showcase.ts`。
- 后端：`backend/src/main/java/com/myblog/showcase/`。
- 浏览器测试：`frontend/tests/showcase.spec.ts`；后端测试：`ShowcaseIntegrationTest.java`。
