import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

function homeFor(role) {
  return role === 'INVESTOR' ? '/investor' : '/operations'
}

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to={homeFor(user.role)} replace />

  async function submit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const signedInUser = await login(email, password, rememberMe)
      const requestedPath = location.state?.from?.pathname
      navigate(requestedPath || homeFor(signedInUser.role), { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div>
          <p className="eyebrow">Secure access</p>
          <h1>Breaking Business</h1>
          <p>Sign in with your assigned business role.</p>
        </div>
        <label>
          Email
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Password
          <span className="password-input-wrap">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="password-visibility-button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 3l18 18" />
                  <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" />
                  <path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5.5 0 9 6 9 6a16.7 16.7 0 0 1-2.1 2.8" />
                  <path d="M6.6 6.6C4.3 8.1 3 10 3 10s3.5 6 9 6a9.8 9.8 0 0 0 3.4-.6" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" />
                  <circle cx="12" cy="12" r="2.5" />
                </svg>
              )}
            </button>
          </span>
        </label>
        <div className="login-options-row">
          <label className="remember-me-control">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
            />
            <span>Remember me</span>
          </label>
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
        {location.state?.notice && (
          <p className="success-message" role="status">
            {location.state.notice}
          </p>
        )}
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="auth-switch">
          New business? <Link to="/signup">Create an Owner profile</Link>
        </p>
      </form>
    </main>
  )
}
