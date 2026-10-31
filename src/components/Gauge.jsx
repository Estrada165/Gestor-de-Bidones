export default function Gauge({ valor, max, nivel, etiqueta = 'bidones', size = '' }) {
  const R = 52, C = 2 * Math.PI * R
  const pct = max > 0 ? Math.max(0, Math.min(1, valor / max)) : 0
  const cls = nivel === 'vacio' || nivel === 'critico' ? 'bad' : nivel === 'bajo' ? 'warn' : ''
  return (
    <div className={`gauge ${size} ${cls}`}>
      <svg viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="58" fill="none" className="g-ticks" strokeWidth="1" strokeDasharray="1 5.07" />
        <circle cx="60" cy="60" r={R} fill="none" className="g-track" strokeWidth="9" />
        <circle cx="60" cy="60" r={R} fill="none" className="g-fill" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - pct)} />
      </svg>
      <div className="gauge-center"><div><b>{valor}</b><span>{etiqueta}</span></div></div>
    </div>
  )
}
