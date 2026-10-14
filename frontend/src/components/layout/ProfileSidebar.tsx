import { Link } from 'react-router-dom'
import { Code2, MapPin, ArrowUpRight, FolderOpen, Hash } from 'lucide-react'
import { blogApi } from '../../api/blog'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useSite } from '../../contexts/SiteContext'

export default function ProfileSidebar() {
  const site = useSite()
  const { data: stats } = useAsyncData(blogApi.stats)
  const { data: categories, error, refresh } = useAsyncData(blogApi.categories)
  return (
    <aside className="left-sidebar">
      <section className="card profile-card">
        <div className="profile-scenery" />
        <div className="avatar">
          {site.avatar ? <img src={site.avatar} alt={site.author} /> : <Code2 size={32} />}
        </div>
        <h2>{site.author}</h2>
        <p className="muted">{site.bio}</p>
        <p className="profile-description">{site.description}</p>
        <div className="location">
          <MapPin size={13} />
          在路上，也在生活里
        </div>
        <div className="profile-stats">
          <Link to="/archives">
            <strong>{stats?.posts ?? '—'}</strong>
            <span>文章</span>
          </Link>
          <Link to="/categories">
            <strong>{stats?.categories ?? '—'}</strong>
            <span>分类</span>
          </Link>
          <Link to="/tags">
            <strong>{stats?.tags ?? '—'}</strong>
            <span>标签</span>
          </Link>
        </div>
        <Link to="/about" className="profile-link">
          认识一下 <ArrowUpRight size={16} />
        </Link>
      </section>
      <section className="card sidebar-card">
        <h3>
          <FolderOpen size={17} />
          文章分类
        </h3>
        {categories?.map((category) => (
          <Link
            key={category.name}
            to={`/?category=${encodeURIComponent(category.name)}`}
            className="category-link"
          >
            <span>{category.name}</span>
            <span className="count">{category.count}</span>
          </Link>
        ))}
        {error ? (
          <button className="text-button" onClick={refresh}>
            加载失败，点击重试
          </button>
        ) : (
          !categories && <p className="muted">分类数据待加载</p>
        )}
      </section>
      <Link to="/tags" className="card tag-shortcut">
        <Hash size={18} />
        在标签里发现更多 <ArrowUpRight size={17} />
      </Link>
    </aside>
  )
}
