import { useEffect, useState } from 'react'
import { managementApi } from '../../api/management'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useAdminAction } from '../../hooks/useAdminAction'
import { usePageTitle } from '../../hooks/usePageTitle'
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges'
import DataState from '../../components/common/DataState'
import MediaLibrary from '../../components/admin/MediaLibrary'
import type { SiteSettings } from '../../types/management'
const fields = [
  ['name', '站点简称', 64],
  ['title', '站点标题', 100],
  ['subtitle', '副标题', 200],
  ['author', '作者昵称', 64],
  ['bio', '个人简介', 200],
  ['description', '站点描述', 500],
  ['publicUrl', '站点公开地址', 500],
  ['avatar', '头像地址', 500],
] as const
export default function AdminSettingsPage() {
  usePageTitle('站点设置')
  const { data, loading, error, errorStatus, refresh } = useAsyncData(managementApi.settings)
  const { busy, message, run } = useAdminAction(errorStatus)
  const [form, setForm] = useState<SiteSettings>()
  const [baseline, setBaseline] = useState('')
  const [choose, setChoose] = useState(false)
  useEffect(() => {
    if (data) {
      setForm(data)
      setBaseline(JSON.stringify(data))
    }
  }, [data])
  useUnsavedChanges(!!form && baseline !== JSON.stringify(form))
  return (
    <>
      <div className="admin-page-heading">
        <h1>
          站点设置<span className="heading-dot">.</span>
        </h1>
      </div>
      <DataState loading={loading} error={error} onRetry={refresh}>
        {form && (
          <section className="card management-card">
            <form
              className="management-form"
              onSubmit={(event) => {
                event.preventDefault()
                void run(async () => {
                  const next = await managementApi.saveSettings(form)
                  setForm(next)
                  setBaseline(JSON.stringify(next))
                  window.dispatchEvent(new Event('site-settings-updated'))
                })
              }}
            >
              {fields.map(([key, label, max]) => (
                <label key={key}>
                  {label}
                  <input
                    value={form[key]}
                    disabled={busy}
                    maxLength={max}
                    required={['name', 'title', 'author', 'publicUrl'].includes(key)}
                    type={key === 'publicUrl' ? 'url' : 'text'}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </label>
              ))}
              <p className="muted">上线后将站点公开地址改成你的域名根地址，用于 RSS 和站点地图。</p>
              <button
                type="button"
                className="text-button"
                disabled={busy}
                onClick={() => setChoose(!choose)}
              >
                {choose ? '关闭头像选择' : '上传 / 选择头像'}
              </button>
              <label>
                关于页面正文（Markdown）
                <textarea
                  rows={8}
                  maxLength={20000}
                  value={form.aboutContent}
                  disabled={busy}
                  onChange={(e) => setForm({ ...form, aboutContent: e.target.value })}
                />
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.commentsEnabled}
                  disabled={busy}
                  onChange={(e) => setForm({ ...form, commentsEnabled: e.target.checked })}
                />
                开放评论（需审核）
              </label>
              <button className="button" disabled={busy}>
                保存站点设置
              </button>
            </form>
            {choose && (
              <MediaLibrary
                disabled={busy}
                onSelect={(url) => {
                  setForm({ ...form, avatar: url })
                  setChoose(false)
                }}
              />
            )}
            {message && <p role="status">{message}</p>}
          </section>
        )}
      </DataState>
    </>
  )
}
