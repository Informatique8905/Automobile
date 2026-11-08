-- =============================================================================
-- 0400 — Espace partenaire : loueurs pro, particuliers, vendeurs, concessionnaires
-- =============================================================================

-- Fiche publique du partenaire (profil vendeur / hôte affiché sur les annonces)
create table public.partners (
  id                   uuid primary key default gen_random_uuid(),
  type                 public.partner_type not null,
  display_name         text not null check (char_length(display_name) between 2 and 120),
  slug                 text not null unique,
  description          text check (char_length(description) <= 3000),
  logo_path            text,
  cover_path           text,
  city_id              integer references public.cities(id) on delete set null,
  district_id          integer references public.districts(id) on delete set null,
  -- Vérification (« badge Vérifié »)
  verification_status  public.verification_status not null default 'pending',
  verified_at          timestamptz,
  -- Réputation (calculée)
  is_super_host        boolean not null default false,
  super_host_since     timestamptz,
  rating_avg           numeric(3,2) not null default 0,
  rating_count         integer not null default 0,
  response_rate        public.percent,             -- taux de réponse sur 30 jours
  avg_response_minutes integer check (avg_response_minutes >= 0),
  completed_bookings   integer not null default 0,
  is_active            boolean not null default true,
  suspended_at         timestamptz,
  created_by           uuid references public.profiles(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
comment on table public.partners is 'Partenaire (agence, particulier loueur, vendeur). Données publiques uniquement.';
create index partners_city_idx on public.partners(city_id);
create index partners_verification_idx on public.partners(verification_status);

create trigger partners_updated_at
  before update on public.partners
  for each row execute function private.set_updated_at();

-- Données sensibles du partenaire (jamais publiques)
create table public.partner_private (
  partner_id       uuid primary key references public.partners(id) on delete cascade,
  legal_name       text,
  rccm_number      text,                 -- Registre du commerce (pros)
  tax_id           text,                 -- Numéro de compte contribuable (NCC)
  contact_email    extensions.citext,
  contact_phone    public.phone_e164,
  whatsapp_phone   public.phone_e164,
  billing_address  text,
  commission_rate  numeric(5,4) check (commission_rate between 0 and 0.5),  -- null = taux par défaut
  internal_notes   text,                 -- notes de l'équipe interne
  updated_at       timestamptz not null default now()
);
create trigger partner_private_updated_at
  before update on public.partner_private
  for each row execute function private.set_updated_at();

-- Membres de l'équipe d'une agence
create table public.partner_members (
  partner_id uuid not null references public.partners(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       public.partner_member_role not null default 'agent',
  invited_by uuid references public.profiles(id) on delete set null,
  joined_at  timestamptz not null default now(),
  primary key (partner_id, user_id)
);
create unique index partner_members_one_owner on public.partner_members(partner_id) where role = 'owner';
create index partner_members_user_idx on public.partner_members(user_id);

create table public.partner_invitations (
  id          uuid primary key default gen_random_uuid(),
  partner_id  uuid not null references public.partners(id) on delete cascade,
  email       extensions.citext not null,
  role        public.partner_member_role not null default 'agent' check (role <> 'owner'),
  token_hash  text not null unique,      -- hash du jeton envoyé par email
  invited_by  uuid references public.profiles(id) on delete set null,
  expires_at  timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index partner_invitations_partner_idx on public.partner_invitations(partner_id);

-- Agences physiques et points de retrait (« Localisation des agences physiques »)
create table public.partner_locations (
  id              uuid primary key default gen_random_uuid(),
  partner_id      uuid not null references public.partners(id) on delete cascade,
  name            text not null check (char_length(name) between 2 and 120),
  address_line    text not null,
  city_id         integer not null references public.cities(id),
  district_id     integer references public.districts(id) on delete set null,
  latitude        numeric(9,6) check (latitude between -90 and 90),
  longitude       numeric(9,6) check (longitude between -180 and 180),
  phone           public.phone_e164,
  -- {"mon":[["08:00","18:00"]],"sat":[["09:00","13:00"]],"sun":[]}
  opening_hours   jsonb not null default '{}'::jsonb check (jsonb_typeof(opening_hours) = 'object'),
  is_pickup_point boolean not null default true,
  is_public_agency boolean not null default false,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index partner_locations_partner_idx on public.partner_locations(partner_id);
create index partner_locations_geo_idx on public.partner_locations(latitude, longitude) where is_active;

create trigger partner_locations_updated_at
  before update on public.partner_locations
  for each row execute function private.set_updated_at();

-- Comptes de versement (Mobile Money ou banque). Le numéro complet est chiffré
-- côté serveur (AES-GCM, clé dans les variables d'environnement) avant stockage.
create table public.partner_payout_accounts (
  id                    uuid primary key default gen_random_uuid(),
  partner_id            uuid not null references public.partners(id) on delete cascade,
  method                public.payout_method not null,
  wallet_provider       public.payment_method check (wallet_provider in ('wave', 'orange_money', 'mtn_momo', 'moov_money')),
  bank_name             text,
  account_holder_name   text not null,
  account_last4         text not null check (account_last4 ~ '^[0-9A-Za-z]{2,4}$'),
  account_ciphertext    text not null,
  is_default            boolean not null default false,
  verified_at           timestamptz,
  created_at            timestamptz not null default now(),
  check ((method = 'mobile_money' and wallet_provider is not null) or (method = 'bank_transfer' and bank_name is not null))
);
create unique index partner_payout_one_default on public.partner_payout_accounts(partner_id) where is_default;

-- Documents justificatifs du partenaire (KYB)
create table public.partner_documents (
  id               uuid primary key default gen_random_uuid(),
  partner_id       uuid not null references public.partners(id) on delete cascade,
  type             public.partner_document_type not null,
  storage_path     text not null unique,
  status           public.verification_status not null default 'pending',
  expires_on       date,
  uploaded_by      uuid references public.profiles(id) on delete set null,
  reviewed_by      uuid references public.profiles(id) on delete set null,
  reviewed_at      timestamptz,
  rejection_reason text,
  created_at       timestamptz not null default now()
);
create index partner_documents_partner_idx on public.partner_documents(partner_id);

-- -----------------------------------------------------------------------------
-- Helpers RLS partenaires
-- -----------------------------------------------------------------------------
create or replace function private.is_partner_member(p_partner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.partner_members
    where partner_id = p_partner_id and user_id = (select auth.uid())
  );
$$;

-- Propriétaire ou gestionnaire (peut modifier prix, annonces, équipe)
create or replace function private.is_partner_manager(p_partner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.partner_members
    where partner_id = p_partner_id and user_id = (select auth.uid()) and role in ('owner', 'manager')
  );
$$;

create or replace function private.my_partner_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select partner_id from public.partner_members where user_id = (select auth.uid());
$$;
