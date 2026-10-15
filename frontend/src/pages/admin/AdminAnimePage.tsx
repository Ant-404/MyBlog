import { useState } from 'react'
import { animeApi } from '../../api/anime'
import { animeStatuses, type AnimeEntry } from '../../types/anime'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useAdminAction } from '../../hooks/useAdminAction'
import { usePageTitle } from '../../hooks/usePageTitle'
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges'
import DataState from '../../components/common/DataState'
import MediaLibrary from '../../components/admin/MediaLibrary'

const empty: Omit<AnimeEntry, 'id'> = {
  title: '',
  cover: '',
  status: 'WATCHING',
  watchedEpisodes: 0,
  totalEpisodes: 0,
  score: 0,
  note: '',
  sourceUrl: '',
  sortOrder: 0,
  visible: true,
  version: 0,
}
export default function AdminAnimePage() {
  usePageTitle('追番管理')
  const { data, loading, error, errorStatus, refresh } = useAsyncData(animeApi.adminList)
  const { busy, message, run } = useAdminAction(errorStatus)
  const [form, setForm] = useState(empty)
  const [id, setId] = useState<number>()
  const [baseline, setBaseline] = useState(JSON.stringify(empty))
  const [chooseCover, setChooseCover] = useState(false)
  useUnsavedChanges(JSON.stringify(form) !== baseline)
  function edit(item?: AnimeEntry) {
    const next = item ? { ...item } : { ...empty }
    setForm(next)
    setBaseline(JSON.stringify(next))
    setId(item?.id)
    setChooseCover(false)
  }
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <h1>
            追番管理<span className="heading-dot">.</span>
          </h1>
          <p className="muted">记录自己的观看进度，公开后展示在追番页面。</p>
        </div>
      </div>
      <section className="card management-card">
        <form
          className="management-form leisure-form"
          onSubmit={(event) => {
            event.preventDefault()
            void run(async () => {
              await animeApi.save(form, id)
              edit()
              refresh()
            })
          }}
        >
          <label>
            番剧名称
            <input
              required
              maxLength={200}
              value={form.title}
              disabled={busy}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </label>
          <label>
            观看状态
            <select
              value={form.status}
              disabled={busy}
              onChange={(event) =>
                setForm({
                  ...form,
                  status: event.target.value as AnimeEntry['status'],
                  ...(event.target.value === 'COMPLETED' && form.totalEpisodes > 0
                    ? { watchedEpisodes: form.totalEpisodes }
                    : {}),
                })
              }
            >
              {Object.entries(animeStatuses).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            已看集数
            <input
              required
              type="number"
              min="0"
              max={form.totalEpisodes || 100000}
              value={form.watchedEpisodes}
              disabled={busy}
              onChange={(event) =>
                setForm({ ...form, watchedEpisodes: Number(event.target.value) })
              }
            />
          </label>
          <label>
            总集数（未知填 0）
            <input
              required
              type="number"
              min="0"
              max="100000"
              value={form.totalEpisodes}
              disabled={busy}
              onChange={(event) => setForm({ ...form, totalEpisodes: Number(event.target.value) })}
            />
          </label>
          <label>
            个人评分（0 表示未评）
            <input
              required
              type="number"
              min="0"
              max="10"
              step="0.5"
              value={form.score}
              disabled={busy}
              onChange={(event) => setForm({ ...form, score: Number(event.target.value) })}
            />
          </label>
          <label>
            排序（小的在前）
            <input
              required
              type="number"
              min="-10000"
              max="10000"
              value={form.sortOrder}
              disabled={busy}
              onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })}
            />
          </label>
          <label>
            番剧封面地址
            <input
              maxLength={1000}
              value={form.cover}
              disabled={busy}
              onChange={(event) => setForm({ ...form, cover: event.target.value })}
            />
          </label>
          <div className="leisure-form-action">
            <button
              className="text-button"
              type="button"
              disabled={busy}
              onClick={() => setChooseCover(!chooseCover)}
            >
              {chooseCover ? '收起图片库' : '上传 / 选择番剧封面'}
            </button>
          </div>
          <label className="leisure-wide">
            作品链接
            <input
              type="url"
              maxLength={1000}
              value={form.sourceUrl}
              disabled={busy}
              onChange={(event) => setForm({ ...form, sourceUrl: event.target.value })}
            />
          </label>
          <label className="leisure-wide">
            观后感
            <textarea
              rows={4}
              maxLength={2000}
              value={form.note}
              disabled={busy}
              onChange={(event) => setForm({ ...form, note: event.target.value })}
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.visible}
              disabled={busy}
              onChange={(event) => setForm({ ...form, visible: event.target.checked })}
            />
            公开显示
          </label>
          <div className="leisure-wide leisure-form-buttons">
            <button className="button" disabled={busy}>
              {id ? '保存追番记录' : '新增追番记录'}
            </button>
            {id && (
              <button className="text-button" type="button" disabled={busy} onClick={() => edit()}>
                取消编辑
              </button>
            )}
          </div>
        </form>
        {message && <p role="status">{message}</p>}
      </section>
      {chooseCover && (
        <section className="card management-card">
          <MediaLibrary
            disabled={busy}
            onSelect={(url) => {
              setForm({ ...form, cover: url })
              setChooseCover(false)
            }}
          />
        </section>
      )}
      <DataState loading={loading} error={error} onRetry={refresh} empty={data?.length === 0}>
        <section className="card management-card management-list">
          {data?.map((entry) => (
            <div key={entry.id}>
              <span>
                <strong>{entry.title}</strong>
                <small>
                  {animeStatuses[entry.status]} · {entry.watchedEpisodes}/
                  {entry.totalEpisodes || '?'} 集 · {entry.visible ? '公开' : '隐藏'}
                </small>
              </span>
              <button
                className="text-button"
                aria-label={`编辑${entry.title}`}
                disabled={busy}
                onClick={() => edit(entry)}
              >
                编辑
              </button>
              <button
                className="text-button danger-action"
                aria-label={`删除${entry.title}`}
                disabled={busy}
                onClick={() => {
                  if (window.confirm(`删除追番记录“${entry.title}”？`))
                    void run(async () => {
                      await animeApi.delete(entry)
                      if (id === entry.id) edit()
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
