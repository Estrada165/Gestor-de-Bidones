export const soles = (n) =>
  'S/ ' + Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const solesCorto = (n) => {
  const v = Number(n || 0)
  if (Math.abs(v) >= 10000) return 'S/ ' + (v / 1000).toLocaleString('es-PE', { maximumFractionDigits: 1 }) + 'k'
  return soles(v)
}

export const num = (n) => Number(n || 0).toLocaleString('es-PE')

const MESES_C = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const fmtDia = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

/** "29 oct" */
export const fecha = (d) => { const x = new Date(d); return `${x.getDate()} ${MESES_C[x.getMonth()]}` }
/** "29 oct 2026" */
export const fechaAno = (d) => `${fecha(d)} ${new Date(d).getFullYear()}`
/** "8:50 p. m." (12 horas, más fácil de leer) */
export const hora = (d) => {
  const x = new Date(d); const h = x.getHours(); const m = String(x.getMinutes()).padStart(2, '0')
  return `${h % 12 || 12}:${m} ${h < 12 ? 'a. m.' : 'p. m.'}`
}
export const fechaHora = (d) => `${fecha(d)}, ${hora(d)}`
export const diaLargo = (d = new Date()) => cap(fmtDia.format(new Date(d)))

/** "hoy, 8:50 p. m." · "ayer, 10:06 a. m." · "29 oct, 10:06 a. m." */
export function cuando(d) {
  const k = claveDia(d)
  if (k === claveDia(new Date())) return `hoy, ${hora(d)}`
  if (k === claveDia(new Date(Date.now() - 86400000))) return `ayer, ${hora(d)}`
  return fechaHora(d)
}

/** "1 bidón" · "3 bidones" */
export const bidones = (n) => `${n} ${Number(n) === 1 ? 'bidón' : 'bidones'}`
/** "hace 1 día" · "hace 3 días" · "hoy" */
export const haceDias = (d) => { const n = diasDesde(d); return n === 0 ? 'hoy' : n === 1 ? 'desde ayer' : `hace ${n} días` }

export const inicioDia = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
export const finDia = (d = new Date()) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x }
export const claveDia = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}` }

export function etiquetaDia(d) {
  const k = claveDia(d)
  const hoy = claveDia(new Date())
  const ayer = claveDia(new Date(Date.now() - 86400000))
  if (k === hoy) return 'Hoy'
  if (k === ayer) return 'Ayer'
  const x = new Date(d)
  const base = `${cap(DIAS[x.getDay()])} ${x.getDate()} de ${fmtDia.formatToParts(x).find((p) => p.type === 'month')?.value || MESES_C[x.getMonth()]}`
  return x.getFullYear() === new Date().getFullYear() ? base : `${base} ${x.getFullYear()}`
}

/** Días de calendario desde la fecha (ayer = 1, aunque hayan pasado menos de 24 h) */
export const diasDesde = (d) => Math.max(0, Math.round((inicioDia(new Date()) - inicioDia(d)) / 86400000))

export function haceTiempo(d) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return 'ahora'
  const m = Math.floor(s / 60); if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60); if (h < 24) return `hace ${h} h`
  const dd = Math.floor(h / 24); if (dd < 30) return `hace ${dd} d`
  return fecha(d)
}

/** valor para <input type="datetime-local"> en hora local */
export function aInputLocal(d = new Date()) {
  const x = new Date(d)
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset())
  return x.toISOString().slice(0, 16)
}
export const aInputFecha = (d = new Date()) => aInputLocal(d).slice(0, 10)

export const METODOS = {
  efectivo: 'Efectivo',
  yape: 'Yape',
  plin: 'Plin',
  transferencia: 'Transferencia',
  fiado: 'Fiado',
  personal: 'Uso propio'
}

export const iniciales = (s = '') => s.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('') || '?'

export function agruparPorDia(items, campo = 'fecha') {
  const map = new Map()
  for (const it of items) {
    const k = claveDia(it[campo])
    if (!map.has(k)) map.set(k, { clave: k, fecha: it[campo], items: [] })
    map.get(k).items.push(it)
  }
  return [...map.values()]
}
