import { useCallback, useEffect, useState } from 'react'
import { guestbookApi } from '../../api/guestbook'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useAdminAction } from '../../hooks/useAdminAction'
import { usePageTitle } from '../../hooks/usePageTitle'
import DataState from '../../components/common/DataState'
import ContentPagination from '../../components/common/ContentPagination'

export default function AdminGuestbookPage() {
  usePageTitle('留言墙管理')
  const [page, setPage] = useState(1)
  const notes = useAsyncData(useCallback(() => guestbookApi.notes(page, true), [page]))
  const { busy, message, run } = useAdminAction(notes.errorStatus)
  useEffect(() => {
    if (notes.data && page > 1) {
      const last = Math.max(1, Math.ceil(notes.data.total / 20))
      if (page > last) setPage(last)
    }
  }, [notes.data, page])
  return (
    <>
      <div className="admin-page-heading">
        <h1>
          留言墙管理<span className="heading-dot">.</span>
        </h1>
      </div>
      <p className="muted">所有便签提交后直接上墙，可在此查看和删除。</p>
      {message && <p role="status">{message}</p>}
      <section className="card management-card">
        <DataState loading={notes.loading} error={notes.error} onRetry={notes.refresh}>
          {!notes.data?.items.length && <p className="muted">暂时没有便签。</p>}
          {notes.data?.items.map((note) => (
            <article className="community-list-item" key={note.id}>
              <div>
                <strong>{note.author}</strong>
                <p>{note.content}</p>
                <small>{note.createdAt.replace('T', ' ').slice(0, 16)}</small>
              </div>
              <div className="community-row-actions">
                <button
                  className="text-button danger"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm('永久删除这条便签吗？'))
                      void run(async () => {
                        await guestbookApi.deleteNote(note)
                        notes.refresh()
                      })
                  }}
                >
                  删除
                </button>
              </div>
            </article>
          ))}
          {notes.data && (
            <ContentPagination page={page} total={notes.data.total} size={20} onChange={setPage} />
          )}
        </DataState>
      </section>
    </>
  )
}
