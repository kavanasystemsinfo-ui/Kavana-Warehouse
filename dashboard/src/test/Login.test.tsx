// =============================================================================
// Login — tests de componente (vitest + Testing Library)
// Run: cd dashboard && npm test
// =============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Login } from '../pages/Login'
import * as api from '../lib/api'

vi.mock('../lib/api', () => ({
  login: vi.fn(),
  getStoredUser: vi.fn(() => null),
}))

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Login />
    </MemoryRouter>
  )
}

describe('Login', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('renderiza el formulario de acceso', () => {
    renderLogin()
    expect(screen.getByText('KAVANA WAREHOUSE')).toBeInTheDocument()
    expect(screen.getByText('Panel de Control de Oficina')).toBeInTheDocument()
  })

  it('muestra error si las credenciales son inválidas', async () => {
    vi.mocked(api.login).mockRejectedValue(new Error('Credenciales invalidas'))
    renderLogin()
    fireEvent.change(screen.getByLabelText(/usuario/i), { target: { value: 'warehouse' } })
    fireEvent.change(screen.getByLabelText(/contrase/i), { target: { value: 'mala' } })
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))
    await waitFor(() => {
      expect(screen.getByText('Credenciales invalidas')).toBeInTheDocument()
    })
  })

  it('rechaza el rol limpiador aunque el login sea correcto', async () => {
    vi.mocked(api.login).mockResolvedValue({
      token: 'x',
      usuario: { rol: 'limpiador', nombre: 'Limp' },
    } as never)
    renderLogin()
    fireEvent.change(screen.getByLabelText(/usuario/i), { target: { value: 'limpiador1' } })
    fireEvent.change(screen.getByLabelText(/contrase/i), { target: { value: 'kavana' } })
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))
    await waitFor(() => {
      expect(screen.getByText(/acceso denegado/i)).toBeInTheDocument()
    })
  })
})
