import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowUpRight, FileText, Search } from 'lucide-react'
import { blogApi } from '../../api/blog'
import type { PostSummary } from '../../types/blog'

export default function SearchBox() {
  const navigate = useNavigate()
  const location = useLocation()
  const [keyword, setKeyword] = useState('')
  const [open, setOpen] = useState(false)
  const [posts, setPosts] = useState<PostSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    setOpen(false)
    setKeyword(new URLSearchParams(location.search).get('keyword') || '')
  }, [location])
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement
      const typing =
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
      if (
        (event.key === '/' && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) ||
        ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k')
      ) {
        event.preventDefault()
        input.current?.focus()
        setOpen(true)
      }
      if (event.key === 'Escape') {
        setOpen(false)
        input.current?.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  useEffect(() => {
    if (!open) return
    let active = true
    setLoading(true)
    setError(false)
    const timer = window.setTimeout(() => {
      blogApi
        .posts({ keyword: keyword.trim(), page: 1, size: 4 })
        .then((result) => {
          if (active) setPosts(result.items)
        })
        .catch(() => {
          if (active) {
            setError(true)
            setPosts([])
          }
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }, 250)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [open, keyword])
  return (
    <form
      className="search-form"
      role="search"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
      }}
      onSubmit={(event) => {
        event.preventDefault()
        setOpen(false)
        input.current?.blur()
        navigate(keyword.trim() ? `/?keyword=${encodeURIComponent(keyword.trim())}` : '/')
      }}
    >
      <Search size={16} />
      <input
        ref={input}
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        onFocus={() => setOpen(true)}
        aria-label="搜索文章"
        aria-expanded={open}
        aria-controls="search-suggestions"
        autoComplete="off"
        placeholder="找一篇文章…"
        maxLength={100}
      />
      <kbd>/</kbd>
      <button type="submit" className="sr-only">
        搜索
      </button>
      {open && (
        <div className="search-suggestions card" id="search-suggestions">
          <div className="search-caption">
            <span>{keyword.trim() ? '搜索结果' : '最近的记录'}</span>
            <kbd>ESC 关闭</kbd>
          </div>
          <div className="search-status" role="status">
            {loading
              ? '正在寻找文章…'
              : error
                ? '暂时无法搜索，请稍后重试'
                : posts.length === 0
                  ? '没有找到相关文章，换个词试试'
                  : `${posts.length} 篇文章可供阅读`}
          </div>
          {!loading &&
            !error &&
            posts.map((post) => (
              <Link
                className="search-result"
                key={post.id}
                to={`/posts/${post.slug}`}
                onClick={() => setOpen(false)}
              >
                <FileText size={16} />
                <span>
                  <strong>{post.title}</strong>
                  <small>
                    {post.category} · {post.publishedAt.slice(0, 10)}
                  </small>
                </span>
                <ArrowUpRight size={14} />
              </Link>
            ))}
          {keyword.trim() && (
            <button className="search-all" type="submit">
              查看全部搜索结果 <ArrowUpRight size={14} />
            </button>
          )}
        </div>
      )}
    </form>
  )
}
