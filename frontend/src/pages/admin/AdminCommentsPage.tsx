import { useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { communityApi } from '../../api/community'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useAdminAction } from '../../hooks/useAdminAction'
import { usePageTitle } from '../../hooks/usePageTitle'
import DataState from '../../components/common/DataState'
export default function AdminCommentsPage() {
  usePageTitle('评论审核')
  const [params, setParams] = useSearchParams()
  const status = params.get('status') ?? 'PENDING'
  const page = Math.max(1, Number(params.get('page')) || 1)
  const fetch = useCallback(() => communityApi.commentsAdmin(status, page), [status, page])
  const { data, loading, error, errorStatus, refresh } = useAsyncData(fetch)
  const { busy, message, run } = useAdminAction(errorStatus)
  return (
    <>
      <div className="admin-page-heading">
        <h1>
          评论审核<span className="heading-dot">.</span>
        </h1>
      </div>
      <p className="muted">注册用户先展示后审核，匿名评论审核通过后展示；拒绝会隐藏评论。</p>
      <div className="card admin-list-toolbar">
        <label>
          评论状态{' '}
          <select
            aria-label="评论状态"
            value={status}
            onChange={(e) => setParams({ status: e.target.value, page: '1' })}
          >
            <option value="PENDING">待审核</option>
            <option value="APPROVED">已通过</option>
            <option value="REJECTED">已拒绝</option>
            <option value="">全部</option>
          </select>
        </label>
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
              <p>{comment.content}</p>
              <div className="comment-actions">
                <span>
                  {comment.status === 'PENDING'
                    ? comment.memberId
                      ? '已展示 · 待审核'
                      : '未展示 · 待审核'
                    : comment.status === 'APPROVED'
                      ? '已通过'
                      : '已拒绝'}
                </span>
                {(['APPROVED', 'REJECTED', 'PENDING'] as const)
                  .filter((state) => state !== comment.status)
                  .map((state) => (
                    <button
                      key={state}
                      className="text-button"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          await communityApi.moderate(comment, state)
                          refresh()
                        })
                      }
                    >
                      {state === 'APPROVED' ? '通过' : state === 'REJECTED' ? '拒绝' : '重新审核'}
                    </button>
                  ))}
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
          {data?.total === 0 && <p className="muted">这个状态下没有评论。</p>}
        </section>
        <div className="admin-pagination">
          <button
            disabled={page <= 1}
            onClick={() => setParams({ status, page: String(page - 1) })}
          >
            上一页
          </button>
          <span>第 {page} 页</span>
          <button
            disabled={!data || page * 20 >= data.total}
            onClick={() => setParams({ status, page: String(page + 1) })}
          >
            下一页
          </button>
        </div>
      </DataState>
    </>
  )
}
