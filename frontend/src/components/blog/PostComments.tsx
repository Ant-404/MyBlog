import { useCallback, useEffect, useState } from 'react'
import { communityApi } from '../../api/community'
import { demoMode } from '../../api/http'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useSite } from '../../contexts/SiteContext'
import DataState from '../common/DataState'
import { Link } from 'react-router-dom'
import { useMember } from '../../contexts/MemberContext'
import { memberApi } from '../../api/members'

export default function PostComments({ slug }: { slug: string }) {
  const { member } = useMember()
  return <MemberComments key={`${slug}:${member?.id || 'guest'}`} slug={slug} />
}

function MemberComments({ slug }: { slug: string }) {
  const site = useSite()
  const { member, loading: memberLoading, refresh: refreshMember } = useMember()
  const [reply, setReply] = useState<{ id: number; author: string } | null>(null)
  const [reportId, setReportId] = useState<number>()
  const [reason, setReason] = useState('')
  const [page, setPage] = useState(1)
  const fetch = useCallback(() => communityApi.comments(slug, page), [slug, page])
  const { data, loading, error, refresh } = useAsyncData(fetch)
  const draftKey = `myblog-comment-draft:${member?.id || 'guest'}:${slug}`
  const [draft] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(draftKey) || '{}')
      return {
        author: typeof saved.author === 'string' ? saved.author.slice(0, 64) : '',
        content: typeof saved.content === 'string' ? saved.content.slice(0, 2000) : '',
      }
    } catch {
      return { author: '', content: '' }
    }
  })
  const author = member?.nickname || '匿名用户'
  const [content, setContent] = useState(draft.content)
  const [draftStatus, setDraftStatus] = useState('')
  const [website, setWebsite] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!site.commentsEnabled || demoMode || memberLoading) return
    const timer = setTimeout(() => {
      try {
        if (content.trim()) {
          sessionStorage.setItem(draftKey, JSON.stringify({ author, content }))
          setDraftStatus('草稿已保存在本标签页')
        } else {
          sessionStorage.removeItem(draftKey)
          setDraftStatus('')
        }
      } catch {
        setDraftStatus('当前浏览器无法保存草稿')
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [author, content, draftKey, site.commentsEnabled, memberLoading])
  async function submit() {
    if (!author.trim() || !content.trim() || busy) return
    setBusy(true)
    setMessage('')
    setFailed(false)
    try {
      await communityApi.submit(slug, author.trim(), content.trim(), website, reply?.id)
      try {
        sessionStorage.removeItem(draftKey)
      } catch {
        /* Comment submission succeeded even when local storage is unavailable. */
      }
      setContent('')
      setReply(null)
      setMessage(
        member ? '评论已发布，管理员审核后可能调整展示。' : '评论已提交，审核通过后会显示在这里。',
      )
      if (member) {
        setPage(1)
        refresh()
      }
    } catch (cause) {
      void refreshMember()
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
      <p className="muted">
        注册用户的评论先展示后审核，匿名评论审核通过后公开。请勿留下私人联系方式。
      </p>
      {site.commentsEnabled &&
      !demoMode &&
      !memberLoading &&
      (!member || member.status === 'ACTIVE') ? (
        <form
          className="comment-form"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <p className="comment-identity">
            {member ? (
              <>
                以 <strong>{author}</strong> <span>#{member.id} · 邮箱已验证</span> 发表评论{' '}
                <Link to="/account">管理账号</Link>
              </>
            ) : (
              <>
                以 <strong>匿名用户</strong> 发表评论，审核后展示。{' '}
                <Link to="/account">登录或注册</Link>后评论可立即展示。
              </>
            )}
          </p>
          {reply && (
            <p className="callout">
              回复 {reply.author}
              <button type="button" className="text-button" onClick={() => setReply(null)}>
                取消回复
              </button>
            </p>
          )}
          <label>
            评论内容
            <textarea
              required
              maxLength={2000}
              rows={2}
              value={content}
              disabled={busy}
              onChange={(e) => setContent(e.target.value)}
            />
          </label>
          <div className="comment-counter">
            <span aria-live="polite">{draftStatus}</span>
            <span>{content.length} / 2000</span>
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
          <button className="button" disabled={busy || !author.trim() || !content.trim()}>
            {busy ? '提交中…' : '提交评论'}
          </button>
        </form>
      ) : (
        <p className="muted">
          {demoMode ? (
            '预览模式不接受评论。'
          ) : !site.commentsEnabled ? (
            '评论暂时关闭。'
          ) : memberLoading ? (
            '正在读取登录状态…'
          ) : member ? (
            '账号已禁言，暂时无法评论。'
          ) : (
            <>
              <Link to="/account">登录或注册</Link>
              ，验证邮箱后即可评论。未完成的文字会保留在本标签页。
            </>
          )}
        </p>
      )}
      {message && (
        <p className={failed ? 'form-error' : 'form-success'} role={failed ? 'alert' : 'status'}>
          {message}
        </p>
      )}
      <DataState loading={loading} error={error} onRetry={refresh}>
        <div className="comment-list">
          {data?.items.map((comment) => (
            <article key={comment.id} id={`comment-${comment.id}`}>
              <div>
                {comment.avatar && (
                  <img className="comment-avatar" src={comment.avatar} alt="" loading="lazy" />
                )}
                <strong>
                  {comment.memberId ? (
                    <Link to={`/people/${comment.memberId}`}>{comment.author}</Link>
                  ) : (
                    comment.author
                  )}
                </strong>
                <small>{comment.memberId ? `#${comment.memberId} · 注册用户` : '匿名用户'}</small>
                <time>{comment.createdAt}</time>
              </div>
              {comment.replyTo && <p className="muted">回复 {comment.replyTo}</p>}
              <p>{comment.content}</p>
              {site.commentsEnabled &&
                !demoMode &&
                !memberLoading &&
                (!member || member.status === 'ACTIVE') && (
                  <div className="comment-actions">
                    <button
                      className="text-button"
                      onClick={() => {
                        setReply({ id: comment.id, author: comment.author })
                        document
                          .querySelector('.comment-form')
                          ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        document
                          .querySelector<HTMLTextAreaElement>('.comment-form textarea')
                          ?.focus({ preventScroll: true })
                      }}
                    >
                      回复
                    </button>
                    {member && (
                      <button
                        className="text-button"
                        onClick={() => {
                          setReportId(comment.id)
                          setReason('')
                        }}
                      >
                        举报
                      </button>
                    )}
                  </div>
                )}
              {reportId === comment.id && (
                <form
                  className="member-form"
                  onSubmit={(event) => {
                    event.preventDefault()
                    if (busy) return
                    setBusy(true)
                    setFailed(false)
                    setMessage('')
                    void memberApi
                      .report(comment.id, reason)
                      .then(() => {
                        setMessage('举报已提交，管理员会核查。')
                        setReportId(undefined)
                      })
                      .catch((cause: unknown) => {
                        setFailed(true)
                        setMessage(cause instanceof Error ? cause.message : '举报失败')
                      })
                      .finally(() => setBusy(false))
                  }}
                >
                  <label>
                    举报原因
                    <textarea
                      required
                      maxLength={500}
                      rows={2}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </label>
                  <button className="button" disabled={busy}>
                    提交举报
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setReportId(undefined)}
                  >
                    取消举报
                  </button>
                </form>
              )}
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
