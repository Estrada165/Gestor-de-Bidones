import { useEffect, useMemo, useRef, useState } from 'react'
import { soles, fecha } from '../lib/format'

/** Barras = ventas, línea = ganancia. datos: [{ fecha, ventas, ganancia, bidones, paso }] */
export default function Chart({ datos }) {
  const [hover, setHover] = useState(null)
  const ref = useRef(null)
  const [W, setW] = useState(800)
  const [H, setH] = useState(240)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const ro = new ResizeObserver(([e]) => { setW(Math.max(260, e.contentRect.width)); setH(Math.max(160, e.contentRect.height)) })
    ro.observe(el); return () => ro.disconnect()
  }, [])
  const P = { l: 44, r: 10, t: 12, b: 26 }

  const calc = useMemo(() => {
    const n = datos.length || 1
    const max = Math.max(1, ...datos.map((d) => Math.max(d.ventas, d.ganancia)))
    const paso = Math.pow(10, Math.floor(Math.log10(max)))
    const top = Math.ceil(max / paso) * paso
    const iw = W - P.l - P.r, ih = H - P.t - P.b
    const bw = iw / n
    const x = (i) => P.l + bw * i + bw / 2
    const y = (v) => P.t + ih - (v / top) * ih
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => top * t)
    const cadaLbl = Math.ceil(n / Math.max(4, Math.floor(iw / 46)))
    const linea = datos.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(d.ganancia).toFixed(1)}`).join(' ')
    return { n, top, iw, ih, bw, x, y, ticks, cadaLbl, linea }
  }, [datos, W, H])

  const { n, bw, x, y, ticks, cadaLbl, linea, ih } = calc

  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect()
    const rel = ((e.clientX - r.left) / r.width) * W
    const i = Math.max(0, Math.min(n - 1, Math.floor((rel - P.l) / bw)))
    setHover({ i, left: ((x(i)) / W) * r.width, top: (y(Math.max(datos[i].ventas, datos[i].ganancia)) / H) * r.height })
  }

  const lbl = (d) => (d.paso > 1 ? `Sem. ${fecha(d.fecha)}` : fecha(d.fecha))

  return (
    <div className="chart" ref={ref} onMouseMove={onMove} onMouseLeave={() => setHover(null)}
      onTouchStart={(e) => onMove(e.touches[0])} onTouchMove={(e) => onMove(e.touches[0])}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="cArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity=".18" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line className="c-grid" x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} strokeDasharray="3 4" />
            <text className="c-axis" x={P.l - 8} y={y(t) + 3} textAnchor="end">{t >= 1000 ? (t / 1000).toFixed(1) + 'k' : Math.round(t)}</text>
          </g>
        ))}
        {datos.map((d, i) => {
          const h = Math.max(d.ventas > 0 ? 2 : 0, P.t + ih - y(d.ventas))
          const w = Math.max(2, Math.min(28, bw * 0.62))
          return <rect key={i} className={`c-bar ${hover?.i === i ? 'on' : ''}`} x={x(i) - w / 2} y={P.t + ih - h} width={w} height={h} rx={Math.min(4, w / 3)} />
        })}
        <path className="c-area" d={`${linea} L${x(n - 1)} ${P.t + ih} L${x(0)} ${P.t + ih} Z`} />
        <path className="c-line" d={linea} vectorEffect="non-scaling-stroke" />
        {hover && <circle className="c-pt" cx={x(hover.i)} cy={y(datos[hover.i].ganancia)} r="4" vectorEffect="non-scaling-stroke" />}
        {datos.map((d, i) => (i % cadaLbl === 0 ? (
          <text key={i} className="c-axis" x={x(i)} y={H - 6} textAnchor="middle">{d.paso > 1 ? fecha(d.fecha) : new Date(d.fecha).getDate()}</text>
        ) : null))}
      </svg>
      {hover && datos[hover.i] && (
        <div className="chart-tip" style={{ left: hover.left, top: hover.top }}>
          <div className="t-3 tiny mono" style={{ marginBottom: 4 }}>{lbl(datos[hover.i])}</div>
          <div className="r"><span className="t-2">Ventas</span><b>{soles(datos[hover.i].ventas)}</b></div>
          <div className="r"><span className="t-2">Ganancia</span><b className="t-accent">{soles(datos[hover.i].ganancia)}</b></div>
          <div className="r"><span className="t-2">Bidones</span><b>{datos[hover.i].bidones}</b></div>
        </div>
      )}
    </div>
  )
}
