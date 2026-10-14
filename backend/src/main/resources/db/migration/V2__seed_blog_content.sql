INSERT INTO categories (id, name) VALUES (1, '随笔'), (2, '技术'), (3, '生活');
INSERT INTO tags (id, name) VALUES
    (1, '生活'), (2, '博客'), (3, 'Java'), (4, 'Spring Boot'),
    (5, '日常'), (6, 'React'), (7, '前端'), (8, 'MySQL'), (9, '数据库');

INSERT INTO posts (id, slug, title, excerpt, content, cover, category_id, published_at, reading_minutes, pinned, status) VALUES
(1, 'hello-world', '你好，世界。这里是我的数字花园',
'在互联网的一隅，建一个属于自己的小小空间。记录成长，也收藏生活里闪闪发光的瞬间。',
'## 写在开始之前

欢迎来到「山间来信」。这是我的个人博客，也是一个慢慢生长的数字花园。

## 为什么开始记录

学习时遇到的问题，项目里做过的选择，还有生活中的小小惊喜，都值得留下来。记录让模糊的想法变得清楚，也给未来的自己留下一些路标。

## 这里会写些什么

- Java 与 Spring Boot 的实践笔记
- React 前端开发中的经验
- 数据库设计与查询思考
- 阅读、散步与日常生活

> 不必等到完美才开始。今天的一小步，也值得被记录。
', '/images/landscape.svg', 1, '2026-10-14', 3, TRUE, 'PUBLISHED'),
(2, 'spring-boot-notes', 'Spring Boot：从一个接口开始',
'从请求到响应，梳理 Controller、Service 与 Repository 的边界，让每一行代码都有自己的位置。',
'## 一个请求的旅程

浏览器请求 `/api/v1/posts`，Controller 接收参数，Service 组织业务逻辑，Repository 查询数据库，最后返回统一的 JSON 响应。

## 保持职责清晰

Controller 负责 HTTP 参数和响应；Service 负责业务规则和事务；Repository 负责 SQL 与数据映射。不要把数据库查询直接写在 Controller 里。

```java
@GetMapping("/posts")
public ApiResponse<?> list() {
    return ApiResponse.success(postService.list());
}
```

上面的代码只展示职责边界，实际项目还需要分页参数与校验。

## 让错误也有一致的出口

参数错误返回 400，资源不存在返回 404，数据库不可用返回 503。前端就能据此展示明确的状态，并提供重试入口。
', '/images/code.svg', 2, '2026-10-12', 8, FALSE, 'PUBLISHED'),
(3, 'autumn-walk', '秋日散步，和一些不必着急的事',
'风开始变凉，树叶慢慢换了颜色。暂时合上电脑，去看看屏幕以外的世界。',
'## 暂时合上电脑

傍晚出门时，风已经有了秋天的凉意。路边的树叶有些还是绿色，有些已经变成浅黄。

## 不必一直赶路

散步没有明确的目的地。走到河边，停下来看看水面；遇到一家小店，就买一杯热饮。没有完成什么任务，却觉得脑子里的事情变得轻了一点。

> 今天不必把所有问题都解决。留一点空间，明天再继续。

## 把步子放慢

生活里有许多事需要时间。项目可以一点一点完善，知识可以一页一页读懂，树叶也会按照自己的节奏换颜色。
', '/images/autumn.svg', 3, '2026-10-08', 4, FALSE, 'PUBLISHED'),
(4, 'react-component-design', '写给未来的自己：React 组件设计笔记',
'好的组件不是越小越好，而是边界清楚。聊聊页面拆分、状态管理，以及那些容易忽略的小细节。',
'## 先划清页面边界

每个路由对应一个页面文件。页面负责组织内容；文章卡片、导航和侧栏作为公共组件复用。

## 从数据流开始

用 props 传入数据，用事件回调传出用户操作。只有一个组件使用的状态，就留在这个组件内。

```tsx
function Greeting({ name }: { name: string }) {
  return <p>你好，{name}</p>
}
```

## 请求状态也是界面的一部分

加载、失败、空内容和正常内容都应该有对应的展示。切换页面时，要避免旧请求的结果覆盖新页面的数据。

## 给未来留出空间

把请求放进 api，把复用逻辑放进 hooks，把类型放进 types。需要扩展时，先找到明确的责任边界。
', '/images/code.svg', 2, '2026-10-03', 6, FALSE, 'PUBLISHED'),
(5, 'quiet-weekend', '给周末留一段空白',
'一本书，一杯咖啡，一段没有安排的午后。有时候，什么都不做也是一种充电。',
'## 没有安排的午后

早上醒来，没有急着打开待办列表。给自己煮了一杯咖啡，把读到一半的书翻开。

## 留一点空白

工作日习惯了用完成了多少事情来衡量一天。到了周末，想试着用另一种方式：有没有认真吃饭，有没有睡够，有没有看见窗外的天。

> 留白不是浪费，它让下一段文字有了呼吸的地方。

## 慢慢来

下午去附近走了走，回来时天还亮着。这样的周末很普通，但已经足够。
', '/images/landscape.svg', 1, '2026-09-26', 2, FALSE, 'PUBLISHED'),
(6, 'mysql-index-notes', 'MySQL 索引，从理解到实践',
'把查询交给数据库之前，先想清楚数据如何被找到。用简单的例子理解索引与查询计划。',
'## 索引是一条查找路径

没有合适的索引时，数据库可能需要扫描许多行。索引通过额外的数据结构帮助定位记录，但它也增加了存储与写入成本。

## 从查询条件出发

博客列表经常按发布状态筛选，再按置顶与日期排序。因此索引的字段顺序应该结合真实查询，而不是给所有字段都单独创建索引。

```sql
EXPLAIN SELECT id, title
FROM posts
WHERE status = ''PUBLISHED''
ORDER BY pinned DESC, published_at DESC, id DESC
LIMIT 4;
```

## 观察执行计划

关注实际使用的 key、扫描行数以及是否额外排序。数据量、选择性和查询形式都会影响结果。

## 搜索需要另外考虑

`LIKE ''%关键词%''` 适合小规模起步，但普通 B-tree 索引通常无法高效处理它。数据增长后可以评估全文检索或独立搜索服务。
', '/images/code.svg', 2, '2026-09-18', 7, FALSE, 'PUBLISHED');

INSERT INTO post_tags (post_id, tag_id) VALUES
    (1, 1), (1, 2), (2, 3), (2, 4), (3, 1), (3, 5),
    (4, 6), (4, 7), (5, 5), (6, 8), (6, 9);

INSERT INTO friends (id, name, description, url, sort_order, visible) VALUES
    (1, 'Mizuki', '本项目的前端设计灵感来源。', 'https://github.com/matsuzaka-yuki/Mizuki', 1, TRUE),
    (2, 'React', '用于构建用户界面的 JavaScript 库。', 'https://react.dev/', 2, TRUE),
    (3, 'Spring', '构建 Java 应用的工具与生态。', 'https://spring.io/', 3, TRUE);
