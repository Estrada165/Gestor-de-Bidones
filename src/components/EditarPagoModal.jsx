import { useState } from 'react'
import { Save, Loader2, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useData } from '../context/DataContext'
import { useUI } from '../context/UIContext'
import { soles, aInputLocal } from '../lib/format'
import Modal from './Modal'
import KeyOptions from './KeyOptions'
import ImagePicker from './ImagePicker'
import Receipt from './Receipt'
import { METODOS_PAGO } from './PagoModal'

/** Editar (o eliminar) un pago hecho a un proveedor. maximo = total del pedido − otros pagos */
export default function EditarPagoModal({ pago, pedido, maximo, onClose }) {
  const { actualizar, eliminar, subirComprobante } = useData()
  const { toast, confirm } = useUI()
  const [monto, setMonto] = useState(Number(pago.monto).toFixed(2))
  const [metodo, setMetodo] = useState(pago.metodo)
  const [fecha, setFecha] = useState(aInputLocal(pago.fecha))
  const [notas, setNotas] = useState(pago.notas || '')
  const [file, setFile] = useState(null)
  const [quitar, setQuitar] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const m = Number(monto)
  const valido = m > 0 && m <= maximo + 0.009
  const capturaActual = quitar ? null : pago.comprobante_path

  const guardar = async (cerrar) => {
    if (!valido) return toast(`El monto debe estar entre S/ 0.01 y ${soles(maximo)}`, 'warn')
    setGuardando(true)
    try {
      const ruta = file ? await subirComprobante(file) : capturaActual
      await actualizar('pagos_pedido', pago.id, { monto: +m.toFixed(2), metodo, fecha: new Date(fecha).toISOString(), notas: notas.trim() || null, comprobante_path: ruta })
      if (pago.comprobante_path && pago.comprobante_path !== ruta) await supabase.storage.from('comprobantes').remove([pago.comprobante_path])
      toast('Pago actualizado')
      cerrar()
    } catch (e) { toast(e.message, 'bad'); setGuardando(false) }
  }

  const borrar = async (cerrar) => {
    if (!(await confirm({ titulo: 'Eliminar pago', peligro: true, textoOk: 'Sí, eliminar', mensaje: `¿Eliminar el pago de ${soles(pago.monto)} a ${pedido.proveedor}? Lo que debes vuelve a subir.` }))) return
    try { await eliminar('pagos_pedido', pago.id, [pago.comprobante_path]); toast('Pago eliminado'); cerrar() } catch (e) { toast(e.message, 'bad') }
  }

  return (
    <Modal titulo={`Editar pago · ${pedido.proveedor}`} onClose={onClose}
      pie={(cerrar) => (<>
        <button className="key danger" style={{ marginRight: 'auto' }} onClick={() => borrar(cerrar)}><Trash2 /><span className="hide-m">Eliminar</span></button>
        <button className="key" onClick={() => cerrar()}>Cancelar</button>
        <button className="key primary" disabled={guardando || !valido} onClick={() => guardar(cerrar)}>{guardando ? <Loader2 className="spin" /> : <Save />}Guardar</button>
      </>)}>
      <div className="form">
        <div className="field">
          <label>Monto <span className="t-3">máx. {soles(maximo)}</span></label>
          <div className="input-wrap"><span className="prefix">S/</span><input className="input mono" inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value.replace(',', '.'))} /></div>
        </div>
        <div className="field"><label>Método</label><KeyOptions opciones={METODOS_PAGO} value={metodo} onChange={setMetodo} size="sm" /></div>
        <div className="field"><label>Fecha y hora del pago</label><input type="datetime-local" className="input" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
        <div className="field">
          <label>Captura del pago</label>
          {capturaActual && !file && (
            <div className="drop has" style={{ cursor: 'default' }}>
              <Receipt ruta={capturaActual} />
              <div className="grow small">Captura guardada</div>
              <button type="button" className="key ghost sm" onClick={() => setQuitar(true)}>Quitar</button>
            </div>
          )}
          <ImagePicker file={file} onChange={setFile} label={capturaActual ? 'Cambiar por otra captura' : 'Adjuntar captura'} />
        </div>
        <div className="field"><label>Notas <span className="t-3">opcional</span></label><input className="input" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Nº de operación, etc." /></div>
      </div>
    </Modal>
  )
}
