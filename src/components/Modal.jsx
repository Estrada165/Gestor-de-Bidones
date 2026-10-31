import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/**
 * <Modal titulo onClose pie={(cerrar)=>...} wide>
 *   children puede ser nodo o función (cerrar) => nodo
 * cerrar(cb?) anima la salida y luego llama cb (o onClose)
 */
export default function Modal({ titulo, onClose, pie, children, wide, sheet, sinPadding }) {
  const [saliendo, setSaliendo] = useState(false)

  const cerrar = useCallback((cb) => {
    setSaliendo(true)
    setTimeout(() => (typeof cb === 'function' ? cb() : onClose?.()), 180)
  }, [onClose])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && cerrar()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [cerrar])

  const contenido = typeof children === 'function' ? children(cerrar) : children

  return createPortal(
    <div className={`scrim ${saliendo ? 'closing' : ''}`} onMouseDown={(e) => e.target === e.currentTarget && cerrar()}>
      {sheet ? (
        <div className="sheet" role="dialog" aria-modal="true">
          <div className="sheet-grip" />
          {contenido}
        </div>
      ) : (
        <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true">
          <div className="modal-h">
            <h3>{titulo}</h3>
            <button className="key ghost icon sm" onClick={() => cerrar()} aria-label="Cerrar"><X /></button>
          </div>
          <div className="modal-b" style={sinPadding ? { padding: 0 } : undefined}>{contenido}</div>
          {pie && <div className="modal-f">{typeof pie === 'function' ? pie(cerrar) : pie}</div>}
        </div>
      )}
    </div>,
    document.body
  )
}
