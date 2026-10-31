// Importa el respaldo JSON de la versión anterior (AquaPure, localStorage)
// o un respaldo de esta versión. Se insertan como registros nuevos.

const low = (s) => String(s || '').trim().toLowerCase()
const metodoV1 = (m) => {
  const x = low(m)
  if (['efectivo', 'yape', 'plin', 'fiado'].includes(x)) return x
  if (x === 'personal') return 'personal'
  return 'efectivo'
}
const iso = (d) => { const t = new Date(d); return isNaN(t) ? new Date().toISOString() : t.toISOString() }

export function prepararImportacion(json) {
  // Respaldo v2
  if (json?.app === 'gestor-agua') {
    const strip = (arr = []) => arr.map(({ id, negocio_id, created_by, created_at, ...r }) => ({ _old: id, ...r }))
    return {
      origen: 'Gestor Agua v2',
      ventas: strip(json.ventas).map((v) => ({ ...v, comprobante_path: null })),
      pedidos: strip(json.pedidos),
      pagos: strip(json.pagos).map((p) => ({ ...p, comprobante_path: null })),
      movimientos: strip(json.movimientos),
      ajustes: strip(json.ajustes),
      stockObjetivo: null
    }
  }

  // Respaldo v1 (AquaPure)
  if (!Array.isArray(json?.ventas) && !Array.isArray(json?.pedidos)) {
    throw new Error('El archivo no parece un respaldo válido')
  }
  const ventas = (json.ventas || []).map((v) => {
    const personal = v.tipo === 'personal' || v.estado === 'Personal'
    const cant = Math.max(1, parseInt(v.cantidad) || 1)
    const precio = Number(v.precioUnitario ?? (v.total && cant ? v.total / cant : 0)) || 0
    const costo = Number(v.costoUnitario ?? 0) || 0
    const metodo = personal ? 'personal' : metodoV1(v.metodoPago)
    const pagado = personal ? 'personal' : low(v.estado) === 'pendiente' ? 'pendiente' : 'pagado'
    return {
      tipo: personal ? 'personal' : 'venta',
      cliente: v.cliente || (personal ? 'Uso propio' : ''),
      cantidad: cant,
      precio_unit: personal ? 0 : precio,
      costo_unit: costo,
      total: personal ? 0 : Number(v.total ?? cant * precio) || 0,
      ganancia: personal ? 0 : Number(v.ganancia ?? cant * (precio - costo)) || 0,
      metodo,
      estado: pagado,
      fecha: iso(v.fecha),
      fecha_cobro: metodo === 'fiado' && pagado === 'pagado' && v.fechaPago ? iso(v.fechaPago) : null,
      metodo_cobro: metodo === 'fiado' && pagado === 'pagado' ? (['yape', 'plin'].includes(low(v.metodoPagoFiado || v.metodoCobro)) ? low(v.metodoPagoFiado || v.metodoCobro) : 'efectivo') : null,
      notas: v.notas || null,
      notas_cobro: v.notasPago || null
    }
  })

  const pedidos = []
  const pagos = []
  ;(json.pedidos || []).forEach((p, i) => {
    const cant = Math.max(1, parseInt(p.cantidad) || 1)
    const total = Number(p.costo ?? 0) || 0
    const tmp = `p${i}`
    pedidos.push({
      _tmp: tmp,
      proveedor: p.proveedor || 'Proveedor',
      telefono: p.telefono || null,
      cantidad: cant,
      devueltos: parseInt(p.devueltos) || 0,
      costo_unit: Number(p.precioUnitario ?? (cant ? total / cant : 0)) || 0,
      total,
      fecha: iso(p.fecha),
      notas: p.notas || null
    })
    if (low(p.estadoPago) === 'pagado' && total > 0) {
      pagos.push({
        _pedido: tmp,
        monto: total,
        metodo: ['yape', 'plin', 'transferencia'].includes(low(p.metodoPago)) ? low(p.metodoPago) : 'efectivo',
        fecha: iso(p.fechaPago || p.fecha),
        notas: p.notasPago || 'Importado de la versión anterior'
      })
    }
  })

  const movimientos = (json.movimientosDinero || []).map((m) => ({
    tipo: ['gasto', 'retiro', 'prestamo', 'ingreso'].includes(low(m.tipo)) ? low(m.tipo) : 'gasto',
    metodo: 'efectivo',
    monto: Math.abs(Number(m.monto) || 0),
    descripcion: m.descripcion || '',
    devuelto: Boolean(m.devuelto),
    fecha: iso(m.fecha)
  })).filter((m) => m.monto > 0)

  return {
    origen: 'AquaPure v1',
    ventas, pedidos, pagos, movimientos, ajustes: [],
    stockObjetivo: Number.isFinite(Number(json.inventario)) ? Number(json.inventario) : null
  }
}
