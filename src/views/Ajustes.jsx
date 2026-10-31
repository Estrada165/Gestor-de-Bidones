import { useEffect, useRef, useState } from 'react'
import { Palette, Tag, User, Users, Smartphone, HardDrive, Save, Loader2, Copy, RefreshCw, Download, Upload, KeyRound, Moon, Sun, Share, PlusSquare, AlertTriangle, Trash2, CheckCircle2 } from 'lucide-react'
import { supabase, traducirError } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useUI } from '../context/UIContext'
import { useInstall } from '../lib/install'
import { jsonRespaldo, csvVentas, csvPedidos } from '../lib/csv'
import { prepararImportacion } from '../lib/importar'
import { iniciales } from '../lib/format'
import Modal from '../components/Modal'

const ACENTOS = [
  { v: 'agua', c: '#67e8f9', n: 'Agua' },
  { v: 'menta', c: '#6ee7b7', n: 'Menta' },
  { v: 'lima', c: '#bef264', n: 'Lima' },
  { v: 'ambar', c: '#fbbf24', n: 'Ámbar' },
  { v: 'violeta', c: '#c4b5fd', n: 'Violeta' },
  { v: 'rosa', c: '#f9a8d4', n: 'Rosa' },
  { v: 'mono', c: '#e4e4e7', n: 'Mono' }
]
const ROLES = { admin: 'Administrador', operador: 'Operador', lector: 'Solo lectura', inactivo: 'Inactivo' }

export default function Ajustes() {
  const { perfil, esAdmin, actualizarNombre, cambiarPassword } = useAuth()
  const data = useData()
  const { config, guardarConfig, miembros, recargarMiembros } = data
  const { toast, confirm, tema, toggleTema, setAcento } = useUI()
  const { puedeInstalar, instalar, instalado, esIOS } = useInstall()

  // Negocio
  const [cfg, setCfg] = useState(() => ({ nombre_app: config.nombre_app, precio_venta: String(config.precio_venta), costo_compra: String(config.costo_compra), stock_bajo: String(config.stock_bajo), stock_critico: String(config.stock_critico) }))
  const [guardandoCfg, setGuardandoCfg] = useState(false)
  const cambiado = cfg.nombre_app !== config.nombre_app || Number(cfg.precio_venta) !== Number(config.precio_venta) || Number(cfg.costo_compra) !== Number(config.costo_compra) || Number(cfg.stock_bajo) !== config.stock_bajo || Number(cfg.stock_critico) !== config.stock_critico

  useEffect(() => { document.title = config.nombre_app || 'Gestor Agua' }, [config.nombre_app])

  const guardarNegocio = async () => {
    const pv = Number(cfg.precio_venta), cc = Number(cfg.costo_compra), sb = parseInt(cfg.stock_bajo), sc = parseInt(cfg.stock_critico)
    if (!cfg.nombre_app.trim()) return toast('El nombre no puede quedar vacío', 'warn')
    if (!(pv > 0) || !(cc >= 0)) return toast('Revisa precio y costo', 'warn')
    if (!(sc >= 0) || !(sb > sc)) return toast('La alerta amarilla debe ser mayor que la roja', 'warn')
    setGuardandoCfg(true)
    try { await guardarConfig({ nombre_app: cfg.nombre_app.trim(), precio_venta: pv, costo_compra: cc, stock_bajo: sb, stock_critico: sc }); toast('Configuración guardada') }
    catch (e) { toast(e.message, 'bad') } finally { setGuardandoCfg(false) }
  }

  const elegirAcento = async (v) => {
    setAcento(v)
    if (esAdmin) { try { await guardarConfig({ acento: v }) } catch (e) { toast(e.message, 'bad') } }
  }

  // Cuenta
  const [nombre, setNombre] = useState(perfil.nombre || '')
  const [pass, setPass] = useState({ a: '', b: '' })
  const guardarNombre = async () => { try { await actualizarNombre(nombre.trim()); toast('Nombre actualizado') } catch (e) { toast(e.message, 'bad') } }
  const guardarPass = async () => {
    if (pass.a.length < 6) return toast('Mínimo 6 caracteres', 'warn')
    if (pass.a !== pass.b) return toast('Las contraseñas no coinciden', 'warn')
    try { await cambiarPassword(pass.a); setPass({ a: '', b: '' }); toast('Contraseña actualizada') } catch (e) { toast(e.message, 'bad') }
  }

  // Equipo
  const copiar = async () => { try { await navigator.clipboard.writeText(config.codigo_invitacion); toast('Código copiado') } catch { toast(config.codigo_invitacion, 'info') } }
  const regenerar = async () => {
    if (!(await confirm({ titulo: 'Nuevo código', mensaje: 'El código anterior dejará de funcionar. ¿Generar uno nuevo?', textoOk: 'Generar' }))) return
    const { error } = await supabase.rpc('regenerar_codigo')
    if (error) return toast(traducirError(error), 'bad')
    data.cargar(); toast('Código regenerado')
  }
  const cambiarRol = async (id, rol) => {
    const { error } = await supabase.rpc('cambiar_rol', { p_perfil: id, p_rol: rol })
    if (error) return toast(traducirError(error), 'bad')
    recargarMiembros(); toast('Rol actualizado')
  }

  // Importar
  const fileRef = useRef(null)
  const [imp, setImp] = useState(null)
  const [importando, setImportando] = useState(false)
  const leerArchivo = async (file) => {
    if (!file) return
    try { setImp(prepararImportacion(JSON.parse(await file.text()))) } catch (e) { toast(e.message || 'Archivo inválido', 'bad') }
  }
  const ejecutarImport = async (cerrar) => {
    setImportando(true)
    try {
      const mapa = new Map()
      const pedidos = imp.pedidos.map(({ _tmp, _old, ...p }) => { const id = crypto.randomUUID(); mapa.set(_tmp || _old, id); return { ...p, id } })
      const pagos = imp.pagos.map(({ _pedido, _old, ...p }) => ({ ...p, pedido_id: mapa.get(_pedido || p.pedido_id) })).filter((p) => p.pedido_id)
      const limpiar = (arr) => arr.map(({ _old, _tmp, ...r }) => r)
      await data.insertarVarios('ventas', limpiar(imp.ventas))
      await data.insertarVarios('pedidos', pedidos)
      await data.insertarVarios('pagos_pedido', pagos)
      await data.insertarVarios('movimientos', limpiar(imp.movimientos))
      await data.insertarVarios('ajustes_inventario', limpiar(imp.ajustes))
      if (imp.stockObjetivo !== null) {
        const neto = imp.pedidos.reduce((s, p) => s + p.cantidad, 0) - imp.ventas.reduce((s, v) => s + v.cantidad, 0)
        const dif = imp.stockObjetivo - neto
        if (dif) await data.insertar('ajustes_inventario', { cantidad: dif, motivo: 'Cuadre con versión anterior' })
      }
      toast(`Importado: ${imp.ventas.length} ventas, ${imp.pedidos.length} pedidos`)
      cerrar(() => setImp(null))
    } catch (e) { toast(e.message, 'bad') } finally { setImportando(false) }
  }

  const borrarTodo = async () => {
    const ok = await confirm({ titulo: 'Borrar todos los datos', peligro: true, textoOk: 'Sí, borrar todo', mensaje: 'Se eliminarán ventas, pedidos, pagos, movimientos, ajustes y capturas de este negocio. Descarga un respaldo antes. No se puede deshacer.' })
    if (!ok) return
    if (!(await confirm({ titulo: 'Última confirmación', peligro: true, textoOk: 'Borrar definitivamente', mensaje: '¿Seguro? Esta es la última advertencia.' }))) return
    try {
      const rutas = [...data.ventas.map((v) => v.comprobante_path), ...data.pagos.map((p) => p.comprobante_path)].filter(Boolean)
      for (let i = 0; i < rutas.length; i += 100) await supabase.storage.from('comprobantes').remove(rutas.slice(i, i + 100))
      for (const t of ['pagos_pedido', 'ventas', 'pedidos', 'movimientos', 'ajustes_inventario']) {
        const { error } = await supabase.from(t).delete().eq('negocio_id', config.id)
        if (error) throw error
      }
      await data.cargar(); toast('Datos eliminados')
    } catch (e) { toast(traducirError(e), 'bad') }
  }

  const TemaIco = tema === 'dark' ? Sun : Moon

  return (
    <div className="view stack">
      <div className="topbar"><div><h1>Ajustes</h1><div className="sub">@{perfil.usuario} · {ROLES[perfil.rol]}</div></div></div>

      <div className="grid g-2" style={{ alignItems: 'start' }}>
        <div className="stack">
          <div className="card">
            <div className="card-h"><h3><Palette />Apariencia</h3></div>
            <div className="card-b form">
              <div className="field">
                <label>Nombre de la app {!esAdmin && <span className="t-3">solo admin</span>}</label>
                <input className="input" value={cfg.nombre_app} disabled={!esAdmin} onChange={(e) => setCfg({ ...cfg, nombre_app: e.target.value })} placeholder="Gestor Agua, AquaPure, Bidones Carlos…" maxLength={28} />
                <span className="hint">Aparece en el menú, el inicio de sesión del equipo y el título de la pestaña.</span>
              </div>
              <div className="field">
                <label>Color de acento</label>
                <div className="swatches">
                  {ACENTOS.map((a) => (
                    <button key={a.v} className={`swatch ${(config.acento || 'agua') === a.v ? 'on' : ''}`} onClick={() => elegirAcento(a.v)} title={a.n}><i style={{ background: a.c }} /></button>
                  ))}
                </div>
                <span className="hint">Se usa en botones principales, gráficos e indicadores. {esAdmin ? 'Se aplica a todo el equipo.' : 'Solo en este dispositivo.'}</span>
              </div>
              <div className="row between">
                <span className="small t-2">Tema {tema === 'dark' ? 'oscuro' : 'claro'}</span>
                <button className="key sm" onClick={toggleTema}><TemaIco />Cambiar a {tema === 'dark' ? 'claro' : 'oscuro'}</button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h3><Tag />Precios y alertas</h3>{!esAdmin && <span className="badge">solo admin</span>}</div>
            <div className="card-b form">
              <div className="f-row keep">
                <div className="field"><label>Precio de venta</label><div className="input-wrap"><span className="prefix">S/</span><input className="input mono" disabled={!esAdmin} inputMode="decimal" value={cfg.precio_venta} onChange={(e) => setCfg({ ...cfg, precio_venta: e.target.value.replace(',', '.') })} /></div></div>
                <div className="field"><label>Costo de compra</label><div className="input-wrap"><span className="prefix">S/</span><input className="input mono" disabled={!esAdmin} inputMode="decimal" value={cfg.costo_compra} onChange={(e) => setCfg({ ...cfg, costo_compra: e.target.value.replace(',', '.') })} /></div></div>
              </div>
              <div className="f-row keep">
                <div className="field"><label><span className="row" style={{ gap: 6 }}><span className="dot t-warn" />Alerta amarilla</span></label><input className="input mono" disabled={!esAdmin} inputMode="numeric" value={cfg.stock_bajo} onChange={(e) => setCfg({ ...cfg, stock_bajo: e.target.value.replace(/\D/g, '') })} /></div>
                <div className="field"><label><span className="row" style={{ gap: 6 }}><span className="dot t-bad" />Alerta roja</span></label><input className="input mono" disabled={!esAdmin} inputMode="numeric" value={cfg.stock_critico} onChange={(e) => setCfg({ ...cfg, stock_critico: e.target.value.replace(/\D/g, '') })} /></div>
              </div>
              <span className="hint">Con {cfg.stock_bajo || '?'} bidones o menos se avisa en amarillo; con {cfg.stock_critico || '?'} o menos, en rojo.</span>
              {esAdmin && <button className="key primary" disabled={!cambiado || guardandoCfg} onClick={guardarNegocio}>{guardandoCfg ? <Loader2 className="spin" /> : <Save />}Guardar cambios</button>}
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h3><Smartphone />Instalar en el celular</h3>{instalado && <span className="badge ok">instalada</span>}</div>
            <div className="card-b stack" style={{ gap: 12 }}>
              {instalado ? <p className="small t-2">Ya estás usando la app instalada.</p> : puedeInstalar ? (
                <>
                  <p className="small t-2">Instálala para abrirla como una app normal, a pantalla completa y desde el inicio de tu celular o PC.</p>
                  <button className="key primary" onClick={instalar}><Download />Instalar app</button>
                </>
              ) : esIOS ? (
                <div className="kv small">
                  <div><span className="row" style={{ gap: 8 }}><Share size={15} />1. Toca Compartir en Safari</span></div>
                  <div><span className="row" style={{ gap: 8 }}><PlusSquare size={15} />2. "Agregar a inicio"</span></div>
                </div>
              ) : (
                <p className="small t-2">Abre esta página en Chrome (Android) o Edge/Chrome (PC) y usa la opción <b>Instalar aplicación</b> del menú del navegador.</p>
              )}
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-h"><h3><User />Mi cuenta</h3></div>
            <div className="card-b form">
              <div className="field">
                <label>Nombre visible</label>
                <div className="row"><input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} /><button className="key" disabled={nombre.trim() === (perfil.nombre || '') || !nombre.trim()} onClick={guardarNombre}><Save /></button></div>
              </div>
              <div className="divider" />
              <div className="field"><label>Nueva contraseña</label><input className="input" type="password" autoComplete="new-password" value={pass.a} onChange={(e) => setPass({ ...pass, a: e.target.value })} /></div>
              <div className="field"><label>Repetir contraseña</label><input className="input" type="password" autoComplete="new-password" value={pass.b} onChange={(e) => setPass({ ...pass, b: e.target.value })} /></div>
              <button className="key" disabled={!pass.a} onClick={guardarPass}><KeyRound />Cambiar contraseña</button>
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h3><Users />Equipo</h3><span className="badge mono">{miembros.length}</span></div>
            <div className="card-b stack" style={{ gap: 14 }}>
              {esAdmin && (
                <>
                  <p className="small t-2">Para sumar a alguien (por ejemplo, quien reparte), que cree su cuenta marcando <b>"Unirme a un negocio"</b> con este código. Entra como operador; puedes cambiar su rol abajo.</p>
                  <div className="code-box">
                    <b>{config.codigo_invitacion}</b>
                    <div className="keys"><button className="key sm icon" onClick={copiar} title="Copiar"><Copy /></button><button className="key sm icon" onClick={regenerar} title="Generar otro"><RefreshCw /></button></div>
                  </div>
                </>
              )}
              <div className="list" style={{ margin: '0 -18px' }}>
                {miembros.map((m) => (
                  <div className="li" key={m.id}>
                    <div className="avatar">{iniciales(m.nombre || m.usuario)}</div>
                    <div className="li-main"><div className="li-title"><span>{m.nombre || m.usuario}</span>{m.id === perfil.id && <span className="badge accent">tú</span>}</div><div className="li-sub">@{m.usuario}</div></div>
                    <div className="li-end">
                      {esAdmin && m.id !== perfil.id ? (
                        <select className="select" style={{ height: 34, fontSize: 12.5, width: 'auto' }} value={m.rol} onChange={(e) => cambiarRol(m.id, e.target.value)}>
                          {Object.entries(ROLES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                        </select>
                      ) : <span className="badge">{ROLES[m.rol]}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h3><HardDrive />Datos y respaldos</h3></div>
            <div className="card-b stack" style={{ gap: 12 }}>
              <div className="keys fill">
                <button className="key" onClick={() => jsonRespaldo(data)}><Download />Respaldo JSON</button>
                <button className="key" onClick={() => csvVentas(data.ventas)}><Download />Ventas CSV</button>
                <button className="key" onClick={() => csvPedidos(data.pedidos, data.pagos)}><Download />Pedidos CSV</button>
              </div>
              {perfil.rol !== 'lector' && (
                <>
                  <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => { leerArchivo(e.target.files?.[0]); e.target.value = '' }} />
                  <button className="key" onClick={() => fileRef.current?.click()}><Upload />Importar respaldo (versión anterior o esta)</button>
                  <span className="hint">Acepta el JSON exportado desde la versión AquaPure (localStorage). Las capturas no se incluyen en los respaldos.</span>
                </>
              )}
              {esAdmin && (
                <>
                  <div className="divider" />
                  <button className="key danger" onClick={borrarTodo}><Trash2 />Borrar todos los datos del negocio</button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {imp && (
        <Modal titulo="Importar datos" onClose={() => setImp(null)}
          pie={(cerrar) => (<>
            <button className="key" onClick={() => cerrar()}>Cancelar</button>
            <button className="key primary" disabled={importando} onClick={() => ejecutarImport(cerrar)}>{importando ? <Loader2 className="spin" /> : <CheckCircle2 />}Importar</button>
          </>)}>
          <div className="stack" style={{ gap: 12 }}>
            <span className="badge accent">{imp.origen}</span>
            <div className="kv">
              <div><span>Ventas y uso propio</span><b>{imp.ventas.length}</b></div>
              <div><span>Pedidos</span><b>{imp.pedidos.length}</b></div>
              <div><span>Pagos a proveedores</span><b>{imp.pagos.length}</b></div>
              <div><span>Movimientos de caja</span><b>{imp.movimientos.length}</b></div>
              {imp.ajustes.length > 0 && <div><span>Ajustes de stock</span><b>{imp.ajustes.length}</b></div>}
              {imp.stockObjetivo !== null && <div><span>Stock en la versión anterior</span><b>{imp.stockObjetivo}</b></div>}
            </div>
            <div className="alert warn"><AlertTriangle /><div className="grow" style={{ fontSize: 12.5 }}>Se agregan como registros nuevos. Si importas el mismo archivo dos veces, se duplicará.</div></div>
          </div>
        </Modal>
      )}
    </div>
  )
}
