import { useEffect, useRef } from 'react'
import { useBlocker } from 'react-router-dom'

export function useUnsavedChanges(dirty: boolean) {
  const allowed = useRef(false)
  useEffect(() => {
    allowed.current = false
  }, [dirty])
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !allowed.current && currentLocation.pathname !== nextLocation.pathname,
  )
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm('还有未保存的修改，确定离开吗？')) blocker.proceed()
    else blocker.reset()
  }, [blocker])
  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (dirty && !allowed.current) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [dirty])
  return () => {
    allowed.current = true
  }
}
