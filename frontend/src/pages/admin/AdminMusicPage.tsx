import { useState, type ChangeEvent } from 'react'
import { ExternalLink, Upload, Pencil, X } from 'lucide-react'
import { musicApi, notifyMusicUpdated } from '../../api/music'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useAdminAction } from '../../hooks/useAdminAction'
import { usePageTitle } from '../../hooks/usePageTitle'
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges'
import DataState from '../../components/common/DataState'
import type { MusicSettings, MusicTrack } from '../../types/music'

export default function AdminMusicPage() {
  usePageTitle('本地音乐')
  const { data, loading, error, errorStatus, refresh } = useAsyncData(musicApi.adminSettings)
  const [saved, setSaved] = useState<MusicSettings>()
  const [editing, setEditing] = useState<MusicTrack>()
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const { busy, message, run } = useAdminAction(errorStatus)
  const dirty = !!editing && (title !== editing.title || artist !== editing.artist)
  useUnsavedChanges(dirty)
  const settings = saved || data
  function updated(value: MusicSettings) {
    setSaved(value)
    notifyMusicUpdated()
  }
  function edit(track: MusicTrack) {
    setEditing(track)
    setTitle(track.title)
    setArtist(track.artist)
  }
  function uploadAudio(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    void run(async () => {
      if (file.size > 50 * 1024 * 1024) throw new Error('音乐不能超过 50MB')
      updated(await musicApi.upload(file))
    })
  }
  function uploadCover(event: ChangeEvent<HTMLInputElement>, track: MusicTrack) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    void run(async () => updated(await musicApi.cover(track.id, track.version || 0, file)))
  }
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <h1>
            本地音乐<span className="heading-dot">.</span>
          </h1>
          <p className="muted">上传喜欢的歌，为它补上名字与封面。</p>
        </div>
      </div>
      {message && (
        <p role="status" className="form-message">
          {message}
        </p>
      )}
      <DataState
        loading={loading}
        error={error}
        onRetry={() => {
          setSaved(undefined)
          refresh()
        }}
      >
        <section className="card management-card">
          <div className="music-library-heading">
            <div>
              <h2>音乐库 · {settings?.tracks.length || 0} 首</h2>
              <p className="muted">音乐最多 50MB，封面最多 5MB。上传后直接出现在播放器中。</p>
            </div>
            <label className={`button music-upload-button ${busy || editing ? 'is-disabled' : ''}`}>
              <Upload size={16} />
              {busy ? '正在处理…' : '上传音乐'}
              <input
                aria-label="上传音乐"
                type="file"
                accept=".mp3,.wav,.ogg,.m4a,.aac,.flac,.opus,.webm"
                disabled={busy || !!editing}
                onChange={uploadAudio}
              />
            </label>
          </div>
          <ol className="admin-track-list music-library-list">
            {settings?.tracks.map((track) => (
              <li key={track.id}>
                <div className="music-library-row">
                  {track.cover ? (
                    <img
                      className="music-library-cover"
                      src={track.cover}
                      alt={`${track.title}封面`}
                    />
                  ) : (
                    <div
                      className="music-library-cover music-library-placeholder"
                      aria-hidden="true"
                    >
                      ♪
                    </div>
                  )}
                  <span className="music-library-info">
                    <strong>{track.title}</strong>
                    <small>{track.artist || '未填写歌手'}</small>
                  </span>
                  <div className="music-library-actions">
                    <a
                      className="text-button"
                      href={track.audioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`试听 ${track.title}`}
                    >
                      试听 <ExternalLink size={13} />
                    </a>
                    <label
                      className={`text-button music-upload-button ${busy || editing ? 'is-disabled' : ''}`}
                    >
                      更换封面
                      <input
                        type="file"
                        aria-label={`更换 ${track.title} 封面`}
                        accept="image/*"
                        disabled={busy || !!editing}
                        onChange={(event) => uploadCover(event, track)}
                      />
                    </label>
                    <button
                      className="text-button"
                      disabled={busy || !!editing}
                      onClick={() => edit(track)}
                      aria-label={`编辑 ${track.title}`}
                    >
                      <Pencil size={13} /> 编辑
                    </button>
                  </div>
                </div>
                {editing?.id === track.id && (
                  <form
                    className="music-track-editor"
                    onSubmit={(event) => {
                      event.preventDefault()
                      void run(async () => {
                        updated(await musicApi.save(track.id, title, artist, editing.version || 0))
                        setEditing(undefined)
                      })
                    }}
                  >
                    <label>
                      歌名
                      <input
                        value={title}
                        maxLength={120}
                        required
                        disabled={busy}
                        onChange={(event) => setTitle(event.target.value)}
                      />
                    </label>
                    <label>
                      歌手
                      <input
                        value={artist}
                        maxLength={120}
                        disabled={busy}
                        onChange={(event) => setArtist(event.target.value)}
                      />
                    </label>
                    <div className="music-library-actions">
                      <button className="button" disabled={busy || !title.trim()}>
                        {busy ? '保存中…' : '保存资料'}
                      </button>
                      <button
                        type="button"
                        className="text-button"
                        disabled={busy}
                        onClick={() => setEditing(undefined)}
                      >
                        <X size={14} />
                        取消
                      </button>
                    </div>
                  </form>
                )}
              </li>
            ))}
          </ol>
          {!settings?.tracks.length && (
            <p className="muted">还没有歌曲，上传第一首喜欢的音乐吧。</p>
          )}
          <details className="music-storage-note">
            <summary>本地目录与部署说明</summary>
            <p className="muted">
              也可继续向 <code>frontend/public/music/</code>{' '}
              放入音乐，后端会自动识别。后台上传的音乐、封面和编辑资料保存在后端音乐目录，默认{' '}
              <code>uploads/music/</code>，请一并备份。生产环境可通过 MUSIC_SOURCE_DIRECTORY
              指定原有歌曲目录。
            </p>
          </details>
        </section>
      </DataState>
    </>
  )
}
