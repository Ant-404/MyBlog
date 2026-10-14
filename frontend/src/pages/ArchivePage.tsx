import { Link } from 'react-router-dom'
import { blogApi } from '../api/blog'
import { useAsyncData } from '../hooks/useAsyncData'
import { usePageTitle } from '../hooks/usePageTitle'
import DataState from '../components/common/DataState'
import { formatDate } from '../utils/date'

export default function ArchivePage() {
  usePageTitle('归档')
  const { data, loading, error, refresh } = useAsyncData(blogApi.archives)
  const years = [...new Set(data?.map((post) => post.publishedAt.slice(0, 4)))]
  return (
    <section className="card content-page">
      <span className="eyebrow">EVERY STEP COUNTS</span>
      <h1>
        文章归档<span className="heading-dot">.</span>
      </h1>
      <p className="muted">{data?.length ?? '—'} 篇记录，串起一路走来的足迹。</p>
      <DataState loading={loading} error={error} empty={data?.length === 0} onRetry={refresh}>
        {years.map((year) => {
          const posts = data!.filter((post) => post.publishedAt.startsWith(year))
          return (
            <div key={year} className="archive-group">
              <h2>
                {year}
                <small>{posts.length} 篇</small>
              </h2>
              {posts.map((post) => (
                <Link key={post.id} to={`/posts/${post.slug}`} className="archive-row">
                  <time>{formatDate(post.publishedAt).slice(5)}</time>
                  <span>{post.title}</span>
                  <small>{post.category}</small>
                </Link>
              ))}
            </div>
          )
        })}
      </DataState>
    </section>
  )
}
