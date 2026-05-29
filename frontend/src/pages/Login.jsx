import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLogin } from '../api/auth'

export default function Login() {
  const navigate = useNavigate()
  const login = useLogin()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setErr(null)
    try {
      await login.mutateAsync({ username, password })
      navigate('/', { replace: true })
    } catch (e) {
      setErr(e.message ?? 'Login failed')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#d9d0bd',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{ width: 320 }}>
        {/* Brand mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{
            width: 36, height: 36,
            background: 'var(--rust)',
            display: 'grid', placeItems: 'center',
            fontFamily: 'Archivo Black', color: 'var(--paper)', fontSize: 20,
          }}>B</div>
          <div>
            <div style={{ fontFamily: 'Archivo Black', fontSize: 22, letterSpacing: '.04em', color: 'var(--ink)' }}>
              BINDEX
            </div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--ink-3)', letterSpacing: '.15em', textTransform: 'uppercase' }}>
              PARTS LEDGER
            </div>
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--paper)',
          border: '1px solid var(--ink)',
          boxShadow: '4px 4px 0 var(--ink)',
        }}>
          <div style={{
            background: 'var(--ink)', color: 'var(--paper)',
            padding: '12px 18px',
            fontFamily: 'JetBrains Mono', fontSize: 11,
            letterSpacing: '.12em', textTransform: 'uppercase',
          }}>
            Sign in
          </div>

          <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <span className="fnote">Username</span>
              <input
                type="text"
                className="search__input"
                style={{ width: '100%', marginTop: 4 }}
                autoComplete="username"
                autoFocus
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
            <div>
              <span className="fnote">Password</span>
              <input
                type="password"
                className="search__input"
                style={{ width: '100%', marginTop: 4 }}
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {err && (
              <div style={{
                padding: '8px 10px',
                background: 'var(--rust-3)',
                border: '1px solid var(--rust)',
                fontFamily: 'JetBrains Mono', fontSize: 11,
                color: 'var(--rust)',
              }}>
                {err}
              </div>
            )}

            <button
              className="btn btn--rust"
              type="submit"
              disabled={login.isPending || !username || !password}
              style={{ width: '100%', justifyContent: 'center', marginTop: 2 }}
            >
              {login.isPending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
