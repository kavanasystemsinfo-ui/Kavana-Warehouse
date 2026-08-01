import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Alerts } from './pages/Alerts'
import { Asignaciones } from './pages/Asignaciones'
import { Inventario } from './pages/Inventario'
import { Deviations } from './pages/Deviations'
import { Incidents } from './pages/Incidents'
import { Notifications } from './pages/Notifications'
import { Layout } from './components/Layout'
import { getStoredUser } from './lib/api'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = getStoredUser()
  if (!user) return <Navigate to="/login" replace />
  if (user.rol === 'limpiador') return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(getStoredUser)

  // Re-check user on storage changes (login/logout in other tabs)
  useEffect(() => {
    const checkUser = () => setCurrentUser(getStoredUser())
    window.addEventListener('storage', checkUser)
    // Also poll on focus to catch login redirects
    window.addEventListener('focus', checkUser)

    const handleUnauthorized = () => {
      setCurrentUser(null)
    }
    window.addEventListener('auth:unauthorized', handleUnauthorized)

    return () => {
      window.removeEventListener('storage', checkUser)
      window.removeEventListener('focus', checkUser)
      window.removeEventListener('auth:unauthorized', handleUnauthorized)
    }
  }, [])

  // Re-check stored user when currentUser changes (handles login in same tab)
  useEffect(() => {
    const user = getStoredUser()
    if (user?.rol !== 'limpiador' && user?.id_usuario !== currentUser?.id_usuario) {
      setCurrentUser(user)
    }
  }, [currentUser])

  if (!currentUser) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={() => setCurrentUser(getStoredUser())} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<Login onLogin={() => setCurrentUser(getStoredUser())} />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="asignaciones" element={<Asignaciones />} />
        <Route path="inventario" element={<Inventario />} />
        <Route path="deviations" element={<Deviations />} />
        <Route path="incidents" element={<Incidents />} />
        <Route path="notifications" element={<Notifications />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}