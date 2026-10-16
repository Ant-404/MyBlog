import { useEffect } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { FileText, FolderOpen, Hash } from 'lucide-react'
import { authApi } from '../../api/auth'
import { useAsyncData } from '../../hooks/useAsyncData'
import { usePageTitle } from '../../hooks/usePageTitle'
import DataState from '../../components/common/DataState'
import type { AdminUser } from '../../types/auth'

export default function AdminDashboardPage() {
  usePageTitle('管理工作台')
  const { user, expire } = useOutletContext<{ user: AdminUser; expire: () => void }>()
  const { data, loading, error, errorStatus, refresh } = useAsyncData(authApi.dashboard)
  useEffect(() => {
    if (errorStatus === 401) expire()
  }, [errorStatus, expire])
  return (
    <>
      <div className="dashboard-heading">
        <span className="eyebrow">YOUR CREATIVE CORNER</span>
        <h1>
          你好，{user.displayName}
          <span className="heading-dot">.</span>
        </h1>
        <p className="muted">这里是你的小站工作台。</p>
        <Link className="button" to="/admin/posts/new">
          写一篇新文章
        </Link>
      </div>
      <DataState loading={loading} error={error} onRetry={refresh}>
        <div className="dashboard-stats">
          <section className="card">
            <FileText size={22} />
            <span>已发布文章</span>
            <strong>{data?.posts}</strong>
          </section>
          <section className="card">
            <FolderOpen size={22} />
            <span>文章分类</span>
            <strong>{data?.categories}</strong>
          </section>
          <section className="card">
            <Hash size={22} />
            <span>内容标签</span>
            <strong>{data?.tags}</strong>
          </section>
        </div>
      </DataState>
      <section className="card dashboard-shortcuts" aria-label="常用功能">
        <h2>常用功能</h2>
        <div>
          <Link to="/admin/posts">管理文章</Link>
          <Link to="/admin/taxonomy">分类、标签与专题</Link>
          <Link to="/admin/comments">管理评论</Link>
          <Link to="/admin/guestbook">管理留言墙</Link>
          <Link to="/admin/media">管理图片</Link>
          <Link to="/admin/settings">站点设置</Link>
        </div>
      </section>
    </>
  )
}
