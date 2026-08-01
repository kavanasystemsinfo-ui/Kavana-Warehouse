import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { getStoredUser, logout, clearTokens } from '../lib/api'

export function Layout() {
  const user = getStoredUser()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    clearTokens()
    navigate('/login')
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/logo.png" alt="Kavana" style={{ width: '36px', height: '36px', borderRadius: '8px' }} />
          <div>
            <h1>CleanStock</h1>
            <span>Panel de Supervisor</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <span className="sidebar-link-icon">📊</span>
            Dashboard
          </NavLink>
          <NavLink to="/alerts" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <span className="sidebar-link-icon">🔔</span>
            Alertas
          </NavLink>
          <NavLink to="/asignaciones" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <span className="sidebar-link-icon">👥</span>
            Asignaciones
          </NavLink>
          <NavLink to="/inventario" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <span className="sidebar-link-icon">📦</span>
            Inventario
          </NavLink>
          <NavLink to="/deviations" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <span className="sidebar-link-icon">📈</span>
            Desviaciones
          </NavLink>
          <NavLink to="/incidents" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <span className="sidebar-link-icon">🛠️</span>
            Incidencias
          </NavLink>
          <NavLink to="/notifications" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <span className="sidebar-link-icon">📬</span>
            Notificaciones
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <strong>{user?.nombre}</strong>
            {user?.rol === 'admin' ? (
              <span className="badge badge-danger" style={{ marginTop: '0.25rem', backgroundColor: '#7c3aed' }}>Admin</span>
            ) : (
              <span className="badge badge-info" style={{ marginTop: '0.25rem' }}>Supervisor</span>
            )}
          </div>
          <button className="btn btn-outline btn-sm" style={{ color: 'white', borderColor: '#4b5563', width: '100%', marginTop: '0.5rem' }} onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}