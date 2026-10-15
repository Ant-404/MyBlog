import { useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { UserRound } from 'lucide-react'
import { memberApi } from '../api/members'
import { useAsyncData } from '../hooks/useAsyncData'
import { usePageTitle } from '../hooks/usePageTitle'
import DataState from '../components/common/DataState'

export default function MemberProfilePage() {
  const { id = '' } = useParams()
  const { data, loading, error, refresh } = useAsyncData(
    useCallback(() => memberApi.publicProfile(Number(id)), [id]),
  )
  usePageTitle(data?.nickname || '用户资料')
  return (
    <DataState loading={loading} error={error} onRetry={refresh}>
      {data && (
        <article className="card member-panel public-member-profile">
          {data.avatar ? (
            <img src={data.avatar} alt="" referrerPolicy="no-referrer" />
          ) : (
            <UserRound size={36} />
          )}
          <span className="eyebrow">小站的朋友 · #{data.id}</span>
          <h1>{data.nickname}</h1>
          <p>{data.bio || '这位朋友还没有填写简介。'}</p>
          <Link className="text-button" to="/guestbook">
            去留言墙看看
          </Link>
        </article>
      )}
    </DataState>
  )
}
