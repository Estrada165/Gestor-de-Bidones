import { useMemo, useState } from 'react'
import { Plus, Truck, Database, Wallet, Clock, HandCoins, ShoppingBag, Home, ArrowDownLeft, ArrowUpRight, AlertTriangle, AlertOctagon, Receipt as RIco, Activity, PackagePlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { calcularCaja, estadoPedido, nivelStock, estadisticas, serie } from '../lib/calc'
import { soles, diaLargo, haceTiempo, diasDesde, inicioDia, finDia, fecha, METODOS } from '../lib/format'
import Sparkline from '../components/Sparkline'
import Empty from '../components/Empty'
import CobroModal from '../components/CobroModal'
import PagoModal from '../components/PagoModal'

export default function Inicio({ ir }) {
  const { perfil, puedeEscribir } = useAuth()
  const data = useData()
  const { ventas, pedidos, pagos, movimientos, ajustes, stock, config } = data
  const [dias, setDias] = useState(7)
  const [cobrar, setCobrar] = useState(null)
  const [pagar, setPagar] = useState(null)

  const nivel = nivelStock(stock, config)
  const caja = useMemo(() => calcularCaja({ ventas, pagos, movimientos }), [ventas, pagos, movimientos])
  const fiados = useMemo(() => ventas.filter((v) => v.tipo === 'venta' && v.estado === 'pendiente').sort((a, b) => new Date(a.fecha) - new Date(b.fecha)), [ventas])
  const deudas = useMemo(() => pedidos.map((p) => ({ p, e: estadoPedido(p, pagos) })).filter((x) => x.e.estado !== 'pagado').sort((a, b) => new Date(a.p.fecha) - new Date(b.p.fecha)), [pedidos, pagos])
  const porCobrar = fiados.reduce((s, v) => s + Number(v.total), 0)
  const porPagar = deudas.reduce((s, x) => s + x.e.saldo, 0)

  const hoy = useMemo(() => estadisticas(data, inicioDia(), finDia()), [data])
  const serie14 = useMemo(() => serie(ventas, inicioDia(new Date(Date.now() - 13 * 864e5)), finDia()), [ventas])
  const periodo = useMemo(() => {
    const ini = inicioDia(new Date(Date.now() - (dias - 1) * 864e5)), fin = finDia()
    return { ...estadisticas(data, ini, fin), ini, fin, s: serie(ventas, ini, fin) }
  }, [data, dias, ventas])

  const actividad = useMemo(() => {
    const items = [
      ...ventas.slice(0, 12).map((v) => ({ k: 'v' + v.id, fecha: v.created_at || v.fecha, tipo: v.tipo === 'personal' ? 'personal' : 'venta', d: v })),
      ...pedidos.slice(0, 8).map((p) => ({ k: 'p' + p.id, fecha: p.created_at || p.fecha, tipo: 'pedido', d: p })),
      ...pagos.slice(0, 8).map((p) => ({ k: 'g' + p.id, fecha: p.created_at || p.fecha, tipo: 'pago', d: p })),
      ...movimientos.slice(0, 6).map((m) => ({ k: 'm' + m.id, fecha: m.created_at || m.fecha, tipo: 'mov', d: m })),
      ...ajustes.slice(0, 4).map((a) => ({ k: 'a' + a.id, fecha: a.created_at || a.fecha, tipo: 'ajuste', d: a }))
    ]
    return items.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 8)
  }, [ventas, pedidos, pagos, movimientos, ajustes])

  const nombre = (perfil?.nombre || perfil?.usuario || '').split(' ')[0]
  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="view stack">
      <div className="topbar">
        <div>
          <h1>{saludo}, {nombre}</h1>
          <div className="sub">{diaLargo()}</div>
        </div>
        {puedeEscribir && (
          <div className="topbar-actions">
            <button className="key" onClick={() => ir('pedidos')}><Truck />Nuevo pedido</button>
            <button className="key primary" onClick={() => ir('ventas')}><Plus />Nueva venta</button>
          </div>
        )}
      </div>

      {ventas.length + pedidos.length + ajustes.length === 0 ? (
        <div className="alert accent">
          <Database className="a-ico" />
          <div className="grow"><b>Bienvenido a {config?.nombre_app || 'Gestor Agua'}</b><small>Empieza registrando cuántos bidones llenos tienes ahora (stock inicial).</small></div>
          {puedeEscribir && <button className="key sm primary" onClick={() => ir('inventario')}>Cargar stock</button>}
        </div>
      ) : nivel !== 'ok' && (
        <div className={`alert ${nivel === 'bajo' ? 'warn' : 'bad'}`}>
          {nivel === 'bajo' ? <AlertTriangle className="a-ico" /> : <AlertOctagon className="a-ico" />}
          <div className="grow">
            <b>{nivel === 'vacio' ? 'Sin stock' : nivel === 'critico' ? `Stock crítico: ${stock} bidón${stock === 1 ? '' : 'es'}` : `Stock bajo: quedan ${stock} bidones`}</b>
            <small>{nivel === 'bajo' ? 'Considera hacer un pedido pronto.' : 'Haz un pedido al proveedor cuanto antes.'}</small>
          </div>
          {puedeEscribir && <button className="key sm" onClick={() => ir('pedidos')}><PackagePlus />Pedir</button>}
        </div>
      )}

      <div className="grid g-4 stagger">
        <button className="stat" onClick={() => ir('inventario')} style={{ textAlign: 'left' }}>
          <div className="stat-top"><span className="stat-label">Stock</span><span className="stat-ico"><Database /></span></div>
          <div className={`stat-val ${nivel === 'ok' ? '' : nivel === 'bajo' ? 't-warn' : 't-bad'}`}>{stock}</div>
          <div className="stat-foot">bidones disponibles</div>
        </button>
        <div className="stat accent">
          <div className="stat-top"><span className="stat-label">Vendido hoy</span><span className="stat-ico"><ShoppingBag /></span></div>
          <div className="stat-val">{soles(hoy.vendido)}</div>
          <div className="stat-foot">{hoy.bidones} bid. · {hoy.nVentas} venta{hoy.nVentas === 1 ? '' : 's'}</div>
          <Sparkline datos={serie14.map((d) => d.ventas)} />
        </div>
        <button className="stat" onClick={() => ir('caja')} style={{ textAlign: 'left' }}>
          <div className="stat-top"><span className="stat-label">En caja</span><span className="stat-ico"><Wallet /></span></div>
          <div className={`stat-val ${caja.saldo < 0 ? 't-bad' : ''}`}>{soles(caja.saldo)}</div>
          <div className="stat-foot">efectivo {soles(caja.porMetodo.efectivo)}</div>
        </button>
        <div className="stat">
          <div className="stat-top"><span className="stat-label">Por cobrar</span><span className="stat-ico"><HandCoins /></span></div>
          <div className={`stat-val ${porCobrar > 0 ? 't-warn' : ''}`}>{soles(porCobrar)}</div>
          <div className="stat-foot">{fiados.length} fiado{fiados.length === 1 ? '' : 's'} · debes {soles(porPagar)}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <h3><Activity />Resumen rápido</h3>
          <div className="seg">
            {[7, 15, 30].map((d) => <button key={d} className={dias === d ? 'on' : ''} onClick={() => setDias(d)}>{d}d</button>)}
          </div>
        </div>
        <div className="card-b stack" style={{ gap: 12 }}>
          <div className="mini">
            <div><small>Ventas</small><b>{periodo.nVentas}</b></div>
            <div><small>Ingresos</small><b className="t-accent">{soles(periodo.vendido)}</b></div>
            <div><small>Ganancia</small><b className="t-ok">{soles(periodo.ganancia)}</b></div>
            <div><small>Bidones</small><b>{periodo.bidones}</b></div>
          </div>
          <div style={{ height: 46, position: 'relative' }}><Sparkline datos={periodo.s.map((d) => d.ventas)} className="spark-full" /></div>
          <div className="row between tiny t-3 mono"><span>{fecha(periodo.ini)} — {fecha(periodo.fin)}</span><button className="key ghost sm" onClick={() => ir('reportes')}>Ver reporte</button></div>
        </div>
      </div>

      <div className="grid g-main">
        <div className="card">
          <div className="card-h"><h3><Clock />Actividad reciente</h3></div>
          <div className="card-b flush">
            {actividad.length === 0 ? (
              <Empty icono={ShoppingBag} titulo="Aún no hay movimientos" texto="Registra tu stock inicial en Inventario y tu primera venta.">
                {puedeEscribir && <button className="key sm primary" onClick={() => ir('inventario')}>Cargar stock inicial</button>}
              </Empty>
            ) : (
              <div className="list">{actividad.map((a) => <ItemActividad key={a.k} a={a} pedidos={pedidos} />)}</div>
            )}
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-h"><h3><HandCoins />Fiados por cobrar</h3>{fiados.length > 0 && <span className="badge warn">{soles(porCobrar)}</span>}</div>
            <div className="card-b flush">
              {fiados.length === 0 ? <Empty titulo="Nadie te debe" texto="Los fiados pendientes aparecerán aquí." /> : (
                <div className="list">
                  {fiados.slice(0, 6).map((v) => {
                    const d = diasDesde(v.fecha)
                    return (
                      <div className="li" key={v.id}>
                        <div className={`li-ico ${d >= 7 ? 'bad' : 'warn'}`}><Clock /></div>
                        <div className="li-main">
                          <div className="li-title"><span>{v.cliente}</span></div>
                          <div className="li-sub"><span>{v.cantidad} bid.</span>·<span className={d >= 7 ? 't-bad' : ''}>{d === 0 ? 'hoy' : `${d} día${d === 1 ? '' : 's'}`}{d >= 7 ? ' · urgente' : ''}</span></div>
                        </div>
                        <div className="li-end">
                          <span className="li-amt">{soles(v.total)}</span>
                          {puedeEscribir && <button className="key sm" onClick={() => setCobrar(v)}>Cobrar</button>}
                        </div>
                      </div>
                    )
                  })}
                  {fiados.length > 6 && <button className="key ghost sm" style={{ margin: 8 }} onClick={() => ir('ventas', 'f=pendiente')}>Ver los {fiados.length}</button>}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h3><Truck />Por pagar a proveedores</h3>{deudas.length > 0 && <span className="badge">{soles(porPagar)}</span>}</div>
            <div className="card-b flush">
              {deudas.length === 0 ? <Empty titulo="Todo pagado" texto="Los pedidos con saldo pendiente aparecerán aquí." /> : (
                <div className="list">
                  {deudas.slice(0, 5).map(({ p, e }) => (
                    <div className="li" key={p.id} style={{ flexWrap: 'wrap' }}>
                      <div className="li-ico"><Truck /></div>
                      <div className="li-main">
                        <div className="li-title"><span>{p.proveedor}</span>{e.estado === 'parcial' && <span className="badge accent">parcial</span>}</div>
                        <div className="li-sub"><span>{p.cantidad} bid. · {fecha(p.fecha)}</span></div>
                      </div>
                      <div className="li-end">
                        <span className="li-amt">{soles(e.saldo)}</span>
                        {puedeEscribir && <button className="key sm" onClick={() => setPagar({ p, saldo: e.saldo })}>Pagar</button>}
                      </div>
                      <div className="bar" style={{ width: '100%' }}><i style={{ width: `${e.pct * 100}%` }} /></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {cobrar && <CobroModal venta={cobrar} onClose={() => setCobrar(null)} />}
      {pagar && <PagoModal pedido={pagar.p} saldo={pagar.saldo} onClose={() => setPagar(null)} />}
    </div>
  )
}

function ItemActividad({ a, pedidos }) {
  const d = a.d
  let ico = ShoppingBag, cls = 'accent', titulo, sub, monto, signo = ''
  if (a.tipo === 'venta') {
    titulo = d.cliente || 'Venta'; sub = `${d.cantidad} bid. · ${METODOS[d.metodo]}`; monto = d.total; signo = '+'
    if (d.metodo === 'fiado') { cls = d.estado === 'pagado' ? 'ok' : 'warn'; sub += d.estado === 'pagado' ? ' · cobrado' : ' · pendiente' }
  } else if (a.tipo === 'personal') {
    ico = Home; cls = ''; titulo = 'Uso propio'; sub = `${d.cantidad} bid. descontados`
  } else if (a.tipo === 'pedido') {
    ico = Truck; cls = ''; titulo = `Pedido · ${d.proveedor}`; sub = `+${d.cantidad} bidones`; monto = d.total
  } else if (a.tipo === 'pago') {
    const p = pedidos.find((x) => x.id === d.pedido_id)
    ico = ArrowUpRight; cls = ''; titulo = `Pago a ${p?.proveedor || 'proveedor'}`; sub = METODOS[d.metodo]; monto = d.monto; signo = '−'
  } else if (a.tipo === 'mov') {
    const ent = d.tipo === 'ingreso'
    ico = ent ? ArrowDownLeft : ArrowUpRight; cls = ''; titulo = d.descripcion || d.tipo; sub = { gasto: 'Gasto', retiro: 'Retiro', prestamo: 'Préstamo', ingreso: 'Ingreso' }[d.tipo]; monto = d.monto; signo = ent ? '+' : '−'
  } else {
    ico = Database; cls = ''; titulo = d.motivo || 'Ajuste de stock'; sub = `${d.cantidad > 0 ? '+' : ''}${d.cantidad} bidones`
  }
  const I = ico
  return (
    <div className="li">
      <div className={`li-ico ${cls}`}><I /></div>
      <div className="li-main">
        <div className="li-title"><span>{titulo}</span>{d.comprobante_path && <RIco size={13} className="t-3" />}</div>
        <div className="li-sub"><span>{sub}</span>·<span>{haceTiempo(a.fecha)}</span></div>
      </div>
      {monto !== undefined && <div className="li-end"><span className={`li-amt ${signo === '+' ? '' : 't-2'}`}>{signo}{soles(monto)}</span></div>}
    </div>
  )
}
