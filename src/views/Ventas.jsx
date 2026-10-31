import { useMemo, useState } from 'react'
import { ShoppingBag, Home, Banknote, Smartphone, Clock, Search, Download, CheckCircle2, Loader2, X, FileText, AlertTriangle, Pencil, CalendarDays, StickyNote, History } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useUI } from '../context/UIContext'
import { soles, hora, cuando, aInputLocal, agruparPorDia, etiquetaDia, diasDesde, haceDias, bidones, METODOS } from '../lib/format'
import { csvVentas } from '../lib/csv'
import Autocomplete from '../components/Autocomplete'
import Stepper from '../components/Stepper'
import KeyOptions from '../components/KeyOptions'
import ImagePicker from '../components/ImagePicker'
import Receipt from '../components/Receipt'
import Empty from '../components/Empty'
import CobroModal from '../components/CobroModal'
import EditarVentaModal from '../components/EditarVentaModal'

const METODOS_VENTA = [
  { v: 'efectivo', label: 'Efectivo', icon: Banknote },
  { v: 'yape', label: 'Yape', icon: Smartphone },
  { v: 'plin', label: 'Plin', icon: Smartphone },
  { v: 'fiado', label: 'Fiado', icon: Clock }
]

const FILTROS = [
  { v: 'todos', label: 'Todas' },
  { v: 'pagado', label: 'Pagadas' },
  { v: 'pendiente', label: 'Me deben' },
  { v: 'cobrados', label: 'Fiados ya pagados' },
  { v: 'personal', label: 'Uso propio' }
]

const paramHash = (k) => new URLSearchParams(window.location.hash.split('?')[1] || '').get(k)

export default function Ventas() {
  const { puedeEscribir } = useAuth()
  const { ventas, config, stock, clientes, insertar, subirComprobante, ultimoId } = useData()
  const { toast, confirm } = useUI()

  // ── Formulario ──
  const nuevo = () => ({ tipo: 'venta', cliente: '', cantidad: 1, precio: String(config?.precio_venta ?? 5), costo: String(config?.costo_compra ?? 2.7), metodo: 'efectivo', notas: '', fecha: aInputLocal(), conFecha: false })
  const [f, setF] = useState(nuevo)
  const [file, setFile] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))

  const personal = f.tipo === 'personal'
  const cant = Number(f.cantidad) || 0
  const precio = Number(f.precio) || 0
  const costo = Number(f.costo) || 0
  const total = personal ? 0 : +(cant * precio).toFixed(2)
  const ganancia = personal ? 0 : +(cant * (precio - costo)).toFixed(2)

  const guardar = async (e) => {
    e.preventDefault()
    if (!personal && !f.cliente.trim()) return toast('Escribe el nombre del cliente', 'warn')
    if (cant < 1) return toast('La cantidad debe ser al menos 1', 'warn')
    if (!personal && precio <= 0) return toast('El precio debe ser mayor a 0', 'warn')
    if (cant > stock && !(await confirm({ titulo: 'No alcanza el stock', mensaje: `Solo hay ${bidones(stock)} registrados y vas a descontar ${cant}. ¿Registrar de todas formas?`, textoOk: 'Registrar' }))) return
    setGuardando(true)
    try {
      const ruta = !personal && ['yape', 'plin'].includes(f.metodo) && file ? await subirComprobante(file) : null
      await insertar('ventas', {
        tipo: f.tipo,
        cliente: personal ? 'Uso propio' : f.cliente.trim(),
        cantidad: cant,
        precio_unit: personal ? 0 : precio,
        costo_unit: costo,
        total, ganancia,
        metodo: personal ? 'personal' : f.metodo,
        estado: personal ? 'personal' : f.metodo === 'fiado' ? 'pendiente' : 'pagado',
        fecha: f.conFecha ? new Date(f.fecha).toISOString() : new Date().toISOString(),
        notas: f.notas.trim() || null,
        comprobante_path: ruta
      })
      toast(personal ? `${bidones(cant)} de uso propio registrado${cant > 1 ? 's' : ''}` : f.metodo === 'fiado' ? `Fiado registrado: ${f.cliente.trim()} · ${soles(total)}` : `Venta registrada · ${soles(total)}`)
      setF((x) => ({ ...nuevo(), tipo: x.tipo, metodo: x.metodo === 'fiado' ? 'efectivo' : x.metodo }))
      setFile(null)
    } catch (err) {
      toast(err.message, 'bad')
    } finally {
      setGuardando(false)
    }
  }

  // ── Historial ──
  const [q, setQ] = useState('')
  const [estado, setEstado] = useState(() => paramHash('f') || 'todos')
  const [verFechas, setVerFechas] = useState(false)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [limite, setLimite] = useState(60)
  const [cobrar, setCobrar] = useState(null)
  const [editar, setEditar] = useState(null)

  const deben = useMemo(() => ventas.filter((v) => v.estado === 'pendiente').length, [ventas])

  const filtradas = useMemo(() => {
    const qq = q.trim().toLowerCase()
    const d = desde ? new Date(desde + 'T00:00') : null
    const h = hasta ? new Date(hasta + 'T23:59:59') : null
    return ventas.filter((v) => {
      if (qq && !`${v.cliente} ${v.notas || ''}`.toLowerCase().includes(qq)) return false
      if (estado === 'pendiente' && v.estado !== 'pendiente') return false
      if (estado === 'cobrados' && !(v.metodo === 'fiado' && v.estado === 'pagado')) return false
      if (estado === 'pagado' && !(v.tipo === 'venta' && v.estado === 'pagado')) return false
      if (estado === 'personal' && v.tipo !== 'personal') return false
      const t = new Date(v.fecha)
      if (d && t < d) return false
      if (h && t > h) return false
      return true
    })
  }, [ventas, q, estado, desde, hasta])

  const grupos = useMemo(() => agruparPorDia(filtradas.slice(0, limite)), [filtradas, limite])
  const vendidasFiltro = filtradas.filter((v) => v.tipo === 'venta')
  const totalFiltrado = vendidasFiltro.reduce((s, v) => s + Number(v.total), 0)
  const bidFiltro = filtradas.reduce((s, v) => s + v.cantidad, 0)
  const hayFiltros = q || estado !== 'todos' || desde || hasta
  const limpiar = () => { setQ(''); setEstado('todos'); setDesde(''); setHasta(''); setVerFechas(false) }

  return (
    <div className="view stack">
      <div className="topbar">
        <div><h1>Ventas</h1><div className="sub">{ventas.filter((v) => v.tipo === 'venta').length} ventas registradas · quedan {bidones(stock)}</div></div>
      </div>

      <div className="grid g-form">
        {puedeEscribir ? (
          <form className="card" onSubmit={guardar}>
            <div className="card-h">
              <div className="seg fill" style={{ width: '100%' }}>
                <button type="button" className={!personal ? 'on' : ''} onClick={() => set('tipo', 'venta')}><ShoppingBag />Venta</button>
                <button type="button" className={personal ? 'on' : ''} onClick={() => set('tipo', 'personal')}><Home />Uso propio</button>
              </div>
            </div>
            <div className="card-b form">
              {!personal && (
                <div className="field">
                  <label>Cliente</label>
                  <Autocomplete value={f.cliente} onChange={(v) => set('cliente', v)} opciones={clientes} placeholder="Nombre del cliente" />
                </div>
              )}
              <div className="field">
                <label>Cantidad de bidones <span className="t-3">quedan {stock}</span></label>
                <Stepper value={f.cantidad} onChange={(v) => set('cantidad', v)} />
              </div>
              {!personal && (
                <>
                  <div className="f-row keep">
                    <div className="field"><label>Precio c/u</label><div className="input-wrap"><span className="prefix">S/</span><input className="input mono" inputMode="decimal" value={f.precio} onChange={(e) => set('precio', e.target.value.replace(',', '.'))} /></div></div>
                    <div className="field"><label>Costo c/u</label><div className="input-wrap"><span className="prefix">S/</span><input className="input mono" inputMode="decimal" value={f.costo} onChange={(e) => set('costo', e.target.value.replace(',', '.'))} /></div></div>
                  </div>
                  <div className="field"><label>¿Cómo pagó?</label><KeyOptions opciones={METODOS_VENTA} value={f.metodo} onChange={(v) => set('metodo', v)} size="sm" /></div>
                  {f.metodo === 'fiado' && <p className="hint">Fiado = se lleva el bidón ahora y paga después. Aparecerá en "Me deben".</p>}
                  {['yape', 'plin'].includes(f.metodo) && <ImagePicker file={file} onChange={setFile} label="Adjuntar captura (opcional)" />}
                </>
              )}
              <div className="field">
                <label>Notas <span className="t-3">opcional</span></label>
                <input className="input" value={f.notas} onChange={(e) => set('notas', e.target.value)} placeholder={personal ? 'Ej. para la casa' : 'Ej. dejar en portería'} />
              </div>
              <div className="field">
                <label className="switch" style={{ justifyContent: 'flex-start' }}>
                  <input type="checkbox" checked={f.conFecha} onChange={(e) => set('conFecha', e.target.checked)} />
                  <span className="track" /><span className="t-2">Fue otro día u otra hora</span>
                </label>
                {f.conFecha && <input type="datetime-local" className="input" value={f.fecha} onChange={(e) => set('fecha', e.target.value)} />}
              </div>

              <div className="summary">
                {personal ? (
                  <div className="s-row big"><span>Se descuentan del stock</span><b>{bidones(cant)}</b></div>
                ) : (
                  <>
                    <div className="s-row"><span>Ganancia</span><b className="t-ok">{soles(ganancia)}</b></div>
                    <div className="s-row big"><span>{f.metodo === 'fiado' ? 'Te va a deber' : 'Total a cobrar'}</span><b>{soles(total)}</b></div>
                  </>
                )}
                {cant > stock && <div className="s-row" style={{ color: 'var(--warn)' }}><span className="row" style={{ gap: 6 }}><AlertTriangle size={14} />Solo quedan {bidones(stock)}</span></div>}
              </div>

              <button className="key primary lg block" disabled={guardando}>
                {guardando ? <Loader2 className="spin" /> : <CheckCircle2 />}
                {personal ? 'Registrar uso propio' : f.metodo === 'fiado' ? 'Registrar fiado' : 'Registrar venta'}
              </button>
            </div>
          </form>
        ) : (
          <div className="card"><Empty icono={FileText} titulo="Modo solo lectura" texto="Tu rol no permite registrar ventas." /></div>
        )}

        {/* ══════════ HISTORIAL ══════════ */}
        <div className="card">
          <div className="card-h">
            <h3><History />Historial de ventas</h3>
            <button className="key sm" onClick={() => csvVentas(filtradas)} title="Descargar en Excel (CSV)"><Download /><span className="hide-m">Descargar</span></button>
          </div>

          <div className="hist-tools">
            <div className="chips">
              {FILTROS.map((x) => (
                <button key={x.v} className={`chip ${estado === x.v ? 'on' : ''} ${x.v === 'pendiente' && deben ? 'warn' : ''}`} onClick={() => setEstado(x.v)}>
                  {x.label}{x.v === 'pendiente' && deben > 0 && <em className="chip-n">{deben}</em>}
                </button>
              ))}
            </div>
            <div className="row" style={{ gap: 8 }}>
              <div className="search"><Search /><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre…" /></div>
              <button className={`key sm ${verFechas || desde || hasta ? 'on' : ''}`} onClick={() => setVerFechas(!verFechas)}><CalendarDays /><span className="hide-m">Fechas</span></button>
            </div>
            {verFechas && (
              <div className="f-row keep">
                <div className="field"><label>Desde</label><input type="date" className="input" value={desde} onChange={(e) => setDesde(e.target.value)} /></div>
                <div className="field"><label>Hasta</label><input type="date" className="input" value={hasta} onChange={(e) => setHasta(e.target.value)} /></div>
              </div>
            )}
            {hayFiltros && (
              <div className="hist-resumen">
                <span>{filtradas.length} resultado{filtradas.length === 1 ? '' : 's'} · {bidones(bidFiltro)} · <b>{soles(totalFiltrado)}</b></span>
                <button className="link" onClick={limpiar}>Ver todo</button>
              </div>
            )}
          </div>

          <div className="card-b flush">
            {grupos.length === 0 ? (
              <Empty icono={ShoppingBag} titulo={hayFiltros ? 'No hay nada con esos filtros' : 'Todavía no hay ventas'} texto={hayFiltros ? 'Toca "Ver todo" para quitar los filtros.' : 'Cuando registres una venta, aparecerá aquí.'} />
            ) : (
              <div className="list">
                {grupos.map((g) => {
                  const tot = g.items.filter((v) => v.tipo === 'venta').reduce((s, v) => s + Number(v.total), 0)
                  const bid = g.items.reduce((s, v) => s + v.cantidad, 0)
                  return (
                    <div key={g.clave}>
                      <div className="day-h"><span>{etiquetaDia(g.fecha)}</span><span>{bidones(bid)} · {soles(tot)}</span></div>
                      {g.items.map((v) => (
                        <FilaVenta key={v.id} v={v} nuevo={v.id === ultimoId} puede={puedeEscribir} onCobrar={() => setCobrar(v)} onEditar={() => setEditar(v)} />
                      ))}
                    </div>
                  )
                })}
                {filtradas.length > limite && <button className="key ghost block" style={{ borderRadius: 0 }} onClick={() => setLimite((l) => l + 60)}>Ver más ({filtradas.length - limite})</button>}
              </div>
            )}
          </div>
        </div>
      </div>

      {cobrar && <CobroModal venta={cobrar} onClose={() => setCobrar(null)} />}
      {editar && <EditarVentaModal venta={editar} onClose={() => setEditar(null)} />}
    </div>
  )
}

/** Una fila del historial, escrita en palabras simples */
function FilaVenta({ v, nuevo, puede, onCobrar, onEditar }) {
  const personal = v.tipo === 'personal'
  const fiado = v.metodo === 'fiado'
  const debe = v.estado === 'pendiente'
  const dias = diasDesde(v.fecha)
  const urgente = debe && dias >= 7

  const I = personal ? Home : fiado ? Clock : v.metodo === 'efectivo' ? Banknote : Smartphone
  const tono = personal ? '' : debe ? (urgente ? 'bad' : 'warn') : 'ok'

  // Estado en palabras
  let estado
  if (personal) estado = <span className="badge">Para la casa</span>
  else if (debe) estado = <span className={`badge ${urgente ? 'bad' : 'warn'}`}>{dias === 0 ? 'Te debe' : `Te debe · ${haceDias(v.fecha)}`}</span>
  else if (fiado) estado = <span className="badge ok">Fiado · ya pagó</span>
  else estado = <span className="badge ok">Pagado</span>

  const como = personal ? 'Uso propio' : fiado ? 'Fiado' : `Pagó con ${METODOS[v.metodo]}`

  return (
    <div className={`vrow ${nuevo ? 'new' : ''} ${debe ? 'debe' : ''}`}>
      <div className={`li-ico ${tono}`}><I /></div>
      <div className="vrow-main">
        <div className="vrow-top">
          <span className="vrow-name">{personal ? 'Uso propio' : v.cliente}</span>
          <span className={`vrow-amt ${personal ? 't-3' : debe ? 't-warn' : ''}`}>{personal ? `−${v.cantidad}` : soles(v.total)}</span>
        </div>
        <div className="vrow-info">
          <span>{bidones(v.cantidad)}</span>
          <span className="sep">·</span><span>{como}</span>
          <span className="sep">·</span><span>{hora(v.fecha)}</span>
        </div>
        {v.notas && <div className="vrow-note"><StickyNote size={13} />{v.notas}</div>}

        {fiado && (
          <div className={`fiado-box ${debe ? 'pend' : 'ok'}`}>
            <div className="tl">
              <div className="tl-step ok"><span className="tl-dot" /><div><b>Se fió</b> <span className="mono">{cuando(v.fecha)}</span></div></div>
              {debe ? (
                <div className="tl-step warn"><span className="tl-dot" /><div><b>Todavía no paga</b> {dias > 0 && <span className="mono">{haceDias(v.fecha)}</span>}</div></div>
              ) : (
                <div className="tl-step accent"><span className="tl-dot" /><div><b>Pagó con {METODOS[v.metodo_cobro] || 'Efectivo'}</b> <span className="mono">{v.fecha_cobro ? cuando(v.fecha_cobro) : ''}</span>{v.notas_cobro && <div className="t-3">{v.notas_cobro}</div>}</div></div>
              )}
            </div>
          </div>
        )}

        <div className="vrow-foot">
          {estado}
          <div className="vrow-actions">
            <Receipt ruta={v.comprobante_path} titulo={`Captura · ${v.cliente}`} />
            {puede && debe && <button className="key sm primary" onClick={onCobrar}><CheckCircle2 />Cobrar</button>}
            {puede && <button className="key sm" onClick={onEditar}><Pencil />Editar</button>}
          </div>
        </div>
      </div>
    </div>
  )
}
