import { useCallback, useEffect, useState } from 'react'
import { Camera, Search, X } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { albumsApi } from '../api/albums'
import { useAsyncData } from '../hooks/useAsyncData'
import { usePageTitle } from '../hooks/usePageTitle'
import DataState from '../components/common/DataState'
export default function AlbumsPage() {
  usePageTitle('光影画廊 · 相册')
  const [params, setParams] = useSearchParams()
  const keyword = (params.get('q') || '').slice(0, 100)
  const [search, setSearch] = useState(keyword)
  useEffect(() => {
    setSearch(keyword)
  }, [keyword])
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search.trim() !== keyword)
        setParams(search.trim() ? { q: search.trim() } : {}, { replace: true })
    }, 300)
    return () => window.clearTimeout(timer)
  }, [search, keyword, setParams])
  const fetchAlbums = useCallback(() => albumsApi.list(keyword), [keyword])
  const { data, loading, error, refresh } = useAsyncData(fetchAlbums)
  return (
    <section className="card content-page albums-page album-gallery-page">
      <header className="album-gallery-header">
        <div className="album-heading">
          <span className="eyebrow">生活里的光与影</span>
          <h1>
            光影画廊<span className="heading-dot">.</span>
          </h1>
          <p>把日常收藏成册，留住值得记住的瞬间。</p>
        </div>
        <div className="album-gallery-tools">
          <form
            className="album-search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault()
              setParams(search.trim() ? { q: search.trim() } : {}, { replace: true })
            }}
          >
            <Search size={19} />
            <input
              type="search"
              aria-label="搜索相册或照片说明"
              placeholder="搜索相册名或照片说明…"
              maxLength={100}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                aria-label="清空相册搜索"
                onClick={() => {
                  setSearch('')
                  setParams({}, { replace: true })
                }}
              >
                <X size={16} />
              </button>
            )}
          </form>
          <p className="album-result-count" role="status">
            {loading
              ? '正在整理照片…'
              : error
                ? ''
                : keyword
                  ? `找到 ${data?.length ?? 0} 本相册`
                  : `${data?.length ?? 0} 本相册 · 慢慢翻看`}
          </p>
        </div>
      </header>
      {loading && (
        <div className="album-gallery-skeleton" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} />
          ))}
        </div>
      )}
      <DataState loading={false} error={error} onRetry={refresh}>
        {!loading && data?.length === 0 && (
          <div className="album-empty">
            <Camera size={36} />
            <h2>{keyword ? '没有找到匹配的相册' : '故事即将在这里展开'}</h2>
            <p>
              {keyword ? '试试其他相册名，或照片里的关键词。' : '还没有公开的相册，照片正在路上。'}
            </p>
            {keyword && (
              <button
                className="text-button"
                onClick={() => {
                  setSearch('')
                  setParams({}, { replace: true })
                }}
              >
                查看全部相册
              </button>
            )}
          </div>
        )}
        <div className="album-grid">
          {data?.map((album) => {
            const cover = album.cover || album.previewImages[0]
            const layers = album.previewImages.filter((url) => url !== cover)
            return (
              <Link className="album-card" key={album.id} to={`/albums/${album.id}`}>
                <div className="album-photo-stack">
                  {[0, 1].map((index) => (
                    <span
                      key={index}
                      className={`album-stack-layer album-stack-layer-${index}`}
                      aria-hidden="true"
                    >
                      {(layers[index] || cover) && (
                        <img src={layers[index] || cover} alt="" loading="lazy" />
                      )}
                    </span>
                  ))}
                  <div className="album-cover">
                    {cover ? (
                      <img
                        src={cover}
                        alt={album.title}
                        loading="lazy"
                        onError={(e) => e.currentTarget.classList.add('album-image-failed')}
                      />
                    ) : (
                      <div className="album-cover-placeholder">
                        <Camera size={42} />
                        <span>等待第一张照片</span>
                      </div>
                    )}
                    <span className="album-photo-count">{album.photoCount} 张照片</span>
                  </div>
                </div>
                <div className="album-card-copy">
                  <div className="album-title-line">
                    <h2>{album.title}</h2>
                    <time dateTime={album.createdAt}>{album.createdAt.slice(0, 10)}</time>
                  </div>
                  <p>{album.description || '打开相册，看看里面的故事。'}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </DataState>
    </section>
  )
}
