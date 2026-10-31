# Gestor Agua v2

Control de bidones: ventas, fiados, pedidos a proveedores (con capturas de pago), inventario, caja y reportes.
React + Vite + Supabase. Instalable como app (PWA) en celular y PC.

---

## 1. Crear la base de datos (5 min)

1. Entra a [supabase.com](https://supabase.com) → **New project** (plan gratis).
2. Ve a **SQL Editor → New query**, pega todo el contenido de `supabase/schema.sql` y dale **Run**.
   Crea las tablas, la seguridad (RLS), el bucket privado `comprobantes` para las capturas y el alta automática de usuarios.
3. **Importante:** ve a **Authentication → Sign In / Providers → Email** y **desactiva "Confirm email"**. Guarda.
   (La app usa usuario + contraseña; por dentro los convierte en un correo interno que no existe, así que no debe intentar enviar correos.)
4. Copia tus claves en **Project Settings → API**: `Project URL` y `anon public key`.

## 2. Correr en tu PC

```bash
cp .env.example .env      # y pega ahí tu URL y anon key
npm install
npm run dev
```

Abre http://localhost:5173 → **Crear cuenta** → elige usuario y contraseña. Entras de frente, sin verificación.
La primera cuenta queda como **Administrador** de su negocio.

## 3. Publicar en Vercel

1. Sube la carpeta a un repo de GitHub.
2. En Vercel: **Add New → Project** → importa el repo (detecta Vite solo).
3. En **Settings → Environment Variables** agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. Deploy. Abre el link en el celular → **Instalar app** (Android/Chrome) o **Compartir → Agregar a inicio** (iPhone).

## 4. Sumar a otra persona (opcional)

En **Ajustes → Equipo** está el código de invitación (6 letras). La otra persona crea su cuenta, activa
**"Unirme a un negocio existente"** y escribe el código. Entra como *Operador* y puedes cambiarle el rol:

| Rol | Puede |
|---|---|
| Administrador | Todo + precios, nombre de la app, color, equipo |
| Operador | Registrar y borrar ventas, pedidos, pagos, caja |
| Solo lectura | Ver todo, no modificar |
| Inactivo | Sin acceso a los datos |

Cuando ya tengan sus cuentas, si quieres cerrar el registro: **Authentication → Sign In / Providers → "Allow new users to sign up"** en off.

## 5. Traer los datos de la versión anterior (AquaPure)

En la app vieja: **Reportes → Exportar JSON**. En la nueva: **Ajustes → Datos → Importar respaldo**.
Se importan ventas, fiados, uso propio, pedidos (los pagados se crean con su pago), gastos/préstamos, y se
agrega un ajuste para que el stock quede igual al de la versión anterior.

---

## Cómo funciona

- **Stock**: no se guarda un número; se calcula siempre con *ajustes + pedidos − ventas − uso propio*.
  Si borras o corriges algo, el stock se recalcula solo. El stock inicial se carga en **Inventario → Conteo**.
- **Caja**: *ventas cobradas + ingresos − pagos a proveedores − gastos − retiros − préstamos sin devolver*,
  separado en efectivo y digital (Yape/Plin/banco).
- **Pedidos**: cada pedido puede pagarse en partes. Cada pago guarda método, fecha, nota y captura.
- **Capturas**: se comprimen en el celular (máx. 1600 px, JPEG) antes de subir. El bucket es privado:
  solo tu negocio las ve, mediante enlaces temporales de 1 hora. Plan gratis de Supabase = 1 GB (~5 000+ capturas).
- **Tiempo real**: si dos dispositivos están abiertos, los cambios aparecen en ambos al instante.
- **Alertas de stock**: amarilla y roja configurables en **Ajustes → Precios y alertas** (por defecto 5 y 2).

## Estructura

```
supabase/schema.sql        Base de datos completa (re-ejecutable)
src/lib/                   supabase, cálculos, formato, imágenes, CSV, importación
src/context/               Sesión, datos (+ tiempo real), UI (toasts, confirmaciones, tema)
src/components/            Teclas, modales, gauge, gráfico, selector de captura, visor…
src/views/                 Inicio, Ventas, Pedidos, Inventario, Caja, Clientes, Reportes, Ajustes, Login
src/styles/global.css      Sistema de diseño (monocromático + acento, botones tipo tecla)
public/icons/              Íconos de la app instalable
```

## Personalizar

- **Nombre de la app**: Ajustes → Apariencia (Gestor Agua, AquaPure, el que quieras).
- **Color de acento**: 7 opciones fijas (Agua, Menta, Lima, Ámbar, Violeta, Rosa, Mono).
- **Nombre al instalar** (ícono del celular): está en `vite.config.js` → `manifest.name` / `short_name`.
