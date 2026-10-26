import { describe, it, expect, vi } from 'vitest'
import { calcRange, isoLocal } from '../lib/PeriodoContext'

// Hora de España también en CI (que corre en UTC): antes, con toISOString(),
// la medianoche local del día 1 salía como el día anterior.
vi.stubEnv('TZ', 'Europe/Madrid')
describe('calcRange', () => {
  const hoy = new Date(2026, 9, 25, 10, 0) // domingo 25-oct-2026, 10:00 hora local

  it('mes actual empieza el día 1 del mes, no el último del anterior', () => {
    expect(calcRange('mes_actual', hoy)).toEqual({ from: '2026-10-01', to: '2026-10-25' })
  })

  it('mes anterior cubre del día 1 al último día, ambos incluidos', () => {
    expect(calcRange('mes_anterior', hoy)).toEqual({ from: '2026-09-01', to: '2026-09-30' })
  })

  it('esta semana empieza el lunes', () => {
    expect(calcRange('semana', hoy)).toEqual({ from: '2026-10-19', to: '2026-10-25' })
  })

  it('todo el histórico no filtra', () => {
    expect(calcRange('todo', hoy)).toEqual({ from: '', to: '' })
  })

  it('isoLocal respeta la fecha local justo después de medianoche', () => {
    expect(isoLocal(new Date(2026, 9, 1, 0, 30))).toBe('2026-10-01')
  })
})
