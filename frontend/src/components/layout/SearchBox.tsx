import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowUpRight, FileText, Search, X } from 'lucide-react'
import { blogApi } from '../../api/blog'
import type { PostSummary } from '../../types/blog'

function Highlight({ text, keyword }: { text: string; keyword: string }) {
  const term = keyword.trim().toLowerCase()
  if (!term) return <>{text}</>
  const parts = []
  let start = 0
  let index = text.toLowerCase().indexOf(term)
  while (index !== -1) {
    parts.push(
      text.slice(start, index),
      <mark key={index}>{text.slice(index, index + term.length)}</mark>,
    )
    start = index + term.length
    index = text.toLowerCase().indexOf(term, start)
  }
  return (
    <>
      {parts}
      {text.slice(start)}
    </>
  )
}

export default function SearchBox() {
  const navigate = useNavigate()
  const location = useLocation()
  const [keyword, setKeyword] = useState('')
  const [open, setOpen] = useState(false)
  const [posts, setPosts] = useState<PostSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [selected, setSelected] = useState(-1)
  const input = useRef<HTMLInputElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const launcher = useRef<HTMLButtonElement>(null)
  function show() {
    setOpen(true)
    requestAnimationFrame(() => input.current?.focus())
  }
  function close(restore = false) {
    setOpen(false)
    input.current?.blur()
    if (restore && matchMedia('(max-width: 680px)').matches) launcher.current?.focus()
  }
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
        show()
      }
      if (event.key === 'Escape' && root.current?.contains(document.activeElement)) close(true)
    }
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', outside)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', outside)
    }
  }, [])
  useEffect(() => {
    setSelected(-1)
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
    <div
      className={`site-search ${open ? 'is-open' : ''}`}
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
      }}
    >
      <button
        ref={launcher}
        type="button"
        className="icon-button mobile-search-toggle"
        aria-label="打开文章搜索"
        aria-expanded={open}
        aria-controls="site-search-form"
        onClick={show}
      >
        <Search size={19} />
      </button>
      <form
        id="site-search-form"
        className="search-form"
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          close()
          navigate(keyword.trim() ? `/?keyword=${encodeURIComponent(keyword.trim())}` : '/')
        }}
      >
        <Search size={16} />
        <input
          ref={input}
          value={keyword}
          type="search"
          role="combobox"
          aria-autocomplete="list"
          onChange={(event) => setKeyword(event.target.value)}
          onFocus={() => setOpen(true)}
          aria-label="搜索文章"
          aria-expanded={open}
          aria-controls="search-result-list"
          aria-activedescendant={
            selected >= 0 && !loading ? `search-result-${selected}` : undefined
          }
          autoComplete="off"
          placeholder="找一篇文章…"
          maxLength={100}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing || loading || !open) return
            if (posts.length && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
              event.preventDefault()
              const next =
                event.key === 'ArrowDown'
                  ? (selected + 1) % posts.length
                  : selected < 0
                    ? posts.length - 1
                    : (selected - 1 + posts.length) % posts.length
              setSelected(next)
              document.getElementById(`search-result-${next}`)?.scrollIntoView({ block: 'nearest' })
            }
            if (event.key === 'Enter' && selected >= 0 && posts[selected]) {
              event.preventDefault()
              close()
              navigate(`/posts/${posts[selected].slug}`)
            }
          }}
        />
        <kbd>/</kbd>
        <button type="submit" className="sr-only">
          搜索
        </button>
        <button
          type="button"
          className="icon-button mobile-search-close"
          aria-label="关闭文章搜索"
          onClick={() => close(true)}
        >
          <X size={18} />
        </button>
        {open && (
          <div className="search-suggestions card" id="search-suggestions">
            <div className="search-caption">
              <span>{keyword.trim() ? '搜索结果' : '最近的记录'}</span>
              <kbd>↑↓ 选择 · ESC 关闭</kbd>
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
            <div id="search-result-list" role="listbox" aria-label="文章搜索结果">
              {!loading &&
                !error &&
                posts.map((post, index) => (
                  <Link
                    className={`search-result ${selected === index ? 'selected' : ''}`}
                    id={`search-result-${index}`}
                    role="option"
                    aria-selected={selected === index}
                    key={post.id}
                    to={`/posts/${post.slug}`}
                    onClick={() => close()}
                  >
                    <FileText size={16} />
                    <span>
                      <strong>
                        <Highlight text={post.title} keyword={keyword} />
                      </strong>
                      <span className="search-excerpt">
                        <Highlight text={post.excerpt} keyword={keyword} />
                      </span>
                      <small>
                        {post.category} · {post.publishedAt.slice(0, 10)}
                      </small>
                    </span>
                    <ArrowUpRight size={14} />
                  </Link>
                ))}
            </div>
            {keyword.trim() && (
              <button className="search-all" type="submit">
                查看全部搜索结果 <ArrowUpRight size={14} />
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  )
}
