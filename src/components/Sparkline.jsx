import { useId } from 'react'

export default function Sparkline({ datos, className = 'spark' }) {
  const id = useId().replace(/:/g, '')
  if (!datos?.length || datos.every((d) => !d)) return null
  const w = 120, h = 40, max = Math.max(...datos, 1)
  const pts = datos.map((d, i) => [(i / Math.max(1, datos.length - 1)) * w, h - 4 - (d / max) * (h - 10)])
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')
  return (
    <svg className={className} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity=".22" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w} ${h} L0 ${h} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" opacity=".85" />
    </svg>
  )
}
