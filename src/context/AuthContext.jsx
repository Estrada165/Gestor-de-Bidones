import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, usuarioAEmail, traducirError } from '../lib/supabase'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = cargando
  const [perfil, setPerfil] = useState(null)
  const [errorPerfil, setErrorPerfil] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null))
    return () => sub.subscription.unsubscribe()
  }, [])

  const cargarPerfil = useCallback(async () => {
    if (!session?.user) { setPerfil(null); return }
    const { data, error } = await supabase.from('perfiles').select('*').eq('id', session.user.id).maybeSingle()
    if (error) { setErrorPerfil(traducirError(error)); return }
    if (!data) { setErrorPerfil('Tu cuenta no tiene perfil. ¿Ejecutaste el schema.sql antes de crearla?'); return }
    setErrorPerfil(null)
    setPerfil(data)
  }, [session?.user?.id])

  useEffect(() => { cargarPerfil() }, [cargarPerfil])

  const ingresar = async (usuario, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: usuarioAEmail(usuario), password })
    if (error) throw new Error(traducirError(error))
  }

  const registrar = async ({ usuario, password, nombre, codigo, negocio }) => {
    const u = String(usuario).trim().toLowerCase()
    if (!/^[a-z0-9._-]{3,30}$/.test(u)) throw new Error('El usuario debe tener 3–30 caracteres: letras, números, punto o guion')
    const { data, error } = await supabase.auth.signUp({
      email: usuarioAEmail(u),
      password,
      options: { data: { usuario: u, nombre: nombre?.trim() || u, codigo: codigo?.trim() || '', negocio: negocio?.trim() || '' } }
    })
    if (error) throw new Error(traducirError(error))
    if (!data.session) await ingresar(u, password) // por si el proyecto no devuelve sesión al registrarse
  }

  const salir = () => supabase.auth.signOut()

  const cambiarPassword = async (password) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw new Error(traducirError(error))
  }

  const actualizarNombre = async (nombre) => {
    const { error } = await supabase.from('perfiles').update({ nombre }).eq('id', perfil.id)
    if (error) throw new Error(traducirError(error))
    setPerfil((p) => ({ ...p, nombre }))
  }

  const puedeEscribir = perfil && ['admin', 'operador'].includes(perfil.rol)
  const esAdmin = perfil?.rol === 'admin'

  return (
    <AuthCtx.Provider value={{ session, perfil, errorPerfil, ingresar, registrar, salir, cambiarPassword, actualizarNombre, puedeEscribir, esAdmin, recargarPerfil: cargarPerfil }}>
      {children}
    </AuthCtx.Provider>
  )
}
