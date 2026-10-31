import { useMemo, useState } from 'react'
import { Wallet, Banknote, Smartphone, HandCoins, Receipt as RIco, ArrowUpRight, ArrowDownLeft, Loader2, CheckCircle2, Trash2, Undo2, Landmark, ListOrdered, Scale } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useUI } from '../context/UIContext'
import { calcularCaja } from '../lib/calc'
import { soles, fechaHora, aInputLocal, METODOS } from '../lib/format'
import KeyOptions from '../components/KeyOptions'
import Empty from '../components/Empty'
import { METODOS_PAGO } from '../components/PagoModal'

const TIPOS = [
  { v: 'gasto', label: 'Gasto', icon: RIco },
  { v: 'retiro', label: 'Retiro', icon: ArrowUpRight },
  { v: 'prestamo', label: 'Préstamo', icon: HandCoins },
  { v: 'ingreso', label: 'Ingreso', icon: ArrowDownLeft }
]
const AYUDA = {
  gasto: 'Gastos del negocio: gasolina, bolsas, tapas, etc.',
  retiro: 'Dinero que sacas para ti.',
  prestamo: 'Dinero que prestas y te deben devolver. Al marcarlo devuelto vuelve a la caja.',
  ingreso: 'Dinero que metes a la caja (capital, vuelto inicial, etc.).'
}

export default function Caja() {
  const { puedeEscribir } = useAuth()
  const { ventas, pagos, movimientos, insertar, actualizar, eliminar } = useData()
  const { toast, confirm } = useUI()
  const caja = useMemo(() => calcularCaja({ ventas, pagos, movimientos }), [ventas, pagos, movimientos])

  const [f, setF] = useState({ tipo: 'gasto', monto: '', metodo: 'efectivo', descripcion: '', fecha: aInputLocal() })
  const [guardando, setGuardando] = useState(false)
  const [filtro, setFiltro] = useState('todos')
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))

  const guardar = async (e) => {
    e.preventDefault()
    const m = Number(f.monto)
    if (!(m > 0)) return toast('Ingresa un monto válido', 'warn')
    if (!f.descripcion.trim()) return toast('Agrega una descripción', 'warn')
    setGuardando(true)
    try {
      await insertar('movimientos', { tipo: f.tipo, monto: +m.toFixed(2), metodo: f.metodo, descripcion: f.descripcion.trim(), fecha: new Date(f.fecha).toISOString() })
      toast(`${TIPOS.find((t) => t.v === f.tipo).label} registrado · ${soles(m)}`)
      setF((x) => ({ ...x, monto: '', descripcion: '', fecha: aInputLocal() }))
    } catch (err) { toast(err.message, 'bad') } finally { setGuardando(false) }
  }

  const toggleDevuelto = async (m) => {
    try { await actualizar('movimientos', m.id, { devuelto: !m.devuelto }); toast(m.devuelto ? 'Préstamo marcado pendiente' : 'Préstamo devuelto') } catch (e) { toast(e.message, 'bad') }
  }
  const borrar = async (m) => {
    if (!(await confirm({ titulo: 'Eliminar movimiento', peligro: true, textoOk: 'Eliminar', mensaje: `¿Eliminar "${m.descripcion}" (${soles(m.monto)})?` }))) return
    try { await eliminar('movimientos', m.id); toast('Movimiento eliminado') } catch (e) { toast(e.message, 'bad') }
  }

  const lista = movimientos.filter((m) => filtro === 'todos' || m.tipo === filtro)
  const digital = caja.porMetodo.yape + caja.porMetodo.plin + caja.porMetodo.transferencia

  return (
    <div className="view stack">
      <div className="topbar"><div><h1>Caja</h1><div className="sub">lo que entró menos lo que salió</div></div></div>

      <div className="grid g-4 stagger">
        <div className="stat accent"><div className="stat-top"><span className="stat-label">Saldo total</span><span className="stat-ico"><Wallet /></span></div><div className={`stat-val ${caja.saldo < 0 ? 't-bad' : ''}`}>{soles(caja.saldo)}</div><div className="stat-foot">dinero que deberías tener</div></div>
        <div className="stat"><div className="stat-top"><span className="stat-label">Efectivo</span><span className="stat-ico"><Banknote /></span></div><div className={`stat-val ${caja.porMetodo.efectivo < 0 ? 't-bad' : ''}`}>{soles(caja.porMetodo.efectivo)}</div><div className="stat-foot">en mano</div></div>
        <div className="stat"><div className="stat-top"><span className="stat-label">Digital</span><span className="stat-ico"><Smartphone /></span></div><div className={`stat-val ${digital < 0 ? 't-bad' : ''}`}>{soles(digital)}</div><div className="stat-foot">Yape {soles(caja.porMetodo.yape)} · Plin {soles(caja.porMetodo.plin)}</div></div>
        <div className="stat"><div className="stat-top"><span className="stat-label">Prestado</span><span className="stat-ico"><HandCoins /></span></div><div className={`stat-val ${caja.prestamos ? 't-warn' : ''}`}>{soles(caja.prestamos)}</div><div className="stat-foot">por devolver</div></div>
      </div>

      <div className="grid g-form">
        <div className="stack">
          {puedeEscribir && (
            <form className="card" onSubmit={guardar}>
              <div className="card-h"><h3><Wallet />Nuevo movimiento</h3></div>
              <div className="card-b form">
                <KeyOptions opciones={TIPOS} value={f.tipo} onChange={(v) => set('tipo', v)} size="sm" />
                <p className="hint">{AYUDA[f.tipo]}</p>
                <div className="field"><label>Monto</label><div className="input-wrap"><span className="prefix">S/</span><input className="input mono" inputMode="decimal" value={f.monto} onChange={(e) => set('monto', e.target.value.replace(',', '.'))} placeholder="0.00" /></div></div>
                <div className="field"><label>Descripción</label><input className="input" value={f.descripcion} onChange={(e) => set('descripcion', e.target.value)} placeholder={f.tipo === 'prestamo' ? '¿A quién?' : '¿Para qué?'} /></div>
                <div className="field"><label>Método</label><KeyOptions opciones={METODOS_PAGO} value={f.metodo} onChange={(v) => set('metodo', v)} size="sm" /></div>
                <div className="field"><label>Fecha</label><input type="datetime-local" className="input" value={f.fecha} onChange={(e) => set('fecha', e.target.value)} /></div>
                <button className="key primary block" disabled={guardando}>{guardando ? <Loader2 className="spin" /> : <CheckCircle2 />}Registrar</button>
              </div>
            </form>
          )}
          <div className="card">
            <div className="card-h"><h3><Scale />Cómo se calcula</h3></div>
            <div className="card-b">
              <div className="kv">
                <div><span>Ventas cobradas</span><b className="t-ok">+{soles(caja.cobrado)}</b></div>
                {caja.ingresos > 0 && <div><span>Ingresos extra</span><b className="t-ok">+{soles(caja.ingresos)}</b></div>}
                <div><span>Pagos a proveedores</span><b>−{soles(caja.pagadoProv)}</b></div>
                <div><span>Gastos</span><b>−{soles(caja.gastos)}</b></div>
                <div><span>Retiros</span><b>−{soles(caja.retiros)}</b></div>
                <div><span>Préstamos sin devolver</span><b>−{soles(caja.prestamos)}</b></div>
                <div><span className="b" style={{ color: 'var(--text)' }}>Saldo</span><b className="t-accent">{soles(caja.saldo)}</b></div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-h">
            <h3><ListOrdered />Movimientos</h3>
            <div className="seg">
              {[['todos', 'Todos'], ...TIPOS.map((t) => [t.v, t.label])].map(([k, l]) => <button key={k} className={filtro === k ? 'on' : ''} onClick={() => setFiltro(k)}>{l}</button>)}
            </div>
          </div>
          <div className="card-b flush">
            {lista.length === 0 ? <Empty icono={Wallet} titulo="Sin movimientos" texto="Gastos, retiros y préstamos aparecerán aquí. Los pagos a proveedores se registran en Pedidos." /> : (
              <div className="list">
                {lista.map((m) => {
                  const T = TIPOS.find((t) => t.v === m.tipo)
                  const I = T.icon
                  const entra = m.tipo === 'ingreso' || (m.tipo === 'prestamo' && m.devuelto)
                  return (
                    <div className="li" key={m.id}>
                      <div className={`li-ico ${m.tipo === 'ingreso' ? 'ok' : m.tipo === 'prestamo' ? (m.devuelto ? 'ok' : 'warn') : ''}`}><I /></div>
                      <div className="li-main">
                        <div className="li-title"><span>{m.descripcion}</span>{m.tipo === 'prestamo' && <span className={`badge ${m.devuelto ? 'ok' : 'warn'}`}>{m.devuelto ? 'devuelto' : 'pendiente'}</span>}</div>
                        <div className="li-sub"><span>{T.label}</span>·<span>{METODOS[m.metodo]}</span>·<span>{fechaHora(m.fecha)}</span></div>
                      </div>
                      <div className="li-end">
                        <span className={`li-amt ${entra ? 't-ok' : ''}`} style={m.devuelto ? { textDecoration: 'line-through', opacity: 0.5 } : undefined}>{m.tipo === 'ingreso' ? '+' : '−'}{soles(m.monto)}</span>
                        {puedeEscribir && (
                          <div className="li-actions">
                            {m.tipo === 'prestamo' && <button className="key sm icon" onClick={() => toggleDevuelto(m)} title={m.devuelto ? 'Marcar pendiente' : 'Marcar devuelto'}>{m.devuelto ? <Undo2 /> : <CheckCircle2 />}</button>}
                            <button className="key ghost icon sm" onClick={() => borrar(m)}><Trash2 /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
