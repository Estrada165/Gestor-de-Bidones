import { useState } from 'react'
import { Save, Loader2, Trash2, AlertTriangle } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useUI } from '../context/UIContext'
import { soles, aInputLocal, bidones } from '../lib/format'
import Modal from './Modal'
import Autocomplete from './Autocomplete'
import Stepper from './Stepper'

/** Editar (o eliminar) un pedido al proveedor. pagado = suma de sus pagos */
export default function EditarPedidoModal({ pedido, pagos, onClose }) {
  const { proveedores, actualizar, eliminar } = useData()
  const { toast, confirm } = useUI()
  const pagado = pagos.reduce((s, p) => s + Number(p.monto), 0)

  const [f, setF] = useState({
    proveedor: pedido.proveedor,
    telefono: pedido.telefono || '',
    cantidad: pedido.cantidad,
    costo: String(pedido.costo_unit),
    devueltos: String(pedido.devueltos || ''),
    fecha: aInputLocal(pedido.fecha),
    notas: pedido.notas || ''
  })
  const [guardando, setGuardando] = useState(false)
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))

  const cant = Number(f.cantidad) || 0
  const costo = Number(f.costo) || 0
  const total = +(cant * costo).toFixed(2)
  const excede = pagado > total + 0.009

  const guardar = async (cerrar) => {
    if (!f.proveedor.trim()) return toast('Escribe el nombre del proveedor', 'warn')
    if (cant < 1) return toast('La cantidad debe ser al menos 1', 'warn')
    if (excede) return toast(`Ya pagaste ${soles(pagado)}; el total no puede ser menor. Edita o borra un pago primero.`, 'warn')
    setGuardando(true)
    try {
      await actualizar('pedidos', pedido.id, {
        proveedor: f.proveedor.trim(), telefono: f.telefono.trim() || null, cantidad: cant, costo_unit: costo,
        total, devueltos: parseInt(f.devueltos) || 0, fecha: new Date(f.fecha).toISOString(), notas: f.notas.trim() || null
      })
      toast('Pedido actualizado')
      cerrar()
    } catch (e) { toast(e.message, 'bad'); setGuardando(false) }
  }

  const borrar = async (cerrar) => {
    const ok = await confirm({
      titulo: 'Eliminar pedido', peligro: true, textoOk: 'Sí, eliminar',
      mensaje: `¿Eliminar el pedido de ${pedido.proveedor} (${bidones(pedido.cantidad)})? Se restan del stock y se borran sus ${pagos.length} pago(s) con sus capturas.`
    })
    if (!ok) return
    try { await eliminar('pedidos', pedido.id, pagos.map((p) => p.comprobante_path)); toast('Pedido eliminado'); cerrar() } catch (e) { toast(e.message, 'bad') }
  }

  return (
    <Modal titulo="Editar pedido" onClose={onClose}
      pie={(cerrar) => (<>
        <button className="key danger" style={{ marginRight: 'auto' }} onClick={() => borrar(cerrar)}><Trash2 /><span className="hide-m">Eliminar</span></button>
        <button className="key" onClick={() => cerrar()}>Cancelar</button>
        <button className="key primary" disabled={guardando || excede} onClick={() => guardar(cerrar)}>{guardando ? <Loader2 className="spin" /> : <Save />}Guardar</button>
      </>)}>
      <div className="form">
        <div className="field">
          <label>Proveedor</label>
          <Autocomplete value={f.proveedor} onChange={(v) => set('proveedor', v)} opciones={proveedores} detalle={(o) => `${o.veces} ped.`}
            onPick={(o) => setF((x) => ({ ...x, proveedor: o.nombre, telefono: x.telefono || o.telefono || '' }))} />
        </div>
        <div className="field"><label>Teléfono / WhatsApp <span className="t-3">opcional</span></label><input className="input mono" inputMode="tel" value={f.telefono} onChange={(e) => set('telefono', e.target.value)} /></div>
        <div className="field"><label>Bidones recibidos</label><Stepper value={f.cantidad} onChange={(v) => set('cantidad', v)} /></div>
        <div className="f-row keep">
          <div className="field"><label>Costo c/u</label><div className="input-wrap"><span className="prefix">S/</span><input className="input mono" inputMode="decimal" value={f.costo} onChange={(e) => set('costo', e.target.value.replace(',', '.'))} /></div></div>
          <div className="field"><label>Vacíos entregados</label><input className="input mono" inputMode="numeric" value={f.devueltos} onChange={(e) => set('devueltos', e.target.value.replace(/\D/g, ''))} placeholder="0" /></div>
        </div>
        <div className="field"><label>Fecha y hora del pedido</label><input type="datetime-local" className="input" value={f.fecha} onChange={(e) => set('fecha', e.target.value)} /></div>
        <div className="field"><label>Notas <span className="t-3">opcional</span></label><input className="input" value={f.notas} onChange={(e) => set('notas', e.target.value)} /></div>

        <div className="summary">
          <div className="s-row"><span>Ya pagado</span><b>{soles(pagado)}</b></div>
          <div className="s-row"><span>Quedará debiendo</span><b className={total - pagado > 0.009 ? 't-warn' : 't-ok'}>{soles(Math.max(0, total - pagado))}</b></div>
          <div className="s-row big"><span>Total del pedido</span><b>{soles(total)}</b></div>
        </div>
        {excede && <div className="alert warn"><AlertTriangle /><div className="grow small">Los pagos ({soles(pagado)}) superan el nuevo total. Corrige primero el monto de un pago.</div></div>}
      </div>
    </Modal>
  )
}
