import { createContext, useContext, useState, ReactNode } from 'react'

// Periodo global del panel (mismo patrón que RouteAI): el selector vive en el
// Layout y aplica a todas las páginas con datos temporales (Dashboard, Incidencias).
interface Periodo {
  rangeMode: string // mes_actual | mes_anterior | semana | todo | custom
  from: string
  to: string
}

interface PeriodoContextValue {
  periodo: Periodo
  setPeriodo: (mode: string) => void
  setCustom: (from: string, to: string) => void
}

const PeriodoContext = createContext<PeriodoContextValue | null>(null)

export function calcRange(mode: string) {
  const hoy = new Date()
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  if (mode === 'mes_actual') {
    const primero = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    return { from: iso(primero), to: iso(hoy) }
  }
  if (mode === 'mes_anterior') {
    const primero = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
    const ultimo = new Date(hoy.getFullYear(), hoy.getMonth(), 0)
    return { from: iso(primero), to: iso(ultimo) }
  }
  if (mode === 'semana') {
    const dia = (hoy.getDay() + 6) % 7 // lunes = 0
    const lunes = new Date(hoy)
    lunes.setDate(hoy.getDate() - dia)
    return { from: iso(lunes), to: iso(hoy) }
  }
  return { from: '', to: '' } // todo el histórico
}

export function PeriodoProvider({ children }: { children: ReactNode }) {
  const inicial = calcRange('mes_actual')
  const [periodo, setPeriodoState] = useState<Periodo>({ rangeMode: 'mes_actual', ...inicial })

  const setPeriodo = (mode: string) => {
    const { from, to } = calcRange(mode)
    setPeriodoState({ rangeMode: mode, from, to })
  }

  const setCustom = (from: string, to: string) => {
    setPeriodoState({ rangeMode: 'custom', from, to })
  }

  return (
    <PeriodoContext.Provider value={{ periodo, setPeriodo, setCustom }}>
      {children}
    </PeriodoContext.Provider>
  )
}

export function usePeriodo(): PeriodoContextValue {
  const ctx = useContext(PeriodoContext)
  if (!ctx) throw new Error('usePeriodo debe usarse dentro de PeriodoProvider')
  return ctx
}

// Selector visual: se renderiza en el Layout, arriba de todas las páginas.
export function PeriodoSelector() {
  const { periodo, setPeriodo, setCustom } = usePeriodo()
  const [customFrom, setCustomFrom] = useState(periodo.from)
  const [customTo, setCustomTo] = useState(periodo.to)

  return (
    <div className="periodo-bar" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 13, color: 'var(--gray-500)', fontWeight: 700, marginRight: 4 }}>Periodo:</span>
      {[
        ['mes_actual', 'Mes actual'],
        ['mes_anterior', 'Mes anterior'],
        ['semana', 'Esta semana'],
        ['todo', 'Todo el histórico'],
        ['custom', 'Personalizado'],
      ].map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => setPeriodo(key)}
          className={`btn btn-sm ${periodo.rangeMode === key ? 'btn-primary' : 'btn-outline'}`}
        >
          {label}
        </button>
      ))}
      {periodo.rangeMode === 'custom' && (
        <>
          <input
            className="form-input"
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            style={{ width: 'auto', padding: '6px 8px' }}
          />
          <span style={{ color: 'var(--gray-500)', fontSize: 13 }}>a</span>
          <input
            className="form-input"
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            style={{ width: 'auto', padding: '6px 8px' }}
          />
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setCustom(customFrom, customTo)}>
            Aplicar
          </button>
        </>
      )}
    </div>
  )
}
