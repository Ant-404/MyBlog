import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Camera, ArrowUp, ArrowDown } from 'lucide-react'
import { albumsApi } from '../../api/albums'
import type { Album, AlbumInput } from '../../types/album'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useAdminAction } from '../../hooks/useAdminAction'
import { usePageTitle } from '../../hooks/usePageTitle'
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges'
import DataState from '../../components/common/DataState'
import MediaLibrary from '../../components/admin/MediaLibrary'
const empty: AlbumInput = {
  title: '',
  description: '',
  cover: '',
  sortOrder: 0,
  visible: false,
  version: 0,
  photos: [],
}
export default function AdminAlbumsPage() {
  usePageTitle('相册管理')
  const { data, loading, error, errorStatus, refresh } = useAsyncData(albumsApi.adminList)
  const { busy, message, run } = useAdminAction(errorStatus)
  const [form, setForm] = useState<AlbumInput>(empty)
  const [id, setId] = useState<number>()
  const [baseline, setBaseline] = useState(JSON.stringify(empty))
  const [picker, setPicker] = useState<'cover' | 'photos' | null>(null)
  const dirty = JSON.stringify(form) !== baseline
  useUnsavedChanges(dirty)
  function load(album?: Album) {
    const next = album || { ...empty, photos: [] }
    setForm(next)
    setId(album?.id)
    setBaseline(JSON.stringify(next))
    setPicker(null)
  }
  function maySwitch() {
    return !dirty || window.confirm('当前相册有未保存的修改，确定放弃吗？')
  }
  function move(index: number, direction: number) {
    const photos = [...form.photos]
    const target = index + direction
    if (target < 0 || target >= photos.length) return
    ;[photos[index], photos[target]] = [photos[target], photos[index]]
    setForm({ ...form, photos })
  }
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <h1>
            相册管理<span className="heading-dot">.</span>
          </h1>
          <p className="muted">创建自己的相册，上传照片，记录每一段日常。</p>
        </div>
        <Link to="/albums" className="text-button">
          查看前台相册
        </Link>
      </div>
      <section className="card management-card">
        <h2>{id ? '编辑相册' : '创建相册'}</h2>
        <form
          className="management-form"
          onSubmit={(event) => {
            event.preventDefault()
            void run(async () => {
              const saved = await albumsApi.save(form, id)
              load(saved)
              refresh()
            })
          }}
        >
          <fieldset className="album-fields" disabled={busy}>
            <label>
              相册名称
              <input
                required
                maxLength={200}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label>
              相册介绍
              <textarea
                rows={3}
                maxLength={2000}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <div className="album-form-row">
              <label>
                封面地址（可留空）
                <input
                  maxLength={1000}
                  value={form.cover}
                  onChange={(e) => setForm({ ...form, cover: e.target.value })}
                />
              </label>
              <button
                className="text-button"
                type="button"
                onClick={() => setPicker(picker === 'cover' ? null : 'cover')}
              >
                上传 / 选择封面
              </button>
            </div>
            {form.cover && (
              <img className="album-admin-cover" src={form.cover} alt="相册封面预览" />
            )}
            <label>
              相册排序（小的在前）
              <input
                required
                type="number"
                min={-10000}
                max={10000}
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
              />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.visible}
                onChange={(e) => setForm({ ...form, visible: e.target.checked })}
              />
              公开显示
            </label>
            <div className="album-form-row">
              <h3>照片 · {form.photos.length} / 200</h3>
              <button
                type="button"
                className="text-button"
                disabled={form.photos.length >= 200}
                onClick={() => setPicker(picker === 'photos' ? null : 'photos')}
              >
                上传 / 添加照片
              </button>
            </div>
            <p className="muted">从图片库选择照片后，点击下方保存。可用上下箭头调整照片顺序。</p>
            {form.photos.length === 0 && (
              <div className="album-empty">
                <Camera size={28} />
                <p>还没有照片，先创建空相册也可以。</p>
              </div>
            )}
            <div className="album-editor-photos">
              {form.photos.map((photo, index) => (
                <div className="album-editor-photo" key={index}>
                  <img src={photo.url} alt={photo.caption || `照片 ${index + 1}`} />
                  <label>
                    照片 {index + 1} 说明
                    <input
                      maxLength={500}
                      value={photo.caption}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          photos: form.photos.map((p, i) =>
                            i === index ? { ...p, caption: e.target.value } : p,
                          ),
                        })
                      }
                    />
                  </label>
                  <div className="album-photo-actions">
                    <button
                      type="button"
                      className="text-button"
                      disabled={index === 0}
                      aria-label={`上移照片 ${index + 1}`}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      disabled={index === form.photos.length - 1}
                      aria-label={`下移照片 ${index + 1}`}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown size={16} />
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setForm({ ...form, cover: photo.url })}
                    >
                      设为封面
                    </button>
                    <button
                      type="button"
                      className="text-button danger-action"
                      aria-label={`移除照片 ${index + 1}`}
                      onClick={() =>
                        setForm({ ...form, photos: form.photos.filter((_, i) => i !== index) })
                      }
                    >
                      移除
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="album-form-row">
              <button className="button" type="submit">
                {busy ? '保存中…' : id ? '保存相册' : '创建相册'}
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  if (maySwitch()) load()
                }}
              >
                新建 / 清空表单
              </button>
              {id && form.visible && (
                <Link to={`/albums/${id}`} className="text-button">
                  查看相册
                </Link>
              )}
            </div>
          </fieldset>
        </form>
        {message && <p role="status">{message}</p>}
      </section>
      {picker && (
        <section className="card management-card">
          <h2>{picker === 'cover' ? '选择相册封面' : '添加照片'}</h2>
          <p className="muted">上传后点击“选择图片”；可连续选择多张，完成后保存相册。</p>
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={() => setPicker(null)}
          >
            收起图片库
          </button>
          <MediaLibrary
            disabled={busy || (picker === 'photos' && form.photos.length >= 200)}
            onSelect={(url) => {
              if (picker === 'cover') {
                setForm({ ...form, cover: url })
                setPicker(null)
              } else
                setForm((current) =>
                  current.photos.length >= 200 || current.photos.some((p) => p.url === url)
                    ? current
                    : { ...current, photos: [...current.photos, { url, caption: '' }] },
                )
            }}
          />
        </section>
      )}
      <DataState loading={loading} error={error} onRetry={refresh}>
        <section className="card management-card management-list">
          <h2>全部相册</h2>
          {data?.length === 0 && <p className="muted">还没有相册，在上方创建第一个相册吧。</p>}
          {data?.map((album) => (
            <div key={album.id}>
              <span>
                <strong>{album.title}</strong>
                <small>
                  {album.photoCount} 张照片 · {album.visible ? '公开' : '隐藏'} · 排序{' '}
                  {album.sortOrder}
                </small>
              </span>
              <button
                type="button"
                className="text-button"
                aria-label={`编辑${album.title}`}
                disabled={busy}
                onClick={() => {
                  if (maySwitch())
                    void run(async () => {
                      load(await albumsApi.adminDetail(album.id))
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    })
                }}
              >
                编辑
              </button>
              <button
                type="button"
                className="text-button danger-action"
                aria-label={`删除${album.title}`}
                disabled={busy}
                onClick={() => {
                  if (window.confirm(`删除相册“${album.title}”？照片文件会保留在图片库中。`))
                    void run(async () => {
                      await albumsApi.remove(album)
                      if (id === album.id) load()
                      refresh()
                    })
                }}
              >
                删除
              </button>
            </div>
          ))}
        </section>
      </DataState>
    </>
  )
}
