import { useCallback, useState } from 'react'
import { managementApi, type TaxonomyKind } from '../../api/management'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useAdminAction } from '../../hooks/useAdminAction'
import DataState from '../common/DataState'
import type { ManagedTaxonomy } from '../../types/management'

export default function TaxonomyManager({ kind }: { kind: TaxonomyKind }) {
  const label = kind === 'categories' ? '分类' : '标签'
  const fetch = useCallback(() => managementApi.taxonomy(kind), [kind])
  const { data, loading, error, errorStatus, refresh } = useAsyncData(fetch)
  const { busy, message, run } = useAdminAction(errorStatus)
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<ManagedTaxonomy | null>(null)
  return (
    <section className="card management-card">
      <h2>{label}管理</h2>
      <p className="muted">重命名会同步影响关联文章；使用中的{label}不能删除。</p>
      <form
        className="management-inline-form"
        onSubmit={(event) => {
          event.preventDefault()
          void run(async () => {
            await managementApi.saveTaxonomy(
              kind,
              { name, version: editing?.version || 0 },
              editing?.id,
            )
            setName('')
            setEditing(null)
            refresh()
          })
        }}
      >
        <input
          aria-label={`${label}名称`}
          required
          maxLength={64}
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={busy}
        />
        <button className="button" disabled={busy}>
          {editing ? '保存名称' : `新增${label}`}
        </button>
        {editing && (
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setEditing(null)
              setName('')
            }}
          >
            取消
          </button>
        )}
      </form>
      {message && <p role="status">{message}</p>}
      <DataState loading={loading} error={error} onRetry={refresh}>
        <div className="management-list">
          {data?.map((item) => (
            <div key={item.id}>
              <span>
                <strong>{item.name}</strong>
                <small>{item.count} 篇关联文章（含草稿）</small>
              </span>
              <button
                type="button"
                className="text-button"
                aria-label={`重命名${item.name}`}
                disabled={busy}
                onClick={() => {
                  setEditing(item)
                  setName(item.name)
                }}
              >
                重命名
              </button>
              <button
                type="button"
                className="text-button danger-action"
                aria-label={`删除${item.name}`}
                disabled={busy}
                onClick={() => {
                  if (window.confirm(`删除${label}“${item.name}”？`))
                    void run(async () => {
                      await managementApi.deleteTaxonomy(kind, item)
                      refresh()
                    })
                }}
              >
                删除
              </button>
            </div>
          ))}
        </div>
      </DataState>
    </section>
  )
}
