import { useState } from 'react'
import { Banknote, Smartphone, CheckCircle2, Loader2 } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useUI } from '../context/UIContext'
import { soles, aInputLocal, fechaHora, diasDesde } from '../lib/format'
import Modal from './Modal'
import KeyOptions from './KeyOptions'
import ImagePicker from './ImagePicker'

const OPC = [
  { v: 'efectivo', label: 'Efectivo', icon: Banknote },
  { v: 'yape', label: 'Yape', icon: Smartphone },
  { v: 'plin', label: 'Plin', icon: Smartphone }
]

/** Registrar el cobro de una venta fiada */
export default function CobroModal({ venta, onClose }) {
  const { actualizar, subirComprobante } = useData()
  const { toast } = useUI()
  const [metodo, setMetodo] = useState('efectivo')
  const [fecha, setFecha] = useState(aInputLocal())
  const [notas, setNotas] = useState('')
  const [file, setFile] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const guardar = async (cerrar) => {
    setGuardando(true)
    try {
      const ruta = file ? await subirComprobante(file) : null
      await actualizar('ventas', venta.id, {
        estado: 'pagado',
        metodo_cobro: metodo,
        fecha_cobro: new Date(fecha).toISOString(),
        notas_cobro: notas.trim() || null,
        ...(ruta ? { comprobante_path: ruta } : {})
      })
      toast(`Cobrado ${soles(venta.total)} de ${venta.cliente}`)
      cerrar()
    } catch (e) {
      toast(e.message, 'bad'); setGuardando(false)
    }
  }

  return (
    <Modal titulo="Registrar cobro" onClose={onClose}
      pie={(cerrar) => (<>
        <button className="key" onClick={() => cerrar()}>Cancelar</button>
        <button className="key primary" disabled={guardando} onClick={() => guardar(cerrar)}>
          {guardando ? <Loader2 className="spin" /> : <CheckCircle2 />}Marcar cobrado
        </button>
      </>)}>
      <div className="form">
        <div className="summary">
          <div className="s-row"><span>Cliente</span><b style={{ fontFamily: 'var(--font)' }}>{venta.cliente}</b></div>
          <div className="s-row"><span>Fiado el</span><b>{fechaHora(venta.fecha)} · {diasDesde(venta.fecha)}d</b></div>
          <div className="s-row big"><span>Monto</span><b>{soles(venta.total)}</b></div>
        </div>
        <div className="field"><label>¿Cómo pagó?</label><KeyOptions opciones={OPC} value={metodo} onChange={setMetodo} /></div>
        <div className="field"><label>Fecha del cobro</label><input type="datetime-local" className="input" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
        {metodo !== 'efectivo' && <ImagePicker file={file} onChange={setFile} />}
        <div className="field"><label>Notas <span className="t-3">opcional</span></label><input className="input" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej. pagó la mitad en efectivo" /></div>
      </div>
    </Modal>
  )
}
