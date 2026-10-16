import { Link } from 'react-router-dom'
import { communityApi } from '../../api/community'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useAdminAction } from '../../hooks/useAdminAction'
import { usePageTitle } from '../../hooks/usePageTitle'
import DataState from '../../components/common/DataState'
export default function AdminStatisticsPage() {
  usePageTitle('阅读统计')
  const { data, loading, error, errorStatus, refresh } = useAsyncData(communityApi.statistics)
  useAdminAction(errorStatus)
  const days = Array.from({ length: 30 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - 29 + index)
    const key = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' })
    return { date: key, count: data?.daily.find((day) => day.date === key)?.count || 0 }
  })
  const maximum = Math.max(1, ...days.map((day) => day.count))
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <h1>
            阅读统计<span className="heading-dot">.</span>
          </h1>
          <p className="muted">同一会话同一天对同一文章只计一次；不代表独立访客人数。</p>
        </div>
        <button className="button secondary" onClick={refresh}>
          刷新统计
        </button>
      </div>
      <DataState loading={loading} error={error} onRetry={refresh}>
        {data && (
          <>
            <div className="dashboard-stats">
              <section className="card">
                <span>累计阅读</span>
                <strong>{data.totalReads}</strong>
              </section>
              <section className="card">
                <span>今日阅读</span>
                <strong>{data.todayReads}</strong>
              </section>
              <section className="card">
                <span>待管理评论</span>
                <strong>{data.totalComments}</strong>
                <Link to="/admin/comments">管理评论</Link>
              </section>
            </div>
            <section className="card management-card statistics-chart">
              <h2>近 30 天阅读</h2>
              <div className="daily-bars" role="group" aria-label="近 30 天每日阅读次数">
                {days.map((day) => (
                  <button
                    key={day.date}
                    type="button"
                    className="daily-bar"
                    aria-label={`${day.date}：${day.count} 次阅读`}
                  >
                    <span
                      className="daily-bar-fill"
                      style={{ height: `${Math.max(2, (day.count / maximum) * 100)}%` }}
                    />
                    <span className="daily-bar-tooltip" role="tooltip">
                      {day.date}
                      <br />
                      <strong>{day.count} 次阅读</strong>
                    </span>
                  </button>
                ))}
              </div>
              <p className="muted">
                {days[0].date} — {days[29].date}
              </p>
              <details>
                <summary>查看每日数据</summary>
                <div className="daily-table">
                  {days.map((day) => (
                    <p key={day.date}>
                      {day.date}
                      <strong>{day.count}</strong>
                    </p>
                  ))}
                </div>
              </details>
            </section>
            <section className="card management-card management-list">
              <h2>文章阅读排行（前 20）</h2>
              {data.posts.map((post) => (
                <div key={post.id}>
                  <Link to={`/admin/posts/${post.id}/edit`}>{post.title}</Link>
                  <strong>{post.count} 次</strong>
                </div>
              ))}
            </section>
          </>
        )}
      </DataState>
    </>
  )
}
