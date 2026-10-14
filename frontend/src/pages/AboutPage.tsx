import { Code2, Coffee, BookOpen } from 'lucide-react'
import { useSite } from '../contexts/SiteContext'
import { usePageTitle } from '../hooks/usePageTitle'
import { renderMarkdown } from '../utils/markdown'

export default function AboutPage() {
  const site = useSite()
  usePageTitle('关于')
  return (
    <section className="card content-page about-page">
      <span className="eyebrow">NICE TO MEET YOU</span>
      <h1>
        你好，我是 {site.author}
        <span className="heading-dot">.</span>
      </h1>
      <p className="about-intro">欢迎来到我的个人博客。</p>
      <div className="prose">
        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(site.aboutContent) }} />
        <h2>这里的内容</h2>
      </div>
      <div className="about-topics">
        <div>
          <Code2 size={24} />
          <h3>技术笔记</h3>
          <p>记录学习过程与解决问题的方法。</p>
        </div>
        <div>
          <Coffee size={24} />
          <h3>生活碎片</h3>
          <p>留下一些日常的片段。</p>
        </div>
        <div>
          <BookOpen size={24} />
          <h3>阅读与思考</h3>
          <p>整理阅读笔记与自己的想法。</p>
        </div>
      </div>
      <div className="callout">欢迎常来。—— {site.author}</div>
    </section>
  )
}
