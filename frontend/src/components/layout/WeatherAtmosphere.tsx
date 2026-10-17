import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useStoredPreference } from '../../hooks/useStoredPreference'

export const weatherOptions = ['clear', 'rain', 'snow', 'glow'] as const
export default function WeatherAtmosphere() {
  const [weather] = useStoredPreference('myblog-weather', 'clear', weatherOptions)
  const [hidden, setHidden] = useState(() => document.hidden)
  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])
  if (weather === 'clear') return null
  return createPortal(
    <div
      className={`weather-atmosphere weather-${weather} ${hidden ? 'weather-paused' : ''}`}
      aria-hidden="true"
    >
      {Array.from({ length: weather === 'rain' ? 28 : 18 }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${(i * 37.7) % 100}%`,
            animationDelay: `${-(i * 1.73) % 12}s`,
            animationDuration: `${weather === 'rain' ? 1.3 + (i % 4) * 0.2 : 7 + (i % 6)}s`,
            opacity: 0.25 + (i % 4) * 0.13,
          }}
        />
      ))}
    </div>,
    document.body,
  )
}
