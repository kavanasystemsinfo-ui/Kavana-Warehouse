import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { getStoredUser, logout, clearTokens } from '../lib/api'
import { PeriodoProvider, PeriodoSelector } from '../lib/PeriodoContext'

export function Layout() {
  const user = getStoredUser()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [contactoOpen, setContactoOpen] = useState(false)

  // Cerrar sidebar automáticamente al navegar (en móvil)
  const closeOnNav = () => {
    setSidebarOpen(false)
  }

  // Cerrar sidebar con Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  const handleLogout = async () => {
    await logout()
    clearTokens()
    navigate('/login')
  }

  return (
    <div className="app-layout">
      {/* Overlay oscuro en móvil cuando el sidebar está abierto */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Botón hamburguesa — siempre visible cuando el sidebar está cerrado */}
      <button
        className={`sidebar-toggle ${sidebarOpen ? 'is-open' : ''}`}
        onClick={() => setSidebarOpen(prev => !prev)}
        aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
      >
        <span className="hamburger-line" />
        <span className="hamburger-line" />
        <span className="hamburger-line" />
      </button>

      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src="/logo.png" alt="Kavana" style={{ width: '36px', height: '36px', borderRadius: '8px' }} />
            <div>
              <h1>KAVANA WAREHOUSE</h1>
              <span>Panel de Supervisor</span>
            </div>
          </div>
          <button
            className="sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} onClick={closeOnNav}>
            <span className="sidebar-link-icon">📊</span>
            Dashboard
          </NavLink>
          <NavLink to="/centros" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} onClick={closeOnNav}>
            <span className="sidebar-link-icon">🏢</span>
            Centros
          </NavLink>
          <NavLink to="/responsables" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} onClick={closeOnNav}>
            <span className="sidebar-link-icon">🧑‍💼</span>
            Responsables
          </NavLink>
          <NavLink to="/supervisores" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} onClick={closeOnNav}>
            <span className="sidebar-link-icon">🛠️</span>
            Supervisores demo
          </NavLink>
          <NavLink to="/desviaciones" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} onClick={closeOnNav}>
            <span className="sidebar-link-icon">⚠️</span>
            Desviaciones
          </NavLink>
          <NavLink to="/costes" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} onClick={closeOnNav}>
            <span className="sidebar-link-icon">💶</span>
            Costes por centro
          </NavLink>
          <NavLink to="/inventario" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} onClick={closeOnNav}>
            <span className="sidebar-link-icon">📦</span>
            Inventario
          </NavLink>
          <NavLink to="/incidents" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} onClick={closeOnNav}>
            <span className="sidebar-link-icon">🛠️</span>
            Incidencias
          </NavLink>
          <NavLink to="/asistente" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} onClick={closeOnNav}>
            <span className="sidebar-link-icon">💬</span>
            Asistente técnico
          </NavLink>
          {/* Contacto desplegable */}
          <div className="sidebar-contacto">
            <button
              type="button"
              className={`sidebar-link sidebar-contacto-toggle${contactoOpen ? ' active' : ''}`}
              onClick={() => setContactoOpen(!contactoOpen)}
              aria-expanded={contactoOpen}
            >
              <span className="sidebar-link-icon">📬</span>
              <span style={{ flex: 1, textAlign: 'left' }}>Contacto</span>
              <span style={{ fontSize: 10 }}>{contactoOpen ? '▲' : '▼'}</span>
            </button>
            {contactoOpen && (
              <div className="sidebar-contacto-opciones">
                <a className="sidebar-link" href="mailto:kavanasystems.info@gmail.com">📧 Email</a>
                <a className="sidebar-link" href="https://www.linkedin.com/in/kavanasystems/" target="_blank" rel="noopener noreferrer">💼 LinkedIn</a>
                <a className="sidebar-link" href="https://wa.me/34633422461" target="_blank" rel="noopener noreferrer">💬 WhatsApp</a>
              </div>
            )}
          </div>
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <strong>{user?.nombre}</strong>
            {user?.rol === 'supervisor' && (
              <span className="badge badge-info" style={{ marginTop: '0.25rem' }}>Supervisor</span>
            )}
          </div>
          <button className="btn btn-outline btn-sm" style={{ color: 'white', borderColor: '#4b5563', width: '100%', marginTop: '0.5rem' }} onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="main-content" onClick={() => setSidebarOpen(false)}>
        <PeriodoProvider>
          <PeriodoSelector />
          <Outlet />
        </PeriodoProvider>
      </main>
    </div>
  )
}
