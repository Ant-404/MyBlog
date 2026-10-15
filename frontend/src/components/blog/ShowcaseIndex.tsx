import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowUpRight, BookOpen, Code2, MessageCircle, Search, CalendarDays } from 'lucide-react'
import { showcaseApi } from '../../api/showcase'
import { showcaseLabels, showcaseStates, type ShowcaseSection } from '../../types/showcase'
import { useAsyncData } from '../../hooks/useAsyncData'
import { usePageTitle } from '../../hooks/usePageTitle'
import { formatDate } from '../../utils/date'
import DataState from '../common/DataState'
import ContentPagination from '../common/ContentPagination'
import ArticleEnhancements from './ArticleEnhancements'

const introductions = {
  projects: {
    english: 'BUILT WITH CARE',
    text: '记录做过的项目，也记录每一次从想法到实现的过程。',
    empty: '项目还在整理中',
    hint: '准备好的项目会在这里展示。',
  },
  series: {
    english: 'ONE CHAPTER AT A TIME',
    text: '把零散的学习笔记串起来，沿着一条线慢慢读。',
    empty: '专题正在准备',
    hint: '整理成系列的文章会出现在这里。',
  },
  moments: {
    english: 'LITTLE THINGS, LATELY',
    text: '一些不必写成长文的日常，也值得留下来。',
    empty: '还没有公开的说说',
    hint: '等下一次想记录的瞬间。',
  },
}
export default function ShowcaseIndex({ section }: { section: ShowcaseSection }) {
  usePageTitle(showcaseLabels[section])
  const [params, setParams] = useSearchParams()
  const page = Math.min(100000, Math.max(1, Math.floor(Number(params.get('page')) || 1)))
  const keyword = (params.get('keyword') || '').slice(0, 100)
  const [search, setSearch] = useState(keyword)
  useEffect(() => setSearch(keyword), [keyword])
  const fetch = useCallback(
    () => showcaseApi.list(section, page, keyword),
    [section, page, keyword],
  )
  const { data, loading, error, refresh } = useAsyncData(fetch)
  const intro = introductions[section]
  const Icon = section === 'projects' ? Code2 : section === 'series' ? BookOpen : MessageCircle
  return (
    <section className={`showcase-page showcase-${section}`}>
      <header className="showcase-intro">
        <span className="eyebrow">{intro.english}</span>
        <h1>
          {showcaseLabels[section]}
          <span className="heading-dot">.</span>
        </h1>
        <p>{intro.text}</p>
      </header>
      <form
        className="showcase-search"
        role="search"
        aria-label={`${showcaseLabels[section]}搜索`}
        onSubmit={(event) => {
          event.preventDefault()
          setParams(search.trim() ? { keyword: search.trim() } : {})
        }}
      >
        <Search size={17} />
        <input
          aria-label={`搜索${showcaseLabels[section]}`}
          value={search}
          maxLength={100}
          placeholder={section === 'projects' ? '项目名称、技术栈或关键词…' : '输入关键词…'}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button type="submit">查找</button>
        {keyword && (
          <button type="button" onClick={() => setParams({})}>
            清除
          </button>
        )}
      </form>
      <DataState loading={loading} error={error} onRetry={refresh}>
        {data && data.items.length === 0 ? (
          <div className="card showcase-empty">
            <Icon size={32} />
            <h2>{keyword ? '没有找到相关内容' : intro.empty}</h2>
            <p>{keyword ? '换个关键词试试，或清除搜索条件。' : intro.hint}</p>
            {keyword && (
              <button className="text-button" onClick={() => setParams({})}>
                查看全部
              </button>
            )}
          </div>
        ) : (
          <>
            <div
              className={section === 'moments' ? 'moment-stream' : 'showcase-grid'}
              id={section === 'moments' ? 'article-content' : undefined}
            >
              {data?.items.map((entry, index) =>
                section === 'moments' ? (
                  <article className="card moment-card" key={entry.id}>
                    <div className="moment-date">
                      <MessageCircle size={16} />
                      <time dateTime={entry.publishedAt}>{formatDate(entry.publishedAt)}</time>
                    </div>
                    {entry.title && <h2>{entry.title}</h2>}
                    <p className="moment-text">{entry.content}</p>
                    {entry.images.length > 0 && (
                      <div className={`moment-images ${entry.images.length === 1 ? 'single' : ''}`}>
                        {entry.images.map((url, i) => (
                          <img
                            key={`${url}:${i}`}
                            src={url}
                            alt={`${entry.title || '日常记录'} · 图片 ${i + 1}`}
                            loading="lazy"
                          />
                        ))}
                      </div>
                    )}
                  </article>
                ) : (
                  <article
                    className={`card showcase-card ${section === 'series' ? 'series-card' : ''}`}
                    key={entry.id}
                  >
                    <Link
                      className={`showcase-cover ${entry.cover ? '' : 'no-cover'}`}
                      to={`/${section}/${entry.id}`}
                      tabIndex={-1}
                      aria-hidden="true"
                    >
                      {entry.cover ? (
                        <img
                          src={entry.cover}
                          alt=""
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <>
                          <Icon size={32} />
                          <span>
                            {section === 'series'
                              ? String((page - 1) * 12 + index + 1).padStart(2, '0')
                              : entry.technologies.slice(0, 3).join(' / ') || 'PROJECT'}
                          </span>
                        </>
                      )}
                    </Link>
                    <div className="showcase-card-body">
                      <span className="showcase-status">
                        {showcaseStates[section][entry.status]}
                      </span>
                      <h2>
                        <Link to={`/${section}/${entry.id}`}>{entry.title}</Link>
                      </h2>
                      <p>{entry.summary || '打开看看这份记录。'}</p>
                      {entry.technologies.length > 0 && (
                        <div className="showcase-technologies">
                          {entry.technologies.slice(0, 6).map((name) => (
                            <span key={name}>{name}</span>
                          ))}
                        </div>
                      )}
                      <div className="showcase-card-footer">
                        <span>
                          <CalendarDays size={13} />
                          {section === 'series'
                            ? `${entry.posts.length} 篇文章`
                            : formatDate(entry.publishedAt)}
                        </span>
                        <Link to={`/${section}/${entry.id}`}>
                          {section === 'series' ? '开始阅读' : '查看项目'}
                          <ArrowUpRight size={17} />
                        </Link>
                      </div>
                    </div>
                  </article>
                ),
              )}
            </div>
            {section === 'moments' && (
              <ArticleEnhancements html={JSON.stringify(data?.items.map((item) => item.images))} />
            )}
          </>
        )}
        {data && (
          <ContentPagination
            page={page}
            total={data.total}
            size={data.size}
            onChange={(value) => {
              const next = new URLSearchParams(params)
              next.set('page', String(value))
              setParams(next)
              document.getElementById('main-content')?.scrollIntoView()
            }}
          />
        )}
      </DataState>
    </section>
  )
}
