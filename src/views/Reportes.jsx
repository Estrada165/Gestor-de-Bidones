import { useMemo, useState } from 'react'
import { BarChart3, TrendingUp, TrendingDown, ShoppingBag, HandCoins, Coins, Database, Receipt, Truck, Home, Wallet, Download, Users, CreditCard, CalendarRange } from 'lucide-react'
import { useData } from '../context/DataContext'
import { estadisticas, serie, enRango } from '../lib/calc'
import { soles, METODOS } from '../lib/format'
import { csvVentas } from '../lib/csv'
import PeriodPicker, { periodoInicial, resolverPeriodo } from '../components/PeriodPicker'
import Chart from '../components/Chart'
import Empty from '../components/Empty'

function Delta({ actual, previo }) {
  if (!previo) return <span className="t-3">sin datos previos</span>
  const p = ((actual - previo) / Math.abs(previo)) * 100
  const I = p >= 0 ? TrendingUp : TrendingDown
  return <span className={p >= 0 ? 't-ok' : 't-bad'} style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><I size={12} />{p >= 0 ? '+' : ''}{p.toFixed(0)}% vs anterior</span>
}

export default function Reportes() {
  const data = useData()
  const [periodo, setPeriodo] = useState(periodoInicial)
  const r = resolverPeriodo(periodo)

  const res = useMemo(() => {
    if (!r) return null
    const st = estadisticas(data, r.inicio, r.fin)
    const largo = r.fin - r.inicio
    const pIni = new Date(r.inicio.getTime() - largo - 1), pFin = new Date(r.inicio.getTime() - 1)
    const prev = estadisticas(data, pIni, pFin)
    return { st, prev, serie: serie(data.ventas, r.inicio, r.fin) }
  }, [data, r?.inicio?.getTime(), r?.fin?.getTime()])

  const st = res?.st
  const maxCli = st?.topClientes[0]?.total || 1
  const metodos = st ? Object.entries(st.metodos).sort((a, b) => b[1] - a[1]) : []
  const maxMet = metodos[0]?.[1] || 1

  return (
    <div className="view stack">
      <div className="topbar">
        <div><h1>Reportes</h1><div className="sub">{r ? r.label : 'elige un rango válido'}</div></div>
        {r && <div className="topbar-actions"><button className="key" onClick={() => csvVentas(enRango(data.ventas, r.inicio, r.fin))}><Download />Exportar período</button></div>}
      </div>

      <div className="card">
        <div className="card-h"><h3><CalendarRange />Período</h3>{r && <span className="badge accent">{r.label}</span>}</div>
        <div className="card-b"><PeriodPicker value={periodo} onChange={setPeriodo} /></div>
      </div>

      {!st ? <div className="card"><Empty icono={CalendarRange} titulo="Rango inválido" texto="La fecha de inicio debe ser anterior a la final." /></div> : (
        <>
          <div className="grid g-4 stagger">
            <Stat label="Vendido" icon={ShoppingBag} valor={soles(st.vendido)} foot={<Delta actual={st.vendido} previo={res.prev.vendido} />} accent />
            <Stat label="Ganancia" icon={Coins} valor={soles(st.ganancia)} foot={<Delta actual={st.ganancia} previo={res.prev.ganancia} />} cls="t-ok" />
            <Stat label="Bidones vendidos" icon={Database} valor={st.bidones} foot={`${st.nVentas} ventas · ticket ${soles(st.ticket)}`} />
            <Stat label="Cobrado" icon={HandCoins} valor={soles(st.cobrado)} foot={st.pendiente ? <span className="t-warn">{soles(st.pendiente)} aún fiado</span> : 'todo cobrado'} />
            <Stat label="Compras" icon={Truck} valor={soles(st.compras)} foot={`${st.comprados} bidones recibidos`} />
            <Stat label="Pagado a proveedores" icon={Receipt} valor={soles(st.pagosProv)} foot="pagos hechos en el período" />
            <Stat label="Gastos" icon={Wallet} valor={soles(st.gastos)} foot="gastos del negocio" />
            <Stat label="Uso propio" icon={Home} valor={st.personal} foot="bidones consumidos" />
          </div>

          <div className="card">
            <div className="card-h">
              <h3><BarChart3 />Ventas y ganancia{res.serie[0]?.paso > 1 ? ' por semana' : ' por día'}</h3>
              <div className="legend"><span><i style={{ background: 'var(--surface-3)' }} />Ventas</span><span><i style={{ background: 'var(--accent)' }} />Ganancia</span></div>
            </div>
            <div className="card-b">{st.vendido > 0 ? <Chart datos={res.serie} /> : <Empty icono={BarChart3} titulo="Sin ventas en este período" />}</div>
          </div>

          <div className="grid g-2">
            <div className="card">
              <div className="card-h"><h3><Users />Mejores clientes</h3></div>
              <div className="card-b">
                {st.topClientes.length === 0 ? <p className="t-3 small">Sin ventas.</p> : (
                  <div className="hbar">
                    {st.topClientes.map((c) => (
                      <div className="hbar-row" key={c.nombre}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nombre} <span className="t-3 mono tiny">· {c.bidones} bid.</span></span>
                        <b className="mono">{soles(c.total)}</b>
                        <div className="bar"><i style={{ width: `${(c.total / maxCli) * 100}%` }} /></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="card">
              <div className="card-h"><h3><CreditCard />Por método de pago</h3></div>
              <div className="card-b">
                {metodos.length === 0 ? <p className="t-3 small">Sin ventas.</p> : (
                  <div className="hbar">
                    {metodos.map(([m, v]) => (
                      <div className="hbar-row" key={m}>
                        <span>{METODOS[m] || m} <span className="t-3 mono tiny">· {((v / st.vendido) * 100).toFixed(0)}%</span></span>
                        <b className="mono">{soles(v)}</b>
                        <div className={`bar ${m === 'fiado' ? 'warn' : ''}`}><i style={{ width: `${(v / maxMet) * 100}%` }} /></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ label, icon: I, valor, foot, accent, cls = '' }) {
  return (
    <div className={`stat ${accent ? 'accent' : ''}`}>
      <div className="stat-top"><span className="stat-label">{label}</span><span className="stat-ico"><I /></span></div>
      <div className={`stat-val ${cls}`}>{valor}</div>
      <div className="stat-foot">{foot}</div>
    </div>
  )
}
