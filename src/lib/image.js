/** Reduce la captura antes de subirla (máx 1600px, JPEG ~80%) para ahorrar espacio */
export async function comprimirImagen(file, max = 1600, calidad = 0.8) {
  if (!file || !file.type.startsWith('image/')) throw new Error('El archivo no es una imagen')
  const bmp = await cargar(file)
  const escala = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * escala), h = Math.round(bmp.height * escala)
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  canvas.getContext('2d').drawImage(bmp, 0, 0, w, h)
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', calidad))
  return blob || file
}

function cargar(file) {
  if ('createImageBitmap' in window) return createImageBitmap(file)
  return new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = rej
    img.src = URL.createObjectURL(file)
  })
}
