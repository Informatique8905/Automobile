-- =============================================================================
-- 0500 — Véhicules, flotte, médias, documents, annonces (location / vente),
-- tarifs, options, favoris, recherches sauvegardées, statistiques
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Formules d'assurance (RC / intermédiaire / tous risques)
-- partner_id null = formule de la plateforme, proposée sur toutes les locations
-- -----------------------------------------------------------------------------
create table public.insurance_plans (
  id                     integer generated always as identity primary key,
  partner_id             uuid references public.partners(id) on delete cascade,
  code                   text not null,
  level                  public.insurance_level not null,
  name                   text not null,
  description            text,
  coverage               jsonb not null default '[]'::jsonb check (jsonb_typeof(coverage) = 'array'),
  deductible_amount      public.xof not null default 0,          -- franchise
  price_per_day          public.xof not null default 0,
  is_included_by_default boolean not null default false,         -- incluse dans le prix
  is_active              boolean not null default true,
  sort_order             integer not null default 0,
  created_at             timestamptz not null default now()
);
create unique index insurance_plans_code_unique
  on public.insurance_plans(coalesce(partner_id, '00000000-0000-0000-0000-000000000000'::uuid), code);

-- -----------------------------------------------------------------------------
-- Véhicules (flotte du partenaire)
-- -----------------------------------------------------------------------------
create table public.vehicles (
  id                   uuid primary key default gen_random_uuid(),
  partner_id           uuid not null references public.partners(id) on delete cascade,
  make_id              integer not null references public.vehicle_makes(id),
  model_id             integer not null references public.vehicle_models(id),
  category_id          integer not null references public.vehicle_categories(id),
  model_year           smallint not null check (model_year between 1950 and 2100),
  trim                 text check (char_length(trim) <= 80),       -- finition
  color                text check (char_length(color) <= 40),
  fuel                 public.fuel_type not null,
  transmission         public.transmission_type not null,
  mileage_km           integer not null check (mileage_km between 0 and 2000000),
  seats                smallint not null check (seats between 1 and 60),
  doors                smallint check (doors between 1 and 6),
  engine_power_hp      smallint check (engine_power_hp between 1 and 2000),
  engine_displacement_cc integer check (engine_displacement_cc between 50 and 10000),
  fleet_status         public.fleet_status not null default 'available',
  fleet_status_changed_at timestamptz not null default now(),
  home_location_id     uuid references public.partner_locations(id) on delete set null,
  -- Localisation publique approximative (quartier, pas l'adresse exacte)
  city_id              integer not null references public.cities(id),
  district_id          integer references public.districts(id) on delete set null,
  latitude             numeric(9,6) check (latitude between -90 and 90),
  longitude            numeric(9,6) check (longitude between -180 and 180),
  description          text check (char_length(description) <= 5000),
  archived_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index vehicles_partner_idx on public.vehicles(partner_id);
create index vehicles_search_idx on public.vehicles(category_id, make_id, model_id, model_year);
create index vehicles_geo_idx on public.vehicles(latitude, longitude);
create index vehicles_city_idx on public.vehicles(city_id, district_id);

create trigger vehicles_updated_at
  before update on public.vehicles
  for each row execute function private.set_updated_at();

create or replace function private.vehicles_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_make integer;
begin
  -- Le modèle doit appartenir à la marque
  select make_id into v_make from public.vehicle_models where id = new.model_id;
  if v_make is distinct from new.make_id then
    raise exception 'MODEL_MAKE_MISMATCH' using hint = 'Le modèle ne correspond pas à la marque.';
  end if;
  if tg_op = 'UPDATE' and new.fleet_status is distinct from old.fleet_status then
    new.fleet_status_changed_at := now();
  end if;
  -- Coordonnées par défaut : centre du quartier, sinon de la ville
  if new.latitude is null or new.longitude is null then
    select coalesce(d.latitude, c.latitude), coalesce(d.longitude, c.longitude)
      into new.latitude, new.longitude
      from public.cities c
      left join public.districts d on d.id = new.district_id
     where c.id = new.city_id;
  end if;
  return new;
end;
$$;

create trigger vehicles_before_write
  before insert or update on public.vehicles
  for each row execute function private.vehicles_before_write();

-- Identifiants sensibles du véhicule (jamais publics)
create table public.vehicle_private (
  vehicle_id              uuid primary key references public.vehicles(id) on delete cascade,
  license_plate           text check (char_length(license_plate) <= 20),
  vin                     text check (char_length(vin) <= 32),
  first_registration_on   date,
  purchase_price          public.xof,
  insurer_name            text,
  insurance_policy_number text,
  notes                   text,
  updated_at              timestamptz not null default now()
);
create unique index vehicle_private_plate_unique
  on public.vehicle_private(upper(regexp_replace(license_plate, '[^A-Za-z0-9]', '', 'g')))
  where license_plate is not null;

create trigger vehicle_private_updated_at
  before update on public.vehicle_private
  for each row execute function private.set_updated_at();

create table public.vehicle_equipment (
  vehicle_id   uuid not null references public.vehicles(id) on delete cascade,
  equipment_id integer not null references public.equipment(id) on delete cascade,
  primary key (vehicle_id, equipment_id)
);
create index vehicle_equipment_equipment_idx on public.vehicle_equipment(equipment_id);

-- Galerie médias : bucket public « vehicle-photos » : {partner_id}/{vehicle_id}/{uuid}.webp
create table public.vehicle_photos (
  id           uuid primary key default gen_random_uuid(),
  vehicle_id   uuid not null references public.vehicles(id) on delete cascade,
  storage_path text not null unique,
  angle        public.photo_angle not null default 'other',
  position     smallint not null default 0 check (position between 0 and 99),
  is_cover     boolean not null default false,
  width        integer check (width > 0),
  height       integer check (height > 0),
  blurhash     text,                                       -- aperçu flou pendant le chargement
  status       public.content_status not null default 'visible',
  created_at   timestamptz not null default now()
);
create index vehicle_photos_vehicle_idx on public.vehicle_photos(vehicle_id, position);
create unique index vehicle_photos_one_cover on public.vehicle_photos(vehicle_id) where is_cover;

-- Documents du véhicule (carte grise, assurance, visite technique, rapport d'inspection…)
create table public.vehicle_documents (
  id               uuid primary key default gen_random_uuid(),
  vehicle_id       uuid not null references public.vehicles(id) on delete cascade,
  type             public.vehicle_document_type not null,
  storage_path     text not null unique,
  title            text,
  is_public        boolean not null default false,   -- téléchargeable par les acheteurs (rapport, carnet)
  status           public.verification_status not null default 'pending',
  issued_on        date,
  expires_on       date,
  uploaded_by      uuid references public.profiles(id) on delete set null,
  reviewed_by      uuid references public.profiles(id) on delete set null,
  reviewed_at      timestamptz,
  rejection_reason text,
  created_at       timestamptz not null default now()
);
create index vehicle_documents_vehicle_idx on public.vehicle_documents(vehicle_id, type);
create index vehicle_documents_expiry_idx on public.vehicle_documents(expires_on) where expires_on is not null;

-- Carnet d'entretien numérique
create table public.vehicle_maintenance_logs (
  id               uuid primary key default gen_random_uuid(),
  vehicle_id       uuid not null references public.vehicles(id) on delete cascade,
  performed_on     date not null,
  mileage_km       integer check (mileage_km >= 0),
  kind             text not null check (kind in ('oil_change', 'tires', 'brakes', 'service', 'repair', 'technical_inspection', 'bodywork', 'other')),
  description      text,
  cost             public.xof,
  garage_name      text,
  document_id      uuid references public.vehicle_documents(id) on delete set null,
  next_due_on      date,
  next_due_km      integer check (next_due_km >= 0),
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now()
);
create index vehicle_maintenance_vehicle_idx on public.vehicle_maintenance_logs(vehicle_id, performed_on desc);

-- -----------------------------------------------------------------------------
-- Annonces : une annonce location et/ou une annonce vente par véhicule
-- -----------------------------------------------------------------------------
create table public.listings (
  id                  uuid primary key default gen_random_uuid(),
  vehicle_id          uuid not null references public.vehicles(id) on delete cascade,
  partner_id          uuid not null references public.partners(id) on delete cascade,  -- recopié du véhicule
  type                public.listing_type not null,
  status              public.listing_status not null default 'draft',
  title               text not null default '',          -- Marque + Modèle + Année + Finition (auto)
  slug                text not null unique,               -- toyota-corolla-2021-k7m3qx (auto)
  description         text check (char_length(description) <= 5000),
  instant_booking     boolean not null default false,    -- badge « Confirmation instantanée »
  -- Offres du moment
  offer_discount_pct  public.percent check (offer_discount_pct <= 90),
  offer_ends_at       timestamptz,
  -- Mise en avant (« Véhicules à la une »), gérée par la plateforme
  is_featured         boolean not null default false,
  featured_until      timestamptz,
  -- Modération
  risk_score          smallint check (risk_score between 0 and 100),
  last_moderated_at   timestamptz,
  rejection_reason    text,
  -- Cycle de vie
  submitted_at        timestamptz,
  published_at        timestamptz,
  paused_at           timestamptz,
  sold_at             timestamptz,
  -- Compteurs (dénormalisés)
  views_count         integer not null default 0,
  favorites_count     integer not null default 0,
  search_vector       tsvector,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create unique index listings_one_active_per_type
  on public.listings(vehicle_id, type) where status not in ('archived', 'sold', 'rejected');
create index listings_published_idx on public.listings(type, published_at desc) where status = 'published';
create index listings_partner_idx on public.listings(partner_id, status);
create index listings_featured_idx on public.listings(type) where status = 'published' and is_featured;
create index listings_search_idx on public.listings using gin (search_vector);

create trigger listings_updated_at
  before update on public.listings
  for each row execute function private.set_updated_at();

-- Titre, partenaire et texte de recherche calculés automatiquement
create or replace function private.listings_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v record;
begin
  select ve.partner_id, ve.model_year, ve.trim, ve.description as vdesc,
         mk.name as make_name, md.name as model_name, cat.name as category_name,
         ci.name as city_name, di.name as district_name
    into v
    from public.vehicles ve
    join public.vehicle_makes mk on mk.id = ve.make_id
    join public.vehicle_models md on md.id = ve.model_id
    join public.vehicle_categories cat on cat.id = ve.category_id
    join public.cities ci on ci.id = ve.city_id
    left join public.districts di on di.id = ve.district_id
   where ve.id = new.vehicle_id;

  if not found then
    raise exception 'VEHICLE_NOT_FOUND';
  end if;

  if tg_op = 'UPDATE' and new.vehicle_id is distinct from old.vehicle_id then
    raise exception 'LISTING_VEHICLE_IMMUTABLE';
  end if;

  new.partner_id := v.partner_id;
  new.title := concat_ws(' ', v.make_name, v.model_name, v.model_year::text, nullif(v.trim, ''));
  if tg_op = 'INSERT' or new.slug is null or new.slug = '' then
    new.slug := private.slugify(new.title) || '-' || lower(private.random_code(6));
  end if;
  new.search_vector :=
       setweight(to_tsvector('french', extensions.unaccent(coalesce(v.make_name, '') || ' ' || coalesce(v.model_name, ''))), 'A')
    || setweight(to_tsvector('french', extensions.unaccent(coalesce(v.category_name, '') || ' ' || coalesce(v.trim, '') || ' ' || v.model_year::text)), 'B')
    || setweight(to_tsvector('french', extensions.unaccent(coalesce(v.city_name, '') || ' ' || coalesce(v.district_name, ''))), 'B')
    || setweight(to_tsvector('french', extensions.unaccent(coalesce(new.description, v.vdesc, ''))), 'C');
  return new;
end;
$$;

create trigger listings_before_write
  before insert or update on public.listings
  for each row execute function private.listings_before_write();

-- Conditions de location
create table public.rental_terms (
  listing_id            uuid primary key references public.listings(id) on delete cascade,
  price_per_day         public.xof not null check (price_per_day > 0),
  weekly_discount_pct   public.percent not null default 0 check (weekly_discount_pct <= 90),  -- ≥ 7 jours
  monthly_discount_pct  public.percent not null default 0 check (monthly_discount_pct <= 90), -- ≥ 28 jours
  deposit_amount        public.xof not null default 0,                 -- caution
  deposit_modes         public.deposit_mode[] not null default array['card_preauthorization', 'refundable_payment']::public.deposit_mode[],
  included_km_per_day   integer check (included_km_per_day > 0),       -- null = kilométrage illimité
  extra_km_price        public.xof not null default 0,
  fuel_policy           public.fuel_policy not null default 'same_to_same',
  min_rental_days       smallint not null default 1 check (min_rental_days >= 1),
  max_rental_days       smallint not null default 30,
  advance_notice_hours  smallint not null default 2 check (advance_notice_hours between 0 and 336),
  min_driver_age        smallint not null default 21 check (min_driver_age between 18 and 99),
  min_license_years     smallint not null default 2 check (min_license_years between 0 and 50),
  cancellation_policy   public.cancellation_policy not null default 'moderate',
  -- Livraison / restitution à domicile ou à l'hôtel
  delivery_available    boolean not null default false,
  delivery_fee          public.xof not null default 0,
  delivery_radius_km    smallint check (delivery_radius_km between 1 and 500),
  -- Location avec chauffeur
  with_driver_available boolean not null default false,
  driver_price_per_day  public.xof not null default 0,
  -- Règles d'usage
  pets_allowed          boolean not null default false,
  smoking_allowed       boolean not null default false,
  intercity_allowed     boolean not null default true,    -- sortie de la ville autorisée
  cross_border_allowed  boolean not null default false,
  pickup_location_id    uuid references public.partner_locations(id) on delete set null,
  updated_at            timestamptz not null default now(),
  check (max_rental_days >= min_rental_days),
  check (cardinality(deposit_modes) >= 1)
);
create trigger rental_terms_updated_at
  before update on public.rental_terms
  for each row execute function private.set_updated_at();

-- Conditions de vente
create table public.sale_terms (
  listing_id                    uuid primary key references public.listings(id) on delete cascade,
  price                         public.xof not null check (price > 0),
  is_negotiable                 boolean not null default false,
  warranty_months               smallint not null default 0 check (warranty_months between 0 and 120),
  is_certified                  boolean not null default false,   -- inspecté par la plateforme (staff)
  is_customs_cleared            boolean not null default true,    -- dédouané
  import_origin                 text check (import_origin in ('local', 'europe', 'north_america', 'asia', 'middle_east', 'africa', 'other')),
  previous_owners               smallint check (previous_owners between 0 and 20),
  last_service_on               date,
  technical_inspection_valid_until date,
  financing_available           boolean not null default false,
  test_drive_available          boolean not null default true,
  reservation_deposit_amount    public.xof,                        -- acompte de réservation
  reservation_hold_days         smallint not null default 3 check (reservation_hold_days between 1 and 30),
  updated_at                    timestamptz not null default now()
);
create trigger sale_terms_updated_at
  before update on public.sale_terms
  for each row execute function private.set_updated_at();

-- Tarifs saisonniers (fêtes, vacances…)
create table public.seasonal_prices (
  id            uuid primary key default gen_random_uuid(),
  listing_id    uuid not null references public.rental_terms(listing_id) on delete cascade,
  label         text,
  starts_on     date not null,
  ends_on       date not null,
  price_per_day public.xof not null check (price_per_day > 0),
  created_at    timestamptz not null default now(),
  check (ends_on >= starts_on),
  exclude using gist (listing_id with =, daterange(starts_on, ends_on, '[]') with &&)
);

-- Options proposées par annonce, au prix du loueur
create table public.listing_extras (
  listing_id   uuid not null references public.rental_terms(listing_id) on delete cascade,
  extra_id     integer not null references public.extras(id) on delete cascade,
  price        public.xof not null,
  max_quantity smallint not null default 1 check (max_quantity between 1 and 10),
  is_available boolean not null default true,
  primary key (listing_id, extra_id)
);
create index listing_extras_extra_idx on public.listing_extras(extra_id) where is_available;

-- -----------------------------------------------------------------------------
-- Favoris, recherches sauvegardées, statistiques
-- -----------------------------------------------------------------------------
create table public.favorites (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
create index favorites_listing_idx on public.favorites(listing_id);

create or replace function private.favorites_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.listings set favorites_count = favorites_count + 1 where id = new.listing_id;
  elsif tg_op = 'DELETE' then
    update public.listings set favorites_count = greatest(favorites_count - 1, 0) where id = old.listing_id;
  end if;
  return null;
end;
$$;

create trigger favorites_count_trg
  after insert or delete on public.favorites
  for each row execute function private.favorites_count();

create table public.saved_searches (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  name             text not null check (char_length(name) between 1 and 100),
  listing_type     public.listing_type not null,
  filters          jsonb not null default '{}'::jsonb check (jsonb_typeof(filters) = 'object'),
  alert_frequency  text not null default 'none' check (alert_frequency in ('none', 'daily', 'weekly')),
  last_notified_at timestamptz,
  created_at       timestamptz not null default now()
);
create index saved_searches_user_idx on public.saved_searches(user_id);

-- Statistiques quotidiennes par annonce (KPIs partenaire)
create table public.listing_stats_daily (
  listing_id       uuid not null references public.listings(id) on delete cascade,
  day              date not null,
  views            integer not null default 0,
  contact_clicks   integer not null default 0,
  favorites        integer not null default 0,
  booking_requests integer not null default 0,
  primary key (listing_id, day)
);
