import { Link } from 'react-router-dom'
import { blogApi } from '../api/blog'
import { useAsyncData } from '../hooks/useAsyncData'
import { usePageTitle } from '../hooks/usePageTitle'
import DataState from '../components/common/DataState'
import ArticleBrowseNav from '../components/blog/ArticleBrowseNav'

export default function TagPage() {
  usePageTitle('标签')
  const { data, loading, error, refresh } = useAsyncData(blogApi.tags)
  return (
    <section className="card content-page">
      <ArticleBrowseNav />
      <span className="eyebrow">CONNECT THE DOTS</span>
      <h1>
        标签漫游<span className="heading-dot">.</span>
      </h1>
      <p className="muted">一个关键词，也是一段探索的开始。</p>
      <DataState loading={loading} error={error} empty={data?.length === 0} onRetry={refresh}>
        <div className="tag-cloud large">
          {data?.map((item) => (
            <Link key={item.name} to={`/?tag=${encodeURIComponent(item.name)}`}>
              # {item.name}
              <small>{item.count}</small>
            </Link>
          ))}
        </div>
      </DataState>
    </section>
  )
}
