-- =============================================================================
-- 0700 — Tunnel de réservation (location), disponibilités, état des lieux,
-- contrats, codes promo, paiements, cautions, remboursements, factures, versements
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Codes promo / offres
-- -----------------------------------------------------------------------------
create table public.promo_codes (
  id                uuid primary key default gen_random_uuid(),
  code              extensions.citext not null unique check (code ~ '^[A-Za-z0-9_-]{3,32}$'),
  description       text,
  discount_type     text not null check (discount_type in ('percent', 'fixed')),
  discount_value    numeric(12,2) not null check (discount_value > 0),
  max_discount      public.xof,
  min_amount        public.xof not null default 0,
  applies_to        public.listing_type,                 -- null = tous
  partner_id        uuid references public.partners(id) on delete cascade,  -- null = plateforme
  starts_at         timestamptz not null default now(),
  ends_at           timestamptz,
  max_redemptions   integer check (max_redemptions > 0),
  max_per_user      integer not null default 1 check (max_per_user > 0),
  redemptions_count integer not null default 0,
  is_active         boolean not null default true,
  created_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  check (discount_type <> 'percent' or discount_value <= 100),
  check (ends_at is null or ends_at > starts_at)
);

-- -----------------------------------------------------------------------------
-- Réservations de location
-- -----------------------------------------------------------------------------
create table public.bookings (
  id                    uuid primary key default gen_random_uuid(),
  reference             text not null unique default private.generate_reference('LOC'),
  listing_id            uuid not null references public.listings(id) on delete restrict,
  vehicle_id            uuid not null references public.vehicles(id) on delete restrict,
  partner_id            uuid not null references public.partners(id) on delete restrict,
  customer_id           uuid not null references public.profiles(id) on delete restrict,
  status                public.booking_status not null default 'pending_payment',
  pickup_at             timestamptz not null,
  return_at             timestamptz not null,
  rental_days           integer not null check (rental_days > 0),
  -- Lieux de départ / retour
  pickup_kind           public.location_kind not null default 'agency',
  pickup_location_id    uuid references public.partner_locations(id) on delete set null,
  pickup_address        text,
  pickup_latitude       numeric(9,6),
  pickup_longitude      numeric(9,6),
  return_kind           public.location_kind not null default 'agency',
  return_location_id    uuid references public.partner_locations(id) on delete set null,
  return_address        text,
  return_latitude       numeric(9,6),
  return_longitude      numeric(9,6),
  -- Choix du client
  insurance_plan_id     integer references public.insurance_plans(id) on delete restrict,
  with_driver           boolean not null default false,
  with_delivery         boolean not null default false,
  promo_code_id         uuid references public.promo_codes(id) on delete set null,
  -- Prix figés au moment de la réservation (jamais recalculés après)
  daily_rate            public.xof not null,
  rental_subtotal       public.xof not null,
  duration_discount     public.xof not null default 0,
  extras_total          public.xof not null default 0,
  insurance_total       public.xof not null default 0,
  driver_total          public.xof not null default 0,
  delivery_fee          public.xof not null default 0,
  service_fee           public.xof not null default 0,
  promo_discount        public.xof not null default 0,
  tax_rate              numeric(5,4) not null default 0,
  tax_amount            public.xof not null default 0,
  prices_include_tax    boolean not null default true,
  total_amount          public.xof not null,
  commission_amount     public.xof not null default 0,     -- part plateforme
  partner_payout_amount public.xof not null default 0,     -- part loueur
  currency              char(3) not null default 'XOF' check (currency = 'XOF'),
  price_breakdown       jsonb not null default '{}'::jsonb, -- détail affiché et repris dans le contrat
  -- Conditions figées
  deposit_amount        public.xof not null default 0,
  deposit_mode          public.deposit_mode,
  included_km_total     integer,                           -- null = illimité
  extra_km_price        public.xof not null default 0,
  fuel_policy           public.fuel_policy not null,
  cancellation_policy   public.cancellation_policy not null,
  -- Prise en charge
  pickup_qr_token       text not null unique default private.random_token(24),
  customer_note         text check (char_length(customer_note) <= 1000),
  -- Cycle de vie
  expires_at            timestamptz,                       -- délai pour payer / pour être accepté
  paid_at               timestamptz,
  confirmed_at          timestamptz,
  started_at            timestamptz,
  completed_at          timestamptz,
  cancelled_at          timestamptz,
  cancelled_by          uuid references public.profiles(id) on delete set null,
  cancellation_reason   text,
  refund_amount         public.xof not null default 0,
  mileage_start         integer check (mileage_start >= 0),
  mileage_end           integer check (mileage_end >= 0),
  extra_km_charge       public.xof not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (return_at > pickup_at),
  check (mileage_end is null or mileage_start is null or mileage_end >= mileage_start)
);
create index bookings_customer_idx on public.bookings(customer_id, created_at desc);
create index bookings_partner_idx on public.bookings(partner_id, status, pickup_at);
create index bookings_vehicle_idx on public.bookings(vehicle_id, pickup_at);
create index bookings_expiry_idx on public.bookings(expires_at) where status in ('pending_payment', 'pending_confirmation');

create trigger bookings_updated_at
  before update on public.bookings
  for each row execute function private.set_updated_at();

create table public.booking_extras (
  booking_id   uuid not null references public.bookings(id) on delete cascade,
  extra_id     integer not null references public.extras(id) on delete restrict,
  quantity     smallint not null check (quantity between 1 and 10),
  unit_price   public.xof not null,
  pricing_unit public.extra_pricing_unit not null,
  total        public.xof not null,
  primary key (booking_id, extra_id)
);

-- Conducteurs (principal + supplémentaires)
create table public.booking_drivers (
  id                  uuid primary key default gen_random_uuid(),
  booking_id          uuid not null references public.bookings(id) on delete cascade,
  user_id             uuid references public.profiles(id) on delete set null,
  full_name           text not null check (char_length(full_name) between 2 and 200),
  date_of_birth       date,
  license_number      text,
  license_issued_on   date,
  license_document_id uuid references public.user_documents(id) on delete set null,
  is_primary          boolean not null default false,
  verification_status public.verification_status not null default 'pending',
  created_at          timestamptz not null default now()
);
create unique index booking_drivers_one_primary on public.booking_drivers(booking_id) where is_primary;
create index booking_drivers_booking_idx on public.booking_drivers(booking_id);

create table public.booking_status_history (
  id          bigint generated always as identity primary key,
  booking_id  uuid not null references public.bookings(id) on delete cascade,
  from_status public.booking_status,
  to_status   public.booking_status not null,
  changed_by  uuid references public.profiles(id) on delete set null,
  reason      text,
  created_at  timestamptz not null default now()
);
create index booking_status_history_booking_idx on public.booking_status_history(booking_id, created_at);

-- -----------------------------------------------------------------------------
-- Calendrier : impossible de louer deux fois le même véhicule au même moment
-- -----------------------------------------------------------------------------
create table public.availability_blocks (
  id         uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  period     tstzrange not null check (not isempty(period) and lower(period) is not null and upper(period) is not null),
  kind       text not null check (kind in ('booking', 'maintenance', 'owner_block', 'sale_hold')),
  booking_id uuid unique references public.bookings(id) on delete cascade,
  note       text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check ((kind = 'booking') = (booking_id is not null)),
  exclude using gist (vehicle_id with =, period with &&)
);

-- -----------------------------------------------------------------------------
-- État des lieux départ / retour (photos, kilométrage, carburant, dommages)
-- -----------------------------------------------------------------------------
create table public.vehicle_inspections (
  id                  uuid primary key default gen_random_uuid(),
  booking_id          uuid not null references public.bookings(id) on delete cascade,
  type                public.inspection_type not null,
  mileage_km          integer not null check (mileage_km >= 0),
  fuel_level_pct      smallint not null check (fuel_level_pct between 0 and 100),
  exterior_condition  text,
  interior_condition  text,
  notes               text,
  performed_by        uuid references public.profiles(id) on delete set null,
  customer_signed_at  timestamptz,
  partner_signed_at   timestamptz,
  created_at          timestamptz not null default now(),
  unique (booking_id, type)
);

create table public.inspection_photos (
  id            uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.vehicle_inspections(id) on delete cascade,
  storage_path  text not null unique,      -- bucket privé « inspection-photos » : {booking_id}/…
  angle         public.photo_angle not null default 'other',
  caption       text,
  taken_by      uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index inspection_photos_inspection_idx on public.inspection_photos(inspection_id);

create table public.inspection_damages (
  id             uuid primary key default gen_random_uuid(),
  inspection_id  uuid not null references public.vehicle_inspections(id) on delete cascade,
  location       text not null,            -- ex. « pare-chocs avant gauche »
  severity       public.damage_severity not null,
  description    text,
  photo_id       uuid references public.inspection_photos(id) on delete set null,
  is_preexisting boolean not null default false,
  estimated_cost public.xof,
  created_at     timestamptz not null default now()
);
create index inspection_damages_inspection_idx on public.inspection_damages(inspection_id);

-- Contrat PDF généré automatiquement (téléchargeable + envoyé par email)
create table public.contracts (
  id                   uuid primary key default gen_random_uuid(),
  booking_id           uuid not null references public.bookings(id) on delete cascade,
  version              smallint not null default 1,
  storage_path         text not null unique,         -- bucket privé « contracts » : {booking_id}/…
  sha256               text not null check (sha256 ~ '^[a-f0-9]{64}$'),  -- empreinte d'intégrité
  generated_at         timestamptz not null default now(),
  emailed_at           timestamptz,
  customer_accepted_at timestamptz,
  customer_accept_ip   inet,
  unique (booking_id, version)
);

create table public.promo_redemptions (
  id              uuid primary key default gen_random_uuid(),
  promo_code_id   uuid not null references public.promo_codes(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  booking_id      uuid unique references public.bookings(id) on delete cascade,
  discount_amount public.xof not null,
  created_at      timestamptz not null default now()
);
create index promo_redemptions_user_idx on public.promo_redemptions(promo_code_id, user_id);

-- -----------------------------------------------------------------------------
-- Paiements (Jeko : cartes + Wave, Orange Money, MTN MoMo, Moov Money, Djamo, QR PI-SPI)
-- -----------------------------------------------------------------------------
create table public.payments (
  id                      uuid primary key default gen_random_uuid(),
  reference               text not null unique default private.generate_reference('PAY'),
  payer_id                uuid not null references public.profiles(id) on delete restrict,
  booking_id              uuid references public.bookings(id) on delete restrict,
  sale_reservation_id     uuid references public.sale_reservations(id) on delete restrict,
  purpose                 public.payment_purpose not null,
  provider                public.payment_provider not null default 'jeko',
  method                  public.payment_method,
  amount                  public.xof not null check (amount > 0),
  currency                char(3) not null default 'XOF' check (currency = 'XOF'),
  status                  public.payment_status not null default 'initiated',
  provider_transaction_id text,
  provider_payment_url    text,
  provider_payload        jsonb,
  idempotency_key         text not null unique,
  failure_reason          text,
  paid_at                 timestamptz,
  refunded_amount         public.xof not null default 0,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  check (num_nonnulls(booking_id, sale_reservation_id) <= 1),
  check (refunded_amount <= amount)
);
create unique index payments_provider_tx_unique on public.payments(provider, provider_transaction_id)
  where provider_transaction_id is not null;
create index payments_booking_idx on public.payments(booking_id);
create index payments_sale_reservation_idx on public.payments(sale_reservation_id);
create index payments_payer_idx on public.payments(payer_id, created_at desc);

create trigger payments_updated_at
  before update on public.payments
  for each row execute function private.set_updated_at();

-- Journal brut des webhooks (idempotence + preuve)
create table public.payment_events (
  id                bigint generated always as identity primary key,
  provider          public.payment_provider not null,
  provider_event_id text not null,
  event_type        text not null,
  payment_id        uuid references public.payments(id) on delete set null,
  payload           jsonb not null,
  signature_valid   boolean not null,
  received_at       timestamptz not null default now(),
  processed_at      timestamptz,
  processing_error  text,
  unique (provider, provider_event_id)
);

-- Caution : empreinte bancaire (non débitée) ou versement remboursable (Mobile Money)
create table public.deposits (
  id                      uuid primary key default gen_random_uuid(),
  booking_id              uuid not null unique references public.bookings(id) on delete cascade,
  amount                  public.xof not null,
  mode                    public.deposit_mode not null,
  status                  public.deposit_status not null default 'pending',
  payment_id              uuid references public.payments(id) on delete set null,
  authorization_reference text,
  authorized_at           timestamptz,
  authorization_expires_at timestamptz,
  captured_amount         public.xof not null default 0,
  capture_reason          text,
  released_at             timestamptz,
  refunded_at             timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  check (captured_amount <= amount)
);
create trigger deposits_updated_at
  before update on public.deposits
  for each row execute function private.set_updated_at();

create table public.refunds (
  id                 uuid primary key default gen_random_uuid(),
  payment_id         uuid not null references public.payments(id) on delete restrict,
  amount             public.xof not null check (amount > 0),
  reason             text not null,
  status             public.refund_status not null default 'pending',
  provider_reference text,
  requested_by       uuid references public.profiles(id) on delete set null,
  processed_at       timestamptz,
  failure_reason     text,
  created_at         timestamptz not null default now()
);
create index refunds_payment_idx on public.refunds(payment_id);
create index refunds_pending_idx on public.refunds(created_at) where status in ('pending', 'processing');

-- -----------------------------------------------------------------------------
-- Factures (numérotation continue par année : FAC-2026-000001)
-- -----------------------------------------------------------------------------
create table public.invoice_counters (
  year        integer primary key,
  last_number integer not null default 0
);

create or replace function private.next_invoice_number(p_prefix text default 'FAC')
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_year integer := extract(year from (now() at time zone 'Africa/Abidjan'))::integer;
  v_num integer;
begin
  insert into public.invoice_counters (year, last_number) values (v_year, 1)
  on conflict (year) do update set last_number = public.invoice_counters.last_number + 1
  returning last_number into v_num;
  return p_prefix || '-' || v_year || '-' || lpad(v_num::text, 6, '0');
end;
$$;

create table public.invoices (
  id                  uuid primary key default gen_random_uuid(),
  number              text not null unique,
  kind                text not null default 'invoice' check (kind in ('invoice', 'credit_note')),
  booking_id          uuid references public.bookings(id) on delete restrict,
  sale_reservation_id uuid references public.sale_reservations(id) on delete restrict,
  payment_id          uuid references public.payments(id) on delete restrict,
  related_invoice_id  uuid references public.invoices(id) on delete restrict,  -- pour un avoir
  customer_id         uuid not null references public.profiles(id) on delete restrict,
  partner_id          uuid references public.partners(id) on delete restrict,
  amount_ht           public.xof not null,
  tax_rate            numeric(5,4) not null,
  tax_amount          public.xof not null,
  amount_ttc          public.xof not null,
  line_items          jsonb not null default '[]'::jsonb check (jsonb_typeof(line_items) = 'array'),
  storage_path        text unique,          -- bucket privé « invoices » : {booking_id}/…
  issued_at           timestamptz not null default now(),
  check (amount_ht + tax_amount = amount_ttc)
);
create index invoices_customer_idx on public.invoices(customer_id, issued_at desc);
create index invoices_partner_idx on public.invoices(partner_id, issued_at desc);

-- -----------------------------------------------------------------------------
-- Versements aux partenaires
-- -----------------------------------------------------------------------------
create table public.payouts (
  id                 uuid primary key default gen_random_uuid(),
  reference          text not null unique default private.generate_reference('VER'),
  partner_id         uuid not null references public.partners(id) on delete restrict,
  payout_account_id  uuid references public.partner_payout_accounts(id) on delete set null,
  period_start       date not null,
  period_end         date not null,
  gross_amount       public.xof not null default 0,
  commission_amount  public.xof not null default 0,
  adjustments        bigint not null default 0,     -- peut être négatif (dommages, pénalités)
  net_amount         public.xof not null default 0,
  status             public.payout_status not null default 'pending',
  provider_reference text,
  paid_at            timestamptz,
  failure_reason     text,
  created_at         timestamptz not null default now(),
  check (period_end >= period_start)
);
create index payouts_partner_idx on public.payouts(partner_id, period_end desc);

create table public.payout_items (
  payout_id         uuid not null references public.payouts(id) on delete cascade,
  booking_id        uuid not null unique references public.bookings(id) on delete restrict,
  gross_amount      public.xof not null,
  commission_amount public.xof not null,
  net_amount        public.xof not null,
  primary key (payout_id, booking_id)
);
