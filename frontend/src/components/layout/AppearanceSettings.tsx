import { useEffect, useRef } from 'react'
import { Check, Monitor, Moon, SlidersHorizontal, Sun } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { useStoredPreference } from '../../hooks/useStoredPreference'
import { accentLightness, hueValues } from '../../utils/theme'
import { weatherOptions } from './WeatherAtmosphere'

const colors = ['violet', 'blue', 'green', 'rose', 'amber', 'custom'] as const
const presetColors = ['violet', 'blue', 'green', 'rose', 'amber'] as const
const presetHues = {
  violet: '275',
  blue: '215',
  green: '160',
  rose: '340',
  amber: '35',
  custom: '275',
}
const sizes = ['small', 'regular', 'large'] as const
const banners = ['show', 'hide'] as const
const switches = ['on', 'off'] as const
const colorNames = ['藤紫', '晴蓝', '松绿', '蔷薇', '麦金']

export default function AppearanceSettings() {
  const { mode, setMode } = useTheme()
  const [color, setColor] = useStoredPreference('myblog-color', 'violet', colors)
  const [hue, setHue] = useStoredPreference('myblog-hue', presetHues[color], hueValues)
  const [size, setSize] = useStoredPreference('myblog-reading-size', 'regular', sizes)
  const [banner, setBanner] = useStoredPreference('myblog-banner', 'show', banners)
  const [motion, setMotion] = useStoredPreference('myblog-motion', 'on', switches)
  const [, setFocus] = useStoredPreference('myblog-reading-focus', 'off', switches)
  const [weather, setWeather] = useStoredPreference('myblog-weather', 'clear', weatherOptions)
  const panel = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    document.documentElement.dataset.color = color
    document.documentElement.style.setProperty('--hue', hue)
    document.documentElement.style.setProperty('--accent-lightness', accentLightness(Number(hue)))
    document.documentElement.dataset.readingSize = size
    document.documentElement.dataset.banner = banner
    document.documentElement.dataset.motion = motion
  }, [color, hue, size, banner, motion])
  useEffect(() => {
    function close(event: PointerEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent) {
        if (event.key === 'Escape' && panel.current?.open) {
          panel.current.open = false
          panel.current.querySelector('summary')?.focus()
        }
      } else if (!panel.current?.contains(event.target as Node) && panel.current) {
        panel.current.open = false
      }
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [])
  return (
    <details className="appearance-settings" ref={panel}>
      <summary className="icon-button" aria-label="外观设置" title="外观设置">
        <SlidersHorizontal size={19} />
      </summary>
      <div className="appearance-panel card" aria-label="外观偏好">
        <div className="panel-heading">
          <strong>让小站，更合你的心意</strong>
          <span>偏好保存在当前浏览器</span>
        </div>
        <fieldset>
          <legend>显示模式</legend>
          <div className="setting-segments">
            {(
              [
                { value: 'light', label: '浅色', icon: Sun },
                { value: 'dark', label: '深色', icon: Moon },
                { value: 'system', label: '跟随系统', icon: Monitor },
              ] as const
            ).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>主题颜色</legend>
          <div className="hue-control">
            <label htmlFor="theme-hue">
              拖动选择喜欢的颜色 <output htmlFor="theme-hue">{hue}°</output>
            </label>
            <input
              id="theme-hue"
              type="range"
              min="0"
              max="360"
              step="1"
              value={hue}
              aria-label="主题色相"
              onChange={(event) => {
                setHue(event.target.value)
                setColor('custom')
              }}
            />
          </div>
          <div className="color-options">
            {presetColors.map((value, index) => (
              <button
                key={value}
                className={`color-swatch swatch-${value}`}
                aria-label={`${colorNames[index]}主题`}
                aria-pressed={hue === presetHues[value]}
                onClick={() => {
                  setHue(presetHues[value])
                  setColor(value)
                }}
              >
                {hue === presetHues[value] && <Check size={17} />}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>正文字号</legend>
          <div className="setting-segments">
            {sizes.map((value, index) => (
              <button key={value} aria-pressed={size === value} onClick={() => setSize(value)}>
                {['紧凑', '标准', '舒展'][index]}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="banner-setting">
          <span>
            显示图片横幅<small>关闭后可更专注地阅读</small>
          </span>
          <input
            type="checkbox"
            checked={banner === 'show'}
            onChange={(event) => setBanner(event.target.checked ? 'show' : 'hide')}
          />
        </label>
        <label className="banner-setting">
          <span>
            动态效果<small>横幅切换、流动波浪与卡片入场</small>
          </span>
          <input
            type="checkbox"
            checked={motion === 'on'}
            onChange={(event) => setMotion(event.target.checked ? 'on' : 'off')}
          />
        </label>
        <fieldset>
          <legend>横幅天气氛围</legend>
          <div className="setting-segments">
            {weatherOptions.map((value, index) => (
              <button
                key={value}
                type="button"
                aria-pressed={weather === value}
                onClick={() => setWeather(value)}
              >
                {['晴天', '雨天', '飘雪', '微光'][index]}
              </button>
            ))}
          </div>
          <small className="muted">仅装饰效果，不读取位置或真实天气；关闭动态效果后隐藏。</small>
        </fieldset>
        <button
          className="text-button appearance-reset"
          type="button"
          onClick={() => {
            setMode('system')
            setColor('violet')
            setHue('275')
            setSize('regular')
            setBanner('show')
            setMotion('on')
            setFocus('off')
            setWeather('clear')
          }}
        >
          恢复默认外观
        </button>
      </div>
    </details>
  )
}
