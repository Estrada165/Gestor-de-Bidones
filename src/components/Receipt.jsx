import { useEffect, useState } from 'react'
import { Image as ImgIco, Download, ExternalLink } from 'lucide-react'
import { useData } from '../context/DataContext'
import Modal from './Modal'

/** Miniatura de comprobante; al tocar abre el visor */
export default function Receipt({ ruta, titulo = 'Comprobante' }) {
  const { urlComprobante } = useData()
  const [url, setUrl] = useState(null)
  const [abierto, setAbierto] = useState(false)

  useEffect(() => {
    let vivo = true
    if (ruta) urlComprobante(ruta).then((u) => vivo && setUrl(u))
    return () => { vivo = false }
  }, [ruta, urlComprobante])

  if (!ruta) return null
  return (
    <>
      <button type="button" className="receipt" onClick={(e) => { e.stopPropagation(); setAbierto(true) }} title="Ver captura">
        {url ? <img src={url} alt="" loading="lazy" /> : <ImgIco />}
      </button>
      {abierto && (
        <Modal titulo={titulo} onClose={() => setAbierto(false)} wide sinPadding
          pie={<>
            <a className="key sm" href={url} target="_blank" rel="noreferrer"><ExternalLink />Abrir</a>
            <a className="key sm primary" href={url} download><Download />Descargar</a>
          </>}>
          <div className="viewer">{url ? <img src={url} alt="Comprobante de pago" /> : <span className="t-3">Cargando…</span>}</div>
        </Modal>
      )}
    </>
  )
}
