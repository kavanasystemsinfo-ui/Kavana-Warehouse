// Formato numérico español para todas las cifras del dashboard.
// Regla de Jorge: punto para miles (12.415), coma para decimales (43,5),
// sin decimales si no los hay (43, no 43,0).
// NO usar toLocaleString('es-ES'): omite el punto de miles cuando el grupo
// más alto tiene 1 dígito (5314 → "5314", no "5.314") — regla CLDR.

export function fmtNum(v: number | string | null | undefined): string {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v)
  if (!Number.isFinite(n)) return '—'
  const [intPart, decPart] = String(n).split('.')
  const withDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return decPart ? `${withDots},${decPart}` : withDots
}

export function fmtEuro(v: number | string | null | undefined): string {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v)
  if (!Number.isFinite(n)) return '—'
  const [intPart, decPart] = n.toFixed(2).split('.')
  const withDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${withDots},${decPart}`
}
