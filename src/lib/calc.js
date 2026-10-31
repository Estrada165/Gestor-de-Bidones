// Cálculos derivados. El stock NUNCA se guarda: se calcula de los registros,
// así no se descuadra si se borra o edita algo.

const sum = (arr, f) => arr.reduce((s, x) => s + Number(f(x) || 0), 0)

export function calcularStock({ ventas, pedidos, ajustes }) {
  return sum(ajustes, (a) => a.cantidad) + sum(pedidos, (p) => p.cantidad) - sum(ventas, (v) => v.cantidad)
}

export function pagadoDePedido(pedido, pagos) {
  return sum(pagos.filter((p) => p.pedido_id === pedido.id), (p) => p.monto)
}

export function estadoPedido(pedido, pagos) {
  const pagado = pagadoDePedido(pedido, pagos)
  const total = Number(pedido.total)
  const saldo = Math.max(0, +(total - pagado).toFixed(2))
  const estado = pagado <= 0 ? 'pendiente' : saldo <= 0.009 ? 'pagado' : 'parcial'
  return { pagado, saldo, total, estado, pct: total > 0 ? Math.min(1, pagado / total) : 1 }
}

/** Caja: lo que entró menos lo que salió, separado por método */
export function calcularCaja({ ventas, pagos, movimientos }) {
  const porMetodo = { efectivo: 0, yape: 0, plin: 0, transferencia: 0 }
  const add = (m, v) => { const k = porMetodo[m] !== undefined ? m : 'efectivo'; porMetodo[k] += v }

  let cobrado = 0
  for (const v of ventas) {
    if (v.tipo !== 'venta' || v.estado !== 'pagado') continue
    const metodo = v.metodo === 'fiado' ? v.metodo_cobro || 'efectivo' : v.metodo
    cobrado += Number(v.total); add(metodo, Number(v.total))
  }
  let pagadoProv = 0
  for (const p of pagos) { pagadoProv += Number(p.monto); add(p.metodo, -Number(p.monto)) }

  let gastos = 0, retiros = 0, prestamos = 0, ingresos = 0
  for (const m of movimientos) {
    const v = Number(m.monto)
    if (m.tipo === 'gasto') { gastos += v; add(m.metodo, -v) }
    else if (m.tipo === 'retiro') { retiros += v; add(m.metodo, -v) }
    else if (m.tipo === 'prestamo' && !m.devuelto) { prestamos += v; add(m.metodo, -v) }
    else if (m.tipo === 'ingreso') { ingresos += v; add(m.metodo, v) }
  }
  const saldo = cobrado + ingresos - pagadoProv - gastos - retiros - prestamos
  return { cobrado, pagadoProv, gastos, retiros, prestamos, ingresos, saldo, porMetodo }
}

export function porCobrar(ventas) {
  return ventas.filter((v) => v.tipo === 'venta' && v.estado === 'pendiente')
}

export function enRango(items, inicio, fin, campo = 'fecha') {
  const a = inicio.getTime(), b = fin.getTime()
  return items.filter((x) => { const t = new Date(x[campo]).getTime(); return t >= a && t <= b })
}

export function estadisticas({ ventas, pedidos, pagos, movimientos }, inicio, fin) {
  const vs = enRango(ventas, inicio, fin)
  const vv = vs.filter((v) => v.tipo === 'venta')
  const vp = vs.filter((v) => v.tipo === 'personal')
  const ps = enRango(pedidos, inicio, fin)
  const pg = enRango(pagos, inicio, fin)
  const mv = enRango(movimientos, inicio, fin)
  const vendido = sum(vv, (v) => v.total)
  const cobrado = sum(vv.filter((v) => v.estado === 'pagado'), (v) => v.total)
  const pendiente = sum(vv.filter((v) => v.estado === 'pendiente'), (v) => v.total)
  const ganancia = sum(vv, (v) => v.ganancia)
  const bidones = sum(vv, (v) => v.cantidad)
  const personal = sum(vp, (v) => v.cantidad)
  const compras = sum(ps, (p) => p.total)
  const comprados = sum(ps, (p) => p.cantidad)
  const pagosProv = sum(pg, (p) => p.monto)
  const gastos = sum(mv.filter((m) => m.tipo === 'gasto'), (m) => m.monto)
  const ticket = vv.length ? vendido / vv.length : 0
  const metodos = {}
  for (const v of vv) metodos[v.metodo] = (metodos[v.metodo] || 0) + Number(v.total)
  const clientes = {}
  for (const v of vv) {
    const k = v.cliente || 'Sin nombre'
    clientes[k] = clientes[k] || { nombre: k, total: 0, bidones: 0 }
    clientes[k].total += Number(v.total); clientes[k].bidones += v.cantidad
  }
  return {
    vv, vendido, cobrado, pendiente, ganancia, bidones, personal, compras, comprados,
    pagosProv, gastos, ticket, nVentas: vv.length, metodos,
    topClientes: Object.values(clientes).sort((a, b) => b.total - a.total).slice(0, 5)
  }
}

/** Serie diaria (o semanal si el rango es largo) para gráficos */
export function serie(ventas, inicio, fin) {
  const dias = Math.round((fin - inicio) / 86400000) + 1
  const paso = dias > 70 ? 7 : 1
  const n = Math.ceil(dias / paso)
  const out = Array.from({ length: n }, (_, i) => {
    const d = new Date(inicio); d.setDate(d.getDate() + i * paso)
    return { fecha: d, ventas: 0, ganancia: 0, bidones: 0, paso }
  })
  const base = new Date(inicio); base.setHours(0, 0, 0, 0)
  for (const v of ventas) {
    if (v.tipo !== 'venta') continue
    const d = new Date(v.fecha); d.setHours(0, 0, 0, 0)
    const i = Math.floor(Math.round((d - base) / 86400000) / paso)
    if (i >= 0 && i < n) { out[i].ventas += Number(v.total); out[i].ganancia += Number(v.ganancia); out[i].bidones += v.cantidad }
  }
  return out
}

export function nivelStock(stock, cfg) {
  if (stock <= 0) return 'vacio'
  if (stock <= (cfg?.stock_critico ?? 2)) return 'critico'
  if (stock <= (cfg?.stock_bajo ?? 5)) return 'bajo'
  return 'ok'
}
