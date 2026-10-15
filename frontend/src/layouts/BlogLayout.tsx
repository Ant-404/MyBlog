import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Flower2, Coffee } from 'lucide-react'
import HeroBanner from '../components/layout/HeroBanner'
import SiteHeader from '../components/layout/SiteHeader'
import ProfileSidebar from '../components/layout/ProfileSidebar'
import RightSidebar from '../components/layout/RightSidebar'
import ScrollToTop from '../components/layout/ScrollToTop'
import MusicPlayer from '../components/layout/MusicPlayer'
import { useSite } from '../contexts/SiteContext'
import { demoMode } from '../api/http'

export default function BlogLayout() {
  const site = useSite()
  const location = useLocation()
  const article = /^\/(posts|projects|series)\/[^/]+\/?$/.test(location.pathname)
  const account = location.pathname === '/account'
  useEffect(() => {
    if (!location.hash) window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])
  return (
    <div
      className={`blog-layout ${article || account ? 'article-layout' : ''} ${account ? 'account-layout' : ''}`}
    >
      <a href="#main-content" className="skip-link">
        跳到主要内容
      </a>
      <SiteHeader />
      {!article && !account && <HeroBanner />}
      <div className="page-shell">
        {!article && !account && <ProfileSidebar />}
        <main id="main-content" className="main-content" tabIndex={-1}>
          {demoMode && <div className="demo-notice">界面预览 · 当前使用演示数据</div>}
          <Outlet />
        </main>
        {account ? null : article ? (
          <aside id="article-sidebar" className="article-sidebar" aria-label="阅读辅助" />
        ) : (
          <RightSidebar />
        )}
      </div>
      <footer className="site-footer">
        <Flower2 size={20} />
        <p>
          © {new Date().getFullYear()} {site.author} · 记录学习，也记录生活。
        </p>
        <div className="footer-note">
          <Coffee size={14} />
          谢谢你，愿意在这里停留片刻。
        </div>
        <span>
          Design inspired by{' '}
          <a
            href="https://github.com/matsuzaka-yuki/Mizuki"
            target="_blank"
            rel="noopener noreferrer"
          >
            Mizuki
          </a>{' '}
          · <Link to="/admin">管理后台</Link>
        </span>
      </footer>
      <ScrollToTop />
      <MusicPlayer />
    </div>
  )
}
