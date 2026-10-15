import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { blogApi } from '../../api/blog'
import { useAsyncData } from '../../hooks/useAsyncData'

export default function ArticleCalendar() {
  const { data: posts, loading, error, refresh } = useAsyncData(blogApi.archives)
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  )
  const [selected, setSelected] = useState('')
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const prefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}`
  const today = new Date()
  const dateKey = (day: number) => `${prefix}-${String(day).padStart(2, '0')}`
  const grouped = useMemo(() => {
    const result = new Map<string, NonNullable<typeof posts>>()
    for (const post of posts || []) {
      const date = post.publishedAt.slice(0, 10)
      result.set(date, [...(result.get(date) || []), post])
    }
    return result
  }, [posts])
  const monthPosts = (posts || []).filter((post) => post.publishedAt.startsWith(prefix))
  function changeMonth(delta: number) {
    setMonth(new Date(year, monthIndex + delta, 1))
    setSelected('')
  }
  return (
    <section className="card sidebar-card article-calendar" aria-label="文章日历">
      <h3>
        <CalendarDays size={17} />
        把日子写成文章
      </h3>
      <div className="calendar-heading">
        <button className="icon-button" aria-label="日历上个月" onClick={() => changeMonth(-1)}>
          <ChevronLeft size={16} />
        </button>
        <button
          className="calendar-month"
          title="回到本月"
          onClick={() => {
            setMonth(new Date(today.getFullYear(), today.getMonth(), 1))
            setSelected('')
          }}
        >
          {year} 年 {monthIndex + 1} 月
        </button>
        <button className="icon-button" aria-label="日历下个月" onClick={() => changeMonth(1)}>
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="calendar-grid">
        {['一', '二', '三', '四', '五', '六', '日'].map((day) => (
          <span className="calendar-weekday" key={day}>
            {day}
          </span>
        ))}
        {Array.from({ length: (month.getDay() + 6) % 7 }, (_, index) => (
          <span key={`blank-${index}`} />
        ))}
        {Array.from({ length: new Date(year, monthIndex + 1, 0).getDate() }, (_, index) => {
          const day = index + 1
          const key = dateKey(day)
          const count = grouped.get(key)?.length || 0
          const isToday =
            today.getFullYear() === year &&
            today.getMonth() === monthIndex &&
            today.getDate() === day
          const className = `calendar-day ${isToday ? 'today' : ''} ${count ? 'has-post' : ''} ${selected === key ? 'selected' : ''}`
          return count ? (
            <button
              key={key}
              className={className}
              aria-label={`${key}，${count} 篇文章`}
              aria-pressed={selected === key}
              onClick={() => setSelected(selected === key ? '' : key)}
            >
              {day}
              <i />
            </button>
          ) : (
            <span key={key} className={className} aria-label={isToday ? '今天' : undefined}>
              {day}
            </span>
          )
        })}
      </div>
      {loading ? (
        <p className="calendar-caption">正在读取文章日期…</p>
      ) : error ? (
        <button className="text-button" onClick={refresh}>
          日历加载失败，点击重试
        </button>
      ) : selected ? (
        <div className="calendar-posts">
          <span>{selected}</span>
          {grouped.get(selected)?.map((post) => (
            <Link key={post.id} to={`/posts/${post.slug}`}>
              {post.title}
            </Link>
          ))}
        </div>
      ) : (
        <p className="calendar-caption">本月 {monthPosts.length} 篇记录 · 点击有圆点的日期</p>
      )}
    </section>
  )
}
