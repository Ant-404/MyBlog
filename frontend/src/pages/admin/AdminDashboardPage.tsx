import { useEffect } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { FileText, FolderOpen, Hash, CheckCircle2 } from 'lucide-react'
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
      <section className="card roadmap-card">
        <h2>一步一步，完善小站</h2>
        <div className="roadmap-step completed">
          <CheckCircle2 size={20} />
          <div>
            <strong>管理员登录与后台入口</strong>
            <p>登录、会话验证、退出登录和权限保护已就绪。</p>
          </div>
          <span>已完成</span>
        </div>
        <div className="roadmap-step completed">
          <CheckCircle2 size={20} />
          <div>
            <Link to="/admin/posts">
              <strong>文章管理</strong>
            </Link>
            <p>新增、编辑、草稿、发布、置顶与删除。</p>
          </div>
          <span>已完成</span>
        </div>
        <div className="roadmap-step completed">
          <CheckCircle2 size={20} />
          <div>
            <strong>Markdown 编辑器</strong>
            <p>实时预览、格式工具栏与已有草稿自动保存。</p>
          </div>
          <span>已完成</span>
        </div>
        <div className="roadmap-step completed">
          <CheckCircle2 size={20} />
          <div>
            <Link to="/admin/media">
              <strong>图片管理</strong>
            </Link>
            <p>封面、正文图片上传与引用保护。</p>
          </div>
          <span>已完成</span>
        </div>
        <div className="roadmap-step completed">
          <CheckCircle2 size={20} />
          <div>
            <Link to="/admin/settings">
              <strong>内容与站点设置</strong>
            </Link>
            <p>分类、标签、友链、个人资料与关于页面。</p>
          </div>
          <span>已完成</span>
        </div>
        <div className="roadmap-step completed">
          <CheckCircle2 size={20} />
          <div>
            <strong>文章阅读体验</strong>
            <p>目录、阅读进度、相邻文章和代码高亮。</p>
          </div>
          <span>已完成</span>
        </div>
        <div className="roadmap-step completed">
          <CheckCircle2 size={20} />
          <div>
            <Link to="/admin/comments">
              <strong>评论、订阅与统计</strong>
            </Link>
            <p>评论审核、RSS、站点地图与阅读趋势。</p>
          </div>
          <span>已完成</span>
        </div>
      </section>
    </>
  )
}
