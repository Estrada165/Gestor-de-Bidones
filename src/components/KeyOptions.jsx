/** Grupo de teclas seleccionables. opciones: [{ v, label, icon }] */
export default function KeyOptions({ opciones, value, onChange, size = '' }) {
  return (
    <div className="keys fill">
      {opciones.map(({ v, label, icon: I }) => (
        <button type="button" key={v} className={`key ${size} ${value === v ? 'on' : ''}`} onClick={() => onChange(v)}>
          {I && <I />}{label}
        </button>
      ))}
    </div>
  )
}
