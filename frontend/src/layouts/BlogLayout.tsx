import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Flower2, ArrowDown } from 'lucide-react'
import SiteHeader from '../components/layout/SiteHeader'
import ProfileSidebar from '../components/layout/ProfileSidebar'
import RightSidebar from '../components/layout/RightSidebar'
import { useSite } from '../contexts/SiteContext'
import { demoMode } from '../api/http'

export default function BlogLayout() {
  const site = useSite()
  const location = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])
  return (
    <>
      <a href="#main-content" className="skip-link">
        跳到主要内容
      </a>
      <SiteHeader />
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-kicker">
            <span />A LITTLE CORNER OF THE INTERNET
          </div>
          <h1>
            {site.title}
            <span>Letters from the mountains.</span>
          </h1>
          <p>{site.subtitle}</p>
          <a className="hero-link" href="#main-content">
            向下探索 <ArrowDown size={14} />
          </a>
        </div>
        <span className="hero-caption">CODE · LIFE · LITTLE MOMENTS</span>
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
    </>
  )
}
