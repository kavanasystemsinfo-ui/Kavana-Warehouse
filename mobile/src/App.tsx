import { useState, useEffect } from 'react'
import { isAuthenticated } from './lib/api'
import { Login } from './pages/Login'
import { Main } from './pages/Main'

function App() {
  const [loggedIn, setLoggedIn] = useState(isAuthenticated())

  useEffect(() => {
    setLoggedIn(isAuthenticated())

    const handleUnauthorized = () => {
      setLoggedIn(false)
    }
    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized)
    }
  }, [])

  if (!loggedIn) {
    return <Login onLoginSuccess={() => setLoggedIn(true)} />
  }

  return <Main onLogout={() => setLoggedIn(false)} />
}

export default App
