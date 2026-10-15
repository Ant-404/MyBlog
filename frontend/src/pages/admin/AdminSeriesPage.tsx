import ShowcaseManager from '../../components/admin/ShowcaseManager'
import ContentOrganizationNav from '../../components/admin/ContentOrganizationNav'
export default function AdminSeriesPage() {
  return (
    <>
      <ContentOrganizationNav />
      <p className="muted">专题可跨分类收录多篇文章，并手动安排阅读顺序，适合教程和连载。</p>
      <ShowcaseManager section="series" />
    </>
  )
}
