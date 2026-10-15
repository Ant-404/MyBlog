import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Copy, MessageSquare, PenLine, RefreshCw } from 'lucide-react'
import { memberApi } from '../api/members'
import { useMember } from '../contexts/MemberContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { usePageTitle } from '../hooks/usePageTitle'
import { demoMode, HttpError } from '../api/http'
import DataState from '../components/common/DataState'
import ContentPagination from '../components/common/ContentPagination'

export default function GuestbookPage() {
  usePageTitle('留言墙')
  const { member, loading: memberLoading, refresh: refreshMember } = useMember()
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
  const [website, setWebsite] = useState('')
  const [preview, setPreview] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const editorToggle = useRef<HTMLButtonElement>(null)
  const editorInput = useRef<HTMLTextAreaElement>(null)
  const restoreEditorFocus = useRef(false)
  useEffect(() => {
    if (editorOpen) editorInput.current?.focus({ preventScroll: true })
  }, [editorOpen])
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!busy && !editorOpen && restoreEditorFocus.current) {
      editorToggle.current?.focus({ preventScroll: true })
      restoreEditorFocus.current = false
    }
  }, [busy, editorOpen])
  async function action(work: () => Promise<void>) {
    setBusy(true)
    setMessage('')
    setFailed(false)
    try {
      await work()
    } catch (cause) {
      setFailed(true)
      setMessage(
        cause instanceof HttpError && !member && [401, 403].includes(cause.status)
          ? '匿名留言暂时不可用，填写的内容已保留，请稍后重试。'
          : cause instanceof Error
            ? cause.message
            : '操作失败',
      )
      void refreshMember()
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="card content-page guestbook-page" aria-label="留言广场">
      {!memberLoading && (!member || member.status === 'ACTIVE') && !demoMode ? (
        <div className="guestbook-composer">
          <button
            type="button"
            className="guestbook-compose-toggle"
            ref={editorToggle}
            aria-label={editorOpen ? '收起留言编辑' : '写留言'}
            aria-expanded={editorOpen}
            aria-controls="guestbook-editor"
            disabled={busy}
            onClick={() => setEditorOpen((value) => !value)}
          >
            <span className="guestbook-avatar">
              <PenLine size={18} />
            </span>
            <span className="guestbook-compose-copy">
              <strong>{editorOpen ? '写下此刻想说的话' : '路过这里，留下一句问候'}</strong>
              <span>{member ? `${member.nickname}，欢迎回来` : '无需注册，也可以匿名留言'}</span>
            </span>
            <span className="guestbook-compose-label">{editorOpen ? '收起编辑' : '写留言'}</span>
            <ChevronDown size={16} />
          </button>
          <div id="guestbook-editor" hidden={!editorOpen}>
            <form
              className="member-panel member-form"
              onSubmit={(event) => {
                event.preventDefault()
                if (!busy)
                  void action(async () => {
                    await memberApi.addNote(content, color, website)
                    setContent('')
                    setPreview(false)
                    setEditorOpen(false)
                    restoreEditorFocus.current = true
                    setMessage('便签已提交，审核通过后会贴到墙上。')
                  })
              }}
            >
              <p className="comment-identity">
                以 <strong>{member?.nickname || '匿名用户'}</strong> 留言，审核通过后上墙。
                {!member && (
                  <>
                    <Link to="/account">登录或注册</Link>后可在个人中心管理自己的便签。
                  </>
                )}
              </p>
              <label>
                写张便签
                <textarea
                  ref={editorInput}
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
              <label className="comment-honeypot" aria-hidden="true">
                Website
                <input
                  value={website}
                  tabIndex={-1}
                  autoComplete="off"
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </label>
              <div className="member-row-actions">
                <button className="button" disabled={busy || !content.trim()}>
                  {busy ? '提交中…' : '贴上便签'}
                </button>
                <button
                  type="button"
                  className="text-button"
                  aria-expanded={preview}
                  aria-controls="guestbook-note-preview"
                  onClick={() => setPreview((value) => !value)}
                >
                  {preview ? '收起预览' : '预览便签'}
                </button>
              </div>
              {preview && (
                <section
                  className="guestbook-preview"
                  id="guestbook-note-preview"
                  aria-label="便签预览"
                >
                  <p className="muted">仅预览，尚未提交</p>
                  <article className={`guestbook-note note-${color}`}>
                    <header className="guestbook-note-header">
                      <span className="guestbook-avatar">
                        <MessageSquare size={18} />
                      </span>
                      <div>
                        <div className="guestbook-author">
                          <strong>{member?.nickname || '匿名用户'}</strong>
                          <span className="guestbook-author-tag">{member ? '成员' : '访客'}</span>
                        </div>
                        <time>审核后上墙</time>
                      </div>
                    </header>
                    <p>{content.trim() || '写下想说的话，这里会显示便签上墙后的样子。'}</p>
                  </article>
                </section>
              )}
            </form>
          </div>
        </div>
      ) : (
        <p className="member-panel">
          {demoMode
            ? '预览模式不接受便签。'
            : memberLoading
              ? '正在读取登录状态…'
              : '账号已禁言，暂时无法发布便签。'}
        </p>
      )}
      {message && (
        <p role={failed ? 'alert' : 'status'} className={failed ? 'form-error' : 'form-success'}>
          {message}
        </p>
      )}
      <header className="guestbook-feed-heading">
        <h1>
          留言墙 <span>{data.data?.total ?? '…'}</span>
        </h1>
        <button
          className="guestbook-pill"
          type="button"
          disabled={data.loading}
          onClick={data.refresh}
        >
          <RefreshCw size={14} />
          {data.loading ? '加载中' : '刷新'}
        </button>
      </header>
      <div className="guestbook-feed-toolbar">
        <span>
          <span className="guestbook-live-dot" />
          最新留言
        </span>
        <span>按发布时间排序 · 审核后公开</span>
      </div>
      <DataState loading={data.loading} error={data.error} onRetry={data.refresh}>
        <div className="guestbook-wall">
          {data.data?.items.map((note) => (
            <article className={`guestbook-note note-${note.color}`} key={note.id}>
              <header className="guestbook-note-header">
                <span className="guestbook-avatar" aria-hidden="true">
                  {note.memberId == null ? <MessageSquare size={18} /> : note.author.slice(0, 1)}
                </span>
                <div>
                  <div className="guestbook-author">
                    <strong>{note.author}</strong>
                    <span className="guestbook-author-tag">
                      {note.memberId == null ? '访客' : '成员'}
                    </span>
                  </div>
                  <time dateTime={note.createdAt}>
                    {note.createdAt.replace('T', ' ').slice(0, 16)}
                  </time>
                </div>
                <span className="guestbook-note-id">#{note.id}</span>
              </header>
              <p>{note.content}</p>
              <footer>
                <button
                  type="button"
                  className="guestbook-pill"
                  onClick={() =>
                    void action(async () => {
                      await navigator.clipboard.writeText(note.content)
                      setMessage('留言已复制。')
                    })
                  }
                >
                  <Copy size={13} />
                  复制留言
                </button>
                {member && member.id === note.memberId && (
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
              </footer>
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
