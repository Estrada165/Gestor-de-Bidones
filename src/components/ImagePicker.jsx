import { useEffect, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'

/** Selector de captura de pago con vista previa */
export default function ImagePicker({ file, onChange, label = 'Adjuntar captura del pago' }) {
  const ref = useRef(null)
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    if (!file) { setPreview(null); return }
    const u = URL.createObjectURL(file)
    setPreview(u)
    return () => URL.revokeObjectURL(u)
  }, [file])

  // Pegar captura con Ctrl+V
  useEffect(() => {
    const onPaste = (e) => {
      const it = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'))
      if (it) onChange(it.getAsFile())
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [onChange])

  return (
    <div className={`drop ${file ? 'has' : ''}`} onClick={() => ref.current?.click()} role="button" tabIndex={0}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f?.type.startsWith('image/')) onChange(f) }}>
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => { onChange(e.target.files?.[0] || null); e.target.value = '' }} />
      {preview ? <img className="thumb" src={preview} alt="Captura" /> : <div className="d-ico"><ImagePlus /></div>}
      <div className="grow">
        <div className="small b" style={{ fontWeight: 500 }}>{file ? 'Captura lista' : label}</div>
        <div className="hint">{file ? `${(file.size / 1024).toFixed(0)} KB · se comprimirá al subir` : 'Toca para elegir, arrastra o pega (Ctrl+V)'}</div>
      </div>
      {file && (
        <button type="button" className="key ghost icon sm" onClick={(e) => { e.stopPropagation(); onChange(null) }} aria-label="Quitar"><X /></button>
      )}
    </div>
  )
}
