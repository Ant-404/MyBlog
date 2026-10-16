import { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshCw, UserRound, X } from 'lucide-react'
import { guestbookApi, type Note } from '../../api/guestbook'
import { demoMode } from '../../api/http'
import { useAsyncData } from '../../hooks/useAsyncData'
import DataState from '../common/DataState'
import avatarImages from 'virtual:user-images'

export default function GuestbookHighlights({
  revision,
  onCompose,
}: {
  revision: number
  onCompose: () => void
}) {
  const [mode, setMode] = useState<'latest' | 'random'>('latest')
  const fetchNotes = useCallback(() => {
    void revision
    return demoMode ? Promise.resolve([]) : guestbookApi.highlights(mode)
  }, [mode, revision])
  const { data, loading, error, refresh } = useAsyncData(fetchNotes)
  const [selected, setSelected] = useState<Note | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (selected) dialog.current?.showModal()
    else dialog.current?.close()
  }, [selected])
  return (
    <section className="guestbook-picks" aria-label="精选便签墙">
      <header className="guestbook-picks-heading">
        <div>
          <span className="guestbook-picks-eyebrow">把问候留在这里</span>
          <h1>留言墙</h1>
          <p>一点日常，一句问候，都可以贴在这里。</p>
        </div>
        {!demoMode && (
          <button type="button" className="guestbook-pill" onClick={onCompose}>
            写张便签 ↗
          </button>
        )}
      </header>
      <div className="guestbook-picks-toolbar">
        <div className="guestbook-picks-modes" role="group" aria-label="便签展示方式">
          {(['latest', 'random'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
            >
              {value === 'latest' ? '最新九张' : '随机九张'}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="guestbook-pill"
          disabled={loading}
          onClick={refresh}
          aria-label={mode === 'random' ? '换一组便签' : '刷新便签墙'}
        >
          <RefreshCw size={14} />
          {mode === 'random' ? '换一组' : '刷新'}
        </button>
        <span className="guestbook-picks-caption">最多展示 9 张 · 在下方写下你的留言</span>
      </div>
      <DataState loading={loading} error={error} onRetry={refresh}>
        <div className="sticky-note-grid" aria-live="polite">
          {data?.map((note) => (
            <article className={`sticky-note note-${note.color}`} key={note.id}>
              <header>
                <strong>{note.author}</strong>
                <span className="sticky-note-avatar" aria-hidden="true">
                  {avatarImages.length ? (
                    <img src={avatarImages[note.id % avatarImages.length]} alt="" loading="lazy" />
                  ) : (
                    <UserRound size={24} />
                  )}
                </span>
              </header>
              <p>{note.content}</p>
              <footer>
                <time dateTime={note.createdAt}>{note.createdAt.slice(0, 10)}</time>
                <button
                  type="button"
                  onClick={() => setSelected(note)}
                  aria-label={`查看留言 #${note.id}`}
                >
                  查看留言
                </button>
              </footer>
            </article>
          ))}
        </div>
        {data?.length === 0 && (
          <p className="guestbook-picks-empty">墙上还没有便签，来贴上第一张吧。</p>
        )}
      </DataState>
      <dialog
        className={`sticky-note-dialog note-${selected?.color || 'lavender'}`}
        ref={dialog}
        aria-labelledby="sticky-note-dialog-title"
        onClose={() => setSelected(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close()
        }}
      >
        {selected && (
          <div className="sticky-note-detail">
            <header>
              <h2 id="sticky-note-dialog-title">{selected.author}的留言</h2>
              <button
                type="button"
                className="comment-tool"
                aria-label="关闭留言"
                onClick={() => dialog.current?.close()}
              >
                <X size={20} />
              </button>
            </header>
            <p>{selected.content}</p>
            <time dateTime={selected.createdAt}>
              {selected.createdAt.replace('T', ' ').slice(0, 16)}
            </time>
          </div>
        )}
      </dialog>
    </section>
  )
}
