import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseListo = Boolean(url && key && !url.includes('TU-PROYECTO'))

export const supabase = supabaseListo
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } })
  : null

export const USER_DOMAIN = import.meta.env.VITE_USER_DOMAIN || 'usuarios.gestoragua.app'

/** "carlos" → "carlos@usuarios.gestoragua.app"; si ya es correo, se deja igual */
export function usuarioAEmail(usuario) {
  const u = String(usuario || '').trim().toLowerCase()
  return u.includes('@') ? u : `${u}@${USER_DOMAIN}`
}

export function traducirError(err) {
  const m = String(err?.message || err || '')
  if (/Invalid login credentials/i.test(m)) return 'Usuario o contraseña incorrectos'
  if (/already registered|already exists|duplicate key.*usuario/i.test(m)) return 'Ese usuario ya existe'
  if (/CODIGO_INVALIDO|Database error saving new user/i.test(m)) return 'El código de invitación no es válido'
  if (/Password should be at least/i.test(m)) return 'La contraseña debe tener al menos 6 caracteres'
  if (/Email not confirmed/i.test(m)) return 'Falta desactivar "Confirm email" en Supabase (ver README)'
  if (/Signups not allowed/i.test(m)) return 'El registro de nuevas cuentas está desactivado'
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Sin conexión con el servidor'
  if (/row-level security/i.test(m)) return 'No tienes permiso para esta acción'
  return m || 'Ocurrió un error'
}
