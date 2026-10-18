import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { SiteProvider } from './contexts/SiteContext'
import './styles/tokens.css'
import './styles/global.css'
import './styles/admin.css'
import './styles/blog-theme.css'
import './styles/leisure.css'
import './styles/experience.css'
import './styles/showcase.css'
import './styles/community.css'
import './styles/comments.css'
import './styles/music-player.css'
import './styles/anime.css'
import './styles/guestbook-wall.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SiteProvider>
      <RouterProvider router={router} />
    </SiteProvider>
  </React.StrictMode>,
)

import './styles/albums.css'
import './styles/moments.css'
