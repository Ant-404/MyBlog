import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Clapperboard, ExternalLink, Search, Star, Tv } from 'lucide-react'
import { animeApi } from '../api/anime'
import { animeStatuses, type AnimeStatus } from '../types/anime'
import { useAsyncData } from '../hooks/useAsyncData'
import { usePageTitle } from '../hooks/usePageTitle'
import DataState from '../components/common/DataState'

export default function AnimePage() {
  usePageTitle('追番记录')
  const { data, loading, error, refresh } = useAsyncData(animeApi.list)
  const [params, setParams] = useSearchParams()
  const status = Object.hasOwn(animeStatuses, params.get('status') || '')
    ? (params.get('status') as AnimeStatus)
    : ''
  const keyword = (params.get('keyword') || '').slice(0, 200)
  const order = params.get('order') === 'score' ? 'score' : 'updated'
  const [expanded, setExpanded] = useState<number[]>([])
  function filter(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: key === 'keyword' })
  }
  const entries = useMemo(() => {
    const result = (data || []).filter(
      (entry) =>
        (!status || entry.status === status) &&
        entry.title.toLowerCase().includes(keyword.trim().toLowerCase()),
    )
    return order === 'score' ? result.sort((a, b) => b.score - a.score) : result
  }, [data, status, keyword, order])
  const watched = (data || []).reduce((sum, entry) => sum + entry.watchedEpisodes, 0)
  return (
    <section className="anime-page">
      <header className="card anime-intro">
        <div className="anime-intro-icon">
          <Clapperboard size={26} />
        </div>
        <span className="eyebrow">AFTER THE ENDING SONG</span>
        <h1>
          追番记录<span className="heading-dot">.</span>
        </h1>
        <p>把喜欢的故事，留在这一页。追到哪里、看完的感受，都慢慢记下来。</p>
        <div className="anime-overview">
          <span>
            <strong>{data?.length ?? '—'}</strong> 部作品
          </span>
          <span>
            <strong>{data?.filter((entry) => entry.status === 'WATCHING').length ?? '—'}</strong>{' '}
            部在看
          </span>
          <span>
            <strong>{data ? watched : '—'}</strong> 集已看
          </span>
        </div>
      </header>
      <div className="anime-filters">
        <div className="category-tabs" aria-label="追番状态筛选">
          <button
            className={!status ? 'active' : ''}
            aria-pressed={!status}
            onClick={() => filter('status', '')}
          >
            全部 <small>{data?.length ?? 0}</small>
          </button>
          {Object.entries(animeStatuses).map(([value, label]) => (
            <button
              key={value}
              className={status === value ? 'active' : ''}
              aria-pressed={status === value}
              onClick={() => filter('status', value)}
            >
              {label}
              <small>{data?.filter((entry) => entry.status === value).length ?? 0}</small>
            </button>
          ))}
        </div>
        <div className="anime-filter-tools">
          <label className="anime-search">
            <Search size={15} />
            <input
              aria-label="搜索番剧"
              placeholder="找一部喜欢的作品…"
              value={keyword}
              onChange={(event) => filter('keyword', event.target.value)}
              maxLength={200}
            />
          </label>
          <select
            aria-label="追番排序"
            value={order}
            onChange={(event) => filter('order', event.target.value)}
          >
            <option value="updated">最近更新</option>
            <option value="score">评分优先</option>
          </select>
        </div>
      </div>
      <DataState loading={loading} error={error} onRetry={refresh}>
        {entries.length === 0 ? (
          <div className="card anime-empty">
            <Tv size={34} />
            <h2>{data?.length ? '这一栏还没有作品' : '故事还没开场'}</h2>
            <p>
              {data?.length
                ? '换一个状态或关键词看看。'
                : '追番记录准备好了，添加作品后会在这里展示。'}
            </p>
          </div>
        ) : (
          <div className="anime-grid">
            {entries.map((entry) => (
              <article className="card anime-card" key={entry.id}>
                <div className="anime-cover">
                  {entry.cover ? (
                    <img src={entry.cover} alt={`${entry.title}封面`} loading="lazy" />
                  ) : (
                    <div className="anime-cover-placeholder">
                      <Tv size={36} />
                      <span>{entry.title}</span>
                    </div>
                  )}
                  <span className={`anime-status anime-status-${entry.status.toLowerCase()}`}>
                    {animeStatuses[entry.status]}
                  </span>
                  {entry.score > 0 && (
                    <span className="anime-score">
                      <Star size={12} fill="currentColor" />
                      {entry.score.toFixed(1)}
                    </span>
                  )}
                </div>
                <div className="anime-body">
                  <h2>{entry.title}</h2>
                  <div className="anime-progress-label">
                    <span>
                      已看 {entry.watchedEpisodes} / {entry.totalEpisodes || '?'} 集
                    </span>
                    {entry.totalEpisodes > 0 && (
                      <small>
                        {Math.round((entry.watchedEpisodes / entry.totalEpisodes) * 100)}%
                      </small>
                    )}
                  </div>
                  <progress
                    aria-label={`${entry.title}观看进度`}
                    value={entry.watchedEpisodes}
                    max={entry.totalEpisodes || Math.max(1, entry.watchedEpisodes)}
                  />
                  <p className={`anime-note ${expanded.includes(entry.id) ? 'is-expanded' : ''}`}>
                    {entry.note || '还没有留下观后感。'}
                  </p>
                  {entry.note && entry.note.length > 60 && (
                    <button
                      type="button"
                      className="text-button anime-note-toggle"
                      aria-expanded={expanded.includes(entry.id)}
                      onClick={() =>
                        setExpanded((old) =>
                          old.includes(entry.id)
                            ? old.filter((id) => id !== entry.id)
                            : [...old, entry.id],
                        )
                      }
                    >
                      {expanded.includes(entry.id) ? '收起观后感' : '展开观后感'}
                    </button>
                  )}
                  {entry.sourceUrl && (
                    <a
                      className="anime-source"
                      href={entry.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      作品页面 <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </DataState>
    </section>
  )
}
