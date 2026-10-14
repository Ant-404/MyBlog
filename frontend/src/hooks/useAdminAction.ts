import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { HttpError } from '../api/http'
export function useAdminAction(errorStatus?: number) {
  const { expire } = useOutletContext<{ expire: () => void }>()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => {
    if (errorStatus === 401) expire()
  }, [errorStatus, expire])
  async function run(work: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    setMessage('')
    try {
      await work()
      setMessage('操作成功')
    } catch (cause) {
      if (cause instanceof HttpError && cause.status === 401) expire()
      else setMessage(cause instanceof Error ? cause.message : '操作失败')
    } finally {
      setBusy(false)
    }
  }
  return { busy, message, run }
}
