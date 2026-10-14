import type { ReactNode } from 'react'
interface Props {
  loading: boolean
  error: string
  empty?: boolean
  onRetry: () => void
  children: ReactNode
}
export default function DataState({ loading, error, empty, onRetry, children }: Props) {
  if (loading)
    return (
      <div className="card data-state" role="status">
        <span className="loader" />
        正在加载，请稍候…
      </div>
    )
  if (error)
    return (
      <div className="card data-state" role="alert">
        <p>{error}</p>
        <button className="button" onClick={onRetry}>
          重新加载
        </button>
        <small>请确认后端与数据库已启动。</small>
      </div>
    )
  if (empty) return <div className="card data-state">这里暂时没有内容。</div>
  return <>{children}</>
}
