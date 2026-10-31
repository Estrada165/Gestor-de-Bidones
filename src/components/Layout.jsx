import { useMemo, useState } from 'react'
import { LayoutGrid, ShoppingBag, Truck, Wallet, Database, Users, BarChart3, Settings, Moon, Sun, LogOut, MoreHorizontal, Download } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useUI } from '../context/UIContext'
import { estadoPedido, nivelStock } from '../lib/calc'
import { iniciales } from '../lib/format'
import { useInstall } from '../lib/install'
import Logo from './Logo'
import Modal from './Modal'

export const VISTAS = [
  { id: 'inicio', label: 'Inicio', icon: LayoutGrid, grupo: 'Operación' },
  { id: 'ventas', label: 'Ventas', icon: ShoppingBag, grupo: 'Operación' },
  { id: 'pedidos', label: 'Pedidos', icon: Truck, grupo: 'Operación' },
  { id: 'inventario', label: 'Inventario', icon: Database, grupo: 'Operación' },
  { id: 'caja', label: 'Caja', icon: Wallet, grupo: 'Dinero' },
  { id: 'clientes', label: 'Clientes', icon: Users, grupo: 'Dinero' },
  { id: 'reportes', label: 'Reportes', icon: BarChart3, grupo: 'Dinero' },
  { id: 'ajustes', label: 'Ajustes', icon: Settings, grupo: 'Sistema' }
]
const BOTTOM = ['inicio', 'ventas', 'pedidos', 'caja']
const ROLES = { admin: 'Administrador', operador: 'Operador', lector: 'Solo lectura', inactivo: 'Inactivo' }

export default function Layout({ vista, ir, children }) {
  const { perfil, salir } = useAuth()
  const { ventas, pedidos, pagos, stock, config } = useData()
  const { tema, toggleTema, confirm } = useUI()
  const { puedeInstalar, instalar } = useInstall()
  const [mas, setMas] = useState(false)

  const badges = useMemo(() => {
    const fiados = ventas.filter((v) => v.tipo === 'venta' && v.estado === 'pendiente').length
    const deudas = pedidos.filter((p) => estadoPedido(p, pagos).estado !== 'pagado').length
    const nivel = nivelStock(stock, config)
    return {
      ventas: fiados ? { n: fiados, c: 'warn' } : null,
      pedidos: deudas ? { n: deudas, c: 'warn' } : null,
      inventario: nivel === 'ok' ? null : { n: stock, c: nivel === 'bajo' ? 'warn' : 'bad' }
    }
  }, [ventas, pedidos, pagos, stock, config])

  const nombreApp = config?.nombre_app || 'Gestor Agua'
  const TemaIco = tema === 'dark' ? Sun : Moon
  const salirConf = async () => { if (await confirm({ titulo: 'Cerrar sesión', mensaje: '¿Salir de tu cuenta en este dispositivo?', textoOk: 'Salir' })) salir() }

  const grupos = VISTAS.reduce((g, v) => ((g[v.grupo] = g[v.grupo] || []).push(v), g), {})

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Logo /></div>
          <div style={{ minWidth: 0 }}>
            <div className="brand-name">{nombreApp}</div>
            <div className="brand-sub">control de bidones</div>
          </div>
        </div>
        <nav className="nav">
          {Object.entries(grupos).map(([g, vs]) => (
            <div key={g} style={{ display: 'contents' }}>
              <div className="nav-label">{g}</div>
              {vs.map(({ id, label, icon: I }) => (
                <button key={id} className={`nav-item ${vista === id ? 'active' : ''}`} onClick={() => ir(id)} title={label}>
                  <I /><span>{label}</span>
                  {badges[id] && <em className={`nav-badge ${badges[id].c}`}>{badges[id].n}</em>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="side-foot">
          {puedeInstalar && <button className="key sm block" onClick={instalar} title="Instalar app"><Download /><span>Instalar app</span></button>}
          <div className="row" style={{ gap: 6 }}>
            <div className="user-chip grow">
              <div className="avatar">{iniciales(perfil?.nombre || perfil?.usuario)}</div>
              <div style={{ minWidth: 0 }}>
                <div className="u-name">{perfil?.nombre || perfil?.usuario}</div>
                <div className="u-role">{ROLES[perfil?.rol]}</div>
              </div>
            </div>
          </div>
          <div className="keys fill">
            <button className="key sm icon" onClick={toggleTema} title="Cambiar tema"><TemaIco /></button>
            <button className="key sm icon" onClick={salirConf} title="Cerrar sesión"><LogOut /></button>
          </div>
        </div>
      </aside>

      <header className="mobile-head">
        <div className="brand">
          <div className="brand-mark"><Logo size={16} /></div>
          <div style={{ minWidth: 0 }}><div className="brand-name">{nombreApp}</div></div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          {puedeInstalar && <button className="key sm icon" onClick={instalar} aria-label="Instalar"><Download /></button>}
          <button className="key sm icon" onClick={toggleTema} aria-label="Tema"><TemaIco /></button>
        </div>
      </header>

      <main className="main">{children}</main>

      <nav className="bottom-nav">
        {BOTTOM.map((id) => {
          const v = VISTAS.find((x) => x.id === id)
          return (
            <button key={id} className={`bn ${vista === id ? 'active' : ''}`} onClick={() => ir(id)}>
              <v.icon /><span>{v.label}</span>
              {badges[id] && <em className={`nav-badge ${badges[id].c}`}>{badges[id].n}</em>}
            </button>
          )
        })}
        <button className={`bn ${!BOTTOM.includes(vista) ? 'active' : ''}`} onClick={() => setMas(true)}>
          <MoreHorizontal /><span>Más</span>
          {badges.inventario && <em className={`nav-badge ${badges.inventario.c}`}>!</em>}
        </button>
      </nav>

      {mas && (
        <Modal sheet onClose={() => setMas(false)}>
          {(cerrar) => (
            <div className="stack" style={{ gap: 12 }}>
              <div className="sheet-grid">
                {VISTAS.filter((v) => !BOTTOM.includes(v.id)).map(({ id, label, icon: I }) => (
                  <button key={id} className={`key ${vista === id ? 'on' : ''}`} onClick={() => cerrar(() => { setMas(false); ir(id) })}>
                    <I />{label}
                    {badges[id] && <em className={`nav-badge ${badges[id].c}`}>{badges[id].n}</em>}
                  </button>
                ))}
              </div>
              <div className="row between" style={{ padding: '4px 2px' }}>
                <div className="user-chip" style={{ padding: 0 }}>
                  <div className="avatar">{iniciales(perfil?.nombre || perfil?.usuario)}</div>
                  <div><div className="u-name">{perfil?.nombre || perfil?.usuario}</div><div className="u-role">{ROLES[perfil?.rol]}</div></div>
                </div>
                <button className="key sm danger" onClick={() => cerrar(() => { setMas(false); salirConf() })}><LogOut />Salir</button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
