import { ArrowUpRight, Globe2 } from 'lucide-react'
import { blogApi } from '../api/blog'
import { useAsyncData } from '../hooks/useAsyncData'
import { usePageTitle } from '../hooks/usePageTitle'
import DataState from '../components/common/DataState'

function safeUrl(url: string) {
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '#'
  } catch {
    return '#'
  }
}
export default function FriendPage() {
  usePageTitle('友链')
  const { data, loading, error, refresh } = useAsyncData(blogApi.friends)
  return (
    <section className="card content-page">
      <span className="eyebrow">GOOD COMPANY</span>
      <h1>
        远方的朋友<span className="heading-dot">.</span>
      </h1>
      <p className="muted">互联网很大，相遇是件很小却很美好的事。</p>
      <DataState loading={loading} error={error} empty={data?.length === 0} onRetry={refresh}>
        <div className="friend-grid">
          {data?.map((friend) => (
            <a
              key={friend.id}
              href={safeUrl(friend.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="friend-card"
            >
              <div className="friend-avatar">
                <Globe2 size={25} />
              </div>
              <h2>{friend.name}</h2>
              <p>{friend.description}</p>
              <ArrowUpRight size={18} />
            </a>
          ))}
        </div>
      </DataState>
      <div className="callout">愿每一份认真记录，都能找到愿意阅读的人。</div>
    </section>
  )
}
