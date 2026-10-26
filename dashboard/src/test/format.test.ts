import { describe, it, expect } from 'vitest'
import { fmtEuro, nombreConUnidad } from '../lib/format'

describe('fmtEuro', () => {
  it('formato español con dos decimales', () => {
    expect(fmtEuro(7.5)).toBe('7,50')
    expect(fmtEuro(1234.5)).toBe('1.234,50')
  })
})

describe('nombreConUnidad', () => {
  it('añade la unidad si el nombre no la lleva', () => {
    expect(nombreConUnidad('Tornillería variada', 'kilos')).toBe('Tornillería variada (kilos)')
  })

  it('no la repite si el nombre ya la indica entre paréntesis', () => {
    expect(nombreConUnidad('Aceite de corte (litros)', 'litros')).toBe('Aceite de corte (litros)')
    expect(nombreConUnidad('Brocas HSS (ud)', 'unidades')).toBe('Brocas HSS (ud)')
  })
})
