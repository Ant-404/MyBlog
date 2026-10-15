import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link2, Maximize2, Minimize2 } from 'lucide-react'
import { useStoredPreference } from '../../hooks/useStoredPreference'

const switches = ['on', 'off'] as const

export default function ArticleReadingTools({ html }: { html: string }) {
  const [headings, setHeadings] = useState<{ id: string; text: string; level: number }[]>([])
  const [active, setActive] = useState('')
  const [progress, setProgress] = useState(0)
  const [sidebar, setSidebar] = useState<HTMLElement | null>(null)
  const [focus, setFocus] = useStoredPreference('myblog-reading-focus', 'off', switches)
  const [copied, setCopied] = useState('')
  useEffect(() => {
    setSidebar(document.getElementById('article-sidebar'))
  }, [])
  useEffect(() => {
    document.documentElement.dataset.readingFocus = focus
  }, [focus])
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(''), 2200)
    return () => clearTimeout(timer)
  }, [copied])
  useEffect(() => {
    const content = document.getElementById('article-content')
    const nodes = [...(content?.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6') || [])]
    setHeadings(
      nodes.map((node) => ({
        id: node.id,
        text: node.textContent || '',
        level: Number(node.tagName.slice(1)),
      })),
    )
    let frame = 0
    function measure() {
      if (!content) return
      const rect = content.getBoundingClientRect()
      const distance = Math.max(1, rect.height - window.innerHeight + 130)
      setProgress(Math.max(0, Math.min(100, ((130 - rect.top) / distance) * 100)))
      let current = nodes[0]?.id || ''
      for (const node of nodes) {
        if (node.getBoundingClientRect().top <= 150) current = node.id
      }
      setActive(current)
    }
    function onScroll() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }
    measure()
    const resize = new ResizeObserver(onScroll)
    if (content) resize.observe(content)
    let hash = location.hash.slice(1)
    try {
      hash = decodeURIComponent(hash)
    } catch {
      /* Ignore malformed URL escapes. */
    }
    const anchorFrame = requestAnimationFrame(() => {
      const target = hash ? document.getElementById(hash) : null
      if (target && content?.contains(target)) target.scrollIntoView({ behavior: 'instant' })
    })
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      cancelAnimationFrame(anchorFrame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      resize.disconnect()
    }
  }, [html])
  useEffect(() => {
    document.querySelectorAll<HTMLElement>('.article-toc nav').forEach((nav) => {
      const item = nav.querySelector<HTMLElement>('[aria-current]')
      if (!item || !nav.clientHeight) return
      const offset = item.offsetTop - nav.offsetTop
      if (offset < nav.scrollTop || offset + item.offsetHeight > nav.scrollTop + nav.clientHeight)
        nav.scrollTop = Math.max(0, offset - nav.clientHeight / 2)
    })
  }, [active])

  const links = headings.map((heading) => (
    <a
      key={heading.id}
      href={`#${heading.id}`}
      aria-current={active === heading.id ? 'location' : undefined}
      style={{ paddingLeft: `${Math.min(heading.level - 1, 3) * 12 + 8}px` }}
    >
      {heading.text}
    </a>
  ))
  return (
    <>
      <div className="article-toolbar">
        <button
          type="button"
          aria-pressed={focus === 'on'}
          onClick={() => setFocus(focus === 'on' ? 'off' : 'on')}
        >
          {focus === 'on' ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          {focus === 'on' ? '退出专注' : '专注阅读'}
        </button>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(location.href)
              setCopied('链接已复制')
            } catch {
              setCopied('请复制地址栏链接')
            }
          }}
        >
          <Link2 size={15} />
          分享文章
        </button>
        <span aria-live="polite">{copied}</span>
      </div>
      <div
        className="reading-progress"
        role="progressbar"
        aria-label="正文阅读进度"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${progress}%` }} />
      </div>
      {headings.length > 0 && (
        <details className="article-toc mobile-article-toc">
          <summary>文章目录</summary>
          <nav aria-label="文章目录">{links}</nav>
        </details>
      )}
      {sidebar &&
        headings.length > 0 &&
        createPortal(
          <section className="card article-toc desktop-article-toc">
            <h2>
              文章目录 <small>{Math.round(progress)}%</small>
            </h2>
            <nav aria-label="文章目录">{links}</nav>
            <p className="muted">{headings.length} 个章节 · 慢慢读</p>
          </section>,
          sidebar,
        )}
    </>
  )
}
