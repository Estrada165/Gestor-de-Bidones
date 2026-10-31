import { useEffect, useState } from 'react'

// Guarda el evento de instalación de la PWA (Android / Chrome / Edge)
let diferido = null
const subs = new Set()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); diferido = e; subs.forEach((f) => f()) })
  window.addEventListener('appinstalled', () => { diferido = null; subs.forEach((f) => f()) })
}

export function useInstall() {
  const [, forzar] = useState(0)
  useEffect(() => { const f = () => forzar((x) => x + 1); subs.add(f); return () => subs.delete(f) }, [])
  const standalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone)
  const esIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)
  return {
    puedeInstalar: Boolean(diferido) && !standalone,
    instalado: standalone,
    esIOS,
    instalar: async () => { if (!diferido) return; diferido.prompt(); await diferido.userChoice; diferido = null; subs.forEach((f) => f()) }
  }
}
