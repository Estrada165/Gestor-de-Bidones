import { useEffect, useState, useCallback } from 'react'
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react'
import { supabaseListo } from './lib/supabase'
import { AuthProvider, useAuth } from './context/AuthContext'
import { UIProvider } from './context/UIContext'
import { DataProvider, useData } from './context/DataContext'
import Layout, { VISTAS } from './components/Layout'
import Logo from './components/Logo'
import Login from './views/Login'
import Inicio from './views/Inicio'
import Ventas from './views/Ventas'
import Pedidos from './views/Pedidos'
import Inventario from './views/Inventario'
import Caja from './views/Caja'
import Clientes from './views/Clientes'
import Reportes from './views/Reportes'
import Ajustes from './views/Ajustes'

const PANTALLAS = { inicio: Inicio, ventas: Ventas, pedidos: Pedidos, inventario: Inventario, caja: Caja, clientes: Clientes, reportes: Reportes, ajustes: Ajustes }

const leerHash = () => { const h = window.location.hash.replace('#/', '').split('?')[0]; return VISTAS.some((v) => v.id === h) ? h : 'inicio' }

function Splash({ texto }) {
  return (
    <div className="splash">
      <div style={{ display: 'grid', placeItems: 'center', gap: 14 }}>
        <div className="brand-mark"><Logo size={26} /></div>
        {texto && <span className="t-3 small mono">{texto}</span>}
      </div>
    </div>
  )
}

function Problema({ titulo, texto, children }) {
  return (
    <div className="splash" style={{ padding: 20 }}>
      <div className="card" style={{ maxWidth: 460, width: '100%' }}>
        <div className="card-b stack">
          <div className="row"><div className="li-ico warn"><AlertTriangle /></div><b style={{ fontSize: 16 }}>{titulo}</b></div>
          <p className="t-2" style={{ fontSize: 13.5 }}>{texto}</p>
          {children}
        </div>
      </div>
    </div>
  )
}

function Contenido() {
  const { cargando, error, cargar } = useData()
  const { salir } = useAuth()
  const [vista, setVista] = useState(leerHash)

  useEffect(() => {
    const f = () => setVista(leerHash())
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])

  const ir = useCallback((id, params = '') => {
    window.location.hash = `#/${id}${params ? '?' + params : ''}`
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  if (cargando) return <Splash texto="cargando datos…" />
  if (error) return (
    <Problema titulo="No se pudieron cargar los datos" texto={error}>
      <div className="keys"><button className="key primary" onClick={cargar}><RefreshCw />Reintentar</button><button className="key" onClick={salir}><LogOut />Salir</button></div>
    </Problema>
  )
  const P = PANTALLAS[vista]
  return <Layout vista={vista} ir={ir}><P key={vista} ir={ir} /></Layout>
}

function Puerta() {
  const { session, perfil, errorPerfil, salir } = useAuth()
  if (session === undefined) return <Splash />
  if (!session) return <Login />
  if (errorPerfil) return (
    <Problema titulo="Problema con tu cuenta" texto={errorPerfil}>
      <button className="key" onClick={salir}><LogOut />Cerrar sesión</button>
    </Problema>
  )
  if (!perfil) return <Splash />
  return <DataProvider><Contenido /></DataProvider>
}

export default function App() {
  if (!supabaseListo) return (
    <UIProvider>
      <Problema titulo="Falta configurar Supabase" texto="Crea un archivo .env en la raíz del proyecto (copia .env.example) con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY, y reinicia npm run dev. En Vercel agrégalas en Settings → Environment Variables." />
    </UIProvider>
  )
  return (
    <UIProvider>
      <AuthProvider>
        <Puerta />
      </AuthProvider>
    </UIProvider>
  )
}
