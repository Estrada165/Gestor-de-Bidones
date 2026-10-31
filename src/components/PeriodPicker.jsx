import { useMemo } from 'react'
import { inicioDia, finDia, aInputFecha, fecha } from '../lib/format'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export const periodoInicial = () => ({ modo: 'dias', dias: 7, mes: new Date().getMonth(), ano: new Date().getFullYear(), desde: aInputFecha(new Date(Date.now() - 6 * 864e5)), hasta: aInputFecha() })

export function resolverPeriodo(p) {
  if (p.modo === 'dias') {
    const fin = finDia(); const ini = inicioDia(new Date(Date.now() - (p.dias - 1) * 864e5))
    return { inicio: ini, fin, label: `Últimos ${p.dias} días` }
  }
  if (p.modo === 'mes') {
    const ini = new Date(p.ano, p.mes, 1); const fin = finDia(new Date(p.ano, p.mes + 1, 0))
    return { inicio: ini, fin, label: `${MESES[p.mes]} ${p.ano}` }
  }
  const ini = inicioDia(new Date(p.desde + 'T00:00')), fin = finDia(new Date(p.hasta + 'T00:00'))
  if (isNaN(ini) || isNaN(fin) || ini > fin) return null
  return { inicio: ini, fin, label: `${fecha(ini)} → ${fecha(fin)}` }
}

export default function PeriodPicker({ value, onChange }) {
  const set = (c) => onChange({ ...value, ...c })
  const anos = useMemo(() => { const y = new Date().getFullYear(); return [y - 2, y - 1, y] }, [])
  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="seg fill">
        <button className={value.modo === 'dias' ? 'on' : ''} onClick={() => set({ modo: 'dias' })}>Rápido</button>
        <button className={value.modo === 'mes' ? 'on' : ''} onClick={() => set({ modo: 'mes' })}>Por mes</button>
        <button className={value.modo === 'rango' ? 'on' : ''} onClick={() => set({ modo: 'rango' })}>Rango libre</button>
      </div>
      {value.modo === 'dias' && (
        <div className="keys">
          {[7, 15, 30, 60, 90].map((d) => (
            <button key={d} className={`keycap ${value.dias === d ? 'on' : ''}`} onClick={() => set({ dias: d })}>
              <b>{d}</b><span>días</span>
            </button>
          ))}
        </div>
      )}
      {value.modo === 'mes' && (
        <div className="f-row keep">
          <select className="select" value={value.mes} onChange={(e) => set({ mes: Number(e.target.value) })}>
            {MESES.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select className="select" value={value.ano} onChange={(e) => set({ ano: Number(e.target.value) })}>
            {anos.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      )}
      {value.modo === 'rango' && (
        <div className="f-row keep">
          <div className="field"><label>Desde</label><input type="date" className="input" value={value.desde} onChange={(e) => set({ desde: e.target.value })} /></div>
          <div className="field"><label>Hasta</label><input type="date" className="input" value={value.hasta} onChange={(e) => set({ hasta: e.target.value })} /></div>
        </div>
      )}
    </div>
  )
}
