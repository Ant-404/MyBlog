import ShowcaseIndex from '../components/blog/ShowcaseIndex'
import ArticleBrowseNav from '../components/blog/ArticleBrowseNav'
export default function SeriesPage() {
  return (
    <section className="card content-page article-series-page">
      <ArticleBrowseNav />
      <ShowcaseIndex section="series" />
    </section>
  )
}
