import { useEffect, useState } from 'react'
import { communityApi } from '../../api/community'
export default function PostReadCount({ slug }: { slug: string }) {
  const [count, setCount] = useState<number>()
  useEffect(() => {
    let active = true
    setCount(undefined)
    // Delay one task so StrictMode's initial cleanup cancels the duplicate effect.
    const timer = window.setTimeout(() => {
      void communityApi
        .recordView(slug)
        .then((value) => {
          if (active) setCount(value)
        })
        .catch(() => {})
    }, 0)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [slug])
  return <span>{count ?? '—'} 次阅读</span>
}
