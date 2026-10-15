import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  Flower2,
  Sun,
  Moon,
  Menu,
  X,
  Home,
  Archive,
  FolderOpen,
  Link2,
  UserRound,
  Tv,
} from 'lucide-react'
import { useSite } from '../../contexts/SiteContext'
import { useTheme } from '../../hooks/useTheme'
import AppearanceSettings from './AppearanceSettings'
import SearchBox from './SearchBox'

const navIcons = [Home, Archive, FolderOpen, Tv, Link2, UserRound]

export default function SiteHeader() {
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
          {site.nav.map((item, index) => {
            const Icon = navIcons[index] || Home
            return (
              <NavLink key={item.path} to={item.path} end>
                <Icon size={15} />
                {item.label}
              </NavLink>
            )
          })}
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
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>
    </header>
  )
}
