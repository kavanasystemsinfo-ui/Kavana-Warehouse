import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, getStoredUser } from '../lib/api'

interface LoginProps {
  onLogin?: () => void
}

export function Login({ onLogin }: LoginProps) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect if already logged in (useEffect to avoid render-time navigation)
  useEffect(() => {
    const existingUser = getStoredUser()
    if (existingUser && existingUser.rol !== 'limpiador') {
      navigate('/', { replace: true })
      return
    }

    const expiredError = localStorage.getItem('auth_error')
    if (expiredError) {
      setError(expiredError)
      localStorage.removeItem('auth_error')
    }
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await login(email, password)
      if (data.usuario.rol === 'limpiador') {
        setError('Acceso denegado. Este panel es para supervisores y administradores.')
        return
      }
      onLogin?.()
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo" style={{ textAlign: 'center' }}>
          <img src="/logo.png" alt="Kavana CleanStock" style={{ width: '80px', height: '80px', borderRadius: '12px', marginBottom: '0.75rem' }} />
          <h1>Kavana CleanStock</h1>
          <p>Panel de Control del Supervisor</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              className="form-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="supervisor@kavana.com"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">Contraseña</label>
            <input
              id="password"
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }} disabled={loading}>
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  )
}