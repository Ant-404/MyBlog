import { useCallback, useEffect, useRef, useState } from 'react'
import { ImagePlus, MessageSquare, RefreshCw, Smile, UserRound, X } from 'lucide-react'
import { communityApi } from '../../api/community'
import { mediaApi } from '../../api/media'
import { demoMode } from '../../api/http'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useSite } from '../../contexts/SiteContext'
import DataState from '../common/DataState'
import ContentPagination from '../common/ContentPagination'
import { renderComment } from '../../utils/commentMarkdown'
import avatarImages from 'virtual:user-images'

const limit = 500
const avatarSeed = Math.floor(Math.random() * 0x7fffffff)
const kaomoji = [
  '(｡･ω･｡)',
  '(*^▽^*)',
  '(≧▽≦)',
  '(๑•̀ㅂ•́)و✧',
  '(´▽`ʃ♡ƪ)',
  '(づ｡◕‿‿◕｡)づ',
  '( •̀ ω •́ )✧',
  '(￣▽￣)／',
  '(⁎⁍̴̛ᴗ⁍̴̛⁎)',
  '(〃∀〃)',
  '(´･ω･`)',
  '(・・?)',
  '(⊙_⊙)',
  '(￣～￣;)',
  '(╥﹏╥)',
  '(T_T)',
  '(｡•́︿•̀｡)',
  '(つД`)ノ',
  '(╯°□°）╯︵ ┻━┻',
  '┬─┬ ノ( ゜-゜ノ)',
  '(￣o￣) . z Z',
  '٩(ˊᗜˋ*)و',
  '(ง •_•)ง',
  '(o゜▽゜)o☆',
]

function CommentAvatar({ identity, composer = false }: { identity: string; composer?: boolean }) {
  // Keep each comment's randomly assigned image stable while editing or refreshing the list.
  const hash = Array.from(identity).reduce(
    (value, char) => (value * 31 + char.charCodeAt(0)) >>> 0,
    avatarSeed,
  )
  const source = avatarImages.length ? avatarImages[hash % avatarImages.length] : ''
  const [failed, setFailed] = useState(false)
  return (
    <span
      className={composer ? 'comment-composer-avatar' : 'comment-author-avatar'}
      aria-hidden="true"
    >
      {source && !failed ? (
        <img src={source} alt="" onError={() => setFailed(true)} />
      ) : (
        <UserRound size={composer ? 27 : 20} />
      )}
    </span>
  )
}

export default function PostComments({ slug }: { slug: string }) {
  return <CommentSection key={slug} slug={slug} />
}
function CommentSection({ slug }: { slug: string }) {
  const site = useSite()
  const draftKey = `myblog-comment-draft:guest:${slug}`
  const [draft] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(draftKey) || '{}')
      const text = (key: string, max: number) =>
        typeof saved[key] === 'string' ? saved[key].slice(0, max) : ''
      return {
        author: text('author', 64),
        email: text('email', 254),
        url: text('url', 500),
        content: text('content', limit),
      }
    } catch {
      return { author: '', email: '', url: '', content: '' }
    }
  })
  const [author, setAuthor] = useState(draft.author)
  const [email, setEmail] = useState(draft.email)
  const [url, setUrl] = useState(draft.url)
  const [content, setContent] = useState(draft.content)
  const [website, setWebsite] = useState('')
  const [reply, setReply] = useState<{ id: number; author: string } | null>(null)
  const [preview, setPreview] = useState(false)
  const [tools, setTools] = useState<'emoji' | 'image' | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [page, setPage] = useState(1)
  const fetchComments = useCallback(() => communityApi.comments(slug, page), [slug, page])
  const { data, loading, error, refresh } = useAsyncData(fetchComments)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  const [draftStatus, setDraftStatus] = useState('')
  const textarea = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (!site.commentsEnabled || demoMode) return
    try {
      if (content.trim()) {
        sessionStorage.setItem(draftKey, JSON.stringify({ author, email, url, content }))
        setDraftStatus('草稿已保存至本标签页')
      } else {
        sessionStorage.removeItem(draftKey)
        setDraftStatus('')
      }
    } catch {
      setDraftStatus('当前浏览器无法保存草稿')
    }
  }, [author, email, url, content, draftKey, site.commentsEnabled])
  const insert = (text: string) => {
    const input = textarea.current
    const start = input?.selectionStart ?? content.length
    const end = input?.selectionEnd ?? content.length
    if (content.length - (end - start) + text.length > limit) {
      setFailed(true)
      setMessage('内容超过 500 字，请先精简文字。')
      return
    }
    setContent(content.slice(0, start) + text + content.slice(end))
    setTools(null)
    requestAnimationFrame(() => {
      input?.focus()
      input?.setSelectionRange(start + text.length, start + text.length)
    })
  }
  async function submit() {
    if (busy || !content.trim() || !author.trim()) return
    setBusy(true)
    setFailed(false)
    setMessage('')
    try {
      await communityApi.submit(slug, {
        author: author.trim(),
        email: email.trim(),
        url: url.trim(),
        content: content.trim(),
        website,
        parentId: reply?.id,
      })
      try {
        sessionStorage.removeItem(draftKey)
      } catch {
        /* Submission already succeeded. */
      }
      setContent('')
      setReply(null)
      setPreview(false)
      setTools(null)
      setMessage('评论已发布。')
      if (page === 1) refresh()
      else setPage(1)
    } catch (cause) {
      setFailed(true)
      setMessage(cause instanceof Error ? cause.message : '发送失败，文字已保留，请稍后重试。')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="post-comments comment-widget" aria-label="文章评论">
      <header className="comment-section-title">
        <MessageSquare size={22} />
        <h2>
          评论 <span className="count">{data?.total ?? '—'}</span>
        </h2>
      </header>
      {site.commentsEnabled && !demoMode ? (
        <form
          className="comment-form"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <CommentAvatar identity="composer" composer />
          <div className="comment-composer-main">
            <div className="comment-fields">
              <label>
                <span>昵称</span>
                <input
                  required
                  aria-label="昵称"
                  placeholder="必填"
                  maxLength={64}
                  autoComplete="nickname"
                  value={author}
                  disabled={busy}
                  onChange={(e) => setAuthor(e.target.value)}
                />
              </label>
              <label>
                <span>邮箱</span>
                <input
                  required
                  type="email"
                  aria-label="邮箱"
                  placeholder="必填，不会公开"
                  maxLength={254}
                  autoComplete="email"
                  value={email}
                  disabled={busy}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label>
                <span>网址</span>
                <input
                  type="url"
                  aria-label="网址"
                  placeholder="选填，https://…"
                  maxLength={500}
                  autoComplete="url"
                  value={url}
                  disabled={busy}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </label>
            </div>
            {reply && (
              <div className="comment-reply-banner">
                <span>回复 {reply.author}</span>
                <button
                  className="text-button"
                  type="button"
                  disabled={busy}
                  aria-label="取消回复"
                  onClick={() => setReply(null)}
                >
                  <X size={14} />
                  取消回复
                </button>
              </div>
            )}
            <div className="comment-editor">
              <textarea
                ref={textarea}
                aria-label="评论内容"
                required
                maxLength={limit}
                rows={4}
                placeholder="快来聊两句吧，期待你的想法…"
                value={content}
                disabled={busy}
                onChange={(e) => setContent(e.target.value)}
              />
              <span className="comment-length" aria-label="评论字数">
                {content.length}/{limit}
              </span>
            </div>
            <div className="comment-toolbar">
              <div className="comment-tools">
                <button
                  className="comment-tool"
                  type="button"
                  title="添加颜文字"
                  aria-label="添加颜文字"
                  aria-expanded={tools === 'emoji'}
                  aria-controls="comment-emoji-picker"
                  disabled={busy}
                  onClick={() => setTools(tools === 'emoji' ? null : 'emoji')}
                >
                  <Smile size={21} />
                </button>
                <button
                  className="comment-tool"
                  type="button"
                  title="插入图片"
                  aria-label="插入图片"
                  aria-expanded={tools === 'image'}
                  aria-controls="comment-image-picker"
                  disabled={busy}
                  onClick={() => setTools(tools === 'image' ? null : 'image')}
                >
                  <ImagePlus size={21} />
                </button>
                <span
                  className="comment-markdown-hint"
                  title="支持 Markdown：加粗、链接、引用和图片"
                >
                  Markdown
                </span>
              </div>
              <div className="comment-send-actions">
                <button
                  className="comment-preview-button"
                  type="button"
                  aria-pressed={preview}
                  disabled={busy}
                  onClick={() => {
                    setPreview(!preview)
                    setTools(null)
                  }}
                >
                  {preview ? '收起预览' : '预览'}
                </button>
                <button
                  className="button"
                  disabled={busy || !author.trim() || !email.trim() || !content.trim()}
                >
                  {uploading ? '图片上传中…' : busy ? '发送中…' : '发送'}
                </button>
              </div>
            </div>
            {preview && (
              <div
                className="comment-preview comment-rich-text"
                aria-label="评论预览"
                role="region"
                dangerouslySetInnerHTML={{ __html: renderComment(content || '还没有写下内容。') }}
              />
            )}
            {tools === 'emoji' && (
              <div
                className="comment-emoji-picker"
                id="comment-emoji-picker"
                role="group"
                aria-label="选择颜文字"
              >
                {kaomoji.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    aria-label={`插入 ${emoji}`}
                    disabled={busy}
                    onClick={() => insert(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            {tools === 'image' && (
              <div className="comment-image-picker" id="comment-image-picker">
                <label className="comment-photo-upload">
                  {uploading ? '正在处理并上传照片…' : '从本地选择照片'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                    disabled={busy}
                    onChange={async (event) => {
                      const file = event.currentTarget.files?.[0]
                      event.currentTarget.value = ''
                      if (!file || busy) return
                      if (content.length + 80 > limit) {
                        setFailed(true)
                        setMessage('请预留至少 80 字用于插入图片，已写文字会保留。')
                        return
                      }
                      setBusy(true)
                      setUploading(true)
                      setMessage('')
                      setFailed(false)
                      try {
                        const image = await mediaApi.uploadCommentImage(file)
                        insert(`![照片](${image.url})`)
                        setPreview(true)
                        setMessage('照片已插入，发送评论后会公开显示。')
                      } catch (cause) {
                        setFailed(true)
                        setMessage(
                          cause instanceof Error ? cause.message : '照片上传失败，请重试。',
                        )
                      } finally {
                        setBusy(false)
                        setUploading(false)
                      }
                    }}
                  />
                  <small>支持 JPG、PNG、WebP 等图片，最大 20MB，自动缩小并压缩。</small>
                </label>
                <label>
                  或填写图片链接
                  <input
                    type="url"
                    placeholder="https://…"
                    value={imageUrl}
                    maxLength={500}
                    disabled={busy}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                </label>
                <button
                  className="comment-preview-button"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    try {
                      const parsed = new URL(imageUrl.trim())
                      if (
                        !['https:', 'http:'].includes(parsed.protocol) ||
                        parsed.username ||
                        parsed.password
                      )
                        throw new Error()
                      insert(
                        `![图片](${parsed.href.replaceAll('(', '%28').replaceAll(')', '%29')})`,
                      )
                      setImageUrl('')
                    } catch {
                      setFailed(true)
                      setMessage('请输入有效的 HTTP/HTTPS 图片链接。')
                    }
                  }}
                >
                  插入图片
                </button>
              </div>
            )}
            <div className="comment-editor-note">
              <span>邮箱不会公开 · 评论即时发布</span>
              <span>{draftStatus}</span>
            </div>
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
        </form>
      ) : (
        <p className="muted">{demoMode ? '预览模式不接受评论。' : '评论暂时关闭。'}</p>
      )}
      {message && (
        <p className={failed ? 'form-error' : 'form-success'} role={failed ? 'alert' : 'status'}>
          {message}
        </p>
      )}
      <div className="comment-feed-toolbar">
        <span>{data?.total ? `${data.total} 条评论` : '所有评论'}</span>
        <button
          className="comment-tool"
          type="button"
          aria-label="刷新评论"
          title="刷新评论"
          disabled={loading}
          onClick={refresh}
        >
          <RefreshCw size={17} className={loading ? 'comment-refreshing' : ''} />
        </button>
      </div>
      <DataState loading={loading} error={error} onRetry={refresh}>
        <div className="comment-list">
          {data?.items.map((comment) => (
            <article
              className={`comment-item ${comment.parentId ? 'is-reply' : ''}`}
              id={`comment-${comment.id}`}
              key={comment.id}
            >
              <div className="comment-item-header">
                <CommentAvatar identity={String(comment.id)} />
                <div>
                  <strong>
                    {comment.url ? (
                      <a href={comment.url} target="_blank" rel="nofollow ugc noopener noreferrer">
                        {comment.author}
                      </a>
                    ) : (
                      comment.author
                    )}
                  </strong>
                  <time dateTime={comment.createdAt}>
                    {comment.createdAt.replace('T', ' ').slice(0, 16)}
                  </time>
                </div>
                {site.commentsEnabled && !demoMode && (
                  <button
                    type="button"
                    className="text-button comment-reply-button"
                    disabled={busy}
                    onClick={() => {
                      setReply({ id: comment.id, author: comment.author })
                      setPreview(false)
                      requestAnimationFrame(() => {
                        textarea.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        textarea.current?.focus({ preventScroll: true })
                      })
                    }}
                  >
                    回复
                  </button>
                )}
              </div>
              {comment.replyTo && <p className="comment-reply-to">回复 @{comment.replyTo}</p>}
              <div
                className="comment-rich-text"
                dangerouslySetInnerHTML={{ __html: renderComment(comment.content) }}
              />
            </article>
          ))}
        </div>
        {data?.total === 0 && (
          <div className="comment-empty">
            <MessageSquare size={32} />
            <p>还没有评论</p>
            <span>来写下第一句问候吧。</span>
          </div>
        )}
        {data && <ContentPagination page={page} total={data.total} size={20} onChange={setPage} />}
      </DataState>
    </section>
  )
}
