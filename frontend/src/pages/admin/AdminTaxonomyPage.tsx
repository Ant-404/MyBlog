import TaxonomyManager from '../../components/admin/TaxonomyManager'
import ContentOrganizationNav from '../../components/admin/ContentOrganizationNav'
import { usePageTitle } from '../../hooks/usePageTitle'
export default function AdminTaxonomyPage() {
  usePageTitle('内容组织')
  return (
    <>
      <div className="admin-page-heading">
        <h1>
          内容组织<span className="heading-dot">.</span>
        </h1>
      </div>
      <ContentOrganizationNav />
      <p className="muted">
        分类是文章的主题归属；标签是可多选的关键词；专题用于按顺序组织教程或连载。
      </p>
      <TaxonomyManager kind="categories" />
      <TaxonomyManager kind="tags" />
    </>
  )
}
