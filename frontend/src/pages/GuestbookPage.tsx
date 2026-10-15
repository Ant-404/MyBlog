import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import { memberApi } from '../api/members'
import { useMember } from '../contexts/MemberContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { usePageTitle } from '../hooks/usePageTitle'
import { demoMode } from '../api/http'
import DataState from '../components/common/DataState'
import ContentPagination from '../components/common/ContentPagination'

export default function GuestbookPage() {
  usePageTitle('留言墙')
  const { member, refresh: refreshMember } = useMember()
  const [page, setPage] = useState(1)
  const data = useAsyncData(
    useCallback(
      () =>
        demoMode ? Promise.resolve({ items: [], total: 0, page, size: 20 }) : memberApi.notes(page),
      [page],
    ),
  )
  const [content, setContent] = useState('')
  const [color, setColor] = useState('lavender')
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  async function action(work: () => Promise<void>) {
    setBusy(true)
    setMessage('')
    setFailed(false)
    try {
      await work()
    } catch (cause) {
      setFailed(true)
      setMessage(cause instanceof Error ? cause.message : '操作失败')
      void refreshMember()
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="card content-page guestbook-page">
      <header className="showcase-intro">
        <span className="eyebrow">LEAVE A LITTLE HELLO</span>
        <h1>
          留言墙<span className="heading-dot">.</span>
        </h1>
        <p>路过时留句话，让这个小角落多一点温度。</p>
      </header>
      {member?.status === 'ACTIVE' && !demoMode ? (
        <form
          className="member-panel member-form"
          onSubmit={(event) => {
            event.preventDefault()
            if (!busy)
              void action(async () => {
                await memberApi.addNote(content, color)
                setContent('')
                setMessage('便签已提交，审核通过后会贴到墙上。')
              })
          }}
        >
          <label>
            写张便签
            <textarea
              rows={4}
              required
              maxLength={500}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </label>
          <div className="member-row-actions">
            <label>
              便签颜色
              <select value={color} onChange={(e) => setColor(e.target.value)}>
                {[
                  ['lavender', '藤紫'],
                  ['peach', '蜜桃'],
                  ['mint', '薄荷'],
                  ['sky', '晴空'],
                ].map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <span className="muted">{content.length} / 500 · 审核后公开</span>
          </div>
          <button className="button" disabled={busy || !content.trim()}>
            贴上便签
          </button>
        </form>
      ) : (
        <p className="member-panel">
          {demoMode ? (
            '预览模式不接受便签。'
          ) : member ? (
            '账号已禁言，暂时无法发布便签。'
          ) : (
            <>
              <Link to="/account">登录或注册</Link>，验证邮箱后可以留下便签。
            </>
          )}
        </p>
      )}
      {message && (
        <p role={failed ? 'alert' : 'status'} className={failed ? 'form-error' : 'form-success'}>
          {message}
        </p>
      )}
      <DataState loading={data.loading} error={data.error} onRetry={data.refresh}>
        <div className="guestbook-wall">
          {data.data?.items.map((note) => (
            <article className={`guestbook-note note-${note.color}`} key={note.id}>
              <MessageSquare size={18} />
              <p>{note.content}</p>
              <footer>
                <strong>
                  {note.author} <small>#{note.memberId}</small>
                </strong>
                <time>{note.createdAt.slice(0, 10)}</time>
              </footer>
              {member?.id === note.memberId && (
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm('删除自己的便签吗？'))
                      void action(async () => {
                        await memberApi.deleteNote(note)
                        data.refresh()
                        setMessage('便签已删除。')
                      })
                  }}
                >
                  删除我的便签
                </button>
              )}
            </article>
          ))}
        </div>
        {data.data?.total === 0 && (
          <div className="showcase-empty">
            <MessageSquare />
            <h2>第一张便签，等你来写</h2>
            <p>审核通过的留言会出现在这里。</p>
          </div>
        )}
        {data.data && (
          <ContentPagination page={page} total={data.data.total} size={20} onChange={setPage} />
        )}
      </DataState>
    </section>
  )
}
