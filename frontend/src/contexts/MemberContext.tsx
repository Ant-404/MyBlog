import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { memberApi, type Member } from '../api/members'
import { demoMode, HttpError } from '../api/http'

const Context = createContext<{
  member: Member | null
  loading: boolean
  error: string
  refresh: () => Promise<void>
  setMember: (member: Member | null) => void
}>({ member: null, loading: true, error: '', refresh: async () => {}, setMember: () => {} })
export function MemberProvider({ children }: { children: React.ReactNode }) {
  const [member, storeMember] = useState<Member | null>(null)
  const sequence = useRef(0)
  const setMember = useCallback((value: Member | null) => {
    ++sequence.current
    storeMember(value)
  }, [])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const refresh = useCallback(async () => {
    const current = ++sequence.current
    try {
      setError('')
      const profile = demoMode ? null : await memberApi.session()
      if (current === sequence.current) storeMember(profile)
    } catch (cause) {
      if (current !== sequence.current) return
      storeMember(null)
      if (!(cause instanceof HttpError && [401, 403].includes(cause.status)))
        setError('登录状态暂时无法读取，请重试。')
    } finally {
      if (current === sequence.current) setLoading(false)
    }
  }, [])
  useEffect(() => {
    void refresh()
    const focus = () => {
      void refresh()
    }
    window.addEventListener('focus', focus)
    return () => window.removeEventListener('focus', focus)
  }, [refresh])
  return (
    <Context.Provider value={{ member, loading, error, refresh, setMember }}>
      {children}
    </Context.Provider>
  )
}
export const useMember = () => useContext(Context)
