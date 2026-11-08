-- =============================================================================
-- 0200 — Référentiels : géographie, catégories, marques/modèles, équipements,
-- options additionnelles, réglages plateforme, documents légaux
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Géographie
-- -----------------------------------------------------------------------------
create table public.cities (
  id           integer generated always as identity primary key,
  name         text not null,
  slug         text not null unique,
  region       text,
  country_code char(2) not null default 'CI',
  latitude     numeric(9,6) not null check (latitude between -90 and 90),
  longitude    numeric(9,6) not null check (longitude between -180 and 180),
  is_active    boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);
comment on table public.cities is 'Villes desservies (Abidjan, Yamoussoukro, Bouaké…).';

-- Communes / quartiers (indication géographique sans adresse exacte)
create table public.districts (
  id         integer generated always as identity primary key,
  city_id    integer not null references public.cities(id) on delete cascade,
  name       text not null,
  slug       text not null,
  latitude   numeric(9,6) check (latitude between -90 and 90),
  longitude  numeric(9,6) check (longitude between -180 and 180),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  unique (city_id, slug)
);
create index districts_city_idx on public.districts(city_id);

-- -----------------------------------------------------------------------------
-- Catalogue véhicules
-- -----------------------------------------------------------------------------
-- « Catégories visuelles » de la page d'accueil (SUV, berline, 4x4…)
create table public.vehicle_categories (
  id          integer generated always as identity primary key,
  slug        text not null unique,
  name        text not null,
  description text,
  icon        text,
  image_path  text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.vehicle_makes (
  id         integer generated always as identity primary key,
  name       text not null unique,
  slug       text not null unique,
  logo_path  text,
  is_popular boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index vehicle_makes_name_trgm on public.vehicle_makes using gin (name extensions.gin_trgm_ops);

create table public.vehicle_models (
  id                  integer generated always as identity primary key,
  make_id             integer not null references public.vehicle_makes(id) on delete cascade,
  name                text not null,
  slug                text not null,
  default_category_id integer references public.vehicle_categories(id) on delete set null,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  unique (make_id, slug)
);
create index vehicle_models_make_idx on public.vehicle_models(make_id);
create index vehicle_models_name_trgm on public.vehicle_models using gin (name extensions.gin_trgm_ops);

-- Grille d'équipements : Confort / Technologie / Sécurité
create table public.equipment (
  id         integer generated always as identity primary key,
  code       text not null unique,
  name       text not null,
  "group"    public.equipment_group not null,
  icon       text,
  is_filterable boolean not null default false,
  sort_order integer not null default 0
);

-- Options et services additionnels du tunnel (siège enfant, GPS, conducteur supp.…)
-- default_price = prix conseillé ; chaque loueur fixe son prix dans listing_extras
create table public.extras (
  id                      integer generated always as identity primary key,
  code                    text not null unique,
  name                    text not null,
  description             text,
  pricing_unit            public.extra_pricing_unit not null,
  default_price           public.xof not null default 0,
  max_quantity            smallint not null default 1 check (max_quantity between 1 and 10),
  requires_driver_details boolean not null default false,
  is_active               boolean not null default true,
  sort_order              integer not null default 0
);

-- -----------------------------------------------------------------------------
-- Réglages plateforme (commission, frais de service, TVA, délais…)
-- -----------------------------------------------------------------------------
create table public.platform_settings (
  key         text primary key check (key ~ '^[a-z0-9_]+$'),
  value       jsonb not null,
  description text,
  is_public   boolean not null default false,  -- lisible par le front (ex. taux de TVA)
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);

create trigger platform_settings_updated_at
  before update on public.platform_settings
  for each row execute function private.set_updated_at();

-- Lecture typée d'un réglage
create or replace function private.setting_numeric(p_key text, p_default numeric)
returns numeric
language sql
stable
set search_path = ''
as $$
  select coalesce((select (value #>> '{}')::numeric from public.platform_settings where key = p_key), p_default);
$$;

create or replace function private.setting_int(p_key text, p_default integer)
returns integer
language sql
stable
set search_path = ''
as $$
  select coalesce((select (value #>> '{}')::integer from public.platform_settings where key = p_key), p_default);
$$;

create or replace function private.setting_bool(p_key text, p_default boolean)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select (value #>> '{}')::boolean from public.platform_settings where key = p_key), p_default);
$$;

-- -----------------------------------------------------------------------------
-- Documents légaux versionnés (CGU, CGV, confidentialité…) — loi n° 2013-450
-- -----------------------------------------------------------------------------
create table public.legal_documents (
  id           uuid primary key default gen_random_uuid(),
  type         public.legal_document_type not null,
  version      text not null,
  title        text not null,
  content_md   text not null,
  is_current   boolean not null default false,
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  unique (type, version)
);
create unique index legal_documents_one_current on public.legal_documents(type) where is_current;

-- Pages de contenu (À propos…)
create table public.cms_pages (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null,
  content_md      text not null default '',
  seo_title       text,
  seo_description text,
  is_published    boolean not null default false,
  updated_by      uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger cms_pages_updated_at
  before update on public.cms_pages
  for each row execute function private.set_updated_at();
