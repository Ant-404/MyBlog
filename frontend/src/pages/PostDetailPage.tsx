import { useCallback, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { renderMarkdown } from '../utils/markdown'
import { CalendarDays, Clock3, ArrowLeft } from 'lucide-react'
import { blogApi } from '../api/blog'
import { useAsyncData } from '../hooks/useAsyncData'
import { usePageTitle } from '../hooks/usePageTitle'
import DataState from '../components/common/DataState'
import ArticleReadingTools from '../components/blog/ArticleReadingTools'
import ArticleEnhancements from '../components/blog/ArticleEnhancements'
import PostNeighbors from '../components/blog/PostNeighbors'
import PostComments from '../components/blog/PostComments'
import PostReadCount from '../components/blog/PostReadCount'
import { formatDate } from '../utils/date'

export default function PostDetailPage() {
  const { slug = '' } = useParams()
  const fetchPost = useCallback(() => blogApi.post(slug), [slug])
  const { data: post, loading, error, refresh } = useAsyncData(fetchPost)
  usePageTitle(post?.title || '文章')
  const html = useMemo(() => renderMarkdown(post?.content || ''), [post?.content])
  return (
    <DataState loading={loading} error={error} onRetry={refresh}>
      {post && (
        <article className="card article-page">
          <Link to="/" className="back-link">
            <ArrowLeft size={15} />
            返回文章列表
          </Link>
          <span className="eyebrow">{post.category}</span>
          <h1>{post.title}</h1>
          <div className="post-meta">
            <span>
              <CalendarDays size={14} />
              {formatDate(post.publishedAt)}
            </span>
            <span>
              <Clock3 size={14} />
              {post.readingMinutes} 分钟阅读
            </span>
            <PostReadCount slug={slug} />
          </div>
          <img
            className="article-cover"
            src={post.cover || '/images/landscape.svg'}
            alt="文章封面"
          />
          <ArticleReadingTools html={html} />
          <div id="article-content" className="prose" dangerouslySetInnerHTML={{ __html: html }} />
          <ArticleEnhancements key={`enhancements:${slug}`} html={html} />
          <div className="tag-cloud">
            {post.tags.map((tag) => (
              <Link key={tag} to={`/?tag=${encodeURIComponent(tag)}`}>
                # {tag}
              </Link>
            ))}
          </div>
          <PostNeighbors slug={slug} />
          <PostComments key={slug} slug={slug} />
        </article>
      )}
    </DataState>
  )
}
