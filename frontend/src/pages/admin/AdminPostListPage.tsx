import { useCallback, useEffect, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import {
  Plus,
  Search,
  Pencil,
  Pin,
  Trash2,
  Eye,
  Send,
  FilePenLine,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { adminPostsApi } from '../../api/adminPosts'
import { HttpError } from '../../api/http'
import { useAsyncData } from '../../hooks/useAsyncData'
import { usePageTitle } from '../../hooks/usePageTitle'
import DataState from '../../components/common/DataState'
import type { AdminPostSummary } from '../../types/adminPost'
import { formatDate } from '../../utils/date'

export default function AdminPostListPage() {
  usePageTitle('文章管理')
  const { expire } = useOutletContext<{ expire: () => void }>()
  const [params, setParams] = useSearchParams()
  const page = Math.min(100000, Math.max(1, Math.floor(Number(params.get('page')) || 1)))
  const keyword = params.get('keyword') || ''
  const status = ['DRAFT', 'PUBLISHED'].includes(params.get('status') || '')
    ? params.get('status')!
    : ''
  const [search, setSearch] = useState(keyword)
  const [busy, setBusy] = useState<number>()
  const [actionError, setActionError] = useState('')
  const fetchPosts = useCallback(
    () => adminPostsApi.list(page, keyword, status),
    [page, keyword, status],
  )
  const { data, loading, error, errorStatus, refresh } = useAsyncData(fetchPosts)
  useEffect(() => {
    if (errorStatus === 401) expire()
  }, [errorStatus, expire])
  useEffect(() => {
    setSearch(keyword)
  }, [keyword])
  useEffect(() => {
    if (data && page > 1 && !data.items.length)
      setParams({
        ...(keyword ? { keyword } : {}),
        ...(status ? { status } : {}),
        page: String(page - 1),
      })
  }, [data, page, keyword, status, setParams])
  async function action(post: AdminPostSummary, kind: 'status' | 'pin' | 'delete') {
    if (busy !== undefined) return
    if (kind === 'delete' && !window.confirm(`删除「${post.title}」？删除后无法恢复。`)) return
    setBusy(post.id)
    setActionError('')
    try {
      if (kind === 'delete') await adminPostsApi.remove(post.id, post.version)
      else
        await adminPostsApi.state(
          post.id,
          kind === 'status' ? (post.status === 'DRAFT' ? 'PUBLISHED' : 'DRAFT') : post.status,
          kind === 'pin' ? !post.pinned : post.pinned,
          post.version,
        )
      refresh()
    } catch (cause) {
      if (cause instanceof HttpError && cause.status === 401) expire()
      else {
        setActionError(cause instanceof Error ? cause.message : '操作失败')
        if (cause instanceof HttpError && cause.status === 409) refresh()
      }
    } finally {
      setBusy(undefined)
    }
  }
  const pageCount = data ? Math.ceil(data.total / data.size) : 0
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">YOUR STORIES</span>
          <h1>
            文章管理<span className="heading-dot">.</span>
          </h1>
          <p className="muted">整理草稿，发布记录，继续写下去。</p>
        </div>
        <Link to="/admin/posts/new" className="button">
          <Plus size={16} />
          新建文章
        </Link>
      </div>
      <form
        className="card admin-list-toolbar"
        onSubmit={(event) => {
          event.preventDefault()
          setParams({
            ...(status ? { status } : {}),
            ...(search.trim() ? { keyword: search.trim() } : {}),
          })
        }}
      >
        <div className="admin-search">
          <Search size={16} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索标题或摘要"
            aria-label="搜索后台文章"
            maxLength={100}
          />
        </div>
        <select
          aria-label="文章状态筛选"
          value={status}
          onChange={(event) =>
            setParams({
              ...(keyword ? { keyword } : {}),
              ...(event.target.value ? { status: event.target.value } : {}),
            })
          }
        >
          <option value="">全部状态</option>
          <option value="DRAFT">草稿</option>
          <option value="PUBLISHED">已发布 / 待发布</option>
        </select>
        <button className="button" type="submit">
          搜索
        </button>
        <span className="muted">共 {data?.total ?? '—'} 篇</span>
      </form>
      {actionError && (
        <p className="form-error" role="alert">
          {actionError}
        </p>
      )}
      <DataState loading={loading} error={error} empty={data?.total === 0} onRetry={refresh}>
        <div className="card admin-post-table">
          <div className="admin-table-head">
            <span>文章</span>
            <span>状态</span>
            <span>操作</span>
          </div>
          {data?.items.map((post) => (
            <article className="admin-post-row" key={post.id}>
              <div className="admin-post-info">
                <Link to={`/admin/posts/${post.id}/edit`}>{post.title}</Link>
                <p>
                  {post.category} · {formatDate(post.publishedAt)} ·{' '}
                  {post.tags.join(' / ') || '无标签'}
                </p>
                <code>/{post.slug}</code>
              </div>
              <div className="admin-post-status">
                <span className={`status-badge ${post.status.toLowerCase()}`}>
                  {post.status === 'DRAFT'
                    ? '草稿'
                    : post.publishedAt >
                        new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' })
                      ? '待发布'
                      : '已发布'}
                </span>
                {post.pinned && (
                  <span className="pinned-badge">
                    <Pin size={12} />
                    置顶
                  </span>
                )}
              </div>
              <div className="admin-row-actions">
                <Link to={`/admin/posts/${post.id}/edit`} aria-label={`编辑：${post.title}`}>
                  <Pencil size={15} />
                  编辑
                </Link>
                <button
                  disabled={busy !== undefined}
                  onClick={() => action(post, 'status')}
                  aria-label={`${post.status === 'DRAFT' ? '发布' : '转为草稿'}：${post.title}`}
                >
                  {post.status === 'DRAFT' ? <Send size={15} /> : <FilePenLine size={15} />}
                  {post.status === 'DRAFT' ? '发布' : '草稿'}
                </button>
                <button
                  disabled={busy !== undefined}
                  onClick={() => action(post, 'pin')}
                  aria-label={`${post.pinned ? '取消置顶' : '置顶'}：${post.title}`}
                >
                  <Pin size={15} />
                  {post.pinned ? '取消置顶' : '置顶'}
                </button>
                {post.status === 'PUBLISHED' && (
                  <Link
                    to={`/posts/${post.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`查看：${post.title}`}
                  >
                    <Eye size={15} />
                    查看
                  </Link>
                )}
                <button
                  className="danger-action"
                  disabled={busy !== undefined}
                  onClick={() => action(post, 'delete')}
                  aria-label={`删除：${post.title}`}
                >
                  <Trash2 size={15} />
                  删除
                </button>
              </div>
            </article>
          ))}
        </div>
      </DataState>
      {pageCount > 1 && (
        <nav className="admin-pagination" aria-label="后台文章分页">
          <button
            disabled={page <= 1 || loading}
            onClick={() => setParams({ ...Object.fromEntries(params), page: String(page - 1) })}
            aria-label="后台上一页"
          >
            <ChevronLeft size={16} />
          </button>
          <span>
            {page} / {pageCount}
          </span>
          <button
            disabled={page >= pageCount || loading}
            onClick={() => setParams({ ...Object.fromEntries(params), page: String(page + 1) })}
            aria-label="后台下一页"
          >
            <ChevronRight size={16} />
          </button>
        </nav>
      )}
    </>
  )
}
