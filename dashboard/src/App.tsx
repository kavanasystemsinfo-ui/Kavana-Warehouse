import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Inventario } from './pages/Inventario'
import { Incidents } from './pages/Incidents'
import { Empleados } from './pages/Empleados'
import { Centros } from './pages/Centros'
import { Deviations } from './pages/Deviations'
import { Costes } from './pages/Costes'
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
        <Route path="inventario" element={<Inventario />} />
        <Route path="incidents" element={<Incidents />} />
        <Route path="empleados" element={<Empleados />} />
        <Route path="centros" element={<Centros />} />
        <Route path="desviaciones" element={<Deviations />} />
        <Route path="costes" element={<Costes />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}