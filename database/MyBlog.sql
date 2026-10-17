-- MyBlog 数据库唯一 SQL 文件（MySQL 8.0.16+，UTF-8）
-- 用法：停止后端，在 MySQL 客户端执行整个文件，成功后再启动 MyBlogApplication。
-- 新库：创建 MyBlog、全部表和示例文章；管理员密码由后端首次启动时初始化。
-- 已有库：补齐缺失的表、版本列和索引，不覆盖文章、管理员密码、站点设置或歌单。
-- 可重复执行；示例文章只在首次创建 posts 表时插入，不恢复已经删除的文章。
-- 执行账号需要 CREATE / ALTER / INDEX / CREATE ROUTINE 等权限；先备份已有数据库。
-- 不包含删库、删表操作。历史 flyway_schema_history 表保留但不再使用。
-- ------------------------
-- 历史更新记录（当前文件已合并 V1-V14，下面的记录不代表可单独执行的更新块）
-- [V1-V2] 基础文章、分类、标签、友链与示例内容。
-- [V3-V4] 管理员表与憨Ant的初始资料。
-- [V5] 文章编辑版本与后台排序索引。
-- [V6] 图片元数据。
-- [V7] 分类/标签/友链版本与站点设置。
-- [V8] 评论与阅读统计。
-- [V9 | 2026-10-15] 追番记录、QQ 公开歌单配置与歌曲元数据。
-- [V10 | 2026-10-15] 项目展示、文章专题、说说及有序文章/图片关联；不插入个人示例内容。
-- [V11 | 2026-10-15] 邮箱验证会员、一次性令牌、评论账号与回复、通知、举报和留言墙。
-- [V12 | 2026-10-15] 留言墙支持匿名便签，允许 guestbook_entries.member_id 为空。
-- [V13 | 2026-10-16] 取消访客账号，评论新增私有邮箱和可选网址；旧会员表保留历史引用。
-- [V14 | 2026-10-17] 独立相册、有序照片及公开状态，不插入示例相册。
-- [整理 | 2026-10-15] 合并为唯一文件，移除 Flyway，改为手动执行。
-- ------------------------
-- 后续维护约定：在本文件末尾追加基于已有数据库的增量更新，不修改已有 SQL。
-- 每次更新用“-- ------------------------”分隔，注明版本、日期、用途和执行范围。
-- 已执行当前版本的数据库，后续仅执行尚未执行的完整更新块。
-- 当前 V13 的升级语句仍位于第二节存储过程内，不能只选取其中的 IF 片段执行。

-- ------------------------
-- 执行环境：MySQL 字符集、数据库选择和首次安装标记。
-- @mysql-only-begin
SET NAMES utf8mb4;
CREATE DATABASE IF NOT EXISTS MyBlog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE MyBlog;
SET @myblog_new_install = NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'posts'
);
-- @mysql-only-end

-- ------------------------
-- 一、最新完整表结构（合并至 V13）。已有表与数据保持不变。
-- CREATE TABLE IF NOT EXISTS 只补建缺失的表；已有表的字段升级由第二节处理。
CREATE TABLE IF NOT EXISTS showcase_entries (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    section VARCHAR(16) NOT NULL,
    title VARCHAR(200) NOT NULL DEFAULT '',
    summary VARCHAR(500) NOT NULL DEFAULT '',
    content LONGTEXT NOT NULL,
    cover VARCHAR(1000) NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT '',
    technologies VARCHAR(2000) NOT NULL DEFAULT '[]',
    source_url VARCHAR(1000) NOT NULL DEFAULT '',
    demo_url VARCHAR(1000) NOT NULL DEFAULT '',
    published_at DATE NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    visible BOOLEAN NOT NULL DEFAULT FALSE,
    version INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_showcase_section CHECK (section IN ('projects','series','moments')),
    INDEX idx_showcase_public (section, visible, sort_order, published_at, id)
);
CREATE TABLE IF NOT EXISTS categories (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(64) NOT NULL UNIQUE,
    version INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tags (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(64) NOT NULL UNIQUE,
    version INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS posts (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(160) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    excerpt VARCHAR(500) NOT NULL,
    content LONGTEXT NOT NULL,
    cover VARCHAR(500) NOT NULL DEFAULT '',
    category_id BIGINT NOT NULL,
    published_at DATE NOT NULL,
    reading_minutes INT NOT NULL DEFAULT 1,
    pinned BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_posts_category FOREIGN KEY (category_id) REFERENCES categories(id),
    CONSTRAINT chk_posts_status CHECK (status IN ('DRAFT', 'PUBLISHED')),
    CONSTRAINT chk_posts_reading_minutes CHECK (reading_minutes > 0),
    INDEX idx_posts_publication (status, pinned, published_at, id),
    INDEX idx_posts_category (category_id, status, published_at),
    INDEX idx_posts_admin_updated (updated_at, id)
);
CREATE TABLE IF NOT EXISTS post_tags (
    post_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    PRIMARY KEY (post_id, tag_id),
    CONSTRAINT fk_post_tags_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_post_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    INDEX idx_post_tags_tag (tag_id, post_id)
);
CREATE TABLE IF NOT EXISTS showcase_posts (
    entry_id BIGINT NOT NULL,
    post_id BIGINT NOT NULL,
    sort_order INT NOT NULL,
    PRIMARY KEY (entry_id, post_id),
    CONSTRAINT fk_showcase_posts_entry FOREIGN KEY (entry_id) REFERENCES showcase_entries(id) ON DELETE CASCADE,
    CONSTRAINT fk_showcase_posts_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS showcase_images (
    entry_id BIGINT NOT NULL,
    sort_order INT NOT NULL,
    url VARCHAR(1000) NOT NULL,
    PRIMARY KEY (entry_id, sort_order),
    CONSTRAINT fk_showcase_images_entry FOREIGN KEY (entry_id) REFERENCES showcase_entries(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS friends (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(300) NOT NULL,
    url VARCHAR(500) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    visible BOOLEAN NOT NULL DEFAULT TRUE,
    version INT NOT NULL DEFAULT 0
);


CREATE TABLE IF NOT EXISTS admin_users (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS media_files (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(64) NOT NULL UNIQUE,
    original_name VARCHAR(200) NOT NULL,
    content_type VARCHAR(32) NOT NULL,
    size_bytes BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS site_settings (
    id INT NOT NULL PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    title VARCHAR(100) NOT NULL,
    subtitle VARCHAR(200) NOT NULL,
    author VARCHAR(64) NOT NULL,
    bio VARCHAR(200) NOT NULL,
    description VARCHAR(500) NOT NULL,
    about_content TEXT NOT NULL,
    avatar VARCHAR(500) NOT NULL,
    public_url VARCHAR(500) NOT NULL,
    comments_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    version INT NOT NULL DEFAULT 0
);


CREATE TABLE IF NOT EXISTS members (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(254) UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    nickname VARCHAR(64) NOT NULL,
    avatar VARCHAR(1000) NOT NULL DEFAULT '',
    bio VARCHAR(300) NOT NULL DEFAULT '',
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    session_version INT NOT NULL DEFAULT 0,
    version INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_members_status CHECK (status IN ('ACTIVE','MUTED','BANNED','DELETED'))
);
CREATE TABLE IF NOT EXISTS member_tokens (
    token_hash VARCHAR(64) PRIMARY KEY,
    email VARCHAR(254) NOT NULL,
    purpose VARCHAR(16) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_member_tokens_email (email,purpose,created_at)
);
CREATE TABLE IF NOT EXISTS comments (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    post_id BIGINT NOT NULL,
    author VARCHAR(64) NOT NULL,
    content VARCHAR(2000) NOT NULL,
    guest_email VARCHAR(254) NOT NULL DEFAULT '',
    guest_url VARCHAR(500) NOT NULL DEFAULT '',
    status VARCHAR(16) NOT NULL DEFAULT 'APPROVED',
    version INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    member_id BIGINT,
    parent_id BIGINT,
    CONSTRAINT fk_comments_member FOREIGN KEY (member_id) REFERENCES members(id),
    CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    CONSTRAINT chk_comments_status CHECK (status IN ('PENDING','APPROVED','REJECTED')),
    INDEX idx_comments_public (post_id,status,id),
    INDEX idx_comments_member (member_id,id),
    INDEX idx_comments_moderation (status,id)
);
CREATE TABLE IF NOT EXISTS member_notifications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    member_id BIGINT NOT NULL,
    comment_id BIGINT NOT NULL,
    message VARCHAR(300) NOT NULL,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notice_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    CONSTRAINT fk_notice_comment FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    UNIQUE (member_id,comment_id),
    INDEX idx_member_notifications (member_id,id)
);
CREATE TABLE IF NOT EXISTS comment_reports (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    member_id BIGINT NOT NULL,
    comment_id BIGINT NOT NULL,
    reason VARCHAR(500) NOT NULL,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_report_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    CONSTRAINT fk_report_comment FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    UNIQUE (member_id,comment_id)
);
CREATE TABLE IF NOT EXISTS guestbook_entries (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    member_id BIGINT NULL,
    content VARCHAR(500) NOT NULL,
    color VARCHAR(16) NOT NULL DEFAULT 'lavender',
    status VARCHAR(16) NOT NULL DEFAULT 'APPROVED',
    version INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_guestbook_member FOREIGN KEY (member_id) REFERENCES members(id),
    CONSTRAINT chk_guestbook_status CHECK (status IN ('PENDING','APPROVED','REJECTED'))
);
CREATE TABLE IF NOT EXISTS post_views (
    post_id BIGINT NOT NULL,
    view_date DATE NOT NULL,
    view_count BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (post_id,view_date),
    CONSTRAINT fk_views_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS anime_entries (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    cover VARCHAR(1000) NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL,
    watched_episodes INT NOT NULL DEFAULT 0,
    total_episodes INT NOT NULL DEFAULT 0,
    score DECIMAL(3,1) NOT NULL DEFAULT 0,
    note VARCHAR(2000) NOT NULL DEFAULT '',
    source_url VARCHAR(1000) NOT NULL DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0,
    visible BOOLEAN NOT NULL DEFAULT TRUE,
    version INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_anime_progress CHECK (watched_episodes >= 0 AND total_episodes >= 0 AND (total_episodes = 0 OR watched_episodes <= total_episodes)),
    CONSTRAINT ck_anime_score CHECK (score >= 0 AND score <= 10),
    CONSTRAINT ck_anime_status CHECK (status IN ('PLANNED','WATCHING','COMPLETED','ON_HOLD','DROPPED')),
    INDEX idx_anime_visible_order (visible, sort_order, id)
);
CREATE TABLE IF NOT EXISTS music_settings (
    id INT NOT NULL PRIMARY KEY,
    playlist_id VARCHAR(32) NOT NULL DEFAULT '',
    name VARCHAR(100) NOT NULL DEFAULT '耳边的小世界',
    profile_url VARCHAR(1000) NOT NULL DEFAULT '',
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    version INT NOT NULL DEFAULT 0
);


CREATE TABLE IF NOT EXISTS music_tracks (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(300) NOT NULL,
    artist VARCHAR(300) NOT NULL,
    audio_url VARCHAR(2000) NOT NULL,
    cover VARCHAR(2000) NOT NULL DEFAULT '',
    source_url VARCHAR(1000) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0
);

-- ------------------------
-- 二、已有库兼容升级（历史合并块）：补齐缺失列与索引，不重置已有版本。
-- 包含 V12 匿名留言升级：将 guestbook_entries.member_id 改为允许 NULL。
-- 本节执行范围：从 DELIMITER $$ 开始，到 DELIMITER ; 结束，须作为完整块执行。
-- 执行前需选中 MyBlog 数据库，并确保第一节所需的表已经存在。
-- @mysql-only-begin
DELIMITER $$
DROP PROCEDURE IF EXISTS myblog_apply_schema_20261015$$
CREATE PROCEDURE myblog_apply_schema_20261015()
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'comments' AND column_name = 'guest_email') THEN
        ALTER TABLE comments ADD COLUMN guest_email VARCHAR(254) NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'comments' AND column_name = 'guest_url') THEN
        ALTER TABLE comments ADD COLUMN guest_url VARCHAR(500) NOT NULL DEFAULT '';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'guestbook_entries' AND column_name = 'member_id' AND is_nullable = 'NO') THEN
        ALTER TABLE guestbook_entries MODIFY COLUMN member_id BIGINT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'posts' AND column_name = 'version') THEN
        ALTER TABLE posts ADD COLUMN version INT NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'comments' AND column_name = 'member_id') THEN
        ALTER TABLE comments ADD COLUMN member_id BIGINT NULL;
        ALTER TABLE comments ADD CONSTRAINT fk_comments_member FOREIGN KEY (member_id) REFERENCES members(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'comments' AND column_name = 'parent_id') THEN
        ALTER TABLE comments ADD COLUMN parent_id BIGINT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'categories' AND column_name = 'version') THEN
        ALTER TABLE categories ADD COLUMN version INT NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'tags' AND column_name = 'version') THEN
        ALTER TABLE tags ADD COLUMN version INT NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'friends' AND column_name = 'version') THEN
        ALTER TABLE friends ADD COLUMN version INT NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'posts' AND index_name = 'idx_posts_publication') THEN
        CREATE INDEX idx_posts_publication ON posts(status, pinned, published_at, id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'posts' AND index_name = 'idx_posts_category') THEN
        CREATE INDEX idx_posts_category ON posts(category_id, status, published_at);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'post_tags' AND index_name = 'idx_post_tags_tag') THEN
        CREATE INDEX idx_post_tags_tag ON post_tags(tag_id, post_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'comments' AND index_name = 'idx_comments_public') THEN
        CREATE INDEX idx_comments_public ON comments(post_id,status,id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'comments' AND index_name = 'idx_comments_member') THEN
        CREATE INDEX idx_comments_member ON comments(member_id,id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'comments' AND index_name = 'idx_comments_moderation') THEN
        CREATE INDEX idx_comments_moderation ON comments(status,id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'anime_entries' AND index_name = 'idx_anime_visible_order') THEN
        CREATE INDEX idx_anime_visible_order ON anime_entries(visible, sort_order, id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'posts' AND index_name = 'idx_posts_admin_updated') THEN
        CREATE INDEX idx_posts_admin_updated ON posts(updated_at, id);
    END IF;
END$$
CALL myblog_apply_schema_20261015()$$
DROP PROCEDURE myblog_apply_schema_20261015$$
DELIMITER ;
-- @mysql-only-end

-- ------------------------
-- 三、首次建库的示例文章与友链。已有数据库跳过。
-- 本节依赖文件开头设置的 @myblog_new_install，不作为已有库的增量更新单独执行。
-- @mysql-only-begin
DELIMITER $$
DROP PROCEDURE IF EXISTS myblog_seed_new_database_20261015$$
CREATE PROCEDURE myblog_seed_new_database_20261015()
BEGIN
    IF @myblog_new_install THEN
-- @mysql-only-end
INSERT INTO categories (id, name) VALUES (1, '随笔'), (2, '技术'), (3, '生活');
INSERT INTO tags (id, name) VALUES
    (1, '生活'), (2, '博客'), (3, 'Java'), (4, 'Spring Boot'),
    (5, '日常'), (6, 'React'), (7, '前端'), (8, 'MySQL'), (9, '数据库');

INSERT INTO posts (id, slug, title, excerpt, content, cover, category_id, published_at, reading_minutes, pinned, status) VALUES
(1, 'hello-world', '你好，世界。这里是我的数字花园',
'在互联网的一隅，建一个属于自己的小小空间。记录成长，也收藏生活里闪闪发光的瞬间。',
'## 写在开始之前

欢迎来到「憨Ant的小站」。我是憨Ant，这里用来记录学习与生活。

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
    (1, 'TypeScript', 'JavaScript 的类型系统与开发工具。', 'https://www.typescriptlang.org/', 1, TRUE),
    (2, 'React', '用于构建用户界面的 JavaScript 库。', 'https://react.dev/', 2, TRUE),
    (3, 'Spring', '构建 Java 应用的工具与生态。', 'https://spring.io/', 3, TRUE);

-- @mysql-only-begin
    END IF;
END$$
CALL myblog_seed_new_database_20261015()$$
DROP PROCEDURE myblog_seed_new_database_20261015$$
DELIMITER ;
-- @mysql-only-end

-- ------------------------
-- 四、只补充缺失的单例配置，不覆盖已有设置。
INSERT INTO site_settings(id, name, title, subtitle, author, bio, description, about_content, avatar, public_url)
SELECT 1, '憨Ant', '憨Ant的小站', '记录学习，也记录生活。', '憨Ant', '记录学习与生活', '这里是憨Ant的个人博客，欢迎来看看。', '这里用来记录学习笔记、项目实践和日常生活。欢迎常来。', '', 'http://127.0.0.1:5173'
WHERE NOT EXISTS (SELECT 1 FROM site_settings WHERE id = 1);
INSERT INTO music_settings(id) SELECT 1
WHERE NOT EXISTS (SELECT 1 FROM music_settings WHERE id = 1);

-- ------------------------
-- 后续增量更新追加区
-- 当前基线：V13（2026-10-16）；以下追加 V14。
-- 下次更新在文件尾部另起分隔块，注明版本、日期、前置版本和具体用途。
-- 每个更新块应可在对应已有数据库上完整执行，不依赖前文的临时变量或存储过程。

-- ------------------------
-- V14 | 2026-10-17 | 相册与照片；适用于 V13 已有库及全新安装，可重复执行。
CREATE TABLE IF NOT EXISTS albums (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description VARCHAR(2000) NOT NULL DEFAULT '',
    cover VARCHAR(1000) NOT NULL DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0,
    visible BOOLEAN NOT NULL DEFAULT FALSE,
    version INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_albums_visibility_sort (visible, sort_order, id)
);
CREATE TABLE IF NOT EXISTS album_photos (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    album_id BIGINT NOT NULL,
    url VARCHAR(1000) NOT NULL,
    caption VARCHAR(500) NOT NULL DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_album_photos_album FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
    INDEX idx_album_photos_sort (album_id, sort_order, id)
);
