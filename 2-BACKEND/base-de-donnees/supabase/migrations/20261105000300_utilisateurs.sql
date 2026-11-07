-- =============================================================================
-- 0300 — Comptes utilisateurs : profils, rôles, préférences, consentements,
-- coffre-fort numérique (documents), vérification d'identité (KYC), suppression
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Profils (1 ligne par compte auth.users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id                        uuid primary key references auth.users(id) on delete cascade,
  first_name                text check (char_length(first_name) between 1 and 100),   -- Prénoms
  last_name                 text check (char_length(last_name) between 1 and 100),    -- Nom
  email                     extensions.citext,
  phone                     public.phone_e164,
  phone_verified_at         timestamptz,
  date_of_birth             date check (date_of_birth > date '1900-01-01'),
  avatar_path               text,
  -- Adresse d'habitation
  address_line              text check (char_length(address_line) <= 300),
  city_id                   integer references public.cities(id) on delete set null,
  district_id               integer references public.districts(id) on delete set null,
  preferred_language        text not null default 'fr' check (preferred_language in ('fr', 'en')),
  -- Vérification d'identité (mise à jour par le système uniquement)
  kyc_status                public.kyc_status not null default 'not_started',
  kyc_verified_at           timestamptz,
  driver_license_issued_on  date,
  driver_license_expires_on date,
  -- Réputation (calculée)
  rating_avg                numeric(3,2) not null default 0,
  rating_count              integer not null default 0,
  -- Sécurité (mis à jour par le système / la modération uniquement)
  risk_score                smallint not null default 0 check (risk_score between 0 and 100),
  is_suspended              boolean not null default false,
  suspended_until           timestamptz,
  two_factor_enabled        boolean not null default false,
  profile_completed_at      timestamptz,
  last_seen_at              timestamptz,
  deleted_at                timestamptz,
  anonymized_at             timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
comment on table public.profiles is 'Profil public/privé de chaque utilisateur (locataire, acheteur, partenaire).';
create unique index profiles_phone_unique on public.profiles(phone) where phone is not null and deleted_at is null;
create index profiles_email_idx on public.profiles(email);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Rôles (un utilisateur peut être client ET partenaire)
-- -----------------------------------------------------------------------------
create table public.user_roles (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       public.app_role not null,
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- Helpers RLS (security definer : évitent la récursion des policies)
create or replace function private.has_role(p_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = p_role
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_role('admin');
$$;

-- Équipe interne : admin, modérateur, support
create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role in ('admin', 'moderator', 'support')
  );
$$;

create or replace function private.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role in ('admin', 'moderator')
  );
$$;

-- -----------------------------------------------------------------------------
-- Préférences de notification (par canal et par catégorie)
-- -----------------------------------------------------------------------------
create table public.notification_preferences (
  user_id  uuid not null references public.profiles(id) on delete cascade,
  channel  public.notification_channel not null,
  category text not null check (category in ('booking', 'message', 'payment', 'security', 'reminder', 'marketing')),
  enabled  boolean not null default true,
  primary key (user_id, channel, category)
);

-- -----------------------------------------------------------------------------
-- Consentements (historique horodaté, jamais modifié) — loi n° 2013-450 / RGPD
-- -----------------------------------------------------------------------------
create table public.consents (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  consent_type      public.consent_type not null,
  granted           boolean not null,
  legal_document_id uuid references public.legal_documents(id) on delete set null,
  ip_address        inet,
  user_agent        text,
  created_at        timestamptz not null default now()
);
create index consents_user_idx on public.consents(user_id, consent_type, created_at desc);

-- -----------------------------------------------------------------------------
-- Coffre-fort numérique : permis recto/verso, pièce d'identité, selfie…
-- Fichiers dans le bucket privé « kyc-documents » : {user_id}/{uuid}.jpg
-- -----------------------------------------------------------------------------
create table public.user_documents (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  type             public.user_document_type not null,
  storage_path     text not null unique,
  mime_type        text check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf')),
  file_size_bytes  integer check (file_size_bytes between 1 and 15728640),
  document_number  text,                -- n° de permis / CNI (accès restreint)
  country_code     char(2) default 'CI',
  issued_on        date,
  expires_on       date,
  status           public.verification_status not null default 'pending',
  reviewed_by      uuid references public.profiles(id) on delete set null,
  reviewed_at      timestamptz,
  rejection_reason text,
  ai_precheck      jsonb,               -- résultat du pré-contrôle IA (aide à la décision)
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (expires_on is null or issued_on is null or expires_on > issued_on)
);
create index user_documents_user_idx on public.user_documents(user_id, type);
create index user_documents_pending_idx on public.user_documents(created_at) where status = 'pending';

create trigger user_documents_updated_at
  before update on public.user_documents
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Vérifications d'identité (manuelle au début, Smile ID ensuite)
-- -----------------------------------------------------------------------------
create table public.kyc_verifications (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references public.profiles(id) on delete cascade,
  provider               text not null default 'manual' check (provider in ('manual', 'smile_id')),
  provider_reference     text,
  status                 public.kyc_status not null default 'pending',
  license_number         text,
  license_categories     text[],
  license_issued_on      date,
  license_expires_on     date,
  date_of_birth          date,
  full_name_on_document  text,
  face_match_score       numeric(5,2) check (face_match_score between 0 and 100),
  liveness_passed        boolean,
  result                 jsonb,                 -- réponse brute du fournisseur (staff uniquement)
  document_ids           uuid[] not null default '{}',
  decided_by             uuid references public.profiles(id) on delete set null,
  decided_at             timestamptz,
  rejection_reason       text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index kyc_verifications_user_idx on public.kyc_verifications(user_id, created_at desc);
create unique index kyc_verifications_provider_ref on public.kyc_verifications(provider, provider_reference)
  where provider_reference is not null;

create trigger kyc_verifications_updated_at
  before update on public.kyc_verifications
  for each row execute function private.set_updated_at();

-- Synchronise le statut KYC sur le profil
create or replace function private.sync_profile_kyc()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from coalesce(old.status, 'not_started'::public.kyc_status) then
    update public.profiles p
       set kyc_status                = new.status,
           kyc_verified_at           = case when new.status = 'approved' then now() else p.kyc_verified_at end,
           driver_license_issued_on  = case when new.status = 'approved'
                                            then coalesce(new.license_issued_on, p.driver_license_issued_on)
                                            else p.driver_license_issued_on end,
           driver_license_expires_on = case when new.status = 'approved'
                                            then coalesce(new.license_expires_on, p.driver_license_expires_on)
                                            else p.driver_license_expires_on end,
           date_of_birth             = case when new.status = 'approved'
                                            then coalesce(p.date_of_birth, new.date_of_birth)
                                            else p.date_of_birth end
     where p.id = new.user_id;
  end if;
  return new;
end;
$$;

create trigger kyc_verifications_sync_profile
  after insert or update of status on public.kyc_verifications
  for each row execute function private.sync_profile_kyc();

-- -----------------------------------------------------------------------------
-- Bouton « Supprimer mon compte » : délai de rétractation puis anonymisation
-- -----------------------------------------------------------------------------
create table public.account_deletion_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  reason        text check (char_length(reason) <= 1000),
  status        public.deletion_status not null default 'requested',
  requested_at  timestamptz not null default now(),
  scheduled_for timestamptz not null default (now() + interval '30 days'),
  cancelled_at  timestamptz,
  completed_at  timestamptz
);
create unique index account_deletion_one_active on public.account_deletion_requests(user_id)
  where status = 'requested';

-- -----------------------------------------------------------------------------
-- Notifications push web
-- -----------------------------------------------------------------------------
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth_key   text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions(user_id);

-- -----------------------------------------------------------------------------
-- Protection des champs sensibles du profil
-- -----------------------------------------------------------------------------
create or replace function private.protect_profile_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Changer de numéro annule la vérification du téléphone
  if new.phone is distinct from old.phone then
    new.phone_verified_at := null;
  end if;
  -- Date de naissance figée une fois l'identité vérifiée (sauf équipe interne)
  if old.kyc_status = 'approved'
     and new.date_of_birth is distinct from old.date_of_birth
     and not private.is_trusted_context()
     and not private.is_staff() then
    raise exception 'DOB_LOCKED_AFTER_KYC' using hint = 'La date de naissance ne peut plus être modifiée après vérification.';
  end if;
  -- Profil complet = nom + prénoms + téléphone
  if new.profile_completed_at is null
     and new.first_name is not null and new.last_name is not null and new.phone is not null then
    new.profile_completed_at := now();
  end if;
  return new;
end;
$$;

create trigger profiles_protect_fields
  before update on public.profiles
  for each row execute function private.protect_profile_fields();

-- -----------------------------------------------------------------------------
-- Création automatique du profil à l'inscription (email, Google, Apple)
-- -----------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_full text := coalesce(v_meta ->> 'full_name', v_meta ->> 'name', '');
  v_first text;
  v_last text;
  v_phone text;
begin
  v_first := nullif(trim(coalesce(v_meta ->> 'first_name', v_meta ->> 'given_name', split_part(v_full, ' ', 1))), '');
  v_last  := nullif(trim(coalesce(v_meta ->> 'last_name', v_meta ->> 'family_name',
                    nullif(substr(v_full, length(split_part(v_full, ' ', 1)) + 2), ''))), '');
  v_phone := coalesce(new.phone, v_meta ->> 'phone');
  if v_phone is not null and v_phone !~ '^\+[1-9][0-9]{7,14}$' then
    v_phone := null;
  end if;

  insert into public.profiles (id, email, first_name, last_name, phone, phone_verified_at, avatar_path)
  values (
    new.id,
    new.email,
    left(v_first, 100),
    left(v_last, 100),
    v_phone,
    new.phone_confirmed_at,
    coalesce(v_meta ->> 'avatar_url', v_meta ->> 'picture')
  );

  insert into public.user_roles (user_id, role) values (new.id, 'client');

  -- Préférences par défaut : tout sauf le marketing
  insert into public.notification_preferences (user_id, channel, category, enabled)
  select new.id, c.channel, k.category, k.category <> 'marketing'
  from unnest(array['in_app', 'email', 'sms', 'whatsapp', 'push']::public.notification_channel[]) as c(channel)
  cross join unnest(array['booking', 'message', 'payment', 'security', 'reminder', 'marketing']) as k(category);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
