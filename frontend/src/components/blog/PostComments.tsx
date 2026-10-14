import { useCallback, useState } from 'react'
import { communityApi } from '../../api/community'
import { demoMode } from '../../api/http'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useSite } from '../../contexts/SiteContext'
import DataState from '../common/DataState'

export default function PostComments({ slug }: { slug: string }) {
  const site = useSite()
  const [page, setPage] = useState(1)
  const fetch = useCallback(() => communityApi.comments(slug, page), [slug, page])
  const { data, loading, error, refresh } = useAsyncData(fetch)
  const [author, setAuthor] = useState('')
  const [content, setContent] = useState('')
  const [website, setWebsite] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  async function submit() {
    setBusy(true)
    setMessage('')
    setFailed(false)
    try {
      await communityApi.submit(slug, author, content, website)
      setContent('')
      setMessage('评论已提交，审核通过后会显示在这里。')
    } catch (cause) {
      setFailed(true)
      setMessage(cause instanceof Error ? cause.message : '提交失败，请稍后重试')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="post-comments">
      <h2>
        留言<span className="count">{data?.total ?? '—'}</span>
      </h2>
      <p className="muted">评论以纯文字展示，审核通过后公开。请勿留下私人联系方式。</p>
      {site.commentsEnabled && !demoMode ? (
        <form
          className="comment-form"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <label>
            昵称
            <input
              required
              maxLength={64}
              value={author}
              disabled={busy}
              onChange={(e) => setAuthor(e.target.value)}
            />
          </label>
          <label>
            评论内容
            <textarea
              required
              maxLength={2000}
              rows={4}
              value={content}
              disabled={busy}
              onChange={(e) => setContent(e.target.value)}
            />
          </label>
          <label className="comment-honeypot" aria-hidden="true">
            Website
            <input
              value={website}
              tabIndex={-1}
              autoComplete="off"
              onChange={(e) => setWebsite(e.target.value)}
            />
          </label>
          <button className="button" disabled={busy}>
            {busy ? '提交中…' : '提交评论'}
          </button>
        </form>
      ) : (
        <p className="muted">{demoMode ? '预览模式不接受评论。' : '评论暂时关闭。'}</p>
      )}
      {message && (
        <p className={failed ? 'form-error' : 'form-success'} role={failed ? 'alert' : 'status'}>
          {message}
        </p>
      )}
      <DataState loading={loading} error={error} onRetry={refresh}>
        <div className="comment-list">
          {data?.items.map((comment) => (
            <article key={comment.id}>
              <div>
                <strong>{comment.author}</strong>
                <time>{comment.createdAt}</time>
              </div>
              <p>{comment.content}</p>
            </article>
          ))}
        </div>
        {data?.total === 0 && <p className="muted">还没有公开留言，欢迎写下你的想法。</p>}
        {data && data.total > 20 && (
          <div className="admin-pagination">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
              上一页
            </button>
            <span>第 {page} 页</span>
            <button disabled={page * 20 >= data.total} onClick={() => setPage(page + 1)}>
              下一页
            </button>
          </div>
        )}
      </DataState>
    </section>
  )
}
