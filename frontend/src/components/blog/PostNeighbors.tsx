import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { blogApi } from '../../api/blog'
import { useAsyncData } from '../../hooks/useAsyncData'
export default function PostNeighbors({ slug }: { slug: string }) {
  const fetch = useCallback(() => blogApi.neighbors(slug), [slug])
  const { data, error, refresh } = useAsyncData(fetch)
  return (
    <nav className="post-neighbors" aria-label="相邻文章">
      {data?.previous && (
        <Link to={`/posts/${data.previous.slug}`}>
          <small>上一篇</small>
          <strong>{data.previous.title}</strong>
        </Link>
      )}
      {data?.next && (
        <Link to={`/posts/${data.next.slug}`}>
          <small>下一篇</small>
          <strong>{data.next.title}</strong>
        </Link>
      )}
      {error && (
        <button className="text-button" onClick={refresh}>
          相邻文章加载失败，重试
        </button>
      )}
    </nav>
  )
}
