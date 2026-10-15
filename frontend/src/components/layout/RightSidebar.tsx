import { Link } from 'react-router-dom'
import { Bell, Hash, Leaf, ArrowUpRight } from 'lucide-react'
import { blogApi } from '../../api/blog'
import { useAsyncData } from '../../hooks/useAsyncData'
import ArticleCalendar from '../blog/ArticleCalendar'

export default function RightSidebar() {
  const { data: tags, error, refresh } = useAsyncData(blogApi.tags)
  return (
    <aside className="right-sidebar">
      <section className="card sidebar-card notice">
        <h3>
          <Bell size={16} />
          小站公告
        </h3>
        <p>
          欢迎来到我的数字花园。
          <br />
          愿你在这里，遇见一点灵感。
        </p>
        <span className="notice-sign">
          HAVE A NICE DAY <Leaf size={13} />
        </span>
      </section>
      <ArticleCalendar />
      <section className="card sidebar-card">
        <h3>
          <Hash size={17} />
          标签漫游
        </h3>
        <div className="tag-cloud">
          {tags?.map((tag) => (
            <Link key={tag.name} to={`/?tag=${encodeURIComponent(tag.name)}`}>
              {tag.name}
              <small>{tag.count}</small>
            </Link>
          ))}
        </div>
        {error ? (
          <button className="text-button" onClick={refresh}>
            加载失败，点击重试
          </button>
        ) : (
          !tags && <p className="muted">标签数据待加载</p>
        )}
      </section>
      <section className="card quote-card">
        <span className="quote-mark">“</span>
        <p>
          生活不是为了赶路，
          <br />
          而是为了感受路。
        </p>
        <span>— 给今天的自己</span>
        <div className="quote-flower">✳</div>
      </section>
      <Link to="/friends" className="friend-invite">
        去朋友家坐坐 <ArrowUpRight size={16} />
      </Link>
    </aside>
  )
}
