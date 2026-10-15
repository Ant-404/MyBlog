import { useCallback, useState } from 'react'
import { memberApi } from '../../api/members'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useAdminAction } from '../../hooks/useAdminAction'
import { usePageTitle } from '../../hooks/usePageTitle'
import DataState from '../../components/common/DataState'
import ContentPagination from '../../components/common/ContentPagination'

const names: Record<string, string> = {
  ACTIVE: '正常',
  MUTED: '禁言',
  BANNED: '封禁',
  DELETED: '已注销',
  PENDING: '待审核',
  APPROVED: '已公开',
  REJECTED: '已拒绝',
}
export default function AdminMembersPage() {
  usePageTitle('用户与社区')
  const [tab, setTab] = useState('members')
  const [keyword, setKeyword] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const members = useAsyncData(useCallback(() => memberApi.list(query, page), [query, page]))
  const reports = useAsyncData(useCallback(() => memberApi.reports(page), [page]))
  const notes = useAsyncData(useCallback(() => memberApi.notes(page, true), [page]))
  const current = tab === 'members' ? members : tab === 'reports' ? reports : notes
  const { busy, message, run } = useAdminAction(current.errorStatus)
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <h1>
            用户与社区<span className="heading-dot">.</span>
          </h1>
          <p className="muted">管理验证邮箱的用户、评论举报与留言墙。禁言和封禁会使旧登录失效。</p>
        </div>
      </div>
      <section className="card management-card">
        <div className="member-tabs" role="group" aria-label="社区管理">
          {[
            ['members', '用户'],
            ['reports', '评论举报'],
            ['notes', '留言墙审核'],
          ].map(([key, label]) => (
            <button
              key={key}
              aria-pressed={tab === key}
              onClick={() => {
                setTab(key)
                setPage(1)
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === 'members' && (
          <form
            className="showcase-search"
            onSubmit={(e) => {
              e.preventDefault()
              setQuery(keyword.trim())
              setPage(1)
            }}
          >
            <input
              aria-label="搜索用户邮箱或昵称"
              maxLength={100}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <button>搜索用户</button>
          </form>
        )}
        {message && <p role="status">{message}</p>}
        <DataState loading={current.loading} error={current.error} onRetry={current.refresh}>
          {current.data?.items.length === 0 && <p className="muted">暂时没有记录。</p>}
          {tab === 'members' &&
            members.data?.items.map((member) => (
              <article key={member.id} className="member-list-item">
                <div>
                  <strong>
                    {member.nickname} #{member.id}
                  </strong>
                  <p>{member.email || '邮箱已清除'}</p>
                  <small>{names[member.status]}</small>
                </div>
                {member.status !== 'DELETED' && (
                  <div className="member-row-actions">
                    {(['ACTIVE', 'MUTED', 'BANNED'] as const).map((status) => (
                      <button
                        className={`text-button ${status === 'BANNED' ? 'danger' : ''}`}
                        key={status}
                        disabled={busy || member.status === status}
                        onClick={() => {
                          if (window.confirm(`确定将用户 #${member.id} 设置为${names[status]}吗？`))
                            void run(async () => {
                              await memberApi.state(member, status)
                              members.refresh()
                            })
                        }}
                      >
                        {names[status]}
                      </button>
                    ))}
                  </div>
                )}
              </article>
            ))}
          {tab === 'reports' &&
            reports.data?.items.map((report) => (
              <article key={report.id} className="member-list-item">
                <div>
                  <strong>
                    评论 #{report.commentId} · 举报人 #{report.memberId}
                  </strong>
                  <p>{report.content}</p>
                  <p>举报原因：{report.reason}</p>
                  <small>{report.resolved ? '已处理' : '待处理'}</small>
                </div>
                <div className="member-row-actions">
                  <a href="/admin/comments">前往评论审核</a>
                  <button
                    className="text-button"
                    disabled={busy || report.resolved}
                    onClick={() =>
                      void run(async () => {
                        await memberApi.resolve(report.id)
                        reports.refresh()
                      })
                    }
                  >
                    标记已处理
                  </button>
                </div>
              </article>
            ))}
          {tab === 'notes' &&
            notes.data?.items.map((note) => (
              <article key={note.id} className="member-list-item">
                <div>
                  <strong>
                    {note.author} {note.memberId != null && `#${note.memberId}`}
                  </strong>
                  <p>{note.content}</p>
                  <small>{names[note.status]}</small>
                </div>
                <div className="member-row-actions">
                  {[
                    ['APPROVED', '通过'],
                    ['REJECTED', '拒绝'],
                  ].map(([status, label]) => (
                    <button
                      className="text-button"
                      key={status}
                      disabled={busy || note.status === status}
                      onClick={() =>
                        void run(async () => {
                          await memberApi.noteState(note, status)
                          notes.refresh()
                        })
                      }
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    className="text-button danger"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm('永久删除这条便签吗？'))
                        void run(async () => {
                          await memberApi.deleteNote(note, true)
                          notes.refresh()
                        })
                    }}
                  >
                    删除
                  </button>
                </div>
              </article>
            ))}
          {current.data && (
            <ContentPagination
              page={page}
              total={current.data.total}
              size={20}
              onChange={setPage}
            />
          )}
        </DataState>
      </section>
    </>
  )
}
