-- Ejecutar una vez en SQL Editor de un proyecto Supabase nuevo.
begin;
create table public.admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.admins enable row level security;
create policy "Consultar mi rol" on public.admins for select to authenticated using (user_id = (select auth.uid()));
create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$ select exists(select 1 from public.admins where user_id = auth.uid()); $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;
create table public.products (
 id uuid primary key default gen_random_uuid(), code text unique not null check(length(trim(code)) between 1 and 40),
 name text not null check(length(trim(name)) between 1 and 120), description text not null default '',
 category text not null check(category in ('Hombre','Mujer','Infantil')), price numeric(12,2) not null check(price > 0),
 image_url text not null check(image_url ~ '^https://'), active boolean not null default true
);
create table public.variants (
 id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
 sku text unique not null check(length(trim(sku)) between 1 and 60), size text not null check(length(trim(size)) between 1 and 12),
 system text not null check(system in ('EU','US')), color text not null check(length(trim(color)) between 1 and 40),
 stock integer not null default 0 check(stock >= 0), unique(product_id,size,system,color)
);
create index on public.variants(product_id);
create table public.sales (
 id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
 created_by uuid not null references auth.users(id), product_name text not null, sku text not null,
 size text not null, system text not null, color text not null, quantity integer not null check(quantity > 0),
 unit_price numeric(12,2) not null check(unit_price > 0), total numeric(14,2) generated always as (quantity * unit_price) stored
);
alter table public.products enable row level security;
alter table public.variants enable row level security;
alter table public.sales enable row level security;
create policy "Catalogo publicado" on public.products for select to anon, authenticated using (active or public.is_admin());
create policy "Administrar productos" on public.products for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Variantes publicadas" on public.variants for select to anon, authenticated using(public.is_admin() or exists(select 1 from public.products p where p.id = product_id and p.active));
create policy "Administrar variantes" on public.variants for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Historial privado" on public.sales for select to authenticated using(public.is_admin());
grant select on public.products, public.variants to anon;
grant select,insert,update,delete on public.products, public.variants to authenticated;
grant select on public.sales, public.admins to authenticated;
revoke insert,update,delete on public.sales from anon,authenticated;
revoke insert,update,delete on public.admins from anon,authenticated;
create function public.record_sale(p_variant uuid, p_quantity integer, p_request_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v public.variants; p public.products; existing uuid;
begin
 if not public.is_admin() then raise exception 'Acceso denegado'; end if;
 if p_quantity is null or p_quantity < 1 or p_request_id is null then raise exception 'Datos de venta invalidos'; end if;
 -- Serializa reintentos con el mismo identificador antes de verificar idempotencia.
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
 select id into existing from public.sales where id = p_request_id;
 if found then return existing; end if;
 select * into v from public.variants where id = p_variant for update;
 if not found then raise exception 'Variante inexistente'; end if;
 select * into p from public.products where id = v.product_id for update;
 if not found or not p.active then raise exception 'Producto no disponible'; end if;
 if v.stock < p_quantity then raise exception 'Existencias insuficientes'; end if;
 update public.variants set stock = stock - p_quantity where id = v.id;
 insert into public.sales(id,created_by,product_name,sku,size,system,color,quantity,unit_price)
 values(p_request_id,auth.uid(),p.name,v.sku,v.size,v.system,v.color,p_quantity,p.price);
 return p_request_id;
end; $$;
revoke all on function public.record_sale(uuid,integer,uuid) from public,anon;
grant execute on function public.record_sale(uuid,integer,uuid) to authenticated;
commit;
-- Crear el usuario desde Authentication > Users (no desde la web publica).
-- Luego ejecutar reemplazando el UUID, nunca una contrasena:
-- insert into public.admins(user_id) values ('UUID-DEL-USUARIO');
