export default function Empty({ icono: I, titulo, texto, children }) {
  return (
    <div className="empty">
      {I && <div className="e-ico"><I /></div>}
      <b>{titulo}</b>
      {texto && <p>{texto}</p>}
      {children}
    </div>
  )
}
