import { useStoredPreference } from '../../hooks/useStoredPreference'

export const weatherOptions = ['clear', 'rain', 'snow', 'glow'] as const
export default function WeatherAtmosphere({ paused }: { paused: boolean }) {
  const [weather] = useStoredPreference('myblog-weather', 'clear', weatherOptions)
  if (weather === 'clear') return null
  return (
    <div
      className={`weather-atmosphere weather-${weather} ${paused ? 'weather-paused' : ''}`}
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
    </div>
  )
}
