-- =============================================================================
-- 0600 — Parcours VENTE : essais (test drive), acompte de réservation,
-- demandes de financement, ventes conclues
-- =============================================================================

-- Réservation d'un essai : date/heure, permis, confirmation
create table public.test_drives (
  id                  uuid primary key default gen_random_uuid(),
  reference           text not null unique default private.generate_reference('ESS'),
  listing_id          uuid not null references public.listings(id) on delete cascade,
  vehicle_id          uuid not null references public.vehicles(id) on delete cascade,
  partner_id          uuid not null references public.partners(id) on delete cascade,
  buyer_id            uuid not null references public.profiles(id) on delete cascade,
  scheduled_at        timestamptz not null,
  ends_at             timestamptz not null,
  location_id         uuid references public.partner_locations(id) on delete set null,
  meeting_address     text,
  status              public.test_drive_status not null default 'requested',
  license_number      text,
  license_document_id uuid references public.user_documents(id) on delete set null,
  buyer_note          text check (char_length(buyer_note) <= 1000),
  partner_note        text check (char_length(partner_note) <= 1000),
  confirmed_at        timestamptz,
  completed_at        timestamptz,
  cancelled_at        timestamptz,
  cancel_reason       text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (ends_at > scheduled_at and ends_at <= scheduled_at + interval '4 hours'),
  -- Pas deux essais en même temps sur le même véhicule
  exclude using gist (
    vehicle_id with =,
    tstzrange(scheduled_at, ends_at, '[)') with &&
  ) where (status in ('requested', 'confirmed'))
);
create index test_drives_partner_idx on public.test_drives(partner_id, scheduled_at);
create index test_drives_buyer_idx on public.test_drives(buyer_id, scheduled_at desc);

create trigger test_drives_updated_at
  before update on public.test_drives
  for each row execute function private.set_updated_at();

-- Acompte de réservation (achat) : bloque le véhicule quelques jours
create table public.sale_reservations (
  id            uuid primary key default gen_random_uuid(),
  reference     text not null unique default private.generate_reference('ACP'),
  listing_id    uuid not null references public.listings(id) on delete cascade,
  vehicle_id    uuid not null references public.vehicles(id) on delete cascade,
  partner_id    uuid not null references public.partners(id) on delete cascade,
  buyer_id      uuid not null references public.profiles(id) on delete cascade,
  amount        public.xof not null check (amount > 0),
  status        public.sale_reservation_status not null default 'pending_payment',
  expires_at    timestamptz not null,
  paid_at       timestamptz,
  converted_at  timestamptz,
  refunded_at   timestamptz,
  cancelled_at  timestamptz,
  cancel_reason text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
-- Une seule réservation active par annonce
create unique index sale_reservations_one_active on public.sale_reservations(listing_id)
  where status in ('pending_payment', 'active');
create index sale_reservations_buyer_idx on public.sale_reservations(buyer_id);
create index sale_reservations_partner_idx on public.sale_reservations(partner_id, status);

create trigger sale_reservations_updated_at
  before update on public.sale_reservations
  for each row execute function private.set_updated_at();

-- Demande de financement issue du simulateur de crédit
create table public.financing_requests (
  id                        uuid primary key default gen_random_uuid(),
  listing_id                uuid not null references public.listings(id) on delete cascade,
  buyer_id                  uuid not null references public.profiles(id) on delete cascade,
  vehicle_price             public.xof not null,
  down_payment              public.xof not null default 0,
  duration_months           smallint not null check (duration_months between 6 and 96),
  annual_rate_pct           numeric(5,2) not null check (annual_rate_pct between 0 and 40),
  estimated_monthly_payment public.xof not null,
  employment_status         text check (employment_status in ('employee', 'civil_servant', 'self_employed', 'business_owner', 'other')),
  monthly_income_range      text check (monthly_income_range in ('lt_300k', '300k_600k', '600k_1m', '1m_2m', 'gt_2m')),
  status                    public.financing_status not null default 'submitted',
  lender_name               text,
  notes                     text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  check (down_payment <= vehicle_price)
);
create index financing_requests_listing_idx on public.financing_requests(listing_id);
create index financing_requests_buyer_idx on public.financing_requests(buyer_id);

create trigger financing_requests_updated_at
  before update on public.financing_requests
  for each row execute function private.set_updated_at();

-- Vente conclue (en ligne ou hors plateforme) : alimente les KPIs et passe l'annonce en « vendue »
create table public.vehicle_sales (
  id                  uuid primary key default gen_random_uuid(),
  listing_id          uuid not null unique references public.listings(id) on delete restrict,
  vehicle_id          uuid not null references public.vehicles(id) on delete restrict,
  partner_id          uuid not null references public.partners(id) on delete restrict,
  buyer_id            uuid references public.profiles(id) on delete set null,
  sale_reservation_id uuid references public.sale_reservations(id) on delete set null,
  final_price         public.xof not null check (final_price > 0),
  commission_amount   public.xof not null default 0,
  closed_offline      boolean not null default true,
  sold_at             timestamptz not null default now(),
  recorded_by         uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now()
);
create index vehicle_sales_partner_idx on public.vehicle_sales(partner_id, sold_at desc);
