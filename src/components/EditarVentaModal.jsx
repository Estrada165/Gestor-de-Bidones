import { useState } from 'react'
import { ShoppingBag, Home, Banknote, Smartphone, Clock, Save, Loader2, Trash2, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useData } from '../context/DataContext'
import { useUI } from '../context/UIContext'
import { soles, aInputLocal, bidones } from '../lib/format'
import Modal from './Modal'
import Autocomplete from './Autocomplete'
import Stepper from './Stepper'
import KeyOptions from './KeyOptions'
import ImagePicker from './ImagePicker'
import Receipt from './Receipt'

const METODOS = [
  { v: 'efectivo', label: 'Efectivo', icon: Banknote },
  { v: 'yape', label: 'Yape', icon: Smartphone },
  { v: 'plin', label: 'Plin', icon: Smartphone },
  { v: 'fiado', label: 'Fiado', icon: Clock }
]
const COBRO = METODOS.slice(0, 3)

/** Editar (o eliminar) una venta / uso propio ya registrado */
export default function EditarVentaModal({ venta, onClose }) {
  const { clientes, actualizar, eliminar, subirComprobante } = useData()
  const { toast, confirm } = useUI()

  const [f, setF] = useState({
    tipo: venta.tipo,
    cliente: venta.tipo === 'personal' ? '' : venta.cliente,
    cantidad: venta.cantidad,
    precio: String(venta.precio_unit || ''),
    costo: String(venta.costo_unit ?? ''),
    metodo: venta.metodo === 'personal' ? 'efectivo' : venta.metodo,
    pagado: venta.estado !== 'pendiente',
    metodoCobro: venta.metodo_cobro || 'efectivo',
    fechaCobro: aInputLocal(venta.fecha_cobro || new Date()),
    fecha: aInputLocal(venta.fecha),
    notas: venta.notas || ''
  })
  const [file, setFile] = useState(null)
  const [quitarCaptura, setQuitarCaptura] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))

  const personal = f.tipo === 'personal'
  const fiado = !personal && f.metodo === 'fiado'
  const cant = Number(f.cantidad) || 0
  const precio = Number(f.precio) || 0
  const costo = Number(f.costo) || 0
  const total = personal ? 0 : +(cant * precio).toFixed(2)
  const ganancia = personal ? 0 : +(cant * (precio - costo)).toFixed(2)
  const capturaActual = quitarCaptura ? null : venta.comprobante_path
  const admiteCaptura = !personal && (['yape', 'plin'].includes(f.metodo) || (fiado && f.pagado && f.metodoCobro !== 'efectivo'))

  const guardar = async (cerrar) => {
    if (!personal && !f.cliente.trim()) return toast('Escribe el nombre del cliente', 'warn')
    if (cant < 1) return toast('La cantidad debe ser al menos 1', 'warn')
    if (!personal && precio <= 0) return toast('El precio debe ser mayor a 0', 'warn')
    setGuardando(true)
    try {
      let ruta = capturaActual
      if (file) ruta = await subirComprobante(file)
      const cambios = {
        tipo: f.tipo,
        cliente: personal ? 'Uso propio' : f.cliente.trim(),
        cantidad: cant,
        precio_unit: personal ? 0 : precio,
        costo_unit: costo,
        total, ganancia,
        metodo: personal ? 'personal' : f.metodo,
        estado: personal ? 'personal' : fiado && !f.pagado ? 'pendiente' : 'pagado',
        fecha: new Date(f.fecha).toISOString(),
        fecha_cobro: fiado && f.pagado ? new Date(f.fechaCobro).toISOString() : null,
        metodo_cobro: fiado && f.pagado ? f.metodoCobro : null,
        notas_cobro: fiado && f.pagado ? venta.notas_cobro : null,
        notas: f.notas.trim() || null,
        comprobante_path: admiteCaptura ? ruta : null
      }
      await actualizar('ventas', venta.id, cambios)
      // borrar la captura anterior si se reemplazó o se quitó
      if (venta.comprobante_path && venta.comprobante_path !== cambios.comprobante_path) {
        await supabase.storage.from('comprobantes').remove([venta.comprobante_path])
      }
      toast('Cambios guardados')
      cerrar()
    } catch (e) {
      toast(e.message, 'bad'); setGuardando(false)
    }
  }

  const borrar = async (cerrar) => {
    const ok = await confirm({
      titulo: 'Eliminar', peligro: true, textoOk: 'Sí, eliminar',
      mensaje: `¿Eliminar ${venta.tipo === 'personal' ? 'este uso propio' : `la venta de ${venta.cliente}`}? ${bidones(venta.cantidad)} ${venta.cantidad === 1 ? 'vuelve' : 'vuelven'} al stock.`
    })
    if (!ok) return
    try { await eliminar('ventas', venta.id, [venta.comprobante_path]); toast('Eliminado'); cerrar() } catch (e) { toast(e.message, 'bad') }
  }

  return (
    <Modal titulo={personal ? 'Editar uso propio' : 'Editar venta'} onClose={onClose}
      pie={(cerrar) => (<>
        <button className="key danger" style={{ marginRight: 'auto' }} onClick={() => borrar(cerrar)}><Trash2 /><span className="hide-m">Eliminar</span></button>
        <button className="key" onClick={() => cerrar()}>Cancelar</button>
        <button className="key primary" disabled={guardando} onClick={() => guardar(cerrar)}>{guardando ? <Loader2 className="spin" /> : <Save />}Guardar</button>
      </>)}>
      <div className="form">
        <div className="seg fill">
          <button type="button" className={!personal ? 'on' : ''} onClick={() => set('tipo', 'venta')}><ShoppingBag />Venta</button>
          <button type="button" className={personal ? 'on' : ''} onClick={() => set('tipo', 'personal')}><Home />Uso propio</button>
        </div>

        {!personal && (
          <div className="field"><label>Cliente</label><Autocomplete value={f.cliente} onChange={(v) => set('cliente', v)} opciones={clientes} placeholder="Nombre del cliente" /></div>
        )}
        <div className="field"><label>Cantidad de bidones</label><Stepper value={f.cantidad} onChange={(v) => set('cantidad', v)} /></div>

        {!personal && (
          <>
            <div className="f-row keep">
              <div className="field"><label>Precio c/u</label><div className="input-wrap"><span className="prefix">S/</span><input className="input mono" inputMode="decimal" value={f.precio} onChange={(e) => set('precio', e.target.value.replace(',', '.'))} /></div></div>
              <div className="field"><label>Costo c/u</label><div className="input-wrap"><span className="prefix">S/</span><input className="input mono" inputMode="decimal" value={f.costo} onChange={(e) => set('costo', e.target.value.replace(',', '.'))} /></div></div>
            </div>
            <div className="field"><label>¿Cómo pagó?</label><KeyOptions opciones={METODOS} value={f.metodo} onChange={(v) => set('metodo', v)} size="sm" /></div>

            {fiado && (
              <div className="field">
                <label>¿Ya te pagó el fiado?</label>
                <div className="seg fill">
                  <button type="button" className={!f.pagado ? 'on' : ''} onClick={() => set('pagado', false)}><Clock />Todavía debe</button>
                  <button type="button" className={f.pagado ? 'on' : ''} onClick={() => set('pagado', true)}><CheckCircle2 />Ya pagó</button>
                </div>
              </div>
            )}
            {fiado && f.pagado && (
              <>
                <div className="field"><label>¿Con qué pagó?</label><KeyOptions opciones={COBRO} value={f.metodoCobro} onChange={(v) => set('metodoCobro', v)} size="sm" /></div>
                <div className="field"><label>¿Cuándo pagó?</label><input type="datetime-local" className="input" value={f.fechaCobro} onChange={(e) => set('fechaCobro', e.target.value)} /></div>
              </>
            )}
          </>
        )}

        <div className="field">
          <label>Fecha y hora {personal ? 'del uso' : 'de la venta'}</label>
          <input type="datetime-local" className="input" value={f.fecha} onChange={(e) => set('fecha', e.target.value)} />
        </div>
        <div className="field"><label>Notas <span className="t-3">opcional</span></label><input className="input" value={f.notas} onChange={(e) => set('notas', e.target.value)} /></div>

        {admiteCaptura && (
          <div className="field">
            <label>Captura del pago</label>
            {capturaActual && !file && (
              <div className="drop has" style={{ cursor: 'default' }}>
                <Receipt ruta={capturaActual} />
                <div className="grow small">Captura guardada</div>
                <button type="button" className="key ghost sm" onClick={() => setQuitarCaptura(true)}>Quitar</button>
              </div>
            )}
            <ImagePicker file={file} onChange={setFile} label={capturaActual ? 'Cambiar por otra captura' : 'Adjuntar captura'} />
          </div>
        )}

        <div className="summary">
          {personal ? (
            <div className="s-row big"><span>Se descuentan del stock</span><b>{bidones(cant)}</b></div>
          ) : (
            <>
              <div className="s-row"><span>Ganancia</span><b className="t-ok">{soles(ganancia)}</b></div>
              <div className="s-row big"><span>Total</span><b>{soles(total)}</b></div>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
