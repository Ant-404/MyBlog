import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { authApi } from '../../api/auth'
import { HttpError } from '../../api/http'
import { usePageTitle } from '../../hooks/usePageTitle'

export default function AdminSecurityPage() {
  usePageTitle('账号安全')
  const navigate = useNavigate()
  const { expire } = useOutletContext<{ expire: () => void }>()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <section className="card editor-settings security-settings">
      <h1>账号安全</h1>
      <p className="muted">
        修改密码后，所有已登录设备都需要重新登录。新密码为 12–64 个字符，UTF-8 编码不超过 72 字节。
      </p>
      <form
        className="management-form"
        onSubmit={async (event) => {
          event.preventDefault()
          setError('')
          if (next !== confirm) {
            setError('两次输入的新密码不一致')
            return
          }
          if (new TextEncoder().encode(next).length > 72) {
            setError('新密码 UTF-8 编码超过 72 字节')
            return
          }
          setBusy(true)
          try {
            await authApi.changePassword(current, next)
            setCurrent('')
            setNext('')
            setConfirm('')
            navigate('/admin/login', {
              replace: true,
              state: { message: '密码已修改，请使用新密码登录。' },
            })
          } catch (cause) {
            if (cause instanceof HttpError && cause.status === 401) expire()
            else setError(cause instanceof Error ? cause.message : '修改失败')
          } finally {
            setBusy(false)
          }
        }}
      >
        <label htmlFor="current-password">旧密码</label>
        <input
          id="current-password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={64}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          disabled={busy}
        />
        <label htmlFor="new-password">新密码</label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={64}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          disabled={busy}
        />
        <label htmlFor="confirm-password">确认新密码</label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={64}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={busy}
        />
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button" disabled={busy}>
          {busy ? '正在修改…' : '修改密码并退出登录'}
        </button>
      </form>
    </section>
  )
}
