import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
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
  Tv,
  Music2,
  BriefcaseBusiness,
  Camera,
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
          <img className="site-logo" src="/images/log.jpg" width={28} height={28} alt="" />
          <span>{site.name}</span>
        </Link>
        <nav aria-label="后台导航" className="admin-grouped-nav">
          <NavLink to="/admin" end>
            <LayoutDashboard size={18} />
            工作台
          </NavLink>
          <div className="admin-nav-group">
            <span className="admin-nav-caption">内容与素材</span>
            <NavLink to="/admin/posts">
              <FileText size={18} />
              文章管理
            </NavLink>
            <NavLink to="/admin/albums">
              <Camera size={18} />
              相册管理
            </NavLink>
            <NavLink to="/admin/projects">
              <BriefcaseBusiness size={18} />
              项目展示
            </NavLink>
            <NavLink
              to="/admin/taxonomy"
              className={location.pathname === '/admin/series' ? 'active' : undefined}
            >
              <Tags size={18} />
              内容组织
            </NavLink>
            <NavLink to="/admin/media">
              <Images size={18} />
              图片管理
            </NavLink>
          </div>
          <div className="admin-nav-group">
            <span className="admin-nav-caption">互动与链接</span>
            <NavLink to="/admin/comments">
              <MessageSquare size={18} />
              评论管理
            </NavLink>
            <NavLink to="/admin/guestbook">
              <MessageSquare size={18} />
              留言墙管理
            </NavLink>
            <NavLink to="/admin/friends">
              <Link2 size={18} />
              友链管理
            </NavLink>
          </div>
          <div className="admin-nav-group">
            <span className="admin-nav-caption">生活与站点</span>
            <NavLink to="/admin/anime">
              <Tv size={18} />
              追番管理
            </NavLink>
            <NavLink to="/admin/music">
              <Music2 size={18} />
              音乐管理
            </NavLink>
            <NavLink to="/admin/statistics">
              <BarChart3 size={18} />
              阅读统计
            </NavLink>
            <NavLink to="/admin/settings">
              <Settings size={18} />
              站点设置
            </NavLink>
          </div>
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
                albums: '相册管理',
                taxonomy: '内容组织',
                friends: '友链管理',
                settings: '站点设置',
                comments: '评论管理',
                statistics: '阅读统计',
                anime: '追番管理',
                music: '音乐管理',
                projects: '项目展示',
                series: '内容组织 / 文章专题',
                guestbook: '留言墙管理',
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
