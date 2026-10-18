export interface SiteNavItem {
  label: string
  path: string
  children?: { label: string; path: string; description: string }[]
}

export const site = {
  name: '憨Ant',
  title: '憨Ant的小站',
  subtitle: '记录学习，也记录生活。',
  author: '憨Ant',
  bio: '记录学习与生活',
  description: '这里是憨Ant的个人博客，欢迎来看看。',
  nav: [
    { label: '首页', path: '/' },
    { label: '文章', path: '/categories' },
    { label: '项目', path: '/projects' },
    { label: '说说', path: '/moments' },
    {
      label: '生活',
      path: '/albums',
      children: [
        { label: '相册', path: '/albums', description: '收藏生活里的光与影' },
        { label: '追番', path: '/anime', description: '记录喜欢的故事' },
      ],
    },
    { label: '留言墙', path: '/guestbook' },
    { label: '友链', path: '/friends' },
    { label: '关于', path: '/about' },
  ] satisfies SiteNavItem[],
}
