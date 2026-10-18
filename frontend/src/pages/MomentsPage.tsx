import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowUpRight, Feather, ImageOff, MessageCircle, Search, X } from 'lucide-react'
import { showcaseApi } from '../api/showcase'
import { useAsyncData } from '../hooks/useAsyncData'
import { usePageTitle } from '../hooks/usePageTitle'
import { useSite } from '../contexts/SiteContext'
import { formatDate } from '../utils/date'
import DataState from '../components/common/DataState'
import ContentPagination from '../components/common/ContentPagination'
import ArticleEnhancements from '../components/blog/ArticleEnhancements'

function MomentPhoto({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false)
  return failed ? (
    <div className="moment-photo-missing" role="img" aria-label={`${alt}，图片暂时无法加载`}>
      <ImageOff size={22} />
      <span>图片暂时无法加载</span>
    </div>
  ) : (
    <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
  )
}

export default function MomentsPage() {
  usePageTitle('说说')
  const site = useSite()
  const [params, setParams] = useSearchParams()
  const requestedPage = Number(params.get('page'))
  const page = Number.isFinite(requestedPage)
    ? Math.min(100000, Math.max(1, Math.floor(requestedPage)))
    : 1
  const keyword = (params.get('keyword') || '').slice(0, 100)
  const [search, setSearch] = useState(keyword)
  useEffect(() => setSearch(keyword), [keyword])
  const fetchMoments = useCallback(
    () => showcaseApi.list('moments', page, keyword),
    [page, keyword],
  )
  const { data, loading, error, refresh } = useAsyncData(fetchMoments)

  return (
    <section className="moments-page" aria-labelledby="moments-title">
      <header className="card moments-intro">
        <div className="moments-intro-copy">
          <span className="eyebrow">LITTLE THINGS, LATELY</span>
          <h1 id="moments-title">
            说说<span className="heading-dot">.</span>
          </h1>
          <p>不必成篇，也值得记录。</p>
          <span className="moments-intro-note">一点近况，一闪而过的念头，还有日常里的小事。</span>
        </div>
        <div className="moments-mark" aria-hidden="true">
          <Feather size={42} strokeWidth={1.2} />
          <span>此刻，留一笔</span>
        </div>
        <div className="moments-intro-footer">
          <span>
            <span className="moments-status-dot" />
            {site.author} 的日常随记
          </span>
          <Link to="/guestbook">
            和我聊聊
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </header>

      <div className="moments-toolbar">
        <div className="moments-feed-heading">
          <h2>{keyword ? '找到的片刻' : '最近的日常'}</h2>
          <span role="status">
            {loading
              ? '整理中…'
              : error
                ? '暂时无法读取'
                : `${data?.total ?? 0} 则${keyword ? '相关记录' : '说说'}`}
          </span>
        </div>
        <form
          className="moments-search"
          role="search"
          aria-label="说说搜索"
          onSubmit={(event) => {
            event.preventDefault()
            setParams(search.trim() ? { keyword: search.trim() } : {})
          }}
        >
          <Search size={16} />
          <input
            type="search"
            aria-label="搜索说说"
            placeholder="找找某个瞬间…"
            maxLength={100}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {(search || keyword) && (
            <button
              type="button"
              aria-label="清空说说搜索"
              onClick={() => {
                setSearch('')
                setParams({})
              }}
            >
              <X size={15} />
            </button>
          )}
          <button type="submit">查找</button>
        </form>
      </div>

      {loading && (
        <div className="moments-loading" role="status">
          <span className="sr-only">正在加载说说…</span>
          {[0, 1, 2].map((item) => (
            <div className="card moments-skeleton" key={item} aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
          ))}
        </div>
      )}
      <DataState loading={false} error={error} onRetry={refresh}>
        {!loading &&
          data &&
          (data.items.length === 0 ? (
            <div className="card moments-empty">
              <Feather size={32} strokeWidth={1.3} />
              <h2>{keyword ? '没有找到这个片刻' : '下一次记录，从这里开始'}</h2>
              <p>
                {keyword
                  ? '换个关键词，或看看其他日常。'
                  : '暂时还没有公开的说说，等一个想分享的瞬间。'}
              </p>
              {keyword ? (
                <button className="text-button" onClick={() => setParams({})}>
                  查看全部说说
                </button>
              ) : (
                <Link to="/">
                  先去读读文章
                  <ArrowUpRight size={14} />
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="moments-timeline" id="article-content">
                {data.items.map((entry) => (
                  <article className="moments-entry" key={entry.id}>
                    <div className="moments-date-rail" aria-hidden="true">
                      <strong>{entry.publishedAt.slice(8, 10)}</strong>
                      <span>{entry.publishedAt.slice(0, 7).replace('-', '.')}</span>
                    </div>
                    <div className="card moments-entry-card">
                      <header className="moments-entry-header">
                        <Link
                          className="moments-avatar"
                          to="/about"
                          aria-label={`关于${site.author}`}
                        >
                          {site.avatar ? <img src={site.avatar} alt="" /> : <Feather size={19} />}
                        </Link>
                        <div>
                          <strong>{site.author}</strong>
                          <time dateTime={entry.publishedAt}>{formatDate(entry.publishedAt)}</time>
                        </div>
                        <span className="moments-entry-label">日常随记</span>
                      </header>
                      {entry.title && <h2>{entry.title}</h2>}
                      <p className="moments-content">{entry.content}</p>
                      {entry.images.length > 0 && (
                        <div
                          className={`moments-photo-grid ${entry.images.length === 1 ? 'is-single' : entry.images.length === 2 || entry.images.length === 4 ? 'is-pair' : ''}`}
                        >
                          {entry.images.map((src, index) => (
                            <MomentPhoto
                              key={`${src}:${index}`}
                              src={src}
                              alt={`${entry.title || `${site.author}的日常`} · 图片 ${index + 1}`}
                            />
                          ))}
                        </div>
                      )}
                      <footer className="moments-entry-footer">
                        <MessageCircle size={13} />
                        <span>一些生活的切片</span>
                        {entry.images.length > 0 && (
                          <span>{entry.images.length} 张配图 · 点击放大</span>
                        )}
                      </footer>
                    </div>
                  </article>
                ))}
              </div>
              <ArticleEnhancements
                html={JSON.stringify(data.items.map((entry) => [entry.id, entry.images]))}
              />
              <ContentPagination
                page={page}
                total={data.total}
                size={data.size}
                onChange={(value) => {
                  const next = new URLSearchParams(params)
                  next.set('page', String(value))
                  setParams(next)
                  document.getElementById('main-content')?.scrollIntoView({ behavior: 'smooth' })
                }}
              />
              <p className="moments-endnote">
                <span />
                {page * data.size >= data.total
                  ? '日子慢慢过，故事慢慢记。'
                  : '还有一些日常，留在下一页。'}
                <span />
              </p>
            </>
          ))}
      </DataState>
    </section>
  )
}
