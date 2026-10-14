import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Flower2, Search, Sun, Moon, Menu, X } from 'lucide-react'
import { useSite } from '../../contexts/SiteContext'
import { useTheme } from '../../hooks/useTheme'

export default function SiteHeader() {
  const site = useSite()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [keyword, setKeyword] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    setMenuOpen(false)
    setKeyword(new URLSearchParams(location.search).get('keyword') || '')
  }, [location])
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement
      if (
        event.key === '/' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) &&
        !target.isContentEditable
      ) {
        event.preventDefault()
        input.current?.focus()
      }
      if (event.key === 'Escape') {
        setMenuOpen(false)
        input.current?.blur()
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
          {site.nav.map((item) => (
            <NavLink key={item.path} to={item.path} end>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="header-actions">
          <form
            className="search-form"
            onSubmit={(event) => {
              event.preventDefault()
              navigate(keyword.trim() ? `/?keyword=${encodeURIComponent(keyword.trim())}` : '/')
            }}
          >
            <Search size={16} />
            <input
              ref={input}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              aria-label="搜索文章"
              placeholder="搜索文章…"
              maxLength={100}
            />
            <kbd>/</kbd>
            <button type="submit" className="sr-only">
              搜索
            </button>
          </form>
          <button
            className="icon-button"
            onClick={toggle}
            aria-label={dark ? '切换浅色模式' : '切换深色模式'}
          >
            {dark ? <Sun size={20} /> : <Moon size={19} />}
          </button>
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
