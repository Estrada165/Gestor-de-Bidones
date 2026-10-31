import { Minus, Plus } from 'lucide-react'

export default function Stepper({ value, onChange, min = 1, max = 999 }) {
  const set = (v) => onChange(Math.max(min, Math.min(max, Number.isFinite(v) ? v : min)))
  return (
    <div className="stepper">
      <button type="button" className="key icon" onClick={() => set(Number(value) - 1)} aria-label="Menos"><Minus /></button>
      <input className="input" inputMode="numeric" value={value} onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); onChange(v === '' ? '' : Number(v)) }} onBlur={() => set(parseInt(value))} />
      <button type="button" className="key icon" onClick={() => set(Number(value || 0) + 1)} aria-label="Más"><Plus /></button>
    </div>
  )
}
