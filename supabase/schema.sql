-- ═══════════════════════════════════════════════════════════════
--  GESTOR AGUA — Esquema completo para Supabase
--  Ejecutar UNA vez en: Supabase → SQL Editor → New query → Run
--  Es re-ejecutable (usa IF NOT EXISTS / OR REPLACE / DROP IF EXISTS)
-- ═══════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ───────────────────────────────────────────────────────────────
-- 1. NEGOCIOS (cada cuenta admin crea un negocio; otros se unen con código)
-- ───────────────────────────────────────────────────────────────
create table if not exists public.negocios (
  id                 uuid primary key default gen_random_uuid(),
  nombre_app         text not null default 'Gestor Agua',
  codigo_invitacion  text not null unique default upper(substr(md5(random()::text), 1, 6)),
  precio_venta       numeric(10,2) not null default 5.00,
  costo_compra       numeric(10,2) not null default 2.70,
  stock_critico      int not null default 2,
  stock_bajo         int not null default 5,
  acento             text not null default 'agua',
  created_at         timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────
-- 2. PERFILES (1 por usuario de auth)
-- ───────────────────────────────────────────────────────────────
create table if not exists public.perfiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  negocio_id  uuid not null references public.negocios(id) on delete cascade,
  usuario     text not null unique,
  nombre      text not null default '',
  rol         text not null default 'operador'
              check (rol in ('admin','operador','lector','inactivo')),
  created_at  timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────
-- 3. FUNCIONES DE SEGURIDAD (usadas por RLS y como DEFAULT)
-- ───────────────────────────────────────────────────────────────
create or replace function public.mi_negocio() returns uuid
language sql stable security definer set search_path = public as $$
  select negocio_id from perfiles where id = auth.uid() and rol <> 'inactivo'
$$;

create or replace function public.mi_rol() returns text
language sql stable security definer set search_path = public as $$
  select rol from perfiles where id = auth.uid()
$$;

create or replace function public.puedo_escribir() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select rol in ('admin','operador') from perfiles where id = auth.uid()), false)
$$;

-- ───────────────────────────────────────────────────────────────
-- 4. TABLAS DE OPERACIÓN
-- ───────────────────────────────────────────────────────────────

-- Ventas y uso personal
create table if not exists public.ventas (
  id               uuid primary key default gen_random_uuid(),
  negocio_id       uuid not null default public.mi_negocio() references public.negocios(id) on delete cascade,
  tipo             text not null default 'venta' check (tipo in ('venta','personal')),
  cliente          text not null default '',
  cantidad         int  not null check (cantidad > 0),
  precio_unit      numeric(10,2) not null default 0,
  costo_unit       numeric(10,2) not null default 0,
  total            numeric(10,2) not null default 0,
  ganancia         numeric(10,2) not null default 0,
  metodo           text not null default 'efectivo' check (metodo in ('efectivo','yape','plin','fiado','personal')),
  estado           text not null default 'pagado'   check (estado in ('pagado','pendiente','personal')),
  fecha            timestamptz not null default now(),
  fecha_cobro      timestamptz,
  metodo_cobro     text check (metodo_cobro in ('efectivo','yape','plin')),
  notas            text,
  notas_cobro      text,
  comprobante_path text,
  created_by       uuid default auth.uid(),
  created_at       timestamptz not null default now()
);

-- Pedidos a proveedores
create table if not exists public.pedidos (
  id          uuid primary key default gen_random_uuid(),
  negocio_id  uuid not null default public.mi_negocio() references public.negocios(id) on delete cascade,
  proveedor   text not null,
  telefono    text,
  cantidad    int not null check (cantidad > 0),
  devueltos   int not null default 0 check (devueltos >= 0),
  costo_unit  numeric(10,2) not null default 0,
  total       numeric(10,2) not null default 0,
  fecha       timestamptz not null default now(),
  notas       text,
  created_by  uuid default auth.uid(),
  created_at  timestamptz not null default now()
);

-- Pagos a proveedores (un pedido puede pagarse en partes, con captura)
create table if not exists public.pagos_pedido (
  id               uuid primary key default gen_random_uuid(),
  negocio_id       uuid not null default public.mi_negocio() references public.negocios(id) on delete cascade,
  pedido_id        uuid not null references public.pedidos(id) on delete cascade,
  monto            numeric(10,2) not null check (monto > 0),
  metodo           text not null default 'efectivo' check (metodo in ('efectivo','yape','plin','transferencia')),
  fecha            timestamptz not null default now(),
  notas            text,
  comprobante_path text,
  created_by       uuid default auth.uid(),
  created_at       timestamptz not null default now()
);

-- Movimientos de caja (gastos, retiros, préstamos, ingresos extra)
create table if not exists public.movimientos (
  id           uuid primary key default gen_random_uuid(),
  negocio_id   uuid not null default public.mi_negocio() references public.negocios(id) on delete cascade,
  tipo         text not null check (tipo in ('gasto','retiro','prestamo','ingreso')),
  metodo       text not null default 'efectivo' check (metodo in ('efectivo','yape','plin','transferencia')),
  monto        numeric(10,2) not null check (monto > 0),
  descripcion  text not null default '',
  devuelto     boolean not null default false,
  fecha        timestamptz not null default now(),
  created_by   uuid default auth.uid(),
  created_at   timestamptz not null default now()
);

-- Ajustes manuales de inventario (stock inicial, roturas, conteo físico)
create table if not exists public.ajustes_inventario (
  id          uuid primary key default gen_random_uuid(),
  negocio_id  uuid not null default public.mi_negocio() references public.negocios(id) on delete cascade,
  cantidad    int not null check (cantidad <> 0),
  motivo      text not null default '',
  fecha       timestamptz not null default now(),
  created_by  uuid default auth.uid(),
  created_at  timestamptz not null default now()
);

create index if not exists ventas_neg_fecha   on public.ventas (negocio_id, fecha desc);
create index if not exists pedidos_neg_fecha  on public.pedidos (negocio_id, fecha desc);
create index if not exists pagos_pedido_ped   on public.pagos_pedido (pedido_id);
create index if not exists movs_neg_fecha     on public.movimientos (negocio_id, fecha desc);
create index if not exists ajustes_neg_fecha  on public.ajustes_inventario (negocio_id, fecha desc);

-- ───────────────────────────────────────────────────────────────
-- 5. ROW LEVEL SECURITY
-- ───────────────────────────────────────────────────────────────
alter table public.negocios           enable row level security;
alter table public.perfiles           enable row level security;
alter table public.ventas             enable row level security;
alter table public.pedidos            enable row level security;
alter table public.pagos_pedido       enable row level security;
alter table public.movimientos        enable row level security;
alter table public.ajustes_inventario enable row level security;

-- Negocios: ver el propio; solo admin edita
drop policy if exists negocio_select on public.negocios;
create policy negocio_select on public.negocios for select to authenticated
  using (id = public.mi_negocio());
drop policy if exists negocio_update on public.negocios;
create policy negocio_update on public.negocios for update to authenticated
  using (id = public.mi_negocio() and public.mi_rol() = 'admin')
  with check (id = public.mi_negocio());

-- Perfiles: ver miembros del negocio; cada uno solo cambia su nombre
drop policy if exists perfil_select on public.perfiles;
create policy perfil_select on public.perfiles for select to authenticated
  using (negocio_id = public.mi_negocio() or id = auth.uid());
drop policy if exists perfil_update_self on public.perfiles;
create policy perfil_update_self on public.perfiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.perfiles from authenticated;
grant  update (nombre) on public.perfiles to authenticated;

-- Política genérica para tablas de operación
do $$
declare t text;
begin
  foreach t in array array['ventas','pedidos','pagos_pedido','movimientos','ajustes_inventario'] loop
    execute format('drop policy if exists %1$s_select on public.%1$s', t);
    execute format('drop policy if exists %1$s_insert on public.%1$s', t);
    execute format('drop policy if exists %1$s_update on public.%1$s', t);
    execute format('drop policy if exists %1$s_delete on public.%1$s', t);
    execute format('create policy %1$s_select on public.%1$s for select to authenticated using (negocio_id = public.mi_negocio())', t);
    execute format('create policy %1$s_insert on public.%1$s for insert to authenticated with check (negocio_id = public.mi_negocio() and public.puedo_escribir())', t);
    execute format('create policy %1$s_update on public.%1$s for update to authenticated using (negocio_id = public.mi_negocio() and public.puedo_escribir()) with check (negocio_id = public.mi_negocio())', t);
    execute format('create policy %1$s_delete on public.%1$s for delete to authenticated using (negocio_id = public.mi_negocio() and public.puedo_escribir())', t);
  end loop;
end $$;

-- ───────────────────────────────────────────────────────────────
-- 6. FUNCIONES RPC PARA EL ADMIN
-- ───────────────────────────────────────────────────────────────
create or replace function public.cambiar_rol(p_perfil uuid, p_rol text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.mi_rol() <> 'admin' then raise exception 'Solo el administrador puede cambiar roles'; end if;
  if p_perfil = auth.uid() then raise exception 'No puedes cambiar tu propio rol'; end if;
  if p_rol not in ('admin','operador','lector','inactivo') then raise exception 'Rol inválido'; end if;
  update perfiles set rol = p_rol where id = p_perfil and negocio_id = public.mi_negocio();
end $$;

create or replace function public.regenerar_codigo() returns text
language plpgsql security definer set search_path = public as $$
declare v text := upper(substr(md5(random()::text), 1, 6));
begin
  if public.mi_rol() <> 'admin' then raise exception 'Solo el administrador'; end if;
  update negocios set codigo_invitacion = v where id = public.mi_negocio();
  return v;
end $$;

-- ───────────────────────────────────────────────────────────────
-- 7. ALTA DE USUARIOS
--    a) Auto-confirmar (no requiere verificar correo)
--    b) Crear negocio + perfil admin, o unirse con código de invitación
-- ───────────────────────────────────────────────────────────────
create or replace function public.auto_confirmar_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  return new;
end $$;

drop trigger if exists on_auth_user_autoconfirm on auth.users;
create trigger on_auth_user_autoconfirm
  before insert on auth.users
  for each row execute function public.auto_confirmar_usuario();

create or replace function public.manejar_nuevo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_meta    jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_codigo  text  := upper(trim(coalesce(v_meta->>'codigo', '')));
  v_usuario text  := lower(coalesce(nullif(v_meta->>'usuario', ''), split_part(new.email, '@', 1)));
  v_nombre  text  := coalesce(nullif(v_meta->>'nombre', ''), v_usuario);
  v_neg     uuid;
begin
  if v_codigo <> '' then
    select id into v_neg from negocios where codigo_invitacion = v_codigo;
    if v_neg is null then
      raise exception 'CODIGO_INVALIDO';
    end if;
    insert into perfiles (id, negocio_id, usuario, nombre, rol)
    values (new.id, v_neg, v_usuario, v_nombre, 'operador');
  else
    insert into negocios (nombre_app)
    values (coalesce(nullif(v_meta->>'negocio', ''), 'Gestor Agua'))
    returning id into v_neg;
    insert into perfiles (id, negocio_id, usuario, nombre, rol)
    values (new.id, v_neg, v_usuario, v_nombre, 'admin');
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.manejar_nuevo_usuario();

-- ───────────────────────────────────────────────────────────────
-- 8. STORAGE: capturas de pago (bucket privado, carpeta por negocio)
-- ───────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprobantes', 'comprobantes', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists comprobantes_select on storage.objects;
create policy comprobantes_select on storage.objects for select to authenticated
  using (bucket_id = 'comprobantes' and (storage.foldername(name))[1] = public.mi_negocio()::text);

drop policy if exists comprobantes_insert on storage.objects;
create policy comprobantes_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'comprobantes'
              and (storage.foldername(name))[1] = public.mi_negocio()::text
              and public.puedo_escribir());

drop policy if exists comprobantes_delete on storage.objects;
create policy comprobantes_delete on storage.objects for delete to authenticated
  using (bucket_id = 'comprobantes'
         and (storage.foldername(name))[1] = public.mi_negocio()::text
         and public.puedo_escribir());

-- ───────────────────────────────────────────────────────────────
-- 9. REALTIME (para que varios dispositivos se actualicen solos)
-- ───────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['ventas','pedidos','pagos_pedido','movimientos','ajustes_inventario','negocios'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ═══════════════════════════════════════════════════════════════
-- LISTO. Ahora en Supabase:
--   Authentication → Sign In / Providers → Email → desactiva "Confirm email"
--   Luego crea tu cuenta desde la app (pantalla "Crear cuenta").
-- ═══════════════════════════════════════════════════════════════
