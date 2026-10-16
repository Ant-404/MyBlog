import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Flower2, LockKeyhole, Eye, EyeOff } from 'lucide-react'
import { authApi } from '../../api/auth'
import { HttpError } from '../../api/http'
import { site } from '../../config/site'
import { usePageTitle } from '../../hooks/usePageTitle'

export default function AdminLoginPage() {
  usePageTitle('管理员登录')
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const candidate = location.state?.from as unknown
  const destination =
    typeof candidate === 'string' &&
    /^\/admin(?:\/|$)/.test(candidate) &&
    candidate !== '/admin/login'
      ? candidate
      : '/admin'
  useEffect(() => {
    let active = true
    authApi
      .me()
      .then(() => {
        if (active) navigate(destination, { replace: true })
      })
      .catch((cause) => {
        if (active && !(cause instanceof HttpError && cause.status === 401))
          setError('暂时无法连接后台，请确认后端已启动。')
      })
    return () => {
      active = false
    }
  }, [navigate, destination])
  async function login(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await authApi.login({ username: username.trim(), password })
      setPassword('')
      navigate(destination, { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '登录失败')
      setPassword('')
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="admin-login-shell">
      <Link to="/" className="admin-back">
        <ArrowLeft size={16} />
        返回小站
      </Link>
      <div className="login-scenery" />
      <section className="card admin-login-card">
        <div className="login-symbol">
          <Flower2 size={32} />
        </div>
        <span className="eyebrow">A SPACE TO CREATE</span>
        <h1>{site.author}的管理后台</h1>
        <p className="muted">登录后，继续记录与创作。</p>
        <form onSubmit={login} autoComplete="off">
          <label htmlFor="admin-username">管理员账号</label>
          <input
            id="admin-username"
            name="admin-login-username"
            autoComplete="off"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="输入管理员账号"
            required
            maxLength={64}
            disabled={busy}
          />
          <label htmlFor="admin-password">密码</label>
          <div className="password-field">
            <input
              id="admin-password"
              type={visible ? 'text' : 'password'}
              name="admin-login-password"
              autoComplete="off"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="输入密码"
              required
              maxLength={128}
              disabled={busy}
            />
            <button
              type="button"
              className="icon-button"
              aria-label={visible ? '隐藏密码' : '显示密码'}
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button login-submit" type="submit" disabled={busy}>
            <LockKeyhole size={16} />
            {busy ? '正在登录…' : '登录后台'}
          </button>
        </form>
        <p className="login-note">仅供站点管理员使用</p>
      </section>
    </main>
  )
}
