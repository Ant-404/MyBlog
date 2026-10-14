import { Link } from 'react-router-dom'
import { usePageTitle } from '../hooks/usePageTitle'
export default function NotFoundPage() {
  usePageTitle('页面未找到')
  return (
    <section className="card content-page not-found">
      <span className="eyebrow">LOST IN THE MOUNTAINS</span>
      <h1>404</h1>
      <p>这条小路暂时没有通往的地方。</p>
      <Link to="/" className="button">
        回到首页
      </Link>
    </section>
  )
}
