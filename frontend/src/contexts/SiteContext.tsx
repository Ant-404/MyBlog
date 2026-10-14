import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { site } from '../config/site'
import { request, demoMode } from '../api/http'
import { useAsyncData } from '../hooks/useAsyncData'
import type { SiteSettings } from '../types/management'
const defaults: SiteSettings = {
  ...site,
  aboutContent: '这里用来记录学习笔记、项目实践和日常生活。欢迎常来。',
  avatar: '',
  publicUrl: 'http://127.0.0.1:5173',
  commentsEnabled: true,
  version: 0,
}
const SiteContext = createContext({ ...defaults, nav: site.nav })
const fetchSettings = () =>
  demoMode ? Promise.resolve(defaults) : request<SiteSettings>('/site/settings')
export function SiteProvider({ children }: { children: ReactNode }) {
  const { data, refresh } = useAsyncData(fetchSettings)
  useEffect(() => {
    window.addEventListener('site-settings-updated', refresh)
    return () => window.removeEventListener('site-settings-updated', refresh)
  }, [refresh])
  return (
    <SiteContext.Provider value={{ ...(data || defaults), nav: site.nav }}>
      {children}
    </SiteContext.Provider>
  )
}
export const useSite = () => useContext(SiteContext)
