import { useCallback, useEffect, useRef, useState } from 'react'
import { HttpError } from '../api/http'

// Pass a useCallback-stabilized fetcher when it depends on route or component state.
export function useAsyncData<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [errorStatus, setErrorStatus] = useState<number>()
  const [revision, setRevision] = useState(0)
  const latestFetcher = useRef(fetcher)
  latestFetcher.current = fetcher
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setErrorStatus(undefined)
    setData(undefined)
    latestFetcher
      .current()
      .then((value) => {
        if (active) setData(value)
      })
      .catch((cause) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : '加载失败')
          setErrorStatus(cause instanceof HttpError ? cause.status : undefined)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [fetcher, revision])
  const refresh = useCallback(() => setRevision((value) => value + 1), [])
  return { data, loading, error, errorStatus, refresh }
}
