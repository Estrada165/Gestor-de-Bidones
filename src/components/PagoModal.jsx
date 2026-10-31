import { useState } from 'react'
import { Banknote, Smartphone, Landmark, CheckCircle2, Loader2 } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useUI } from '../context/UIContext'
import { soles, aInputLocal, fecha as ff } from '../lib/format'
import Modal from './Modal'
import KeyOptions from './KeyOptions'
import ImagePicker from './ImagePicker'

export const METODOS_PAGO = [
  { v: 'efectivo', label: 'Efectivo', icon: Banknote },
  { v: 'yape', label: 'Yape', icon: Smartphone },
  { v: 'plin', label: 'Plin', icon: Smartphone },
  { v: 'transferencia', label: 'Banco', icon: Landmark }
]

/** Registrar un pago (total o parcial) a un pedido del proveedor */
export default function PagoModal({ pedido, saldo, onClose }) {
  const { insertar, subirComprobante } = useData()
  const { toast } = useUI()
  const [monto, setMonto] = useState(saldo.toFixed(2))
  const [metodo, setMetodo] = useState('yape')
  const [fecha, setFecha] = useState(aInputLocal())
  const [notas, setNotas] = useState('')
  const [file, setFile] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const m = Number(monto)
  const valido = m > 0 && m <= saldo + 0.009

  const guardar = async (cerrar) => {
    if (!valido) return toast(`El monto debe estar entre 0.01 y ${soles(saldo)}`, 'warn')
    setGuardando(true)
    try {
      const ruta = file ? await subirComprobante(file) : null
      await insertar('pagos_pedido', {
        pedido_id: pedido.id, monto: +m.toFixed(2), metodo,
        fecha: new Date(fecha).toISOString(), notas: notas.trim() || null, comprobante_path: ruta
      })
      toast(m >= saldo - 0.009 ? `Pedido de ${pedido.proveedor} pagado` : `Pago parcial de ${soles(m)} registrado`)
      cerrar()
    } catch (e) {
      toast(e.message, 'bad'); setGuardando(false)
    }
  }

  return (
    <Modal titulo="Pagar pedido" onClose={onClose}
      pie={(cerrar) => (<>
        <button className="key" onClick={() => cerrar()}>Cancelar</button>
        <button className="key primary" disabled={guardando || !valido} onClick={() => guardar(cerrar)}>
          {guardando ? <Loader2 className="spin" /> : <CheckCircle2 />}Registrar pago
        </button>
      </>)}>
      <div className="form">
        <div className="summary">
          <div className="s-row"><span>Proveedor</span><b style={{ fontFamily: 'var(--font)' }}>{pedido.proveedor}</b></div>
          <div className="s-row"><span>Pedido</span><b>{pedido.cantidad} bid. · {ff(pedido.fecha)} · {soles(pedido.total)}</b></div>
          <div className="s-row big"><span>Saldo pendiente</span><b>{soles(saldo)}</b></div>
        </div>
        <div className="field">
          <label>Monto a pagar
            <span className="keys">
              <button type="button" className="key sm" onClick={() => setMonto((saldo / 2).toFixed(2))}>Mitad</button>
              <button type="button" className="key sm" onClick={() => setMonto(saldo.toFixed(2))}>Todo</button>
            </span>
          </label>
          <div className="input-wrap"><span className="prefix">S/</span><input className="input mono" inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value.replace(',', '.'))} /></div>
        </div>
        <div className="field"><label>Método</label><KeyOptions opciones={METODOS_PAGO} value={metodo} onChange={setMetodo} size="sm" /></div>
        <div className="field"><label>Fecha del pago</label><input type="datetime-local" className="input" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
        <div className="field"><label>Captura del pago <span className="t-3">recomendado</span></label><ImagePicker file={file} onChange={setFile} /></div>
        <div className="field"><label>Notas <span className="t-3">opcional</span></label><input className="input" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Nº de operación, etc." /></div>
      </div>
    </Modal>
  )
}
