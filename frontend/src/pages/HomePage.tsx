import { useCallback, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LayoutGrid, List, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { blogApi } from '../api/blog'
import { useAsyncData } from '../hooks/useAsyncData'
import { usePageTitle } from '../hooks/usePageTitle'
import PostCard from '../components/blog/PostCard'
import DataState from '../components/common/DataState'

export default function HomePage() {
  usePageTitle('首页')
  const [params, setParams] = useSearchParams()
  const [grid, setGrid] = useState(true)
  const page = Math.min(100000, Math.max(1, Math.floor(Number(params.get('page')) || 1)))
  const keyword = params.get('keyword') || ''
  const category = params.get('category') || ''
  const tag = params.get('tag') || ''
  const fetchPosts = useCallback(
    () => blogApi.posts({ page, size: 4, keyword, category, tag }),
    [page, keyword, category, tag],
  )
  const { data, loading, error, refresh } = useAsyncData(fetchPosts)
  const { data: categories } = useAsyncData(blogApi.categories)
  function changePage(value: number) {
    const next = new URLSearchParams(params)
    next.set('page', String(value))
    setParams(next)
    document.getElementById('main-content')?.scrollIntoView({ behavior: 'smooth' })
  }
  const pageCount = data ? Math.ceil(data.total / data.size) : 0
  const visiblePages = Array.from(
    { length: Math.min(5, pageCount) },
    (_, i) => Math.max(1, Math.min(page - 2, pageCount - 4)) + i,
  )
  return (
    <div className="home-page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">THE JOURNAL</span>
          <h2>
            {keyword ? `搜索：${keyword}` : tag ? `标签：${tag}` : '最近的记录'}
            <span className="heading-dot">.</span>
          </h2>
        </div>
        <div className="view-switch">
          <button
            className={grid ? 'active' : ''}
            aria-label="网格视图"
            aria-pressed={grid}
            onClick={() => setGrid(true)}
          >
            <LayoutGrid size={17} />
          </button>
          <button
            className={!grid ? 'active' : ''}
            aria-label="列表视图"
            aria-pressed={!grid}
            onClick={() => setGrid(false)}
          >
            <List size={18} />
          </button>
        </div>
      </div>
      <div className="category-tabs">
        <button
          className={!category && !tag && !keyword ? 'active' : ''}
          onClick={() => setParams({})}
        >
          全部文章
        </button>
        {categories?.map((item) => (
          <button
            key={item.name}
            className={category === item.name ? 'active' : ''}
            onClick={() => setParams({ category: item.name })}
          >
            {item.name}
            <small>{item.count}</small>
          </button>
        ))}
        {(keyword || tag) && (
          <button onClick={() => setParams({})}>
            <X size={13} />
            清除筛选
          </button>
        )}
        <span className="result-count">{data?.total ?? '—'} 篇记录</span>
      </div>
      <DataState loading={loading} error={error} empty={data?.items.length === 0} onRetry={refresh}>
        <div className={`post-grid ${grid ? '' : 'list-view'}`}>
          {data?.items.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
        {pageCount > 1 && (
          <nav className="pagination" aria-label="文章分页">
            <button disabled={page <= 1} onClick={() => changePage(page - 1)} aria-label="上一页">
              <ChevronLeft size={17} />
            </button>
            {visiblePages.map((number) => (
              <button
                key={number}
                className={page === number ? 'active' : ''}
                aria-current={page === number ? 'page' : undefined}
                onClick={() => changePage(number)}
              >
                {number}
              </button>
            ))}
            <button
              disabled={page >= pageCount}
              onClick={() => changePage(page + 1)}
              aria-label="下一页"
            >
              <ChevronRight size={17} />
            </button>
          </nav>
        )}
      </DataState>
      <p className="end-note">
        慢慢记录，慢慢生长。<span>✳</span>
      </p>
    </div>
  )
}
