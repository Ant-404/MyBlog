import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, X, Camera } from 'lucide-react'
import { albumsApi } from '../api/albums'
import { useAsyncData } from '../hooks/useAsyncData'
import { usePageTitle } from '../hooks/usePageTitle'
import DataState from '../components/common/DataState'
export default function AlbumDetailPage() {
  const { id = '' } = useParams()
  const fetchAlbum = useCallback(() => albumsApi.detail(id), [id])
  const { data, loading, error, refresh } = useAsyncData(fetchAlbum)
  const [active, setActive] = useState<number | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  usePageTitle(data?.title || '相册')
  useEffect(() => {
    setActive(null)
  }, [id])
  useEffect(() => {
    if (active === null) return
    const modal = dialog.current
    previousFocus.current = document.activeElement as HTMLElement
    modal?.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      modal?.close()
      document.body.style.overflow = overflow
      previousFocus.current?.focus()
    }
  }, [active !== null])
  const photo = active === null ? undefined : data?.photos[active]
  function step(direction: number) {
    if (data?.photos.length)
      setActive((value) => ((value ?? 0) + direction + data.photos.length) % data.photos.length)
  }
  return (
    <section className="card content-page albums-page album-detail-page">
      <Link className="album-back" to="/albums">
        <ArrowLeft size={16} />
        全部相册
      </Link>
      <DataState loading={loading} error={error} onRetry={refresh}>
        {data && (
          <>
            <div className="album-heading">
              <span className="album-eyebrow">{data.photoCount} PHOTOS</span>
              <h1>
                {data.title}
                <span className="heading-dot">.</span>
              </h1>
              <p className="album-description">{data.description}</p>
            </div>
            {data.photos.length === 0 && (
              <div className="album-empty">
                <Camera size={36} />
                <p>这个相册还没有照片。</p>
              </div>
            )}
            <div className="album-photo-grid">
              {data.photos.map((item, index) => (
                <figure key={index}>
                  <button
                    type="button"
                    className="album-photo-button"
                    onClick={() => setActive(index)}
                    aria-label={`查看照片 ${index + 1}：${item.caption || data.title}`}
                  >
                    <img
                      src={item.url}
                      alt={item.caption || `${data.title} · 照片 ${index + 1}`}
                      loading="lazy"
                    />
                  </button>
                  {item.caption && <figcaption>{item.caption}</figcaption>}
                </figure>
              ))}
            </div>
          </>
        )}
      </DataState>
      <dialog
        ref={dialog}
        className="album-lightbox"
        aria-label="照片预览"
        onCancel={() => setActive(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setActive(null)
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') {
            event.preventDefault()
            step(-1)
          }
          if (event.key === 'ArrowRight') {
            event.preventDefault()
            step(1)
          }
        }}
      >
        {photo && (
          <>
            <button
              autoFocus
              className="album-lightbox-close"
              onClick={() => setActive(null)}
              aria-label="关闭照片预览"
            >
              <X />
            </button>
            <div className="album-lightbox-stage">
              <button
                disabled={(data?.photos.length || 0) < 2}
                onClick={() => step(-1)}
                aria-label="上一张照片"
              >
                <ChevronLeft />
              </button>
              <img src={photo.url} alt={photo.caption || data?.title} />
              <button
                disabled={(data?.photos.length || 0) < 2}
                onClick={() => step(1)}
                aria-label="下一张照片"
              >
                <ChevronRight />
              </button>
            </div>
            <p aria-live="polite">
              {(active ?? 0) + 1} / {data?.photos.length}
              {photo.caption && ` · ${photo.caption}`}
            </p>
          </>
        )}
      </dialog>
    </section>
  )
}
