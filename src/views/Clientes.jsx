import { useMemo, useState } from 'react'
import { Users, Search, ChevronRight, Clock, Banknote, Smartphone, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { soles, fecha, haceTiempo, iniciales, fechaHora, METODOS, diasDesde } from '../lib/format'
import Empty from '../components/Empty'
import Modal from '../components/Modal'
import CobroModal from '../components/CobroModal'

export default function Clientes() {
  const { puedeEscribir } = useAuth()
  const { ventas } = useData()
  const [q, setQ] = useState('')
  const [orden, setOrden] = useState('total')
  const [sel, setSel] = useState(null)
  const [cobrar, setCobrar] = useState(null)

  const clientes = useMemo(() => {
    const m = new Map()
    for (const v of ventas) {
      if (v.tipo !== 'venta') continue
      const k = (v.cliente || 'Sin nombre').trim().toLowerCase()
      const c = m.get(k) || { k, nombre: (v.cliente || 'Sin nombre').trim(), compras: 0, bidones: 0, total: 0, deuda: 0, fiados: 0, ultima: v.fecha, ventas: [] }
      c.compras++; c.bidones += v.cantidad; c.total += Number(v.total); c.ventas.push(v)
      if (v.estado === 'pendiente') { c.deuda += Number(v.total); c.fiados++ }
      if (new Date(v.fecha) > new Date(c.ultima)) c.ultima = v.fecha
      m.set(k, c)
    }
    return [...m.values()]
  }, [ventas])

  const lista = useMemo(() => {
    const qq = q.trim().toLowerCase()
    const l = clientes.filter((c) => !qq || c.k.includes(qq))
    const f = { total: (a, b) => b.total - a.total, deuda: (a, b) => b.deuda - a.deuda, reciente: (a, b) => new Date(b.ultima) - new Date(a.ultima), nombre: (a, b) => a.nombre.localeCompare(b.nombre) }[orden]
    return l.sort(f)
  }, [clientes, q, orden])

  const actual = sel ? clientes.find((c) => c.k === sel) : null
  const deudaTotal = clientes.reduce((s, c) => s + c.deuda, 0)

  return (
    <div className="view stack">
      <div className="topbar"><div><h1>Clientes</h1><div className="sub">{clientes.length} clientes · te deben {soles(deudaTotal)}</div></div></div>
      <div className="card">
        <div className="filters">
          <div className="search"><Search /><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente" /></div>
          <div className="seg">
            {[['total', 'Más compran'], ['deuda', 'Deben'], ['reciente', 'Recientes'], ['nombre', 'A–Z']].map(([k, l]) => <button key={k} className={orden === k ? 'on' : ''} onClick={() => setOrden(k)}>{l}</button>)}
          </div>
        </div>
        <div className="card-b flush">
          {lista.length === 0 ? <Empty icono={Users} titulo="Sin clientes" texto="Los clientes se crean solos al registrar ventas." /> : (
            <div className="list">
              {lista.map((c) => (
                <button className="li" key={c.k} onClick={() => setSel(c.k)} style={{ textAlign: 'left', width: '100%' }}>
                  <div className="avatar" style={{ width: 36, height: 36, borderRadius: 10 }}>{iniciales(c.nombre)}</div>
                  <div className="li-main">
                    <div className="li-title"><span>{c.nombre}</span>{c.deuda > 0 && <span className={`badge ${c.ventas.some((v) => v.estado === 'pendiente' && diasDesde(v.fecha) >= 7) ? 'bad' : 'warn'}`}>debe {soles(c.deuda)}</span>}</div>
                    <div className="li-sub"><span>{c.compras} compra{c.compras === 1 ? '' : 's'}</span>·<span>{c.bidones} bid.</span>·<span>{haceTiempo(c.ultima)}</span></div>
                  </div>
                  <div className="li-end"><span className="li-amt">{soles(c.total)}</span><ChevronRight size={16} className="t-3" /></div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {actual && (
        <Modal titulo={actual.nombre} onClose={() => setSel(null)} wide sinPadding>
          <div className="card-b" style={{ borderBottom: '1px solid var(--line)' }}>
            <div className="mini">
              <div><small>Compras</small><b>{actual.compras}</b></div>
              <div><small>Bidones</small><b>{actual.bidones}</b></div>
              <div><small>Total</small><b className="t-accent">{soles(actual.total)}</b></div>
              <div><small>Debe</small><b className={actual.deuda ? 't-warn' : ''}>{soles(actual.deuda)}</b></div>
            </div>
          </div>
          <div className="list">
            {actual.ventas.map((v) => {
              const I = v.metodo === 'fiado' ? Clock : v.metodo === 'efectivo' ? Banknote : Smartphone
              return (
                <div className="li" key={v.id}>
                  <div className={`li-ico ${v.estado === 'pendiente' ? 'warn' : v.metodo === 'fiado' ? 'ok' : ''}`}><I /></div>
                  <div className="li-main">
                    <div className="li-title"><span>{v.cantidad} bid. · {METODOS[v.metodo]}</span>{v.metodo === 'fiado' && <span className={`badge ${v.estado === 'pendiente' ? 'warn' : 'ok'}`}>{v.estado === 'pendiente' ? 'pendiente' : `cobrado ${v.fecha_cobro ? fecha(v.fecha_cobro) : ''}`}</span>}</div>
                    <div className="li-sub">{fechaHora(v.fecha)}{v.notas ? ` · ${v.notas}` : ''}</div>
                  </div>
                  <div className="li-end">
                    <span className="li-amt">{soles(v.total)}</span>
                    {puedeEscribir && v.estado === 'pendiente' && <button className="key sm" onClick={() => setCobrar(v)}><CheckCircle2 />Cobrar</button>}
                  </div>
                </div>
              )
            })}
          </div>
        </Modal>
      )}
      {cobrar && <CobroModal venta={cobrar} onClose={() => setCobrar(null)} />}
    </div>
  )
}
