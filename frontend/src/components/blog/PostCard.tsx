import { Link } from 'react-router-dom'
import { ArrowUpRight, CalendarDays, Clock3, Pin } from 'lucide-react'
import type { PostSummary } from '../../types/blog'
import { formatDate } from '../../utils/date'

export default function PostCard({ post }: { post: PostSummary }) {
  return (
    <article className="card post-card">
      <Link to={`/posts/${post.slug}`} className="post-cover" tabIndex={-1} aria-hidden="true">
        <img src={post.cover || '/images/landscape.svg'} alt="" loading="lazy" />
        {post.pinned && (
          <span className="pin-badge">
            <Pin size={12} />
            置顶
          </span>
        )}
      </Link>
      <div className="post-body">
        <Link to={`/?category=${encodeURIComponent(post.category)}`} className="eyebrow">
          {post.category}
        </Link>
        <h2>
          <Link to={`/posts/${post.slug}`}>{post.title}</Link>
        </h2>
        <p>{post.excerpt}</p>
        <div className="post-meta">
          <span>
            <CalendarDays size={13} />
            {formatDate(post.publishedAt)}
          </span>
          <span>
            <Clock3 size={13} />
            {post.readingMinutes} 分钟
          </span>
        </div>
        <div className="post-bottom">
          <div className="post-tags">
            {post.tags.map((tag) => (
              <Link key={tag} to={`/?tag=${encodeURIComponent(tag)}`}>
                # {tag}
              </Link>
            ))}
          </div>
          <Link
            to={`/posts/${post.slug}`}
            className="read-arrow"
            aria-label={`阅读：${post.title}`}
          >
            <ArrowUpRight size={19} />
          </Link>
        </div>
      </div>
    </article>
  )
}
