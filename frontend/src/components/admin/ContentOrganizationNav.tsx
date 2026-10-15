import { NavLink } from 'react-router-dom'

export default function ContentOrganizationNav() {
  return (
    <nav className="content-organization-nav" aria-label="内容组织">
      <NavLink to="/admin/taxonomy">分类与标签</NavLink>
      <NavLink to="/admin/series">文章专题</NavLink>
    </nav>
  )
}
