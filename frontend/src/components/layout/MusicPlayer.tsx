import { useEffect, useRef, useState } from 'react'
import {
  Disc3,
  ExternalLink,
  ListMusic,
  Music2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
  Repeat,
  Repeat1,
  Shuffle,
} from 'lucide-react'
import { musicApi } from '../../api/music'
import type { MusicTrack } from '../../types/music'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useStoredPreference } from '../../hooks/useStoredPreference'

const volumeValues = Array.from({ length: 101 }, (_, index) => String(index))
const playModes = ['list', 'one', 'shuffle'] as const
const modeLabels = { list: '列表循环', one: '单曲循环', shuffle: '随机播放' }
function time(value: number) {
  const seconds = Number.isFinite(value) ? Math.floor(value) : 0
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export default function MusicPlayer() {
  const { data, loading, error: loadError, refresh } = useAsyncData(musicApi.publicSettings)
  const [expanded, setExpanded] = useState(false)
  const [showList, setShowList] = useState(false)
  const [selectedId, setSelectedId] = useState<number | undefined>(() => {
    try {
      const id = Number(localStorage.getItem('myblog-last-track'))
      return id > 0 ? id : undefined
    } catch {
      return undefined
    }
  })
  const [playing, setPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState('')
  const [volume, setVolume] = useStoredPreference('myblog-volume', '65', volumeValues)
  const [playMode, setPlayMode] = useStoredPreference('myblog-play-mode', 'list', playModes)
  const audio = useRef<HTMLAudioElement>(null)
  const wantsPlay = useRef(false)
  const requestSequence = useRef(0)
  const track = data?.tracks.find((item) => item.id === selectedId) || data?.tracks[0]
  const index = data?.tracks.findIndex((item) => item.id === track?.id) ?? -1
  useEffect(() => {
    if (!track) return
    try {
      localStorage.setItem('myblog-last-track', String(track.id))
    } catch {
      /* Optional preference. */
    }
  }, [track?.id])
  useEffect(() => {
    if (
      !('mediaSession' in navigator) ||
      typeof MediaMetadata === 'undefined' ||
      !track ||
      !data?.enabled
    )
      return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist || '',
      album: data.name,
    })
    const actions: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => void play()],
      ['pause', pause],
      ['previoustrack', () => skip(-1)],
      ['nexttrack', () => skip(1)],
      [
        'seekto',
        (event) => {
          if (audio.current && event.seekTime !== undefined)
            audio.current.currentTime = event.seekTime
        },
      ],
    ]
    for (const [action, handler] of actions) {
      try {
        navigator.mediaSession.setActionHandler(action, handler)
      } catch {
        /* Platform support varies. */
      }
    }
    return () => {
      for (const [action] of actions) {
        try {
          navigator.mediaSession.setActionHandler(action, null)
        } catch {
          /* Optional platform action. */
        }
      }
      navigator.mediaSession.metadata = null
    }
  }, [track, data?.name, data?.enabled, playMode])
  useEffect(() => {
    if ('mediaSession' in navigator)
      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
  }, [playing])

  useEffect(() => {
    window.addEventListener('music-settings-updated', refresh)
    return () => window.removeEventListener('music-settings-updated', refresh)
  }, [refresh])
  useEffect(() => {
    if (audio.current) audio.current.volume = Number(volume) / 100
  }, [volume, data?.enabled])
  async function play() {
    const sequence = ++requestSequence.current
    setError('')
    wantsPlay.current = true
    try {
      await audio.current?.play()
    } catch (cause) {
      if (
        sequence !== requestSequence.current ||
        (cause instanceof DOMException && cause.name === 'AbortError')
      )
        return
      wantsPlay.current = false
      setError('暂时无法播放这首歌，请重试、切歌或前往 QQ 音乐。')
    }
  }
  function pause() {
    ++requestSequence.current
    wantsPlay.current = false
    audio.current?.pause()
  }
  useEffect(() => {
    setPosition(0)
    setDuration(0)
    setError('')
    if (track && wantsPlay.current) void play()
  }, [track?.audioUrl])
  useEffect(() => {
    const element = audio.current
    return () => {
      ++requestSequence.current
      wantsPlay.current = false
      element?.pause()
    }
  }, [data?.enabled])
  function select(item: MusicTrack, start: boolean) {
    wantsPlay.current = start
    if (track?.id === item.id) {
      if (start) void play()
      return
    }
    ++requestSequence.current
    setSelectedId(item.id)
  }
  function skip(delta: number, start = wantsPlay.current) {
    const tracks = data?.tracks || []
    if (!tracks.length) return
    const choices = tracks.filter((item) => item.id !== track?.id)
    const next =
      playMode === 'shuffle' && choices.length
        ? choices[Math.floor(Math.random() * choices.length)]
        : tracks[(Math.max(0, index) + delta + tracks.length) % tracks.length]
    select(next, start)
  }
  if (data && !data.enabled) return null
  return (
    <div className={`music-widget ${playing ? 'is-playing' : ''}`}>
      <audio
        ref={audio}
        src={track?.audioUrl}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={() => setPosition(audio.current?.currentTime || 0)}
        onLoadedMetadata={() =>
          setDuration(Number.isFinite(audio.current?.duration) ? audio.current!.duration : 0)
        }
        onEnded={() => {
          if (playMode === 'one' || data?.tracks.length === 1) {
            if (audio.current) audio.current.currentTime = 0
            void play()
          } else skip(1, true)
        }}
        onError={() => {
          wantsPlay.current = false
          setPlaying(false)
          setError('音源暂时不可用，可切换歌曲或前往 QQ 音乐收听。')
        }}
      />
      {expanded && (
        <section id="music-panel" className="music-panel card" aria-label="音乐播放器">
          <header className="music-panel-header">
            <span>
              <Music2 size={15} />
              {data?.name || '耳边的小世界'}
            </span>
            <button
              className="icon-button"
              aria-label="收起音乐播放器"
              onClick={() => setExpanded(false)}
            >
              <X size={17} />
            </button>
          </header>
          {loading ? (
            <p className="music-empty" role="status">
              正在读取歌单…
            </p>
          ) : loadError ? (
            <div className="music-empty">
              <p>歌单暂时加载失败，请确认后端已更新并启动。</p>
              <button className="text-button" onClick={refresh}>
                重新加载歌单
              </button>
            </div>
          ) : track ? (
            <>
              <div className="music-now-playing">
                <div className="music-artwork">
                  {track.cover ? <img src={track.cover} alt="专辑封面" /> : <Disc3 size={36} />}
                </div>
                <div>
                  <strong>{track.title}</strong>
                  <span>{track.artist || '未知歌手'}</span>
                  <small>来自 QQ 音乐公开歌单</small>
                </div>
              </div>
              <div className="music-timeline">
                <input
                  aria-label="音乐播放进度"
                  type="range"
                  min={0}
                  max={duration || 1}
                  step="0.1"
                  value={Math.min(position, duration || 1)}
                  disabled={!duration}
                  onChange={(event) => {
                    const next = Number(event.target.value)
                    if (audio.current) audio.current.currentTime = next
                    setPosition(next)
                  }}
                />
                <div>
                  <span>{time(position)}</span>
                  <span>{time(duration)}</span>
                </div>
              </div>
              <div className="music-controls">
                <button
                  className="icon-button"
                  aria-label={`播放模式：${modeLabels[playMode]}`}
                  title={modeLabels[playMode]}
                  onClick={() =>
                    setPlayMode(playModes[(playModes.indexOf(playMode) + 1) % playModes.length])
                  }
                >
                  {playMode === 'one' ? (
                    <Repeat1 size={18} />
                  ) : playMode === 'shuffle' ? (
                    <Shuffle size={18} />
                  ) : (
                    <Repeat size={18} />
                  )}
                </button>
                <button className="icon-button" aria-label="上一首" onClick={() => skip(-1)}>
                  <SkipBack size={19} />
                </button>
                <button
                  className="music-play"
                  aria-label={playing ? '暂停音乐' : '播放音乐'}
                  onClick={() => (playing ? pause() : void play())}
                >
                  {playing ? (
                    <Pause size={21} fill="currentColor" />
                  ) : (
                    <Play size={21} fill="currentColor" />
                  )}
                </button>
                <button className="icon-button" aria-label="下一首" onClick={() => skip(1)}>
                  <SkipForward size={19} />
                </button>
                <button
                  className="icon-button"
                  aria-label="显示或隐藏播放列表"
                  aria-expanded={showList}
                  onClick={() => setShowList(!showList)}
                >
                  <ListMusic size={19} />
                </button>
              </div>
              <div className="music-volume">
                <button
                  className="icon-button"
                  aria-label={Number(volume) === 0 ? '取消静音' : '静音'}
                  onClick={() => setVolume(Number(volume) === 0 ? '65' : '0')}
                >
                  {Number(volume) === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  aria-label="音乐音量"
                  onChange={(event) => setVolume(event.target.value)}
                />
                <a href={track.sourceUrl} target="_blank" rel="noopener noreferrer">
                  QQ 音乐 <ExternalLink size={12} />
                </a>
              </div>
              {error && (
                <p className="music-error" role="status">
                  {error}
                </p>
              )}
              {showList && (
                <ol className="music-track-list" aria-label="播放列表">
                  {data?.tracks.map((item, itemIndex) => (
                    <li key={item.id}>
                      <button
                        className={item.id === track.id ? 'active' : ''}
                        aria-label={`播放 ${item.title}`}
                        aria-current={item.id === track.id ? 'true' : undefined}
                        onClick={() => select(item, true)}
                      >
                        <span className="track-number">{itemIndex + 1}</span>
                        <span>
                          <strong>{item.title}</strong>
                          <small>{item.artist}</small>
                        </span>
                        {item.id === track.id && <Music2 size={14} />}
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </>
          ) : (
            <div className="music-empty">
              <Disc3 size={30} />
              <p>歌单还没有歌曲，等主人分享下一首。</p>
            </div>
          )}
          {data?.profileUrl && (
            <a
              className="music-profile"
              href={data.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              我的 QQ 音乐主页 <ExternalLink size={12} />
            </a>
          )}
        </section>
      )}
      <button
        className="music-launcher"
        aria-label={expanded ? '收起音乐播放器' : '展开音乐播放器'}
        aria-expanded={expanded}
        aria-controls="music-panel"
        onClick={() => setExpanded(!expanded)}
      >
        <Disc3 size={22} />
        <span>{playing && track ? track.title : '听一首歌'}</span>
        {playing && (
          <span className="music-equalizer" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        )}
      </button>
    </div>
  )
}
