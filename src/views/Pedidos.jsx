import { useMemo, useState } from 'react'
import { Truck, Search, Download, CheckCircle2, Loader2, Clock, Wallet, MessageCircle, Phone, FileText, X, Pencil } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useUI } from '../context/UIContext'
import { soles, fechaHora, fecha, aInputLocal, diasDesde, haceDias, bidones, METODOS } from '../lib/format'
import { estadoPedido } from '../lib/calc'
import { csvPedidos } from '../lib/csv'
import Autocomplete from '../components/Autocomplete'
import Stepper from '../components/Stepper'
import KeyOptions from '../components/KeyOptions'
import ImagePicker from '../components/ImagePicker'
import Receipt from '../components/Receipt'
import Empty from '../components/Empty'
import PagoModal, { METODOS_PAGO } from '../components/PagoModal'
import EditarPedidoModal from '../components/EditarPedidoModal'
import EditarPagoModal from '../components/EditarPagoModal'

const telWa = (t) => { const d = String(t || '').replace(/\D/g, ''); return d.length === 9 ? '51' + d : d }

export default function Pedidos() {
  const { puedeEscribir } = useAuth()
  const { pedidos, pagos, config, proveedores, insertar, eliminar, subirComprobante, ultimoId } = useData()
  const { toast, confirm } = useUI()

  const nuevo = () => ({ proveedor: '', telefono: '', cantidad: 20, costo: String(config?.costo_compra ?? 2.7), devueltos: '', notas: '', pago: 'despues', metodo: 'yape', monto: '', conFecha: false, fecha: aInputLocal() })
  const [f, setF] = useState(nuevo)
  const [file, setFile] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))

  const cant = Number(f.cantidad) || 0
  const costo = Number(f.costo) || 0
  const total = +(cant * costo).toFixed(2)
  const montoPago = f.pago === 'total' ? total : f.pago === 'parcial' ? Number(f.monto) || 0 : 0

  const guardar = async (e) => {
    e.preventDefault()
    if (!f.proveedor.trim()) return toast('Escribe el nombre del proveedor', 'warn')
    if (cant < 1) return toast('La cantidad debe ser al menos 1', 'warn')
    if (f.pago === 'parcial' && (montoPago <= 0 || montoPago >= total)) return toast('El pago parcial debe ser mayor a 0 y menor al total', 'warn')
    setGuardando(true)
    try {
      const fechaIso = f.conFecha ? new Date(f.fecha).toISOString() : new Date().toISOString()
      const ped = await insertar('pedidos', {
        proveedor: f.proveedor.trim(), telefono: f.telefono.trim() || null, cantidad: cant,
        devueltos: parseInt(f.devueltos) || 0, costo_unit: costo, total, fecha: fechaIso, notas: f.notas.trim() || null
      })
      if (montoPago > 0) {
        const ruta = file ? await subirComprobante(file) : null
        await insertar('pagos_pedido', { pedido_id: ped.id, monto: +montoPago.toFixed(2), metodo: f.metodo, fecha: fechaIso, comprobante_path: ruta })
      }
      toast(`Pedido registrado: +${cant} bidones`)
      setF((x) => ({ ...nuevo(), proveedor: x.proveedor, telefono: x.telefono, cantidad: x.cantidad, costo: x.costo }))
      setFile(null)
    } catch (err) {
      toast(err.message, 'bad')
    } finally {
      setGuardando(false)
    }
  }

  // ── Lista ──
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [pagar, setPagar] = useState(null)
  const [editPed, setEditPed] = useState(null)
  const [editPago, setEditPago] = useState(null)
  const [limite, setLimite] = useState(30)

  const lista = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return pedidos
      .map((p) => ({ p, e: estadoPedido(p, pagos), pg: pagos.filter((x) => x.pedido_id === p.id).sort((a, b) => new Date(a.fecha) - new Date(b.fecha)) }))
      .filter(({ p, e }) => (!qq || p.proveedor.toLowerCase().includes(qq)) && (filtro === 'todos' || (filtro === 'pendientes' ? e.estado !== 'pagado' : e.estado === 'pagado')))
  }, [pedidos, pagos, q, filtro])

  const deudaTotal = useMemo(() => pedidos.reduce((s, p) => s + estadoPedido(p, pagos).saldo, 0), [pedidos, pagos])


  return (
    <div className="view stack">
      <div className="topbar">
        <div><h1>Pedidos</h1><div className="sub">{pedidos.length} pedidos · debes {soles(deudaTotal)}</div></div>
      </div>

      <div className="grid g-form">
        {puedeEscribir ? (
          <form className="card" onSubmit={guardar}>
            <div className="card-h"><h3><Truck />Nuevo pedido al proveedor</h3></div>
            <div className="card-b form">
              <div className="field">
                <label>Proveedor</label>
                <Autocomplete value={f.proveedor} onChange={(v) => set('proveedor', v)} opciones={proveedores}
                  onPick={(o) => setF((x) => ({ ...x, proveedor: o.nombre, telefono: o.telefono || x.telefono, costo: String(o.costo ?? x.costo) }))}
                  detalle={(o) => `${o.veces} ped.`} placeholder="Nombre del proveedor" />
              </div>
              <div className="field"><label>Teléfono / WhatsApp <span className="t-3">opcional</span></label><input className="input mono" inputMode="tel" value={f.telefono} onChange={(e) => set('telefono', e.target.value)} placeholder="9XX XXX XXX" /></div>
              <div className="field"><label>Bidones recibidos</label><Stepper value={f.cantidad} onChange={(v) => set('cantidad', v)} /></div>
              <div className="f-row keep">
                <div className="field"><label>Costo c/u</label><div className="input-wrap"><span className="prefix">S/</span><input className="input mono" inputMode="decimal" value={f.costo} onChange={(e) => set('costo', e.target.value.replace(',', '.'))} /></div></div>
                <div className="field"><label>Vacíos entregados</label><input className="input mono" inputMode="numeric" value={f.devueltos} onChange={(e) => set('devueltos', e.target.value.replace(/\D/g, ''))} placeholder="0" /></div>
              </div>

              <div className="field">
                <label>Pago</label>
                <div className="seg fill">
                  <button type="button" className={f.pago === 'despues' ? 'on' : ''} onClick={() => set('pago', 'despues')}><Clock />Después</button>
                  <button type="button" className={f.pago === 'total' ? 'on' : ''} onClick={() => set('pago', 'total')}><CheckCircle2 />Ya pagué</button>
                  <button type="button" className={f.pago === 'parcial' ? 'on' : ''} onClick={() => set('pago', 'parcial')}><Wallet />Parcial</button>
                </div>
              </div>
              {f.pago !== 'despues' && (
                <>
                  {f.pago === 'parcial' && (
                    <div className="field"><label>Monto pagado ahora</label><div className="input-wrap"><span className="prefix">S/</span><input className="input mono" inputMode="decimal" value={f.monto} onChange={(e) => set('monto', e.target.value.replace(',', '.'))} placeholder="0.00" /></div></div>
                  )}
                  <div className="field"><label>Método</label><KeyOptions opciones={METODOS_PAGO} value={f.metodo} onChange={(v) => set('metodo', v)} size="sm" /></div>
                  <ImagePicker file={file} onChange={setFile} />
                </>
              )}

              <div className="field"><label>Notas <span className="t-3">opcional</span></label><input className="input" value={f.notas} onChange={(e) => set('notas', e.target.value)} placeholder="Ej. llegó con 1 bidón rajado" /></div>
              <div className="field">
                <label className="switch" style={{ justifyContent: 'flex-start' }}>
                  <input type="checkbox" checked={f.conFecha} onChange={(e) => set('conFecha', e.target.checked)} /><span className="track" /><span className="t-2">Registrar con otra fecha</span>
                </label>
                {f.conFecha && <input type="datetime-local" className="input" value={f.fecha} onChange={(e) => set('fecha', e.target.value)} />}
              </div>

              <div className="summary">
                <div className="s-row"><span>Entran al stock</span><b>+{bidones(cant)}</b></div>
                {montoPago > 0 && <div className="s-row"><span>Pagas ahora</span><b>{soles(montoPago)}</b></div>}
                {total - montoPago > 0.009 && <div className="s-row"><span>Quedará debiendo</span><b className="t-warn">{soles(total - montoPago)}</b></div>}
                <div className="s-row big"><span>Total del pedido</span><b>{soles(total)}</b></div>
              </div>

              <button className="key primary lg block" disabled={guardando}>{guardando ? <Loader2 className="spin" /> : <CheckCircle2 />}Registrar pedido</button>
            </div>
          </form>
        ) : (
          <div className="card"><Empty icono={FileText} titulo="Modo solo lectura" texto="Tu rol no permite registrar pedidos." /></div>
        )}

        <div className="card">
          <div className="card-h">
            <div className="seg">
              {[['todos', 'Todos'], ['pendientes', 'Por pagar'], ['pagados', 'Pagados']].map(([k, l]) => <button key={k} className={filtro === k ? 'on' : ''} onClick={() => setFiltro(k)}>{l}</button>)}
            </div>
            <button className="key sm" onClick={() => csvPedidos(pedidos, pagos)}><Download /><span className="hide-m">CSV</span></button>
          </div>
          <div className="filters"><div className="search"><Search /><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar proveedor" /></div>{q && <button className="key ghost sm" onClick={() => setQ('')}><X /></button>}</div>
          <div className="card-b flush">
            {lista.length === 0 ? <Empty icono={Truck} titulo="Sin pedidos" texto="Cuando registres una compra al proveedor, aparecerá aquí con sus pagos." /> : (
              <div className="list">
                {lista.slice(0, limite).map(({ p, e, pg }) => (
                  <div className={`ped ${p.id === ultimoId ? 'new' : ''}`} key={p.id}>
                    <div className="ped-head">
                      <div className={`li-ico ${e.estado === 'pagado' ? 'ok' : e.estado === 'parcial' ? 'accent' : 'warn'}`}><Truck /></div>
                      <div className="li-main">
                        <div className="li-title">
                          <span>{p.proveedor}</span>
                          <span className={`badge ${e.estado === 'pagado' ? 'ok' : e.estado === 'parcial' ? 'accent' : 'warn'}`}>{e.estado === 'pagado' ? 'pagado' : e.estado === 'parcial' ? 'parcial' : 'por pagar'}</span>
                        </div>
                        <div className="li-sub">
                          <span>{fechaHora(p.fecha)}</span>
                          {e.estado !== 'pagado' && <><span>·</span><span className={diasDesde(p.fecha) >= 7 ? 't-bad' : ''}>{haceDias(p.fecha)}</span></>}
                          {p.telefono && <><span>·</span><span className="row" style={{ gap: 4 }}><Phone size={11} />{p.telefono}</span></>}
                        </div>
                      </div>
                      {puedeEscribir && <button className="key sm" onClick={() => setEditPed({ p, pg })}><Pencil /><span className="hide-m">Editar</span></button>}
                    </div>

                    <div className="ped-nums">
                      <div>Bidones<b>{p.cantidad}{p.devueltos > 0 && <span className="t-3" style={{ fontSize: 11 }}> · {p.devueltos} vac.</span>}</b></div>
                      <div>Total<b>{soles(p.total)}</b></div>
                      <div>{e.estado === 'pagado' ? 'Pagado' : 'Saldo'}<b className={e.estado === 'pagado' ? 't-ok' : 't-warn'}>{soles(e.estado === 'pagado' ? e.pagado : e.saldo)}</b></div>
                    </div>
                    <div className={`bar ${e.estado === 'pagado' ? 'ok' : ''}`}><i style={{ width: `${e.pct * 100}%` }} /></div>

                    {pg.length > 0 && (
                      <div className="pagos">
                        {pg.map((x) => (
                          <div className="pago" key={x.id}>
                            <CheckCircle2 size={14} className="t-ok" />
                            <div className="grow"><b className="mono">{soles(x.monto)}</b> <span className="t-3">· {METODOS[x.metodo]} · {fecha(x.fecha)}</span>{x.notas && <div className="t-3 tiny">{x.notas}</div>}</div>
                            <Receipt ruta={x.comprobante_path} titulo={`Pago a ${p.proveedor} · ${soles(x.monto)}`} />
                            {puedeEscribir && <button className="key ghost icon sm" onClick={() => setEditPago({ x, p, maximo: Number(p.total) - pg.filter((o) => o.id !== x.id).reduce((s, o) => s + Number(o.monto), 0) })} title="Editar pago"><Pencil /></button>}
                          </div>
                        ))}
                      </div>
                    )}
                    {p.notas && <div className="small t-2">{p.notas}</div>}

                    {(e.estado !== 'pagado' || p.telefono) && (
                      <div className="keys">
                        {puedeEscribir && e.estado !== 'pagado' && <button className="key sm primary" onClick={() => setPagar({ p, saldo: e.saldo })}><Wallet />Registrar pago</button>}
                        {p.telefono && (
                          <a className="key sm" target="_blank" rel="noreferrer"
                            href={`https://wa.me/${telWa(p.telefono)}?text=${encodeURIComponent(e.estado === 'pagado' ? `Hola ${p.proveedor}, ` : `Hola ${p.proveedor}, te escribo por el pedido del ${fecha(p.fecha)} (${p.cantidad} bidones). Saldo pendiente: ${soles(e.saldo)}.`)}`}>
                            <MessageCircle />WhatsApp
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {lista.length > limite && <button className="key ghost block" style={{ borderRadius: 0 }} onClick={() => setLimite((l) => l + 30)}>Ver más</button>}
              </div>
            )}
          </div>
        </div>
      </div>

      {pagar && <PagoModal pedido={pagar.p} saldo={pagar.saldo} onClose={() => setPagar(null)} />}
      {editPed && <EditarPedidoModal pedido={editPed.p} pagos={editPed.pg} onClose={() => setEditPed(null)} />}
      {editPago && <EditarPagoModal pago={editPago.x} pedido={editPago.p} maximo={editPago.maximo} onClose={() => setEditPago(null)} />}
    </div>
  )
}
