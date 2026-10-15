import { useEffect, useRef, useState } from 'react'
import { ArrowDown } from 'lucide-react'
import images from 'virtual:home-images'
import { useSite } from '../../contexts/SiteContext'
import { useStoredPreference } from '../../hooks/useStoredPreference'
import WeatherAtmosphere from './WeatherAtmosphere'

const switches = ['on', 'off'] as const
const banners = ['show', 'hide'] as const
const fallback = '/images/landscape.svg'

export default function HeroBanner() {
  const site = useSite()
  const [motion] = useStoredPreference('myblog-motion', 'on', switches)
  const [banner] = useStoredPreference('myblog-banner', 'show', banners)
  const [hidden, setHidden] = useState(document.hidden)
  const [reduced, setReduced] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const [picture, setPicture] = useState(() => ({
    current: images[Math.floor(Math.random() * images.length)] || fallback,
    previous: '',
  }))
  const [failed, setFailed] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const sequence = useRef(0)
  const available = images.filter((src) => !failed.includes(src))
  const animate = motion === 'on' && !reduced

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const onMotion = () => setReduced(media.matches)
    const onVisibility = () => setHidden(document.hidden)
    media.addEventListener('change', onMotion)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      ++sequence.current
      media.removeEventListener('change', onMotion)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  function changePicture() {
    const choices = available.filter((src) => src !== picture.current)
    if (!choices.length || loading) return
    const src = choices[Math.floor(Math.random() * choices.length)]
    const request = ++sequence.current
    setLoading(true)
    const next = new Image()
    next.onload = () => {
      if (request !== sequence.current) return
      setPicture((old) => ({ previous: old.current, current: src }))
      setLoading(false)
    }
    next.onerror = () => {
      if (request !== sequence.current) return
      setFailed((old) => [...old, src])
      setLoading(false)
    }
    next.src = src
  }

  useEffect(() => {
    if (!animate || hidden || banner === 'hide' || available.length < 2) return
    const timer = window.setTimeout(changePicture, 12000)
    return () => clearTimeout(timer)
  }, [animate, hidden, banner, picture.current, failed, loading])

  return (
    <section className={`hero ${animate ? '' : 'hero-still'}`} aria-label="小站横幅">
      <div className="hero-pictures" aria-hidden="true">
        {picture.previous && <img className="hero-picture" src={picture.previous} alt="" />}
        <img
          key={picture.current}
          className="hero-picture hero-picture-current"
          src={picture.current}
          alt=""
          fetchPriority="high"
          onError={() => {
            setFailed((old) => [...old, picture.current])
            setPicture({
              previous: '',
              current: available.find((src) => src !== picture.current) || fallback,
            })
          }}
        />
      </div>
      {available.length > 1 && (
        <button
          type="button"
          className="hero-picture-switch"
          aria-label="切换横幅图片"
          title="点击切换图片"
          disabled={loading}
          onClick={changePicture}
        />
      )}
      <div className="hero-inner">
        <div className="hero-kicker">
          <span />
          欢迎路过，我的生活切片
        </div>
        <h1>
          {site.title}
          <span>Keep a little wonder.</span>
        </h1>
        <p>{site.subtitle}</p>
        <a className="hero-link" href="#main-content">
          向下探索 <ArrowDown size={14} />
        </a>
      </div>
      <WeatherAtmosphere paused={!animate || hidden} />
      <div className="hero-wave" aria-hidden="true">
        {[0, 1, 2].map((layer) => (
          <svg
            key={layer}
            className={`wave-layer wave-layer-${layer}`}
            viewBox="0 0 2880 80"
            preserveAspectRatio="none"
          >
            <path d="M0,40 C360,-50 1080,130 1440,40 C1800,-50 2520,130 2880,40 L2880,80 L0,80Z" />
          </svg>
        ))}
      </div>
    </section>
  )
}
