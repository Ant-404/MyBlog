import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Mail, ShieldCheck, UserRound } from 'lucide-react'
import { memberApi, type Member } from '../api/members'
import { demoMode, HttpError } from '../api/http'
import { useMember } from '../contexts/MemberContext'
import { usePageTitle } from '../hooks/usePageTitle'
import { useAsyncData } from '../hooks/useAsyncData'
import DataState from '../components/common/DataState'
import ContentPagination from '../components/common/ContentPagination'

export default function AccountPage() {
  usePageTitle('个人中心')
  const { member, loading, error, refresh, setMember } = useMember()
  const [params, setParams] = useSearchParams()
  const [mode, setMode] = useState(() =>
    ['register', 'reset'].includes(params.get('mode') || '') ? params.get('mode')! : 'login',
  )
  const [token, setToken] = useState(() => params.get('token') || '')
  const [email, setEmail] = useState(() => params.get('email') || '')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  const config = useAsyncData(memberApi.config)
  // Keep verification secrets out of later history entries and referrers.
  useEffect(() => {
    if (params.has('token')) setParams({ mode }, { replace: true })
  }, [])
  async function action(work: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    setMessage('')
    setFailed(false)
    try {
      await work()
    } catch (cause) {
      setFailed(true)
      setMessage(cause instanceof Error ? cause.message : '操作失败，请重试')
      if (cause instanceof HttpError && cause.status === 401) await refresh()
    } finally {
      setBusy(false)
    }
  }
  function switchMode(next: string) {
    setMode(next)
    setToken('')
    setPassword('')
    setConfirm('')
    setMessage('')
    setParams(next === 'login' ? {} : { mode: next }, { replace: true })
  }
  if (demoMode)
    return (
      <section className="card member-panel">
        <h1>个人中心</h1>
        <p>预览模式不支持注册或登录。</p>
      </section>
    )
  if (loading) return <p role="status">正在读取登录状态…</p>
  return (
    <section className="member-page">
      <header className="member-heading">
        <ShieldCheck size={27} />
        <h1>{member ? '个人中心' : '在这里，留下你的名字'}</h1>
        <p>邮箱用于验证与找回密码，不会公开展示。所有新评论仍需审核。</p>
      </header>
      {error && (
        <p role="alert">
          {error}
          <button className="text-button" onClick={() => void refresh()}>
            重试
          </button>
        </p>
      )}
      {message && (
        <p className={failed ? 'form-error' : 'form-success'} role={failed ? 'alert' : 'status'}>
          {message}
        </p>
      )}
      {!member ? (
        <div className="card member-panel">
          <div className="member-tabs" role="group" aria-label="账号操作">
            {[
              ['login', '登录'],
              ['register', '注册'],
              ['reset', '找回密码'],
            ].map(([key, text]) => (
              <button key={key} aria-pressed={mode === key} onClick={() => switchMode(key)}>
                {text}
              </button>
            ))}
          </div>
          <h2>
            {mode === 'login'
              ? '欢迎回来'
              : mode === 'register'
                ? token
                  ? '完成邮箱验证，设置账号'
                  : '先验证你的邮箱'
                : '设置一个新密码'}
          </h2>
          {config.error && (
            <p role="alert">
              {config.error}
              <button className="text-button" onClick={config.refresh}>
                重试
              </button>
            </p>
          )}
          {mode !== 'login' && !config.data?.mailEnabled && (
            <p className="callout">博主尚未启用邮箱服务，暂时无法注册或找回密码。</p>
          )}
          <form
            className="member-form"
            onSubmit={(event) => {
              event.preventDefault()
              void action(async () => {
                if (mode === 'login') {
                  const profile = await memberApi.login(email, password)
                  setMember(profile)
                  setPassword('')
                  setMessage('登录成功。')
                } else if (!token) {
                  await memberApi.email(email, mode === 'register' ? 'REGISTER' : 'RESET')
                  setMessage(
                    '如果该邮箱可用于本次操作，验证邮件将发送到你的邮箱。请检查收件箱和垃圾邮件，60 秒内无需重复申请。',
                  )
                } else {
                  if (password !== confirm) throw new Error('两次输入的密码不一致')
                  if (new TextEncoder().encode(password).length > 72)
                    throw new Error('密码 UTF-8 编码不能超过 72 字节')
                  if (mode === 'register')
                    await memberApi.register(email, token, nickname, password)
                  else await memberApi.reset(email, token, password)
                  switchMode('login')
                  setMessage(
                    mode === 'register' ? '注册完成，请登录。' : '密码已重置，请重新登录。',
                  )
                }
              })
            }}
          >
            <label>
              邮箱
              <input
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                value={email}
                disabled={busy || !!token}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            {mode === 'register' && token && (
              <label>
                昵称
                <input
                  required
                  maxLength={64}
                  autoComplete="nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                />
              </label>
            )}
            {(mode === 'login' || token) && (
              <label>
                密码
                <input
                  type="password"
                  required
                  minLength={mode === 'login' ? 1 : 10}
                  maxLength={72}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
            )}
            {token && (
              <>
                <label>
                  确认密码
                  <input
                    type="password"
                    required
                    minLength={10}
                    maxLength={72}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </label>
                <p className="muted">
                  至少 10 个字符，建议使用独立的长密码。验证链接有效期 30 分钟。
                </p>
              </>
            )}
            <button
              className="button"
              disabled={busy || (mode !== 'login' && !config.data?.mailEnabled)}
            >
              {busy
                ? '处理中…'
                : mode === 'login'
                  ? '登录账号'
                  : token
                    ? mode === 'register'
                      ? '完成注册'
                      : '重置密码'
                    : '发送验证邮件'}
            </button>
          </form>
        </div>
      ) : (
        <>
          <div className="card member-panel member-welcome">
            <UserRound />
            <div>
              <h2>
                {member.nickname}
                <small> #{member.id}</small>
              </h2>
              <p>
                {member.status === 'MUTED'
                  ? '账号已禁言，可管理资料和删除自己的评论。'
                  : '邮箱已验证 · 可以参与评论和留言墙'}
              </p>
              <p>{member.email}</p>
            </div>
            <button
              className="text-button"
              disabled={busy}
              onClick={() =>
                void action(async () => {
                  await memberApi.logout()
                  setMember(null)
                  setMessage('已退出登录。')
                })
              }
            >
              退出登录
            </button>
          </div>
          <ProfileEditor
            key={member.id}
            member={member}
            busy={busy}
            action={action}
            onSaved={(saved) => {
              setMember(saved)
              setMessage('资料已保存。')
            }}
          />
          <MemberActivity action={action} />
          <AccountSecurity busy={busy} action={action} onLogout={() => setMember(null)} />
        </>
      )}
      <p className="member-privacy">
        <Mail size={15} />{' '}
        不公开邮箱；不在浏览器保存密码；注销后清除邮箱与个人资料，历史评论显示为已注销用户。
        <Link to="/guestbook">去留言墙看看</Link>
      </p>
    </section>
  )
}

function ProfileEditor({
  member,
  busy,
  action,
  onSaved,
}: {
  member: Member
  busy: boolean
  action: (work: () => Promise<void>) => Promise<void>
  onSaved: (member: Member) => void
}) {
  const [form, setForm] = useState(member)
  return (
    <section className="card member-panel">
      <h2>个人资料</h2>
      <form
        className="member-form"
        onSubmit={(event) => {
          event.preventDefault()
          void action(async () => {
            const saved = await memberApi.edit(form)
            setForm(saved)
            onSaved(saved)
          })
        }}
      >
        <label>
          昵称
          <input
            required
            maxLength={64}
            value={form.nickname}
            onChange={(e) => setForm({ ...form, nickname: e.target.value })}
          />
        </label>
        <label>
          头像地址
          <input
            maxLength={1000}
            value={form.avatar}
            placeholder="https://… 或 /images/…"
            onChange={(e) => setForm({ ...form, avatar: e.target.value })}
          />
        </label>
        <label>
          个人简介
          <textarea
            rows={3}
            maxLength={300}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
          />
        </label>
        <p className="muted">
          公开显示昵称、头像和固定账号编号；邮箱仅本人和管理员可见。使用外部头像会向图片服务发起请求。
        </p>
        <button className="button" disabled={busy}>
          保存资料
        </button>
      </form>
    </section>
  )
}
function MemberActivity({ action }: { action: (work: () => Promise<void>) => Promise<void> }) {
  const [page, setPage] = useState(1)
  const [noticePage, setNoticePage] = useState(1)
  const [notePage, setNotePage] = useState(1)
  const comments = useAsyncData(useCallback(() => memberApi.comments(page), [page]))
  const notices = useAsyncData(useCallback(() => memberApi.notices(noticePage), [noticePage]))
  const notes = useAsyncData(useCallback(() => memberApi.ownNotes(notePage), [notePage]))
  return (
    <>
      <section className="card member-panel">
        <h2>回复通知</h2>
        <DataState loading={notices.loading} error={notices.error} onRetry={notices.refresh}>
          {!notices.data?.items.length && <p className="muted">暂时没有回复通知。</p>}
          {notices.data?.items.map((notice) => (
            <div className="member-list-item" key={notice.id}>
              <Link
                to={`/posts/${notice.slug}#comment-${notice.commentId}`}
                onClick={() =>
                  void action(async () => {
                    await memberApi.read(notice.id)
                    notices.refresh()
                  })
                }
              >
                {notice.message}
              </Link>
              <span>{notice.read ? '已读' : '未读'}</span>
            </div>
          ))}
          {notices.data && (
            <ContentPagination
              page={noticePage}
              total={notices.data.total}
              size={20}
              onChange={setNoticePage}
            />
          )}
        </DataState>
      </section>
      <section className="card member-panel">
        <h2>我的便签</h2>
        <DataState loading={notes.loading} error={notes.error} onRetry={notes.refresh}>
          {!notes.data?.items.length && <p className="muted">还没有便签。</p>}
          {notes.data?.items.map((note) => (
            <article className="member-list-item" key={note.id}>
              <div>
                <p>{note.content}</p>
                <small>
                  {
                    (
                      { PENDING: '待审核', APPROVED: '已公开', REJECTED: '未通过' } as Record<
                        string,
                        string
                      >
                    )[note.status]
                  }
                </small>
              </div>
              <button
                className="text-button danger"
                onClick={() => {
                  if (window.confirm('确定删除自己的便签吗？'))
                    void action(async () => {
                      await memberApi.deleteNote(note)
                      notes.refresh()
                    })
                }}
              >
                删除便签
              </button>
            </article>
          ))}
          {notes.data && (
            <ContentPagination
              page={notePage}
              total={notes.data.total}
              size={20}
              onChange={setNotePage}
            />
          )}
        </DataState>
      </section>
      <section className="card member-panel">
        <h2>我的评论</h2>
        <DataState loading={comments.loading} error={comments.error} onRetry={comments.refresh}>
          {!comments.data?.items.length && (
            <p className="muted">还没有评论，读到喜欢的文章时留句话吧。</p>
          )}
          {comments.data?.items.map((comment) => (
            <article className="member-list-item" key={comment.id}>
              <div>
                <Link to={`/posts/${comment.slug}`}>{comment.postTitle}</Link>
                <p>{comment.content}</p>
                <small>
                  {
                    (
                      { PENDING: '待审核', APPROVED: '已公开', REJECTED: '未通过' } as Record<
                        string,
                        string
                      >
                    )[comment.status]
                  }
                </small>
              </div>
              <button
                className="text-button danger"
                onClick={() => {
                  if (window.confirm('确定删除自己的这条评论吗？'))
                    void action(async () => {
                      await memberApi.deleteComment(comment)
                      comments.refresh()
                    })
                }}
              >
                删除评论
              </button>
            </article>
          ))}
          {comments.data && (
            <ContentPagination
              page={page}
              total={comments.data.total}
              size={20}
              onChange={setPage}
            />
          )}
        </DataState>
      </section>
    </>
  )
}
function AccountSecurity({
  busy,
  action,
  onLogout,
}: {
  busy: boolean
  action: (work: () => Promise<void>) => Promise<void>
  onLogout: () => void
}) {
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [closing, setClosing] = useState('')
  return (
    <section className="card member-panel">
      <h2>账号安全</h2>
      <form
        className="member-form"
        onSubmit={(event) => {
          event.preventDefault()
          void action(async () => {
            if (password !== confirmation) throw new Error('两次输入的密码不一致')
            await memberApi.password(current, password)
            onLogout()
          })
        }}
      >
        <label>
          当前密码
          <input
            type="password"
            required
            maxLength={72}
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </label>
        <label>
          新密码
          <input
            type="password"
            required
            minLength={10}
            maxLength={72}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label>
          确认新密码
          <input
            type="password"
            required
            minLength={10}
            maxLength={72}
            autoComplete="new-password"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </label>
        <p className="muted">修改密码后，所有设备的旧登录都会失效。</p>
        <button className="button" disabled={busy}>
          修改密码并退出
        </button>
      </form>
      <details className="member-close">
        <summary>注销账号</summary>
        <p>
          注销将清除邮箱、头像和简介，删除留言墙便签，历史评论匿名保留；此操作无法撤销。也可以先在上方删除自己的评论。
        </p>
        <form
          className="member-form"
          onSubmit={(event) => {
            event.preventDefault()
            if (window.confirm('确定永久注销账号吗？'))
              void action(async () => {
                await memberApi.close(closing)
                onLogout()
              })
          }}
        >
          <label>
            输入密码确认注销
            <input
              type="password"
              required
              maxLength={72}
              autoComplete="current-password"
              value={closing}
              onChange={(e) => setClosing(e.target.value)}
            />
          </label>
          <button className="text-button danger" disabled={busy}>
            永久注销账号
          </button>
        </form>
      </details>
    </section>
  )
}
