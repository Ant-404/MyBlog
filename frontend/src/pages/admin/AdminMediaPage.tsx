import MediaLibrary from '../../components/admin/MediaLibrary'
import { usePageTitle } from '../../hooks/usePageTitle'
export default function AdminMediaPage() {
  usePageTitle('图片管理')
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <h1>
            图片管理<span className="heading-dot">.</span>
          </h1>
          <p className="muted">为文章上传封面和正文图片。</p>
        </div>
      </div>
      <section className="card management-card">
        <MediaLibrary />
      </section>
    </>
  )
}
