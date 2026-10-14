import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { SiteProvider } from './contexts/SiteContext'
import './styles/tokens.css'
import './styles/global.css'
import './styles/admin.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SiteProvider>
      <RouterProvider router={router} />
    </SiteProvider>
  </React.StrictMode>,
)
