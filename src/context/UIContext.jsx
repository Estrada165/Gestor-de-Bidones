import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { flushSync } from 'react-dom'
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react'
import Modal from '../components/Modal'

const UICtx = createContext(null)
export const useUI = () => useContext(UICtx)

const ICONOS = { ok: CheckCircle2, bad: XCircle, warn: AlertTriangle, info: Info }

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [confirmar, setConfirmar] = useState(null)
  const [tema, setTemaState] = useState(() => document.documentElement.getAttribute('data-theme') || 'dark')
  const idRef = useRef(0)

  const toast = useCallback((msg, tipo = 'ok') => {
    const id = ++idRef.current
    setToasts((t) => [...t.slice(-3), { id, msg, tipo }])
    setTimeout(() => setToasts((t) => t.map((x) => (x.id === id ? { ...x, out: true } : x))), 3200)
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)
  }, [])

  /** confirm({ titulo, mensaje, textoOk, peligro }) → Promise<boolean> */
  const confirm = useCallback((opts) => new Promise((resolve) => setConfirmar({ ...opts, resolve })), [])

  const cerrarConfirm = (v) => { confirmar?.resolve(v); setConfirmar(null) }

  /** Cambia el tema con un círculo que se expande desde el botón */
  const toggleTema = useCallback((ev) => {
    const nuevo = tema === 'dark' ? 'light' : 'dark'
    const aplicar = () => {
      document.documentElement.setAttribute('data-theme', nuevo)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', nuevo === 'dark' ? '#0a0a0b' : '#efefec')
      try { localStorage.setItem('ga-tema', nuevo) } catch {}
      setTemaState(nuevo)
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!document.startViewTransition || reduce) { aplicar(); return }
    const r = ev?.currentTarget?.getBoundingClientRect?.()
    const x = r ? r.left + r.width / 2 : window.innerWidth / 2
    const y = r ? r.top + r.height / 2 : 0
    const radio = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
    const t = document.startViewTransition(() => flushSync(aplicar))
    t.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radio}px at ${x}px ${y}px)`] },
        { duration: 600, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' }
      )
    })
  }, [tema])

  const setAcento = useCallback((a) => {
    if (!a || a === 'agua') document.documentElement.removeAttribute('data-acento')
    else document.documentElement.setAttribute('data-acento', a)
    try { localStorage.setItem('ga-acento', a || 'agua') } catch {}
  }, [])

  return (
    <UICtx.Provider value={{ toast, confirm, tema, toggleTema, setAcento }}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => {
          const I = ICONOS[t.tipo] || Info
          return (
            <div key={t.id} className={`toast ${t.tipo} ${t.out ? 'out' : ''}`}>
              <I /> <span>{t.msg}</span>
            </div>
          )
        })}
      </div>
      {confirmar && (
        <Modal
          titulo={confirmar.titulo || '¿Confirmar?'}
          onClose={() => cerrarConfirm(false)}
          pie={(cerrar) => (
            <>
              <button className="key" onClick={() => cerrar(() => cerrarConfirm(false))}>Cancelar</button>
              <button className={`key ${confirmar.peligro ? 'danger' : 'primary'}`} onClick={() => cerrar(() => cerrarConfirm(true))} autoFocus>
                {confirmar.textoOk || 'Confirmar'}
              </button>
            </>
          )}
        >
          <p className="t-2" style={{ fontSize: 14 }}>{confirmar.mensaje}</p>
        </Modal>
      )}
    </UICtx.Provider>
  )
}
