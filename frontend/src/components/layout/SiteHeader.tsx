import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Flower2,
  Sun,
  Moon,
  Menu,
  X,
  Home,
  FolderOpen,
  Link2,
  UserRound,
  Tv,
  BriefcaseBusiness,
  MessageCircle,
} from 'lucide-react'
import { useSite } from '../../contexts/SiteContext'
import { useTheme } from '../../hooks/useTheme'
import AppearanceSettings from './AppearanceSettings'
import SearchBox from './SearchBox'
import { useMember } from '../../contexts/MemberContext'

const navIcons: Record<string, typeof Home> = {
  '/': Home,
  '/categories': FolderOpen,
  '/anime': Tv,
  '/friends': Link2,
  '/about': UserRound,
  '/projects': BriefcaseBusiness,
  '/guestbook': MessageCircle,
}

export default function SiteHeader() {
  const { member } = useMember()
  const site = useSite()
  const { dark, toggle } = useTheme()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    setMenuOpen(false)
  }, [location])
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="brand">
          <Flower2 size={26} />
          <span>
            {site.name}
            <small>个人博客</small>
          </span>
        </Link>
        <nav id="main-nav" className={`main-nav ${menuOpen ? 'open' : ''}`} aria-label="主导航">
          {site.nav.map((item) => {
            const Icon = navIcons[item.path] || Home
            const active =
              item.path === '/categories'
                ? ['/categories', '/series', '/archives', '/tags', '/posts'].some(
                    (path) =>
                      location.pathname === path || location.pathname.startsWith(`${path}/`),
                  )
                : location.pathname === item.path ||
                  (item.path !== '/' && location.pathname.startsWith(`${item.path}/`))
            return (
              <Link
                key={item.path}
                to={item.path}
                className={active ? 'active' : ''}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={15} />
                {item.label}
              </Link>
            )
          })}
          <div className="mobile-nav-extras">
            <p>
              {site.author}
              <span>{site.bio}</span>
            </p>
          </div>
        </nav>
        <div className="header-actions">
          <SearchBox />
          <Link
            className="icon-button"
            to="/account"
            aria-label={member ? '个人中心' : '用户登录与注册'}
            title={member ? member.nickname : '用户登录与注册'}
          >
            <UserRound size={19} />
          </Link>
          <button
            className="icon-button"
            onClick={toggle}
            aria-label={dark ? '切换浅色模式' : '切换深色模式'}
          >
            {dark ? <Sun size={20} /> : <Moon size={19} />}
          </button>
          <AppearanceSettings />
          <button
            className="icon-button mobile-menu"
            aria-controls="main-nav"
            aria-expanded={menuOpen}
            aria-label="打开或关闭导航"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>
    </header>
  )
}
