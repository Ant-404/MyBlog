import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

export default function ScrollToTop() {
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    let frame = 0
    function measure() {
      const height = document.documentElement.scrollHeight - window.innerHeight
      setProgress(height > 0 ? Math.min(100, Math.round((window.scrollY / height) * 100)) : 0)
      setVisible(window.scrollY > 320)
    }
    function update() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])
  return (
    <button
      className={`back-to-top ${visible ? 'visible' : ''}`}
      aria-label="回到顶部"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        })
      }
    >
      <ArrowUp size={18} />
      <span>{progress}%</span>
    </button>
  )
}
