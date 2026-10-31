import { useState, useMemo, useRef } from 'react'

/** Input con sugerencias. opciones: [{ nombre, veces, ... }] */
export default function Autocomplete({ value, onChange, onPick, opciones, placeholder, autoFocus, detalle }) {
  const [abierto, setAbierto] = useState(false)
  const [hl, setHl] = useState(0)
  const ref = useRef(null)

  const lista = useMemo(() => {
    const q = value.trim().toLowerCase()
    return opciones.filter((o) => !q || o.nombre.toLowerCase().includes(q)).filter((o) => o.nombre.toLowerCase() !== q).slice(0, 7)
  }, [value, opciones])

  const elegir = (o) => { onChange(o.nombre); onPick?.(o); setAbierto(false) }

  return (
    <div className="ac">
      <input
        ref={ref}
        className="input"
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        onChange={(e) => { onChange(e.target.value); setAbierto(true); setHl(0) }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        onKeyDown={(e) => {
          if (!abierto || !lista.length) return
          if (e.key === 'ArrowDown') { e.preventDefault(); setHl((h) => (h + 1) % lista.length) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHl((h) => (h - 1 + lista.length) % lista.length) }
          else if (e.key === 'Enter') { e.preventDefault(); elegir(lista[hl]) }
          else if (e.key === 'Escape') setAbierto(false)
        }}
      />
      {abierto && lista.length > 0 && (
        <div className="ac-list">
          {lista.map((o, i) => (
            <button type="button" key={o.nombre} className={`ac-item ${i === hl ? 'hl' : ''}`} onMouseDown={(e) => { e.preventDefault(); elegir(o) }}>
              <span>{o.nombre}</span>
              <small>{detalle ? detalle(o) : `${o.veces}×`}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
