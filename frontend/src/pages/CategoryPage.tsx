import { Link } from 'react-router-dom'
import { FolderOpen, ArrowUpRight } from 'lucide-react'
import { blogApi } from '../api/blog'
import { useAsyncData } from '../hooks/useAsyncData'
import { usePageTitle } from '../hooks/usePageTitle'
import DataState from '../components/common/DataState'
import ArticleBrowseNav from '../components/blog/ArticleBrowseNav'

export default function CategoryPage() {
  usePageTitle('分类')
  const { data, loading, error, refresh } = useAsyncData(blogApi.categories)
  return (
    <section className="card content-page">
      <ArticleBrowseNav />
      <span className="eyebrow">FIND YOUR INTEREST</span>
      <h1>
        文章分类<span className="heading-dot">.</span>
      </h1>
      <p className="muted">在不同的主题里，找到同频的想法。</p>
      <DataState loading={loading} error={error} empty={data?.length === 0} onRetry={refresh}>
        <div className="taxonomy-grid">
          {data?.map((item) => (
            <Link
              key={item.name}
              to={`/?category=${encodeURIComponent(item.name)}`}
              className="taxonomy-card"
            >
              <FolderOpen size={24} />
              <h2>{item.name}</h2>
              <span>{item.count} 篇文章</span>
              <ArrowUpRight size={20} />
            </Link>
          ))}
        </div>
      </DataState>
    </section>
  )
}
