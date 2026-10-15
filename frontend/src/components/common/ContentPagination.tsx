import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function ContentPagination({
  page,
  total,
  size,
  onChange,
}: {
  page: number
  total: number
  size: number
  onChange: (page: number) => void
}) {
  const pages = Math.ceil(total / size)
  if (pages <= 1) return null
  return (
    <nav className="pagination content-pagination" aria-label="内容分页">
      <button
        type="button"
        disabled={page <= 1}
        aria-label="内容上一页"
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft size={18} />
      </button>
      <span>
        第 {page} / {pages} 页
      </span>
      <button
        type="button"
        disabled={page >= pages}
        aria-label="内容下一页"
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight size={18} />
      </button>
    </nav>
  )
}
