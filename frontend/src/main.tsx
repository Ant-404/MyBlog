import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { SiteProvider } from './contexts/SiteContext'
import { MemberProvider } from './contexts/MemberContext'
import './styles/tokens.css'
import './styles/global.css'
import './styles/admin.css'
import './styles/blog-theme.css'
import './styles/leisure.css'
import './styles/experience.css'
import './styles/showcase.css'
import './styles/members.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SiteProvider>
      <MemberProvider>
        <RouterProvider router={router} />
      </MemberProvider>
    </SiteProvider>
  </React.StrictMode>,
)
