import { useEffect, useState } from 'react'
import { ExternalLink, Music2 } from 'lucide-react'
import { emptyMusic, musicApi } from '../../api/music'
import type { MusicInput, MusicSettings } from '../../types/music'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useAdminAction } from '../../hooks/useAdminAction'
import { usePageTitle } from '../../hooks/usePageTitle'
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges'
import DataState from '../../components/common/DataState'

const inputFrom = ({ tracks: _tracks, ...settings }: MusicSettings): MusicInput => settings
export default function AdminMusicPage() {
  usePageTitle('音乐管理')
  const { data, loading, error, errorStatus, refresh } = useAsyncData(musicApi.adminSettings)
  const { busy, message, run } = useAdminAction(errorStatus)
  const [form, setForm] = useState<MusicInput>(inputFrom(emptyMusic))
  const [baseline, setBaseline] = useState(JSON.stringify(inputFrom(emptyMusic)))
  useEffect(() => {
    if (data) {
      const next = inputFrom(data)
      setForm(next)
      setBaseline(JSON.stringify(next))
    }
  }, [data])
  useUnsavedChanges(JSON.stringify(form) !== baseline)
  async function save(importTracks: boolean) {
    const next = await musicApi.save(form, importTracks)
    setForm(inputFrom(next))
    setBaseline(JSON.stringify(inputFrom(next)))
    refresh()
    window.dispatchEvent(new Event('music-settings-updated'))
  }
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <h1>
            音乐管理<span className="heading-dot">.</span>
          </h1>
          <p className="muted">关联 QQ 音乐公开主页，导入喜欢的公开歌单。</p>
        </div>
      </div>
      <DataState loading={loading} error={error} onRetry={refresh}>
        <section className="card management-card">
          <form
            className="management-form leisure-form"
            onSubmit={(event) => {
              event.preventDefault()
              void run(() => save(true))
            }}
          >
            <label>
              播放器标题
              <input
                required
                maxLength={100}
                value={form.name}
                disabled={busy}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </label>
            <label>
              QQ 音乐公开主页
              <input
                type="url"
                maxLength={1000}
                placeholder="https://y.qq.com/...（可选）"
                value={form.profileUrl}
                disabled={busy}
                onChange={(event) => setForm({ ...form, profileUrl: event.target.value })}
              />
            </label>
            <label className="leisure-wide">
              QQ 音乐歌单链接或 ID
              <input
                maxLength={1000}
                placeholder="https://y.qq.com/n/ryqq/playlist/你的歌单ID"
                value={form.playlistId}
                disabled={busy}
                onChange={(event) => setForm({ ...form, playlistId: event.target.value })}
              />
            </label>
            <p className="leisure-wide form-help">
              在 QQ 音乐把歌单设为公开，复制完整网页链接或数字
              ID；短分享链接请先用浏览器打开。最多导入前 100 首可解析歌曲。无需 QQ 密码或 Cookie。
            </p>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.enabled}
                disabled={busy}
                onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
              />
              启用前台播放器
            </label>
            <div className="leisure-wide leisure-form-buttons">
              <button className="button" disabled={busy}>
                <Music2 size={15} />
                {busy ? '正在处理…' : '导入并保存歌单'}
              </button>
              <button
                type="button"
                className="text-button"
                disabled={busy}
                onClick={() => void run(() => save(false))}
              >
                仅保存显示设置
              </button>
            </div>
          </form>
          {message && <p role="status">{message}</p>}
          <div className="music-source-note">
            歌单通过可配置的第三方 Meting
            服务解析。公开歌单不代表每首歌都可播放；受限歌曲或音源失效时可跳转 QQ
            音乐。更换歌单、更新歌曲或刷新音源，请使用「导入并保存」。导入失败会保留原歌单。
          </div>
          {data?.tracks.length ? (
            <button
              className="text-button danger-action"
              disabled={busy}
              onClick={() => {
                if (window.confirm('清空当前已导入的歌曲并关闭播放器？'))
                  void run(async () => {
                    const next = await musicApi.clear(form.version)
                    setForm(inputFrom(next))
                    setBaseline(JSON.stringify(inputFrom(next)))
                    refresh()
                  })
              }}
            >
              清空歌单并关闭播放器
            </button>
          ) : null}
        </section>
        <section className="card management-card">
          <div className="management-heading">
            <h2>已导入 {data?.tracks.length || 0} 首歌曲</h2>
            {data?.playlistId && (
              <a
                className="text-button"
                href={`https://y.qq.com/n/ryqq/playlist/${data.playlistId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                在 QQ 音乐打开 <ExternalLink size={13} />
              </a>
            )}
          </div>
          <ol className="admin-track-list">
            {data?.tracks.map((track) => (
              <li key={track.id}>
                <span>
                  <strong>{track.title}</strong>
                  <small>{track.artist || '未知歌手'}</small>
                </span>
              </li>
            ))}
          </ol>
          {!data?.tracks.length && (
            <p className="muted">还没有导入歌曲，填写自己的歌单链接即可开始。</p>
          )}
        </section>
      </DataState>
    </>
  )
}
