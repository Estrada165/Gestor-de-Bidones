import { useState } from 'react'
import { Eye, EyeOff, LogIn, UserPlus, AlertCircle, Loader2, ImageUp, Wifi, Smartphone, Moon, Sun } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useUI } from '../context/UIContext'
import Logo from '../components/Logo'

export default function Login() {
  const { ingresar, registrar } = useAuth()
  const { tema, toggleTema } = useUI()
  const [modo, setModo] = useState('entrar')
  const [f, setF] = useState({ usuario: '', password: '', nombre: '', negocio: '', codigo: '' })
  const [ver, setVer] = useState(false)
  const [unirse, setUnirse] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  const enviar = async (e) => {
    e.preventDefault()
    setError('')
    if (!f.usuario.trim() || !f.password) return setError('Completa usuario y contraseña')
    setEnviando(true)
    try {
      if (modo === 'entrar') await ingresar(f.usuario, f.password)
      else {
        if (f.password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres')
        await registrar({ ...f, codigo: unirse ? f.codigo : '' })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  const TemaIco = tema === 'dark' ? Sun : Moon

  return (
    <div className="auth">
      <section className="auth-art">
        <div className="ripple"><span /><span /><span /><span /></div>
        <div className="big-drop"><Logo size={120} /></div>
        <div className="brand" style={{ padding: 0, position: 'relative' }}>
          <div className="brand-mark"><Logo /></div>
          <div><div className="brand-name">Gestor Agua</div><div className="brand-sub">control de bidones</div></div>
        </div>
        <div style={{ position: 'relative' }}>
          <h2>Cada bidón, cada sol, <em>en su lugar.</em></h2>
          <div className="feat" style={{ marginTop: 22 }}>
            <span><ImageUp />Capturas de pago</span>
            <span><Wifi />Sincronizado en la nube</span>
            <span><Smartphone />Instalable en el celular</span>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <form className="auth-box" onSubmit={enviar}>
          <div className="row between">
            <div className="brand-mark show-m-auth"><Logo /></div>
            <button type="button" className="key sm icon" onClick={toggleTema} aria-label="Tema" style={{ marginLeft: 'auto' }}><TemaIco /></button>
          </div>
          <div>
            <h1>{modo === 'entrar' ? 'Bienvenido de vuelta' : 'Crear cuenta'}</h1>
            <p className="sub">{modo === 'entrar' ? 'Ingresa con tu usuario y contraseña.' : 'Solo usuario y contraseña. Sin correo, sin verificación.'}</p>
          </div>

          <div className="seg fill">
            <button type="button" className={modo === 'entrar' ? 'on' : ''} onClick={() => { setModo('entrar'); setError('') }}><LogIn />Ingresar</button>
            <button type="button" className={modo === 'crear' ? 'on' : ''} onClick={() => { setModo('crear'); setError('') }}><UserPlus />Crear cuenta</button>
          </div>

          <div className="form">
            <div className="field">
              <label>Usuario</label>
              <input className="input" value={f.usuario} onChange={set('usuario')} placeholder="ej. carlos" autoCapitalize="none" autoCorrect="off" autoComplete="username" autoFocus />
            </div>
            <div className="field">
              <label>Contraseña</label>
              <div className="input-wrap">
                <input className="input" type={ver ? 'text' : 'password'} value={f.password} onChange={set('password')} placeholder="••••••" autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} style={{ paddingRight: 44 }} />
                <button type="button" className="key ghost icon sm pass-toggle" onClick={() => setVer(!ver)} aria-label="Ver contraseña">{ver ? <EyeOff /> : <Eye />}</button>
              </div>
            </div>

            {modo === 'crear' && (
              <>
                <div className="field">
                  <label>Tu nombre <span className="t-3">opcional</span></label>
                  <input className="input" value={f.nombre} onChange={set('nombre')} placeholder="Cómo te mostramos en la app" />
                </div>
                <label className="switch">
                  <input type="checkbox" checked={unirse} onChange={(e) => setUnirse(e.target.checked)} />
                  <span className="track" />
                  <span>Unirme a un negocio existente</span>
                </label>
                {unirse ? (
                  <div className="field">
                    <label>Código de invitación</label>
                    <input className="input mono" value={f.codigo} onChange={set('codigo')} placeholder="ABC123" maxLength={6} style={{ textTransform: 'uppercase', letterSpacing: '0.2em' }} />
                    <span className="hint">Lo encuentras en Ajustes → Equipo de la cuenta principal.</span>
                  </div>
                ) : (
                  <div className="field">
                    <label>Nombre del negocio <span className="t-3">opcional</span></label>
                    <input className="input" value={f.negocio} onChange={set('negocio')} placeholder="Gestor Agua" />
                    <span className="hint">Se puede cambiar después en Ajustes.</span>
                  </div>
                )}
              </>
            )}

            {error && <div className="err"><AlertCircle />{error}</div>}

            <button className="key primary lg block" disabled={enviando}>
              {enviando ? <Loader2 className="spin" /> : modo === 'entrar' ? <LogIn /> : <UserPlus />}
              {modo === 'entrar' ? 'Ingresar' : 'Crear y entrar'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
