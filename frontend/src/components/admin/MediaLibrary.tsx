import { useCallback, useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { mediaApi } from '../../api/media'
import { HttpError } from '../../api/http'
import { useAsyncData } from '../../hooks/useAsyncData'
import DataState from '../common/DataState'
import ContentPagination from '../common/ContentPagination'

export default function MediaLibrary({
  onSelect,
  onSelectMany,
  maxSelection = 200,
  disabled = false,
}: {
  onSelect?: (url: string) => void
  onSelectMany?: (urls: string[]) => void
  maxSelection?: number
  disabled?: boolean
}) {
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const { data, loading, error, errorStatus, refresh } = useAsyncData(
    useCallback(() => mediaApi.page(page, keyword), [page, keyword]),
  )
  useEffect(() => {
    if (data && page > Math.max(1, Math.ceil(data.total / data.size)))
      setPage(Math.max(1, Math.ceil(data.total / data.size)))
  }, [data, page])
  const { expire } = useOutletContext<{ expire: () => void }>()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState('')
  const [uploadingName, setUploadingName] = useState('')
  const [uploadPhase, setUploadPhase] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [failedFiles, setFailedFiles] = useState<File[]>([])
  const [completed, setCompleted] = useState(0)
  const [uploadTotal, setUploadTotal] = useState(0)
  async function uploadFiles(files: File[]) {
    if (busy || disabled || !files.length) return
    setBusy(true)
    setMessage('')
    setSuccess('')
    setCompleted(0)
    setUploadTotal(files.length)
    const failures: File[] = []
    let uploadedCount = 0
    const uploadedNames: string[] = []
    for (let index = 0; index < files.length; index++) {
      const file = files[index]
      setUploadingName(file.name)
      setUploadPhase('正在准备')
      try {
        const uploaded = await mediaApi.upload(file, (phase) =>
          setUploadPhase(phase === 'converting' ? '正在转换图片格式' : '正在上传'),
        )
        uploadedNames.push(uploaded.originalName)
        uploadedCount++
      } catch (cause) {
        failures.push(file)
        if (cause instanceof HttpError && cause.status === 401) {
          failures.push(...files.slice(index + 1))
          expire()
          break
        }
        setMessage(cause instanceof Error ? cause.message : '上传失败')
      } finally {
        setCompleted(index + 1)
      }
    }
    setFailedFiles(failures)
    setSuccess(
      uploadedCount
        ? `已上传 ${uploadedCount} 张（${uploadedNames.join('、')}），失败 ${failures.length} 张。${onSelect || onSelectMany ? '请从下方选择图片，再保存当前页面。' : ''}`
        : '',
    )
    setPage(1)
    setKeyword('')
    setSearch('')
    setUploadingName('')
    setBusy(false)
    refresh()
  }
  useEffect(() => {
    if (errorStatus === 401) expire()
  }, [errorStatus, expire])
  async function action<T>(
    work: () => Promise<T>,
    successMessage: string | ((result: T) => string) = '',
  ) {
    if (busy || disabled) return
    setBusy(true)
    setMessage('')
    setSuccess('')
    try {
      const result = await work()
      setSuccess(typeof successMessage === 'function' ? successMessage(result) : successMessage)
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
        上传图片（最多 5MB，其他格式自动转换）
        <input
          aria-label="上传图片"
          type="file"
          multiple
          accept="image/*,.avif,.heic,.heif"
          disabled={busy || disabled}
          onChange={(event) => {
            const input = event.currentTarget
            const files = Array.from(input.files || [])
            input.value = ''
            void uploadFiles(files)
          }}
        />
      </label>
      <p className="muted">
        PNG/JPEG 直接上传；浏览器可读取的 WebP、GIF、BMP、AVIF 等自动转为
        PNG，保留透明背景。动图保存为静态图，HEIC 等能否转换取决于浏览器。
      </p>
      <p className="muted">
        每页 50 张，可搜索名称或翻页查找旧图片。正在被文章、相册或站点设置等内容引用的图片不能删除。
      </p>
      {busy && (
        <div role="status">
          <p>
            {uploadingName
              ? `${uploadPhase}“${uploadingName}”…（${completed}/${uploadTotal}）`
              : '正在处理…'}
          </p>
          {uploadingName && (
            <progress value={completed} max={uploadTotal} aria-label="批量上传进度" />
          )}
        </div>
      )}
      {!!failedFiles.length && (
        <button
          type="button"
          className="button secondary"
          disabled={busy || disabled}
          onClick={() => void uploadFiles(failedFiles)}
        >
          重试失败的 {failedFiles.length} 张图片
        </button>
      )}
      {onSelectMany && (
        <div className="media-search-toolbar">
          <span>
            已选 {selected.length} / {maxSelection} 张（可跨页选择）
          </span>
          <button
            type="button"
            className="button secondary"
            disabled={busy || disabled || !selected.length}
            onClick={() => {
              onSelectMany(selected)
              setSelected([])
            }}
          >
            添加选中的图片
          </button>
          <button
            type="button"
            className="text-button"
            disabled={busy || disabled || !selected.length}
            onClick={() => setSelected([])}
          >
            清空选择
          </button>
        </div>
      )}
      {success && (
        <p className="form-success" role="status">
          {success}
        </p>
      )}
      {message && (
        <p className="form-error" role="alert">
          {message}
        </p>
      )}
      <div className="media-search-toolbar">
        <label>
          搜索图片名称
          <input
            type="search"
            maxLength={100}
            value={search}
            disabled={busy || disabled}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                setPage(1)
                setKeyword(search.trim())
              }
            }}
          />
        </label>
        <button
          type="button"
          className="button secondary"
          disabled={busy || disabled}
          onClick={() => {
            setPage(1)
            setKeyword(search.trim())
          }}
        >
          搜索图片
        </button>
        {keyword && (
          <button
            type="button"
            className="text-button"
            disabled={busy || disabled}
            onClick={() => {
              setSearch('')
              setKeyword('')
              setPage(1)
            }}
          >
            显示全部图片
          </button>
        )}
        <span className="muted">共 {data?.total ?? '—'} 张</span>
      </div>
      <DataState loading={loading} error={error} onRetry={refresh}>
        <div className="media-grid">
          {data?.items.map((file) => (
            <article className="media-item" key={file.id}>
              <img src={file.url} alt={file.originalName} loading="lazy" />
              <strong>{file.originalName}</strong>
              <small>{Math.ceil(file.sizeBytes / 1024)} KB</small>
              <div>
                {onSelectMany && (
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      aria-label={`选择 ${file.originalName}`}
                      checked={selected.includes(file.url)}
                      disabled={
                        busy ||
                        disabled ||
                        (!selected.includes(file.url) && selected.length >= maxSelection)
                      }
                      onChange={(event) =>
                        setSelected((current) =>
                          event.target.checked
                            ? [...current, file.url]
                            : current.filter((url) => url !== file.url),
                        )
                      }
                    />
                    多选
                  </label>
                )}
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
                      void action(async () => {
                        await mediaApi.remove(file.id)
                        setSelected((current) => current.filter((url) => url !== file.url))
                      })
                  }}
                >
                  删除图片
                </button>
              </div>
            </article>
          ))}
        </div>
        {data?.total === 0 && (
          <p className="muted">{keyword ? '没有找到匹配的图片。' : '还没有上传图片。'}</p>
        )}
        {data && !busy && !disabled && (
          <ContentPagination page={page} total={data.total} size={data.size} onChange={setPage} />
        )}
      </DataState>
    </div>
  )
}
