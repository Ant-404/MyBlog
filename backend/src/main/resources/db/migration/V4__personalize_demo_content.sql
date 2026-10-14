-- Only replace known starter text. Preserve any articles the owner has edited.
UPDATE posts SET content = REPLACE(content,
    '欢迎来到「山间来信」。这是我的个人博客，也是一个慢慢生长的数字花园。',
    '欢迎来到「憨Ant的小站」。我是憨Ant，这里用来记录学习与生活。')
WHERE slug = 'hello-world' AND content LIKE '%欢迎来到「山间来信」。这是我的个人博客，也是一个慢慢生长的数字花园。%';

-- The original theme is a design credit, not a personal friend of this blog owner.
UPDATE friends SET name = 'TypeScript', description = 'JavaScript 的类型系统与开发工具。',
    url = 'https://www.typescriptlang.org/'
WHERE name = 'Mizuki' AND url = 'https://github.com/matsuzaka-yuki/Mizuki';
