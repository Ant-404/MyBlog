import { NavLink } from 'react-router-dom'
import { FolderOpen, LibraryBig, Archive, Hash } from 'lucide-react'

export default function ArticleBrowseNav() {
  return (
    <nav className="article-browse-nav" aria-label="文章浏览方式">
      {[
        { to: '/categories', label: '分类', icon: FolderOpen },
        { to: '/series', label: '专题', icon: LibraryBig },
        { to: '/archives', label: '归档', icon: Archive },
        { to: '/tags', label: '标签', icon: Hash },
      ].map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} end>
          <Icon size={16} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
