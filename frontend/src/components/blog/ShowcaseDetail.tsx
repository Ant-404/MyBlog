import { useCallback, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, Code2, Globe2, BookOpen } from 'lucide-react'
import { showcaseApi } from '../../api/showcase'
import { showcaseLabels, showcaseStates } from '../../types/showcase'
import { useAsyncData } from '../../hooks/useAsyncData'
import { usePageTitle } from '../../hooks/usePageTitle'
import { renderMarkdown } from '../../utils/markdown'
import { formatDate } from '../../utils/date'
import DataState from '../common/DataState'
import ArticleReadingTools from './ArticleReadingTools'
import ArticleEnhancements from './ArticleEnhancements'

export default function ShowcaseDetail({ section }: { section: 'projects' | 'series' }) {
  const { id = '' } = useParams()
  const fetch = useCallback(() => showcaseApi.detail(section, Number(id)), [section, id])
  const { data, loading, error, refresh } = useAsyncData(fetch)
  usePageTitle(data?.title || showcaseLabels[section])
  const html = useMemo(() => renderMarkdown(data?.content || ''), [data?.content])
  return (
    <DataState loading={loading} error={error} onRetry={refresh}>
      {data && (
        <article className="card article-page showcase-detail">
          <Link className="back-link" to={`/${section}`}>
            <ArrowLeft size={15} />
            返回{showcaseLabels[section]}
          </Link>
          <span className="eyebrow">{showcaseStates[section][data.status]}</span>
          <h1>{data.title}</h1>
          <p className="showcase-lead">{data.summary}</p>
          <div className="post-meta">
            {formatDate(data.publishedAt)}
            {section === 'series' && <span>{data.posts.length} 篇文章</span>}
          </div>
          {section === 'projects' && (
            <div className="showcase-project-links">
              {data.sourceUrl && (
                <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer">
                  <Code2 size={16} />
                  源码
                  <ArrowUpRight size={14} />
                </a>
              )}
              {data.demoUrl && (
                <a href={data.demoUrl} target="_blank" rel="noopener noreferrer">
                  <Globe2 size={16} />
                  在线演示
                  <ArrowUpRight size={14} />
                </a>
              )}
              <div className="showcase-technologies">
                {data.technologies.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>
          )}
          <ArticleReadingTools key={`${section}:${id}`} html={html} />
          {data.cover && (
            <img className="article-cover" src={data.cover} alt={`${data.title}封面`} />
          )}
          <div className="prose" id="article-content" dangerouslySetInnerHTML={{ __html: html }} />
          <ArticleEnhancements key={`enhance:${section}:${id}`} html={html} />
          {data.posts.length > 0 && (
            <section
              className="series-reading-list"
              aria-label={section === 'series' ? '专题阅读顺序' : '项目相关文章'}
            >
              <h2>
                <BookOpen size={19} />
                {section === 'series' ? '按顺序读下去' : '项目相关文章'}
              </h2>
              <ol>
                {data.posts.map((post, index) => (
                  <li key={post.id}>
                    <Link to={`/posts/${post.slug}`}>
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <strong>{post.title}</strong>
                      <ArrowUpRight size={17} />
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          )}
          {section === 'series' && data.posts.length === 0 && (
            <p className="callout">本专题的文章正在整理中。</p>
          )}
        </article>
      )}
    </DataState>
  )
}
