import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Flower2, ArrowDown, Coffee } from 'lucide-react'
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
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])
  return (
    <div className="blog-layout">
      <a href="#main-content" className="skip-link">
        跳到主要内容
      </a>
      <SiteHeader />
      <section className="hero" aria-label="小站横幅">
        <div className="hero-inner">
          <div className="hero-kicker">
            <span />
            欢迎路过，我的生活切片
          </div>
          <h1>
            {site.title}
            <span>Keep a little wonder.</span>
          </h1>
          <p>{site.subtitle}</p>
          <a className="hero-link" href="#main-content">
            向下探索 <ArrowDown size={14} />
          </a>
        </div>
        <span className="hero-caption">CODE · LIFE · LITTLE MOMENTS</span>
        <div className="hero-wave" aria-hidden="true">
          <svg viewBox="0 0 1440 70" preserveAspectRatio="none">
            <path
              className="wave-back"
              d="M0,30 C360,90 720,-25 1080,30 C1260,60 1380,35 1440,20 L1440,70 L0,70Z"
            />
            <path d="M0,48 C320,-5 780,95 1120,38 C1280,8 1380,28 1440,42 L1440,70 L0,70Z" />
          </svg>
        </div>
      </section>
      <div className="page-shell">
        <ProfileSidebar />
        <main id="main-content" className="main-content" tabIndex={-1}>
          {demoMode && <div className="demo-notice">界面预览 · 当前使用演示数据</div>}
          <Outlet />
        </main>
        <RightSidebar />
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
          · <a href="/rss.xml">RSS 订阅</a> · <a href="/sitemap.xml">站点地图</a> ·{' '}
          <Link to="/admin">管理后台</Link>
        </span>
      </footer>
      <ScrollToTop />
      <MusicPlayer />
    </div>
  )
}
