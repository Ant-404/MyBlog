import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { mediaApi } from '../../api/media'
import { HttpError } from '../../api/http'
import { useAsyncData } from '../../hooks/useAsyncData'
import DataState from '../common/DataState'

export default function MediaLibrary({
  onSelect,
  disabled = false,
}: {
  onSelect?: (url: string) => void
  disabled?: boolean
}) {
  const { data, loading, error, errorStatus, refresh } = useAsyncData(mediaApi.list)
  const { expire } = useOutletContext<{ expire: () => void }>()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => {
    if (errorStatus === 401) expire()
  }, [errorStatus, expire])
  async function action(work: () => Promise<unknown>) {
    if (busy || disabled) return
    setBusy(true)
    setMessage('')
    try {
      await work()
      refresh()
    } catch (cause) {
      if (cause instanceof HttpError && cause.status === 401) expire()
      else setMessage(cause instanceof Error ? cause.message : '操作失败')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="media-library">
      <label className="media-upload">
        上传 PNG / JPEG（最多 5MB）
        <input
          aria-label="上传图片"
          type="file"
          accept="image/png,image/jpeg"
          disabled={busy || disabled}
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void action(() => mediaApi.upload(file))
          }}
        />
      </label>
      <p className="muted">最近 200 张图片。正在被文章或站点设置引用的图片不能删除。</p>
      {busy && <p role="status">正在处理…</p>}
      {message && (
        <p className="form-error" role="alert">
          {message}
        </p>
      )}
      <DataState loading={loading} error={error} onRetry={refresh}>
        <div className="media-grid">
          {data?.map((file) => (
            <article className="media-item" key={file.id}>
              <img src={file.url} alt={file.originalName} loading="lazy" />
              <strong>{file.originalName}</strong>
              <small>{Math.ceil(file.sizeBytes / 1024)} KB</small>
              <div>
                {onSelect ? (
                  <button
                    type="button"
                    className="text-button"
                    disabled={busy || disabled}
                    onClick={() => onSelect(file.url)}
                  >
                    选择图片
                  </button>
                ) : (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      void navigator.clipboard
                        .writeText(file.url)
                        .then(() => setMessage('图片地址已复制'))
                        .catch(() => setMessage(file.url))
                    }}
                  >
                    复制地址
                  </button>
                )}
                <button
                  type="button"
                  className="danger-action"
                  disabled={busy || disabled}
                  onClick={() => {
                    if (window.confirm(`删除图片“${file.originalName}”？此操作无法撤销。`))
                      void action(() => mediaApi.remove(file.id))
                  }}
                >
                  删除图片
                </button>
              </div>
            </article>
          ))}
        </div>
        {data?.length === 0 && <p className="muted">还没有上传图片。</p>}
      </DataState>
    </div>
  )
}
