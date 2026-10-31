import { METODOS } from './format'

export function descargar(contenido, nombre, tipo) {
  const blob = contenido instanceof Blob ? contenido : new Blob([contenido], { type: tipo })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = nombre
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const esc = (c) => `"${String(c ?? '').replace(/"/g, '""')}"`
const f = (d) => (d ? new Date(d).toLocaleString('es-PE') : '')
const hoy = () => new Date().toISOString().slice(0, 10)

export function csvVentas(ventas) {
  const head = ['Fecha', 'Tipo', 'Cliente', 'Cantidad', 'Precio unit.', 'Total', 'Ganancia', 'Método', 'Estado', 'Fecha cobro', 'Cobrado con', 'Notas']
  const rows = ventas.map((v) => [
    f(v.fecha), v.tipo === 'personal' ? 'Uso propio' : 'Venta', v.cliente, v.cantidad,
    Number(v.precio_unit).toFixed(2), Number(v.total).toFixed(2), Number(v.ganancia).toFixed(2),
    METODOS[v.metodo] || v.metodo, v.estado, f(v.fecha_cobro), METODOS[v.metodo_cobro] || '', v.notas
  ])
  descargar('﻿' + [head, ...rows].map((r) => r.map(esc).join(',')).join('\n'), `ventas_${hoy()}.csv`, 'text/csv;charset=utf-8')
}

export function csvPedidos(pedidos, pagos) {
  const head = ['Fecha', 'Proveedor', 'Teléfono', 'Cantidad', 'Vacíos devueltos', 'Costo unit.', 'Total', 'Pagado', 'Saldo', 'Notas']
  const rows = pedidos.map((p) => {
    const pagado = pagos.filter((x) => x.pedido_id === p.id).reduce((s, x) => s + Number(x.monto), 0)
    return [f(p.fecha), p.proveedor, p.telefono, p.cantidad, p.devueltos, Number(p.costo_unit).toFixed(2), Number(p.total).toFixed(2), pagado.toFixed(2), Math.max(0, p.total - pagado).toFixed(2), p.notas]
  })
  descargar('﻿' + [head, ...rows].map((r) => r.map(esc).join(',')).join('\n'), `pedidos_${hoy()}.csv`, 'text/csv;charset=utf-8')
}

export function jsonRespaldo(data) {
  const { ventas, pedidos, pagos, movimientos, ajustes, config } = data
  const out = { app: 'gestor-agua', version: 2, fecha: new Date().toISOString(), config, ventas, pedidos, pagos, movimientos, ajustes }
  descargar(JSON.stringify(out, null, 2), `respaldo_gestor-agua_${hoy()}.json`, 'application/json')
}
