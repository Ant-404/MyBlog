import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Camera,
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
  ChevronDown,
  Feather,
} from 'lucide-react'
import type { SiteNavItem } from '../../config/site'
import { useSite } from '../../contexts/SiteContext'
import { useTheme } from '../../hooks/useTheme'
import AppearanceSettings from './AppearanceSettings'
import SearchBox from './SearchBox'

const navIcons: Record<string, typeof Home> = {
  '/': Home,
  '/categories': FolderOpen,
  '/anime': Tv,
  '/albums': Camera,
  '/friends': Link2,
  '/about': UserRound,
  '/projects': BriefcaseBusiness,
  '/guestbook': MessageCircle,
  '/moments': Feather,
}

export default function SiteHeader() {
  const site = useSite()
  const { dark, toggle } = useTheme()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [lifeOpen, setLifeOpen] = useState(false)
  const header = useRef<HTMLElement>(null)
  const lifeToggle = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    setMenuOpen(false)
    setLifeOpen(false)
  }, [location])
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (lifeToggle.current?.getAttribute('aria-expanded') === 'true') {
          setLifeOpen(false)
          lifeToggle.current.focus()
          return
        }
        setMenuOpen(false)
      }
    }
    function onOutside(event: PointerEvent) {
      if (!header.current?.contains(event.target as Node)) {
        setLifeOpen(false)
        setMenuOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onOutside)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onOutside)
    }
  }, [])
  return (
    <header className="site-header" ref={header}>
      <div className="header-inner">
        <Link to="/" className="brand">
          <img className="site-logo" src="/images/log.jpg" width={28} height={28} alt="" />
          <span>
            {site.name}
            <small>个人博客</small>
          </span>
        </Link>
        <nav id="main-nav" className={`main-nav ${menuOpen ? 'open' : ''}`} aria-label="主导航">
          {site.nav.map((item: SiteNavItem) => {
            const Icon = navIcons[item.path] || Home
            if (item.children) {
              const active = item.children.some(
                (child) =>
                  location.pathname === child.path ||
                  location.pathname.startsWith(`${child.path}/`),
              )
              return (
                <div
                  className="nav-dropdown"
                  key={item.label}
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node))
                      setLifeOpen(false)
                  }}
                >
                  <button
                    type="button"
                    ref={lifeToggle}
                    className={`nav-dropdown-toggle ${active ? 'active' : ''}`}
                    aria-expanded={lifeOpen}
                    aria-controls="life-navigation"
                    onClick={() => setLifeOpen((value) => !value)}
                  >
                    <Icon size={15} />
                    {item.label}
                    <ChevronDown className="nav-chevron" size={12} />
                  </button>
                  <div className="nav-dropdown-panel" id="life-navigation" hidden={!lifeOpen}>
                    <span className="nav-dropdown-caption">日常的另一面</span>
                    {item.children.map((child) => {
                      const ChildIcon = navIcons[child.path] || Home
                      const selected =
                        location.pathname === child.path ||
                        location.pathname.startsWith(`${child.path}/`)
                      return (
                        <Link
                          key={child.path}
                          to={child.path}
                          aria-label={child.label}
                          className={selected ? 'active' : ''}
                          aria-current={selected ? 'page' : undefined}
                        >
                          <ChildIcon size={19} />
                          <span>
                            <strong>{child.label}</strong>
                            <small>{child.description}</small>
                          </span>
                          <span className="nav-child-arrow" aria-hidden="true">
                            ↗
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )
            }
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
            onClick={() => {
              setMenuOpen(!menuOpen)
              setLifeOpen(false)
            }}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>
    </header>
  )
}
