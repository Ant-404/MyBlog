ALTER TABLE categories ADD COLUMN version INT NOT NULL DEFAULT 0;
ALTER TABLE tags ADD COLUMN version INT NOT NULL DEFAULT 0;
ALTER TABLE friends ADD COLUMN version INT NOT NULL DEFAULT 0;
CREATE TABLE site_settings (
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
INSERT INTO site_settings(id, name, title, subtitle, author, bio, description, about_content, avatar, public_url)
VALUES (1, '憨Ant', '憨Ant的小站', '记录学习，也记录生活。', '憨Ant', '记录学习与生活', '这里是憨Ant的个人博客，欢迎来看看。', '这里用来记录学习笔记、项目实践和日常生活。欢迎常来。', '', 'http://127.0.0.1:5173');
