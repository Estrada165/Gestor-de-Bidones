import { useMemo, useState } from 'react'
import { Database, Plus, Minus, ClipboardCheck, Loader2, CheckCircle2, Truck, ShoppingBag, Home, SlidersHorizontal, Trash2, History } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useUI } from '../context/UIContext'
import { nivelStock } from '../lib/calc'
import { fechaHora, inicioDia } from '../lib/format'
import Gauge from '../components/Gauge'
import Stepper from '../components/Stepper'
import Empty from '../components/Empty'

const NIVEL = { ok: ['Stock saludable', 'ok'], bajo: ['Stock bajo', 'warn'], critico: ['Stock crítico', 'bad'], vacio: ['Sin stock', 'bad'] }

export default function Inventario() {
  const { puedeEscribir } = useAuth()
  const { ventas, pedidos, ajustes, stock, config, insertar, eliminar } = useData()
  const { toast, confirm } = useUI()
  const [modo, setModo] = useState(ajustes.length || pedidos.length ? 'sumar' : 'conteo')
  const [cant, setCant] = useState(1)
  const [conteo, setConteo] = useState('')
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [limite, setLimite] = useState(60)

  const nivel = nivelStock(stock, config)
  const max = Math.max(stock, (config?.stock_bajo ?? 5) * 2, 10) // promedio objetivo ~10 bidones

  const mes = useMemo(() => {
    const ini = new Date(); ini.setDate(1); const t = inicioDia(ini).getTime()
    const dm = (x) => new Date(x.fecha).getTime() >= t
    return {
      entradas: pedidos.filter(dm).reduce((s, p) => s + p.cantidad, 0),
      vendidos: ventas.filter((v) => dm(v) && v.tipo === 'venta').reduce((s, v) => s + v.cantidad, 0),
      propios: ventas.filter((v) => dm(v) && v.tipo === 'personal').reduce((s, v) => s + v.cantidad, 0),
      ajustes: ajustes.filter(dm).reduce((s, a) => s + a.cantidad, 0)
    }
  }, [ventas, pedidos, ajustes])

  // Kardex: todos los movimientos con saldo acumulado
  const kardex = useMemo(() => {
    const items = [
      ...pedidos.map((p) => ({ id: 'p' + p.id, fecha: p.fecha, delta: p.cantidad, tipo: 'pedido', titulo: `Pedido · ${p.proveedor}` })),
      ...ventas.map((v) => ({ id: 'v' + v.id, fecha: v.fecha, delta: -v.cantidad, tipo: v.tipo, titulo: v.tipo === 'personal' ? 'Uso propio' : `Venta · ${v.cliente}` })),
      ...ajustes.map((a) => ({ id: 'a' + a.id, fecha: a.fecha, delta: a.cantidad, tipo: 'ajuste', titulo: a.motivo || 'Ajuste manual', raw: a }))
    ].sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
    let saldo = 0
    for (const it of items) { saldo += it.delta; it.saldo = saldo }
    return items.reverse()
  }, [ventas, pedidos, ajustes])

  const delta = modo === 'conteo' ? (conteo === '' ? 0 : Number(conteo) - stock) : modo === 'sumar' ? Number(cant) || 0 : -(Number(cant) || 0)

  const guardar = async (e) => {
    e.preventDefault()
    if (!delta) return toast(modo === 'conteo' ? 'El conteo coincide con el stock, no hay nada que ajustar' : 'Indica una cantidad', 'info')
    setGuardando(true)
    try {
      const m = motivo.trim() || (modo === 'conteo' ? (ajustes.length || pedidos.length ? 'Conteo físico' : 'Stock inicial') : modo === 'sumar' ? 'Ajuste: entrada' : 'Ajuste: salida (rotura/pérdida)')
      await insertar('ajustes_inventario', { cantidad: delta, motivo: m })
      toast(`Stock ajustado ${delta > 0 ? '+' : ''}${delta} → ${stock + delta}`)
      setCant(1); setConteo(''); setMotivo('')
    } catch (err) { toast(err.message, 'bad') } finally { setGuardando(false) }
  }

  const borrar = async (a) => {
    if (!(await confirm({ titulo: 'Eliminar ajuste', peligro: true, textoOk: 'Eliminar', mensaje: `¿Eliminar "${a.motivo}" (${a.cantidad > 0 ? '+' : ''}${a.cantidad})? El stock se recalcula.` }))) return
    try { await eliminar('ajustes_inventario', a.id); toast('Ajuste eliminado') } catch (e) { toast(e.message, 'bad') }
  }

  const ICO = { pedido: Truck, venta: ShoppingBag, personal: Home, ajuste: SlidersHorizontal }

  return (
    <div className="view stack">
      <div className="topbar"><div><h1>Inventario</h1><div className="sub">el stock se calcula solo con cada venta, pedido y ajuste</div></div></div>

      <div className="grid g-main">
        <div className="card">
          <div className="card-b" style={{ display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Gauge valor={stock} max={max} nivel={nivel} />
            <div className="grow" style={{ minWidth: 220 }}>
              <span className={`badge ${NIVEL[nivel][1]}`}><span className="dot" />{NIVEL[nivel][0]}</span>
              <p className="t-2 small" style={{ margin: '10px 0 14px' }}>
                Alerta amarilla con {config?.stock_bajo ?? 5} o menos · roja con {config?.stock_critico ?? 2} o menos. Puedes cambiarlo en Ajustes.
              </p>
              <div className="mini">
                <div><small>Entraron</small><b className="t-ok">+{mes.entradas}</b></div>
                <div><small>Vendidos</small><b>−{mes.vendidos}</b></div>
                <div><small>Uso propio</small><b>−{mes.propios}</b></div>
                <div><small>Ajustes</small><b>{mes.ajustes > 0 ? '+' : ''}{mes.ajustes}</b></div>
              </div>
              <div className="tiny t-3 mono" style={{ marginTop: 8 }}>movimiento de este mes</div>
            </div>
          </div>
        </div>

        {puedeEscribir && (
          <form className="card" onSubmit={guardar}>
            <div className="card-h"><h3><SlidersHorizontal />Ajustar stock</h3></div>
            <div className="card-b form">
              <div className="seg fill">
                <button type="button" className={modo === 'sumar' ? 'on' : ''} onClick={() => setModo('sumar')}><Plus />Sumar</button>
                <button type="button" className={modo === 'restar' ? 'on' : ''} onClick={() => setModo('restar')}><Minus />Restar</button>
                <button type="button" className={modo === 'conteo' ? 'on' : ''} onClick={() => setModo('conteo')}><ClipboardCheck />Conteo</button>
              </div>
              {modo === 'conteo' ? (
                <div className="field">
                  <label>¿Cuántos bidones llenos hay realmente?</label>
                  <input className="input mono" inputMode="numeric" value={conteo} onChange={(e) => setConteo(e.target.value.replace(/\D/g, ''))} placeholder={String(stock)} style={{ fontSize: 18, height: 46, textAlign: 'center' }} />
                  <span className="hint">Úsalo para cargar el stock inicial o cuadrar con lo físico.</span>
                </div>
              ) : (
                <div className="field"><label>Cantidad</label><Stepper value={cant} onChange={setCant} /></div>
              )}
              <div className="field"><label>Motivo <span className="t-3">opcional</span></label><input className="input" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder={modo === 'restar' ? 'Ej. bidón roto' : modo === 'conteo' ? 'Ej. stock inicial' : 'Ej. préstamo devuelto'} /></div>
              <div className="summary">
                <div className="s-row"><span>Ajuste</span><b className={delta > 0 ? 't-ok' : delta < 0 ? 't-bad' : ''}>{delta > 0 ? '+' : ''}{delta}</b></div>
                <div className="s-row big"><span>Stock final</span><b>{stock + delta}</b></div>
              </div>
              <button className="key primary block" disabled={guardando || !delta}>{guardando ? <Loader2 className="spin" /> : <CheckCircle2 />}Guardar ajuste</button>
            </div>
          </form>
        )}
      </div>

      <div className="card">
        <div className="card-h"><h3><History />Movimientos de stock</h3><span className="badge mono">{kardex.length}</span></div>
        <div className="card-b flush">
          {kardex.length === 0 ? <Empty icono={Database} titulo="Sin movimientos" texto="Empieza con un conteo para cargar tu stock inicial." /> : (
            <div className="list">
              {kardex.slice(0, limite).map((k) => {
                const I = ICO[k.tipo]
                return (
                  <div className="li" key={k.id}>
                    <div className={`li-ico ${k.delta > 0 ? 'ok' : ''}`}><I /></div>
                    <div className="li-main"><div className="li-title"><span>{k.titulo}</span></div><div className="li-sub">{fechaHora(k.fecha)}</div></div>
                    <div className="li-end">
                      <span className={`li-amt ${k.delta > 0 ? 't-ok' : 't-2'}`}>{k.delta > 0 ? '+' : ''}{k.delta}</span>
                      <span className="badge mono" title="Saldo">{k.saldo}</span>
                      {k.tipo === 'ajuste' && puedeEscribir && <button className="key ghost icon sm" onClick={() => borrar(k.raw)}><Trash2 /></button>}
                    </div>
                  </div>
                )
              })}
              {kardex.length > limite && <button className="key ghost block" style={{ borderRadius: 0 }} onClick={() => setLimite((l) => l + 60)}>Ver más</button>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
