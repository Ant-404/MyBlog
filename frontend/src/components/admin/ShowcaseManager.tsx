import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUp, ArrowDown, X, Plus } from 'lucide-react'
import { showcaseApi } from '../../api/showcase'
import { adminPostsApi } from '../../api/adminPosts'
import {
  showcaseLabels,
  showcaseStates,
  type ShowcaseEntry,
  type ShowcaseSection,
} from '../../types/showcase'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useAdminAction } from '../../hooks/useAdminAction'
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges'
import { usePageTitle } from '../../hooks/usePageTitle'
import DataState from '../common/DataState'
import ContentPagination from '../common/ContentPagination'
import MediaLibrary from './MediaLibrary'
import MarkdownEditor from './MarkdownEditor'

type Form = Omit<ShowcaseEntry, 'id' | 'section'>
const today = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date())
function empty(section: ShowcaseSection): Form {
  return {
    title: '',
    summary: '',
    content: '',
    cover: '',
    status: section === 'projects' ? 'IN_PROGRESS' : section === 'series' ? 'ONGOING' : '',
    technologies: [],
    sourceUrl: '',
    demoUrl: '',
    images: [],
    posts: [],
    publishedAt: today(),
    sortOrder: 0,
    visible: false,
    version: 0,
  }
}
const techs = (value: string) => [
  ...new Set(
    value
      .split(/[,，]/)
      .map((item) => item.trim())
      .filter(Boolean),
  ),
]

export default function ShowcaseManager({ section }: { section: ShowcaseSection }) {
  const label = showcaseLabels[section]
  usePageTitle(`${label}管理`)
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const fetch = useCallback(
    () => showcaseApi.list(section, page, query, true),
    [section, page, query],
  )
  const { data, loading, error, errorStatus, refresh } = useAsyncData(fetch)
  const [postSearch, setPostSearch] = useState('')
  const [postQuery, setPostQuery] = useState('')
  const fetchPosts = useCallback(
    () => (section === 'moments' ? Promise.resolve(null) : adminPostsApi.list(1, postQuery)),
    [section, postQuery],
  )
  const {
    data: options,
    error: postError,
    errorStatus: postStatus,
    refresh: refreshPosts,
  } = useAsyncData(fetchPosts)
  const { busy, message, run } = useAdminAction(errorStatus === 401 ? errorStatus : postStatus)
  const [form, setForm] = useState<Form>(() => empty(section))
  const [id, setId] = useState<number>()
  const [technologyText, setTechnologyText] = useState('')
  const [baseline, setBaseline] = useState(() => JSON.stringify(empty(section)))
  const [mediaMode, setMediaMode] = useState<'cover' | 'images' | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const snapshot = JSON.stringify({ ...form, technologies: techs(technologyText) })
  useUnsavedChanges(snapshot !== baseline)
  useEffect(() => {
    if (data && !data.items.length && page > 1) setPage(page - 1)
  }, [data, page])
  function edit(entry?: ShowcaseEntry, force = false) {
    if (
      !force &&
      snapshot !== baseline &&
      !window.confirm('还有未保存的修改，确定放弃当前输入吗？')
    )
      return
    const next: Form = entry
      ? {
          title: entry.title,
          summary: entry.summary,
          content: entry.content,
          cover: entry.cover,
          status: entry.status,
          technologies: [...entry.technologies],
          sourceUrl: entry.sourceUrl,
          demoUrl: entry.demoUrl,
          images: [...entry.images],
          posts: [...entry.posts],
          publishedAt: entry.publishedAt,
          sortOrder: entry.sortOrder,
          visible: entry.visible,
          version: entry.version,
        }
      : empty(section)
    setForm(next)
    setTechnologyText(next.technologies.join(', '))
    setBaseline(JSON.stringify(next))
    setId(entry?.id)
    setMediaMode(null)
    setImageUrl('')
  }
  function reorder(field: 'posts' | 'images', index: number, delta: number) {
    setForm((old) => {
      const values = [...old[field]]
      const target = index + delta
      if (target < 0 || target >= values.length) return old
      ;[values[index], values[target]] = [values[target], values[index]]
      return { ...old, [field]: values }
    })
  }
  function addImage(url: string) {
    if (!url.trim() || form.images.length >= 9) return
    setForm((old) => ({ ...old, images: [...old.images, url.trim()] }))
    setImageUrl('')
  }
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <h1>
            {label}管理<span className="heading-dot">.</span>
          </h1>
          <p className="muted">
            {section === 'projects'
              ? '整理项目介绍、技术栈、源码与演示链接。'
              : section === 'series'
                ? '关联已有文章，按你希望的顺序组织阅读。'
                : '发布短文字和照片，记录日常片段。'}{' '}
            勾选公开后，到发布日期才会出现在前台。
          </p>
        </div>
        <Link className="button" to={`/${section}`}>
          查看前台
        </Link>
      </div>
      <section className="card management-card">
        <div className="showcase-editor-heading">
          <h2>{id ? `编辑${label}` : `新增${label}`}</h2>
          {id && (
            <button type="button" className="text-button" disabled={busy} onClick={() => edit()}>
              <Plus size={15} />
              新建一条
            </button>
          )}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void run(async () => {
              const { posts, ...fields } = form
              const saved = await showcaseApi.save(
                section,
                {
                  ...fields,
                  technologies: techs(technologyText),
                  postIds: posts.map((post) => post.id),
                },
                id,
              )
              edit(saved, true)
              refresh()
            })
          }}
        >
          <fieldset className="showcase-fields" disabled={busy}>
            <label>
              {section === 'moments' ? '说说标题（可选）' : `${label}标题`}
              <input
                required={section !== 'moments'}
                maxLength={200}
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </label>
            {section !== 'moments' && (
              <label>
                状态
                <select
                  value={form.status}
                  onChange={(event) => setForm({ ...form, status: event.target.value })}
                >
                  {Object.entries(showcaseStates[section]).map(([value, name]) => (
                    <option key={value} value={value}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              发布日期
              <input
                required
                type="date"
                value={form.publishedAt}
                onChange={(event) => setForm({ ...form, publishedAt: event.target.value })}
              />
            </label>
            <label>
              排序（小的在前）
              <input
                required
                type="number"
                min={-10000}
                max={10000}
                value={form.sortOrder}
                onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })}
              />
            </label>
            {section !== 'moments' && (
              <>
                <label className="showcase-wide">
                  摘要
                  <textarea
                    rows={2}
                    maxLength={500}
                    value={form.summary}
                    onChange={(event) => setForm({ ...form, summary: event.target.value })}
                  />
                </label>
                <label className="showcase-wide">
                  封面地址
                  <input
                    maxLength={1000}
                    value={form.cover}
                    onChange={(event) => setForm({ ...form, cover: event.target.value })}
                  />
                </label>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setMediaMode(mediaMode === 'cover' ? null : 'cover')}
                >
                  上传 / 选择封面
                </button>
              </>
            )}
            {section === 'projects' && (
              <>
                <label className="showcase-wide">
                  技术栈（逗号分隔，最多 20 项）
                  <input
                    maxLength={1000}
                    value={technologyText}
                    onChange={(event) => setTechnologyText(event.target.value)}
                  />
                </label>
                <label>
                  源码地址
                  <input
                    type="url"
                    maxLength={1000}
                    value={form.sourceUrl}
                    onChange={(event) => setForm({ ...form, sourceUrl: event.target.value })}
                  />
                </label>
                <label>
                  在线演示地址
                  <input
                    type="url"
                    maxLength={1000}
                    value={form.demoUrl}
                    onChange={(event) => setForm({ ...form, demoUrl: event.target.value })}
                  />
                </label>
              </>
            )}
            <div className="showcase-wide">
              {section === 'moments' ? (
                <label>
                  说说正文
                  <textarea
                    aria-label="说说正文"
                    required
                    maxLength={5000}
                    rows={6}
                    value={form.content}
                    onChange={(event) => setForm({ ...form, content: event.target.value })}
                  />
                  <small>{form.content.length} / 5000 · 纯文字展示</small>
                </label>
              ) : (
                <>
                  <label htmlFor="post-content">正文（Markdown）</label>
                  <p className="muted">介绍正文，最多 20000 字。</p>
                  <MarkdownEditor
                    value={form.content}
                    onChange={(value) => {
                      if (value.length <= 20000) setForm({ ...form, content: value })
                    }}
                    disabled={busy}
                  />
                </>
              )}
            </div>
            {section === 'moments' && (
              <div className="showcase-wide">
                <p className="muted">最多 9 张图片，可调整顺序。</p>
                <button
                  type="button"
                  className="text-button"
                  disabled={form.images.length >= 9}
                  onClick={() => setMediaMode(mediaMode === 'images' ? null : 'images')}
                >
                  上传 / 选择说说图片
                </button>
                <div className="showcase-image-url">
                  <label>
                    添加图片地址
                    <input
                      maxLength={1000}
                      value={imageUrl}
                      onChange={(event) => setImageUrl(event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="text-button"
                    disabled={!imageUrl.trim() || form.images.length >= 9}
                    onClick={() => addImage(imageUrl)}
                  >
                    添加图片
                  </button>
                </div>
                <ol className="showcase-image-editor">
                  {form.images.map((url, index) => (
                    <li key={`${url}:${index}`}>
                      <img src={url} alt={`说说图片 ${index + 1}`} />
                      <span className="sr-only">图片 {index + 1}</span>
                      <div>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`上移图片 ${index + 1}`}
                          disabled={index === 0}
                          onClick={() => reorder('images', index, -1)}
                        >
                          <ArrowUp size={15} />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`下移图片 ${index + 1}`}
                          disabled={index === form.images.length - 1}
                          onClick={() => reorder('images', index, 1)}
                        >
                          <ArrowDown size={15} />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`移除图片 ${index + 1}`}
                          onClick={() =>
                            setForm({ ...form, images: form.images.filter((_, i) => i !== index) })
                          }
                        >
                          <X size={15} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {section !== 'moments' && (
              <section className="showcase-wide showcase-post-picker" aria-label="关联文章编辑">
                <h3>{section === 'series' ? '专题文章与阅读顺序' : '项目相关文章'}</h3>
                <div className="showcase-image-url">
                  <label>
                    查找关联文章
                    <input
                      maxLength={100}
                      value={postSearch}
                      onChange={(event) => setPostSearch(event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setPostQuery(postSearch.trim())}
                  >
                    查找文章
                  </button>
                </div>
                {postError ? (
                  <button type="button" className="text-button" onClick={refreshPosts}>
                    文章加载失败，点击重试
                  </button>
                ) : (
                  <div className="showcase-post-options">
                    {options?.items.map((post) => (
                      <button
                        type="button"
                        key={post.id}
                        disabled={
                          form.posts.some((item) => item.id === post.id) || form.posts.length >= 100
                        }
                        onClick={() =>
                          setForm({
                            ...form,
                            posts: [
                              ...form.posts,
                              {
                                id: post.id,
                                title: post.title,
                                slug: post.slug,
                                published:
                                  post.status === 'PUBLISHED' && post.publishedAt <= today(),
                              },
                            ],
                          })
                        }
                      >
                        ＋ {post.title}
                        <small>{post.status === 'DRAFT' ? '草稿' : '已发布'}</small>
                      </button>
                    ))}
                    {options && !options.items.length && <p className="muted">没有匹配的文章。</p>}
                  </div>
                )}
                <ol className="showcase-linked-editor">
                  {form.posts.map((post, index) => (
                    <li key={post.id}>
                      <span>
                        {index + 1}. {post.title}
                        {!post.published && <small>（未公开，前台暂不显示）</small>}
                      </span>
                      <div>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`上移文章 ${index + 1}`}
                          disabled={index === 0}
                          onClick={() => reorder('posts', index, -1)}
                        >
                          <ArrowUp size={15} />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`下移文章 ${index + 1}`}
                          disabled={index === form.posts.length - 1}
                          onClick={() => reorder('posts', index, 1)}
                        >
                          <ArrowDown size={15} />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`移除文章 ${index + 1}`}
                          onClick={() =>
                            setForm({
                              ...form,
                              posts: form.posts.filter((item) => item.id !== post.id),
                            })
                          }
                        >
                          <X size={15} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            <label className="checkbox-label showcase-wide">
              <input
                type="checkbox"
                checked={form.visible}
                onChange={(event) => setForm({ ...form, visible: event.target.checked })}
              />
              公开显示
            </label>
            <div className="showcase-wide showcase-editor-buttons">
              <button className="button" type="submit">
                {busy ? '保存中…' : id ? `保存${label}` : `新增${label}`}
              </button>
              {id && (
                <button type="button" className="text-button" onClick={() => edit()}>
                  取消编辑
                </button>
              )}
            </div>
          </fieldset>
        </form>
        {message && <p role="status">{message}</p>}
      </section>
      {mediaMode && (
        <section className="card management-card">
          <MediaLibrary
            disabled={busy || (mediaMode === 'images' && form.images.length >= 9)}
            onSelect={(url) => {
              if (mediaMode === 'cover') setForm({ ...form, cover: url })
              else addImage(url)
              setMediaMode(null)
            }}
          />
        </section>
      )}
      <section className="card management-card">
        <form
          className="showcase-admin-search"
          onSubmit={(event) => {
            event.preventDefault()
            setQuery(search.trim())
            setPage(1)
          }}
        >
          <label>
            搜索已有内容
            <input
              maxLength={100}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <button className="text-button" type="submit">
            搜索
          </button>
        </form>
        <DataState
          loading={loading}
          error={error}
          onRetry={refresh}
          empty={data?.items.length === 0}
        >
          <div className="management-list showcase-admin-list">
            {data?.items.map((entry) => (
              <div key={entry.id}>
                <span>
                  <strong>{entry.title || entry.content.slice(0, 40)}</strong>
                  <small>
                    {entry.publishedAt} ·{' '}
                    {entry.visible ? (entry.publishedAt > today() ? '待发布' : '公开') : '隐藏'}
                    {section === 'series' ? ` · ${entry.posts.length} 篇关联文章` : ''}
                  </small>
                </span>
                <button
                  type="button"
                  className="text-button"
                  disabled={busy}
                  aria-label={`编辑${entry.title || entry.id}`}
                  onClick={() => edit(entry)}
                >
                  编辑
                </button>
                <button
                  type="button"
                  className="text-button danger-action"
                  disabled={busy}
                  aria-label={`删除${entry.title || entry.id}`}
                  onClick={() => {
                    if (window.confirm(`确定删除这条${label}？`))
                      void run(async () => {
                        await showcaseApi.remove(section, entry.id, entry.version)
                        if (id === entry.id) edit(undefined, true)
                        refresh()
                      })
                  }}
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        </DataState>
        {data && (
          <ContentPagination page={page} total={data.total} size={data.size} onChange={setPage} />
        )}
      </section>
    </>
  )
}
