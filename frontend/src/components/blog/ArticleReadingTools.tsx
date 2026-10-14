import { useEffect, useState } from 'react'

export default function ArticleReadingTools({ html }: { html: string }) {
  const [headings, setHeadings] = useState<{ id: string; text: string; level: number }[]>([])
  const [active, setActive] = useState('')
  const [progress, setProgress] = useState(0)
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
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [html])
  return (
    <>
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
        <details className="article-toc" open>
          <summary>文章目录</summary>
          <nav aria-label="文章目录">
            {headings.map((heading) => (
              <a
                key={heading.id}
                href={`#${heading.id}`}
                aria-current={active === heading.id ? 'location' : undefined}
                style={{ paddingLeft: `${Math.min(heading.level - 1, 3) * 12}px` }}
              >
                {heading.text}
              </a>
            ))}
          </nav>
        </details>
      )}
    </>
  )
}
