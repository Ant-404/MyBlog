import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Send, Eye } from 'lucide-react'
import { adminPostsApi } from '../../api/adminPosts'
import { HttpError } from '../../api/http'
import { useAsyncData } from '../../hooks/useAsyncData'
import { usePageTitle } from '../../hooks/usePageTitle'
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges'
import DataState from '../../components/common/DataState'
import MarkdownEditor from '../../components/admin/MarkdownEditor'
import MediaLibrary from '../../components/admin/MediaLibrary'
import type { PostInput, AdminPost } from '../../types/adminPost'

function emptyPost(): PostInput {
  return {
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    cover: '/images/landscape.svg',
    category: '随笔',
    tags: [],
    publishedAt: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' }),
    readingMinutes: 1,
    pinned: false,
    status: 'DRAFT',
    version: 0,
  }
}
function fromPost(post: AdminPost): PostInput {
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    cover: post.cover,
    category: post.category,
    tags: post.tags,
    publishedAt: post.publishedAt,
    readingMinutes: post.readingMinutes,
    pinned: post.pinned,
    status: post.status,
    version: post.version,
  }
}

export default function AdminPostEditorPage() {
  const { id } = useParams()
  const isNew = id === undefined
  const navigate = useNavigate()
  const { expire } = useOutletContext<{ expire: () => void }>()
  usePageTitle(isNew ? '新建文章' : '编辑文章')
  const [form, setForm] = useState<PostInput>(emptyPost)
  const [baseline, setBaseline] = useState('')
  const [tagsText, setTagsText] = useState('')
  const saving = useRef(false)
  const editorForm = useRef<HTMLFormElement>(null)
  const [mediaTarget, setMediaTarget] = useState<'cover' | 'content' | null>(null)
  const [autoSave, setAutoSave] = useState(true)
  const [autoPaused, setAutoPaused] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [saved, setSaved] = useState('')
  const fetchPost = useCallback(
    () => (isNew ? Promise.resolve(null) : adminPostsApi.detail(Number(id))),
    [isNew, id],
  )
  const { data, loading, error, errorStatus, refresh } = useAsyncData(fetchPost)
  const { data: options } = useAsyncData(adminPostsApi.options)
  const dirty =
    baseline !== '' &&
    JSON.stringify({
      ...form,
      tags: tagsText
        .split(/[,，]/)
        .map((tag) => tag.trim())
        .filter(Boolean),
    }) !== baseline
  const allowNavigation = useUnsavedChanges(dirty)
  useEffect(() => {
    if (errorStatus === 401) expire()
  }, [errorStatus, expire])
  useEffect(() => {
    if (loading || error) return
    const next = data ? fromPost(data) : emptyPost()
    setForm(next)
    setTagsText(next.tags.join(', '))
    setBaseline(JSON.stringify(next))
    setSaved('')
    setActionError('')
    setAutoPaused(false)
  }, [data, loading, error])
  function field<K extends keyof PostInput>(key: K, value: PostInput[K]) {
    setForm((previous) => ({ ...previous, [key]: value }))
    setSaved('')
  }
  async function save(status: 'DRAFT' | 'PUBLISHED', automatic = false) {
    if (saving.current) return
    const input: PostInput = {
      ...form,
      status,
      title: form.title.trim(),
      slug: form.slug.trim(),
      category: form.category.trim(),
      tags: [
        ...new Set(
          tagsText
            .split(/[,，]/)
            .map((tag) => tag.trim())
            .filter(Boolean),
        ),
      ],
    }
    if (!input.title || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug) || !input.category) {
      setActionError('请填写标题、分类和有效的文章地址（小写英文、数字与短横线）。')
      return
    }
    if (status === 'PUBLISHED' && !input.content.trim()) {
      setActionError('请先填写正文，再发布文章。')
      return
    }
    if (input.tags.length > 12 || input.tags.some((tag) => tag.length > 64)) {
      setActionError('最多添加 12 个标签，每个标签不超过 64 个字符。')
      return
    }
    saving.current = true
    setBusy(true)
    setActionError('')
    setSaved('')
    try {
      const result = isNew
        ? await adminPostsApi.create(input)
        : await adminPostsApi.update(Number(id), input)
      const next = fromPost(result)
      setForm(next)
      setTagsText(next.tags.join(', '))
      setBaseline(JSON.stringify(next))
      setAutoPaused(false)
      setSaved(
        automatic
          ? `草稿已自动保存 · ${new Date().toLocaleTimeString('zh-CN')}`
          : status === 'DRAFT'
            ? '草稿已保存'
            : '文章已保存并发布',
      )
      if (isNew) {
        allowNavigation()
        navigate(`/admin/posts/${result.id}/edit`, { replace: true })
      }
    } catch (cause) {
      setAutoPaused(true)
      if (cause instanceof HttpError && cause.status === 401) expire()
      else setActionError(cause instanceof Error ? cause.message : '保存失败')
    } finally {
      saving.current = false
      setBusy(false)
    }
  }
  const existingDraft =
    !isNew && baseline !== '' && JSON.parse(baseline).status === 'DRAFT' && form.status === 'DRAFT'
  useEffect(() => {
    if (!autoSave || autoPaused || !existingDraft || !dirty || busy || loading || error) return
    const timer = window.setTimeout(() => {
      if (editorForm.current?.checkValidity()) void save('DRAFT', true)
    }, 3000)
    return () => window.clearTimeout(timer)
  }, [autoSave, autoPaused, existingDraft, dirty, busy, loading, error, form, tagsText, baseline])
  const autoMessage = autoPaused
    ? '自动保存已暂停，请处理错误后手动保存。'
    : isNew
      ? '首次手动保存草稿后启用自动保存。'
      : !existingDraft
        ? '已发布文章请手动保存修改。'
        : !autoSave
          ? '自动保存已关闭。'
          : busy
            ? '正在保存…'
            : dirty
              ? '停止输入 3 秒后自动保存（必填项需完整）。'
              : '草稿修改会自动保存。'
  return (
    <DataState loading={loading} error={error} onRetry={refresh}>
      <div className="post-editor-page">
        <div className="admin-page-heading">
          <div>
            <Link to="/admin/posts" className="back-link">
              <ArrowLeft size={15} />
              返回文章列表
            </Link>
            <h1>
              {isNew ? '写一篇新文章' : '编辑文章'}
              <span className="heading-dot">.</span>
            </h1>
          </div>
          <div className="editor-actions">
            {!isNew && form.status === 'PUBLISHED' && (
              <Link
                to={`/posts/${form.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="button secondary"
              >
                <Eye size={15} />
                查看文章
              </Link>
            )}
            <button
              type="submit"
              form="post-editor-form"
              className="button secondary"
              disabled={busy}
              onClick={() => field('status', 'DRAFT')}
            >
              <Save size={15} />
              保存草稿
            </button>
            <button
              type="submit"
              form="post-editor-form"
              className="button"
              disabled={busy}
              onClick={() => field('status', 'PUBLISHED')}
            >
              <Send size={15} />
              {busy ? '保存中…' : '发布文章'}
            </button>
          </div>
        </div>
        {actionError && (
          <p className="form-error" role="alert">
            {actionError}
          </p>
        )}
        {saved && (
          <p className="form-success" role="status">
            {saved}
          </p>
        )}
        <div className="autosave-bar">
          <label>
            <input
              type="checkbox"
              checked={autoSave}
              onChange={(event) => setAutoSave(event.target.checked)}
            />
            自动保存草稿
          </label>
          <span>{autoMessage}</span>
        </div>
        <div hidden={!mediaTarget} className="card media-picker">
          <div className="management-heading">
            <h2>选择图片</h2>
            <button type="button" className="text-button" onClick={() => setMediaTarget(null)}>
              关闭图片选择
            </button>
          </div>
          {mediaTarget && (
            <MediaLibrary
              disabled={busy}
              onSelect={(url) => {
                if (mediaTarget === 'cover') field('cover', url)
                else field('content', form.content + '\n\n![图片说明](' + url + ')\n')
                setMediaTarget(null)
              }}
            />
          )}
        </div>
        <form
          ref={editorForm}
          id="post-editor-form"
          className="editor-grid"
          onSubmit={(event) => {
            event.preventDefault()
            void save(form.status)
          }}
        >
          <section className="card editor-main">
            <label htmlFor="post-title">文章标题</label>
            <input
              id="post-title"
              value={form.title}
              onChange={(event) => field('title', event.target.value)}
              placeholder="给这篇记录起个名字"
              required
              maxLength={200}
              disabled={busy}
            />
            <label htmlFor="post-excerpt">文章摘要</label>
            <textarea
              id="post-excerpt"
              value={form.excerpt}
              onChange={(event) => field('excerpt', event.target.value)}
              placeholder="简要介绍文章内容，显示在前台卡片中"
              maxLength={500}
              rows={3}
              disabled={busy}
            />
            <div className="editor-label-line">
              <label htmlFor="post-content">正文（Markdown）</label>
              <span>
                {form.content.length} 字符{dirty ? ' · 尚未保存' : ''}
              </span>
            </div>
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => setMediaTarget('content')}
            >
              上传 / 选择正文图片
            </button>
            <MarkdownEditor
              value={form.content}
              onChange={(value) => field('content', value)}
              disabled={busy}
            />
          </section>
          <aside className="card editor-settings">
            <h2>文章设置</h2>
            <label htmlFor="post-slug">文章地址（slug）</label>
            <input
              id="post-slug"
              value={form.slug}
              onChange={(event) => field('slug', event.target.value)}
              placeholder="例如 my-first-post"
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              required
              maxLength={160}
              disabled={busy}
            />
            <small>使用小写英文、数字与短横线。修改后旧地址会失效。</small>
            <label htmlFor="post-category">分类</label>
            <input
              id="post-category"
              list="post-category-options"
              value={form.category}
              onChange={(event) => field('category', event.target.value)}
              required
              maxLength={64}
              disabled={busy}
            />
            <datalist id="post-category-options">
              {options?.categories.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            <small>选择已有分类，或输入新分类。</small>
            <label htmlFor="post-tags">标签</label>
            <input
              id="post-tags"
              value={tagsText}
              onChange={(event) => {
                setTagsText(event.target.value)
                setSaved('')
              }}
              placeholder="例如 React, 学习笔记"
              disabled={busy}
            />
            <small>用逗号分隔，最多 12 个。</small>
            <label htmlFor="post-date">发布日期</label>
            <input
              id="post-date"
              type="date"
              value={form.publishedAt}
              onChange={(event) => field('publishedAt', event.target.value)}
              required
              disabled={busy}
            />
            <small>未来日期的文章到当天才会在前台显示。</small>
            <label htmlFor="post-minutes">阅读时长（分钟）</label>
            <input
              id="post-minutes"
              type="number"
              min={1}
              max={240}
              value={form.readingMinutes}
              onChange={(event) => field('readingMinutes', Number(event.target.value))}
              required
              disabled={busy}
            />
            <label htmlFor="post-cover">封面地址</label>
            <input
              id="post-cover"
              value={form.cover}
              onChange={(event) => field('cover', event.target.value)}
              placeholder="/images/landscape.svg"
              maxLength={500}
              disabled={busy}
            />
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => setMediaTarget('cover')}
            >
              上传 / 选择封面
            </button>
            <small>支持站内路径或 HTTP/HTTPS 图片地址。</small>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.pinned}
                onChange={(event) => field('pinned', event.target.checked)}
                disabled={busy}
              />
              置顶文章
            </label>
            <p className="editor-current-status">
              当前状态：{form.status === 'DRAFT' ? '草稿' : '已发布 / 待发布'}
            </p>
          </aside>
        </form>
      </div>
    </DataState>
  )
}
