import type { ReactNode } from 'react'
interface Props {
  loading: boolean
  error: string
  empty?: boolean
  onRetry: () => void
  children: ReactNode
  variant?: 'default' | 'posts'
}
export default function DataState({
  loading,
  error,
  empty,
  onRetry,
  children,
  variant = 'default',
}: Props) {
  if (loading && variant === 'posts')
    return (
      <div role="status">
        <span className="sr-only">正在加载文章，请稍候…</span>
        <div className="post-grid" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="card post-skeleton" key={index}>
              <div className="skeleton-cover" />
              <div className="skeleton-copy">
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
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
