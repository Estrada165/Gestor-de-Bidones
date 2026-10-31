import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { supabase, traducirError } from '../lib/supabase'
import { comprimirImagen } from '../lib/image'
import { calcularStock } from '../lib/calc'
import { useAuth } from './AuthContext'
import { useUI } from './UIContext'

const DataCtx = createContext(null)
export const useData = () => useContext(DataCtx)

// tabla en BD → clave en estado
const TABLAS = {
  ventas: 'ventas',
  pedidos: 'pedidos',
  pagos_pedido: 'pagos',
  movimientos: 'movimientos',
  ajustes_inventario: 'ajustes'
}

async function traerTodo(tabla) {
  const filas = []
  const paso = 1000
  for (let desde = 0; ; desde += paso) {
    const { data, error } = await supabase.from(tabla).select('*').order('fecha', { ascending: false }).range(desde, desde + paso - 1)
    if (error) throw error
    filas.push(...data)
    if (data.length < paso) break
  }
  return filas
}

const ordenar = (arr) => [...arr].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))

export function DataProvider({ children }) {
  const { perfil } = useAuth()
  const { setAcento } = useUI()
  const [estado, setEstado] = useState({ ventas: [], pedidos: [], pagos: [], movimientos: [], ajustes: [] })
  const [config, setConfig] = useState(null)
  const [miembros, setMiembros] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [ultimoId, setUltimoId] = useState(null)
  const urls = useRef(new Map())

  const negocioId = perfil?.negocio_id

  const cargar = useCallback(async () => {
    if (!negocioId) return
    try {
      setError(null)
      const [cfg, mbs, ...listas] = await Promise.all([
        supabase.from('negocios').select('*').eq('id', negocioId).single(),
        supabase.from('perfiles').select('id, usuario, nombre, rol, created_at').order('created_at'),
        ...Object.keys(TABLAS).map(traerTodo)
      ])
      if (cfg.error) throw cfg.error
      setConfig(cfg.data)
      setAcento(cfg.data.acento)
      setMiembros(mbs.data || [])
      const nuevo = {}
      Object.values(TABLAS).forEach((k, i) => { nuevo[k] = listas[i] })
      setEstado(nuevo)
    } catch (e) {
      setError(traducirError(e))
    } finally {
      setCargando(false)
    }
  }, [negocioId, setAcento])

  useEffect(() => { cargar() }, [cargar])

  // Tiempo real: otros dispositivos ven los cambios al instante
  useEffect(() => {
    if (!negocioId) return
    const canal = supabase.channel(`negocio-${negocioId}`)
    Object.entries(TABLAS).forEach(([tabla, clave]) => {
      canal.on('postgres_changes', { event: '*', schema: 'public', table: tabla }, (p) => {
        setEstado((s) => {
          let arr = s[clave]
          if (p.eventType === 'DELETE') arr = arr.filter((x) => x.id !== p.old.id)
          else if (p.new?.negocio_id !== negocioId) return s
          else if (p.eventType === 'INSERT') arr = arr.some((x) => x.id === p.new.id) ? arr : ordenar([p.new, ...arr])
          else arr = ordenar(arr.map((x) => (x.id === p.new.id ? p.new : x)))
          return { ...s, [clave]: arr }
        })
      })
    })
    canal.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'negocios', filter: `id=eq.${negocioId}` }, (p) => {
      setConfig(p.new); setAcento(p.new.acento)
    })
    canal.subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [negocioId, setAcento])

  const claveDe = (tabla) => TABLAS[tabla]

  const insertar = useCallback(async (tabla, fila) => {
    const { data, error } = await supabase.from(tabla).insert(fila).select().single()
    if (error) throw new Error(traducirError(error))
    const k = claveDe(tabla)
    setEstado((s) => ({ ...s, [k]: s[k].some((x) => x.id === data.id) ? s[k] : ordenar([data, ...s[k]]) }))
    setUltimoId(data.id)
    return data
  }, [])

  const insertarVarios = useCallback(async (tabla, filas) => {
    if (!filas.length) return []
    const out = []
    for (let i = 0; i < filas.length; i += 500) {
      const { data, error } = await supabase.from(tabla).insert(filas.slice(i, i + 500)).select()
      if (error) throw new Error(traducirError(error))
      out.push(...data)
    }
    const k = claveDe(tabla)
    setEstado((s) => {
      const ids = new Set(s[k].map((x) => x.id))
      return { ...s, [k]: ordenar([...out.filter((x) => !ids.has(x.id)), ...s[k]]) }
    })
    return out
  }, [])

  const actualizar = useCallback(async (tabla, id, cambios) => {
    const { data, error } = await supabase.from(tabla).update(cambios).eq('id', id).select().single()
    if (error) throw new Error(traducirError(error))
    const k = claveDe(tabla)
    setEstado((s) => ({ ...s, [k]: ordenar(s[k].map((x) => (x.id === id ? data : x))) }))
    return data
  }, [])

  const eliminar = useCallback(async (tabla, id, rutasImagen = []) => {
    const { error } = await supabase.from(tabla).delete().eq('id', id)
    if (error) throw new Error(traducirError(error))
    const rutas = rutasImagen.filter(Boolean)
    if (rutas.length) await supabase.storage.from('comprobantes').remove(rutas)
    const k = claveDe(tabla)
    setEstado((s) => {
      const n = { ...s, [k]: s[k].filter((x) => x.id !== id) }
      if (tabla === 'pedidos') n.pagos = s.pagos.filter((p) => p.pedido_id !== id)
      return n
    })
  }, [])

  const guardarConfig = useCallback(async (cambios) => {
    const { data, error } = await supabase.from('negocios').update(cambios).eq('id', negocioId).select().single()
    if (error) throw new Error(traducirError(error))
    setConfig(data)
    if (cambios.acento) setAcento(data.acento)
    return data
  }, [negocioId, setAcento])

  /** Sube una captura (comprimida) y devuelve la ruta en Storage */
  const subirComprobante = useCallback(async (file) => {
    if (!file) return null
    const blob = await comprimirImagen(file)
    const ruta = `${negocioId}/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.jpg`
    const { error } = await supabase.storage.from('comprobantes').upload(ruta, blob, { contentType: 'image/jpeg', upsert: false })
    if (error) throw new Error('No se pudo subir la captura: ' + traducirError(error))
    return ruta
  }, [negocioId])

  /** URL temporal (1 h) para ver una captura privada */
  const urlComprobante = useCallback(async (ruta) => {
    if (!ruta) return null
    const c = urls.current.get(ruta)
    if (c && c.exp > Date.now()) return c.url
    const { data, error } = await supabase.storage.from('comprobantes').createSignedUrl(ruta, 3600)
    if (error) return null
    urls.current.set(ruta, { url: data.signedUrl, exp: Date.now() + 3500 * 1000 })
    return data.signedUrl
  }, [])

  const recargarMiembros = useCallback(async () => {
    const { data } = await supabase.from('perfiles').select('id, usuario, nombre, rol, created_at').order('created_at')
    setMiembros(data || [])
  }, [])

  const stock = useMemo(() => calcularStock(estado), [estado])

  // Clientes y proveedores conocidos (para autocompletar), por frecuencia
  const clientes = useMemo(() => {
    const m = new Map()
    for (const v of estado.ventas) {
      if (v.tipo !== 'venta' || !v.cliente) continue
      const k = v.cliente.trim().toLowerCase()
      const c = m.get(k) || { nombre: v.cliente.trim(), veces: 0, ultima: v.fecha }
      c.veces++; m.set(k, c)
    }
    return [...m.values()].sort((a, b) => b.veces - a.veces)
  }, [estado.ventas])

  const proveedores = useMemo(() => {
    const m = new Map()
    for (const p of estado.pedidos) {
      const k = p.proveedor.trim().toLowerCase()
      const c = m.get(k) || { nombre: p.proveedor.trim(), veces: 0, telefono: p.telefono, costo: p.costo_unit }
      c.veces++; m.set(k, c)
    }
    return [...m.values()].sort((a, b) => b.veces - a.veces)
  }, [estado.pedidos])

  const value = {
    ...estado, config, miembros, cargando, error, stock, clientes, proveedores, ultimoId,
    cargar, insertar, insertarVarios, actualizar, eliminar, guardarConfig, subirComprobante, urlComprobante, recargarMiembros
  }
  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>
}
