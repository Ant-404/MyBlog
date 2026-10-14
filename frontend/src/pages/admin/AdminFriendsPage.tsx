import { useState } from 'react'
import { managementApi } from '../../api/management'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useAdminAction } from '../../hooks/useAdminAction'
import { usePageTitle } from '../../hooks/usePageTitle'
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges'
import DataState from '../../components/common/DataState'
import type { ManagedFriend } from '../../types/management'
const empty = { name: '', description: '', url: '', sortOrder: 0, visible: true, version: 0 }
export default function AdminFriendsPage() {
  usePageTitle('友链管理')
  const { data, loading, error, errorStatus, refresh } = useAsyncData(managementApi.friends)
  const { busy, message, run } = useAdminAction(errorStatus)
  const [form, setForm] = useState(empty)
  const [baseline, setBaseline] = useState(JSON.stringify(empty))
  const [id, setId] = useState<number>()
  useUnsavedChanges(JSON.stringify(form) !== baseline)
  function edit(item?: ManagedFriend) {
    const next = item || empty
    setForm(next)
    setBaseline(JSON.stringify(next))
    setId(item?.id)
  }
  return (
    <>
      <div className="admin-page-heading">
        <h1>
          友链管理<span className="heading-dot">.</span>
        </h1>
      </div>
      <section className="card management-card">
        <form
          className="management-form"
          onSubmit={(event) => {
            event.preventDefault()
            void run(async () => {
              await managementApi.saveFriend(form, id)
              edit()
              refresh()
            })
          }}
        >
          <label>
            友链名称
            <input
              required
              maxLength={100}
              value={form.name}
              disabled={busy}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            简介
            <textarea
              maxLength={300}
              value={form.description}
              disabled={busy}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          <label>
            网站地址
            <input
              type="url"
              required
              maxLength={500}
              value={form.url}
              disabled={busy}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
            />
          </label>
          <label>
            排序（小的在前）
            <input
              type="number"
              min={-10000}
              max={10000}
              value={form.sortOrder}
              disabled={busy}
              onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.visible}
              disabled={busy}
              onChange={(e) => setForm({ ...form, visible: e.target.checked })}
            />
            公开显示
          </label>
          <div>
            <button className="button" disabled={busy}>
              {id ? '保存友链' : '新增友链'}
            </button>
            {id && (
              <button type="button" className="text-button" onClick={() => edit()}>
                取消编辑
              </button>
            )}
          </div>
        </form>
        {message && <p role="status">{message}</p>}
      </section>
      <DataState loading={loading} error={error} onRetry={refresh}>
        <section className="card management-card management-list">
          {data?.map((item) => (
            <div key={item.id}>
              <span>
                <strong>{item.name}</strong>
                <small>
                  {item.url} · {item.visible ? '公开' : '隐藏'}
                </small>
              </span>
              <button
                className="text-button"
                aria-label={`编辑${item.name}`}
                disabled={busy}
                onClick={() => edit(item)}
              >
                编辑
              </button>
              <button
                className="text-button danger-action"
                aria-label={`删除${item.name}`}
                disabled={busy}
                onClick={() => {
                  if (window.confirm(`删除友链“${item.name}”？`))
                    void run(async () => {
                      await managementApi.deleteFriend(item)
                      refresh()
                      if (id === item.id) edit()
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
