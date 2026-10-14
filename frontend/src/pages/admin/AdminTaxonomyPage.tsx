import TaxonomyManager from '../../components/admin/TaxonomyManager'
import { usePageTitle } from '../../hooks/usePageTitle'
export default function AdminTaxonomyPage() {
  usePageTitle('分类与标签')
  return (
    <>
      <div className="admin-page-heading">
        <h1>
          分类与标签<span className="heading-dot">.</span>
        </h1>
      </div>
      <TaxonomyManager kind="categories" />
      <TaxonomyManager kind="tags" />
    </>
  )
}
