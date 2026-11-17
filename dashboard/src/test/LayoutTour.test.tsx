// Tour guiado en el Layout: se abre solo la primera vez a un visitante de la demo y se repite con el botón.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Layout } from '../components/Layout'
import * as api from '../lib/api'

vi.mock('../lib/api', () => ({
  getStoredUser: vi.fn(() => ({ nombre: 'Responsable de Planta', rol: 'oficina', demo: true })),
  esVisita: vi.fn(() => true),
  logout: vi.fn(),
  clearTokens: vi.fn(),
}))

const CLAVE = 'warehouse-tour-visto'

function montar(ruta = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route path="dashboard" element={<p>Pantalla dashboard</p>} />
          <Route path="centros" element={<p>Pantalla centros</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('Tour guiado en el Layout', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(api.esVisita).mockReturnValue(true)
  })
  afterEach(() => cleanup())

  it('se abre solo la primera vez que entra un visitante de la demo, y no vuelve', async () => {
    const primera = montar()
    expect(await screen.findByRole('dialog', { name: 'Bienvenido a Kavana Warehouse' }, { timeout: 3000 })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(localStorage.getItem(CLAVE)).toBe('true')
    primera.unmount()

    montar()
    await new Promise((r) => setTimeout(r, 1500))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('no se abre solo con una cuenta propia (no es visitante de la demo)', async () => {
    vi.mocked(api.esVisita).mockReturnValue(false)
    montar()
    await new Promise((r) => setTimeout(r, 1500))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('el botón «Tour guiado» abre el recorrido de la pantalla en la que estás', async () => {
    localStorage.setItem(CLAVE, 'true')
    montar('/centros')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Tour guiado/ }))
    expect(await screen.findByRole('dialog', { name: 'Los centros de trabajo' })).toBeInTheDocument()
  })

  it('el último paso de una pantalla lleva a la siguiente y cambia de pantalla', async () => {
    localStorage.setItem(CLAVE, 'true')
    montar('/dashboard')
    fireEvent.click(screen.getByRole('button', { name: /Tour guiado/ }))
    await screen.findByRole('dialog', { name: 'Bienvenido a Kavana Warehouse' })
    for (let i = 0; i < 4; i++) fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.click(await screen.findByRole('button', { name: 'Sí, llévame' }))
    expect(await screen.findByRole('dialog', { name: 'Los centros de trabajo' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Pantalla centros')).toBeInTheDocument())
  })
})
