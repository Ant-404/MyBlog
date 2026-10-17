import { Link, useOutletContext } from 'react-router-dom'
import { FileText, FilePenLine, Camera, Images, MessageSquare, StickyNote } from 'lucide-react'
import { authApi } from '../../api/auth'
import { useAsyncData } from '../../hooks/useAsyncData'
import { usePageTitle } from '../../hooks/usePageTitle'
import { useAdminAction } from '../../hooks/useAdminAction'
import DataState from '../../components/common/DataState'
import type { AdminUser, DashboardOverview } from '../../types/auth'
const metrics: {
  key: keyof DashboardOverview
  label: string
  path: string
  icon: typeof FileText
}[] = [
  { key: 'posts', label: '已发布文章', path: '/admin/posts?status=PUBLISHED', icon: FileText },
  { key: 'drafts', label: '草稿', path: '/admin/posts?status=DRAFT', icon: FilePenLine },
  { key: 'albums', label: '相册', path: '/admin/albums', icon: Camera },
  { key: 'photos', label: '相册照片', path: '/admin/albums', icon: Images },
  { key: 'comments', label: '文章评论', path: '/admin/comments', icon: MessageSquare },
  { key: 'notes', label: '留言便签', path: '/admin/guestbook', icon: StickyNote },
]
export default function AdminDashboardPage() {
  usePageTitle('管理工作台')
  const { user } = useOutletContext<{ user: AdminUser }>()
  const { data, loading, error, errorStatus, refresh } = useAsyncData(authApi.dashboard)
  useAdminAction(errorStatus)
  return (
    <>
      <div className="dashboard-heading">
        <span className="eyebrow">小站工作台</span>
        <h1>
          你好，{user.displayName}
          <span className="heading-dot">.</span>
        </h1>
        <p className="muted">继续写作，也整理最近的生活记录。</p>
        <div className="dashboard-primary-actions">
          <Link className="button" to="/admin/posts/new">
            写一篇新文章
          </Link>
          <Link className="button secondary" to="/admin/albums">
            创建或整理相册
          </Link>
        </div>
      </div>
      <DataState loading={loading} error={error} onRetry={refresh}>
        <div className="dashboard-stats">
          {metrics.map((item) => (
            <section className="card" key={item.key}>
              <item.icon size={22} />
              <span>{item.label}</span>
              <strong>{data?.[item.key]}</strong>
              <Link className="dashboard-metric-link" to={item.path}>
                查看{item.label}
              </Link>
            </section>
          ))}
        </div>
        {data && (
          <p className="dashboard-summary muted">
            {data.scheduled > 0 && <>{data.scheduled} 篇文章等待预定日期发布 · </>}
            {data.categories} 个分类 · {data.tags} 个标签 · {data.projects} 个项目 · {data.series}{' '}
            个专题 · {data.anime} 条追番记录 · 图片库 {data.media} 张
          </p>
        )}
      </DataState>
      <section className="card dashboard-shortcuts" aria-label="常用功能">
        <h2>常用功能</h2>
        <div>
          <Link to="/admin/posts?status=DRAFT">继续编辑草稿</Link>
          <Link to="/admin/albums">管理相册</Link>
          <Link to="/admin/comments">管理评论</Link>
          <Link to="/admin/guestbook">管理留言墙</Link>
          <Link to="/admin/media">上传与整理图片</Link>
          <Link to="/admin/statistics">查看阅读统计</Link>
        </div>
      </section>
    </>
  )
}
