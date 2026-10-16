import { useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { communityApi } from '../../api/community'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useAdminAction } from '../../hooks/useAdminAction'
import { usePageTitle } from '../../hooks/usePageTitle'
import DataState from '../../components/common/DataState'
export default function AdminCommentsPage() {
  usePageTitle('评论管理')
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const fetch = useCallback(() => communityApi.commentsAdmin(page), [page])
  const { data, loading, error, errorStatus, refresh } = useAsyncData(fetch)
  const { busy, message, run } = useAdminAction(errorStatus)
  return (
    <>
      <div className="admin-page-heading">
        <h1>
          评论管理<span className="heading-dot">.</span>
        </h1>
      </div>
      <p className="muted">所有评论提交后直接展示，可在此查看和删除。邮箱仅在后台可见。</p>
      <div className="card admin-list-toolbar">
        <span>{data?.total ?? '—'} 条</span>
      </div>
      {message && <p role="status">{message}</p>}
      <DataState loading={loading} error={error} onRetry={refresh}>
        <section className="card management-card comment-list">
          {data?.items.map((comment) => (
            <article key={comment.id}>
              <div>
                <strong>{comment.author}</strong>
                <time>{comment.createdAt}</time>
              </div>
              <Link to={`/posts/${comment.slug}`}>{comment.postTitle}</Link>
              {comment.email && <p className="muted">邮箱：{comment.email}</p>}
              {comment.url && (
                <p>
                  <a href={comment.url} target="_blank" rel="noopener noreferrer nofollow">
                    {comment.url}
                  </a>
                </p>
              )}
              <p>{comment.content}</p>
              <div className="comment-actions">
                <button
                  className="text-button danger-action"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm('永久删除这条评论？'))
                      void run(async () => {
                        await communityApi.deleteComment(comment)
                        refresh()
                      })
                  }}
                >
                  删除评论
                </button>
              </div>
            </article>
          ))}
          {data?.total === 0 && <p className="muted">暂时没有评论。</p>}
        </section>
        <div className="admin-pagination">
          <button disabled={page <= 1} onClick={() => setParams({ page: String(page - 1) })}>
            上一页
          </button>
          <span>第 {page} 页</span>
          <button
            disabled={!data || page * 20 >= data.total}
            onClick={() => setParams({ page: String(page + 1) })}
          >
            下一页
          </button>
        </div>
      </DataState>
    </>
  )
}
