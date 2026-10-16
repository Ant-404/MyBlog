import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import BlogLayout from '../layouts/BlogLayout'
import ErrorPage from '../pages/ErrorPage'

const HomePage = lazy(() => import('../pages/HomePage'))
const PostDetailPage = lazy(() => import('../pages/PostDetailPage'))
const ArchivePage = lazy(() => import('../pages/ArchivePage'))
const CategoryPage = lazy(() => import('../pages/CategoryPage'))
const TagPage = lazy(() => import('../pages/TagPage'))
const FriendPage = lazy(() => import('../pages/FriendPage'))
const AboutPage = lazy(() => import('../pages/AboutPage'))
const AnimePage = lazy(() => import('../pages/AnimePage'))
const ProjectsPage = lazy(() => import('../pages/ProjectsPage'))
const ProjectDetailPage = lazy(() => import('../pages/ProjectDetailPage'))
const SeriesPage = lazy(() => import('../pages/SeriesPage'))
const SeriesDetailPage = lazy(() => import('../pages/SeriesDetailPage'))
const GuestbookPage = lazy(() => import('../pages/GuestbookPage'))
const AdminGuestbookPage = lazy(() => import('../pages/admin/AdminGuestbookPage'))
const AdminProjectsPage = lazy(() => import('../pages/admin/AdminProjectsPage'))
const AdminSeriesPage = lazy(() => import('../pages/admin/AdminSeriesPage'))
const AdminAnimePage = lazy(() => import('../pages/admin/AdminAnimePage'))
const AdminMusicPage = lazy(() => import('../pages/admin/AdminMusicPage'))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'))
const AdminLoginPage = lazy(() => import('../pages/admin/AdminLoginPage'))
const AdminLayout = lazy(() => import('../layouts/AdminLayout'))
const AdminDashboardPage = lazy(() => import('../pages/admin/AdminDashboardPage'))
const AdminPostListPage = lazy(() => import('../pages/admin/AdminPostListPage'))
const AdminPostEditorPage = lazy(() => import('../pages/admin/AdminPostEditorPage'))
const AdminMediaPage = lazy(() => import('../pages/admin/AdminMediaPage'))
const AdminTaxonomyPage = lazy(() => import('../pages/admin/AdminTaxonomyPage'))
const AdminFriendsPage = lazy(() => import('../pages/admin/AdminFriendsPage'))
const AdminSettingsPage = lazy(() => import('../pages/admin/AdminSettingsPage'))
const AdminCommentsPage = lazy(() => import('../pages/admin/AdminCommentsPage'))
const AdminStatisticsPage = lazy(() => import('../pages/admin/AdminStatisticsPage'))
const page = (Component: React.ComponentType) => (
  <Suspense
    fallback={
      <div className="card data-state" role="status">
        正在加载页面…
      </div>
    }
  >
    <Component />
  </Suspense>
)

export const router = createBrowserRouter([
  { path: '/admin/login', element: page(AdminLoginPage), errorElement: <ErrorPage /> },
  {
    path: '/admin',
    element: page(AdminLayout),
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: page(AdminDashboardPage) },
      { path: 'posts', element: page(AdminPostListPage) },
      { path: 'posts/new', element: page(AdminPostEditorPage) },
      { path: 'posts/:id/edit', element: page(AdminPostEditorPage) },
      { path: 'media', element: page(AdminMediaPage) },
      { path: 'taxonomy', element: page(AdminTaxonomyPage) },
      { path: 'friends', element: page(AdminFriendsPage) },
      { path: 'anime', element: page(AdminAnimePage) },
      { path: 'music', element: page(AdminMusicPage) },
      { path: 'projects', element: page(AdminProjectsPage) },
      { path: 'series', element: page(AdminSeriesPage) },
      { path: 'moments', element: <Navigate to="/admin/guestbook" replace /> },
      { path: 'settings', element: page(AdminSettingsPage) },
      { path: 'comments', element: page(AdminCommentsPage) },
      { path: 'statistics', element: page(AdminStatisticsPage) },
      { path: 'guestbook', element: page(AdminGuestbookPage) },
      { path: 'members', element: <Navigate to="/admin/guestbook" replace /> },
      { path: '*', element: page(NotFoundPage) },
    ],
  },
  {
    element: <BlogLayout />,
    errorElement: <ErrorPage />,
    children: [
      { path: '/', element: page(HomePage) },
      { path: '/posts/:slug', element: page(PostDetailPage) },
      { path: '/archives', element: page(ArchivePage) },
      { path: '/categories', element: page(CategoryPage) },
      { path: '/tags', element: page(TagPage) },
      { path: '/friends', element: page(FriendPage) },
      { path: '/about', element: page(AboutPage) },
      { path: '/anime', element: page(AnimePage) },
      { path: '/projects', element: page(ProjectsPage) },
      { path: '/projects/:id', element: page(ProjectDetailPage) },
      { path: '/series', element: page(SeriesPage) },
      { path: '/series/:id', element: page(SeriesDetailPage) },
      { path: '/moments', element: <Navigate to="/guestbook" replace /> },
      { path: '/guestbook', element: page(GuestbookPage) },
      { path: '*', element: page(NotFoundPage) },
    ],
  },
])
