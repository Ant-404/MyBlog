import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Flower2,
  LayoutDashboard,
  LogOut,
  ArrowUpRight,
  FileText,
  Images,
  Tags,
  Link2,
  Settings,
  MessageSquare,
  BarChart3,
} from 'lucide-react'
import { authApi } from '../api/auth'
import { HttpError } from '../api/http'
import { useAsyncData } from '../hooks/useAsyncData'
import { useSite } from '../contexts/SiteContext'

export default function AdminLayout() {
  const site = useSite()
  const location = useLocation()
  const navigate = useNavigate()
  const { data: user, loading, error, errorStatus, refresh } = useAsyncData(authApi.me)
  const [busy, setBusy] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const expire = useCallback(
    () => navigate('/admin/login', { replace: true, state: { from: location.pathname } }),
    [navigate, location.pathname],
  )
  useEffect(() => {
    if (!loading && errorStatus === 401) expire()
  }, [loading, errorStatus, expire])
  // Child API calls handle 401 as well; session expiry must never expose cached protected data.
  async function logout() {
    setBusy(true)
    setLogoutError('')
    try {
      await authApi.logout()
      navigate('/admin/login', { replace: true })
    } catch (cause) {
      if (cause instanceof HttpError && cause.status === 401) expire()
      else setLogoutError(cause instanceof Error ? cause.message : '退出失败')
    } finally {
      setBusy(false)
    }
  }
  if (loading)
    return (
      <main className="admin-status" role="status">
        正在验证登录状态…
      </main>
    )
  if (!user)
    return (
      <main className="admin-status">
        <p role="alert">{error}</p>
        <button className="button" onClick={refresh}>
          重新验证
        </button>
        <Link to="/admin/login">前往登录</Link>
      </main>
    )
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="brand" to="/admin">
          <Flower2 size={27} />
          <span>{site.name}</span>
        </Link>
        <span className="admin-sidebar-caption">内容管理</span>
        <nav aria-label="后台导航">
          <NavLink to="/admin" end>
            <LayoutDashboard size={18} />
            工作台
          </NavLink>
          <NavLink to="/admin/posts">
            <FileText size={18} />
            文章管理
          </NavLink>
          <NavLink to="/admin/media">
            <Images size={18} />
            图片管理
          </NavLink>
          <NavLink to="/admin/taxonomy">
            <Tags size={18} />
            分类与标签
          </NavLink>
          <NavLink to="/admin/friends">
            <Link2 size={18} />
            友链管理
          </NavLink>
          <NavLink to="/admin/settings">
            <Settings size={18} />
            站点设置
          </NavLink>
          <NavLink to="/admin/comments">
            <MessageSquare size={18} />
            评论审核
          </NavLink>
          <NavLink to="/admin/statistics">
            <BarChart3 size={18} />
            阅读统计
          </NavLink>
        </nav>
        <Link className="admin-public-link" to="/">
          查看小站 <ArrowUpRight size={16} />
        </Link>
      </aside>
      <div className="admin-workspace">
        <header className="admin-header">
          <span>
            管理后台{' '}
            <small>
              /{' '}
              {{
                posts: '文章管理',
                media: '图片管理',
                taxonomy: '分类与标签',
                friends: '友链管理',
                settings: '站点设置',
                comments: '评论审核',
                statistics: '阅读统计',
              }[location.pathname.split('/')[2]] || '工作台'}
            </small>
          </span>
          <div>
            <span className="admin-user">{user.displayName}</span>
            <button onClick={logout} disabled={busy}>
              <LogOut size={15} />
              {busy ? '退出中…' : '退出登录'}
            </button>
          </div>
        </header>
        {logoutError && (
          <p className="form-error" role="alert">
            {logoutError}
          </p>
        )}
        <main className="admin-main">
          <Outlet context={{ user, expire }} />
        </main>
      </div>
    </div>
  )
}
