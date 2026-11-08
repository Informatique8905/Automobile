-- =============================================================================
-- 0100 — Extensions, schéma privé, domaines, énumérations, utilitaires
-- Plateforme de location et vente de véhicules (Côte d'Ivoire)
-- Conventions :
--   * identifiants SQL en anglais (snake_case), commentaires en français
--   * montants en FCFA (XOF) entiers : pas de centimes
--   * toutes les dates en timestamptz (UTC), affichage en Africa/Abidjan
-- =============================================================================

create extension if not exists pgcrypto  with schema extensions;
create extension if not exists citext    with schema extensions;
create extension if not exists pg_trgm   with schema extensions;
create extension if not exists unaccent  with schema extensions;
create extension if not exists btree_gist with schema extensions;

-- Schéma non exposé par l'API : fonctions internes (helpers RLS, triggers)
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Domaines
-- -----------------------------------------------------------------------------
-- Montant en FCFA, entier positif ou nul
create domain public.xof as bigint check (value >= 0);
-- Numéro de téléphone au format international E.164 (+2250701020304)
create domain public.phone_e164 as text check (value ~ '^\+[1-9][0-9]{7,14}$');
-- Note de 1 à 5
create domain public.rating_1_5 as smallint check (value between 1 and 5);
-- Pourcentage 0–100
create domain public.percent as numeric(5,2) check (value >= 0 and value <= 100);

-- -----------------------------------------------------------------------------
-- Énumérations
-- -----------------------------------------------------------------------------
create type public.app_role as enum ('client', 'partner', 'moderator', 'support', 'admin');

-- Statut de validation (« En attente | Validé | Refusé » du cahier des charges)
create type public.verification_status as enum ('pending', 'approved', 'rejected', 'expired');
create type public.kyc_status as enum ('not_started', 'pending', 'approved', 'rejected', 'expired');

create type public.user_document_type as enum (
  'driver_license_front', 'driver_license_back',
  'national_id_front', 'national_id_back',
  'passport', 'residence_permit', 'selfie', 'proof_of_address'
);

create type public.partner_type as enum (
  'rental_agency',   -- loueur professionnel
  'private_owner',   -- particulier qui loue
  'dealership',      -- concessionnaire / garage vendeur pro
  'private_seller'   -- particulier qui vend
);
create type public.partner_member_role as enum ('owner', 'manager', 'agent');
create type public.partner_document_type as enum (
  'rccm', 'tax_certificate', 'business_license', 'owner_id', 'insurance_certificate', 'bank_details', 'other'
);

create type public.fuel_type as enum ('petrol', 'diesel', 'hybrid', 'plug_in_hybrid', 'electric', 'lpg');
create type public.transmission_type as enum ('manual', 'automatic');
-- Statut de flotte en temps réel (« Disponible, Loué, En maintenance, Hors service »)
create type public.fleet_status as enum ('available', 'rented', 'maintenance', 'out_of_service', 'sold');
create type public.vehicle_document_type as enum (
  'registration',          -- carte grise
  'insurance',             -- attestation d'assurance
  'technical_inspection',  -- visite technique
  'service_book',          -- carnet d'entretien
  'inspection_report',     -- rapport d'inspection
  'history_report',        -- historique du véhicule
  'customs_clearance',     -- dédouanement
  'other'
);
create type public.photo_angle as enum (
  'front', 'rear', 'left', 'right', 'three_quarter_front', 'three_quarter_rear',
  'interior_front', 'interior_rear', 'dashboard', 'trunk', 'engine', 'wheels', 'other'
);
create type public.equipment_group as enum ('comfort', 'technology', 'safety');

create type public.listing_type as enum ('rental', 'sale');
create type public.listing_status as enum (
  'draft', 'pending_review', 'published', 'paused', 'rejected', 'archived', 'sold'
);
create type public.content_status as enum ('visible', 'flagged', 'hidden');

create type public.fuel_policy as enum ('full_to_full', 'same_to_same', 'prepaid', 'free');
create type public.cancellation_policy as enum ('flexible', 'moderate', 'strict', 'non_refundable');
create type public.extra_pricing_unit as enum ('per_day', 'per_booking', 'per_unit');
create type public.insurance_level as enum ('third_party', 'intermediate', 'comprehensive');
create type public.location_kind as enum ('agency', 'customer_address', 'hotel', 'airport', 'other');

create type public.booking_status as enum (
  'pending_payment',        -- créée, en attente du paiement
  'pending_confirmation',   -- payée, en attente d'acceptation du loueur
  'confirmed',
  'in_progress',            -- véhicule remis (QR code scanné)
  'completed',
  'cancelled_by_customer',
  'cancelled_by_partner',
  'cancelled_by_admin',
  'declined',
  'expired',
  'disputed'
);

create type public.payment_status as enum (
  'initiated', 'pending', 'succeeded', 'failed', 'cancelled', 'refunded', 'partially_refunded'
);
create type public.payment_method as enum (
  'card', 'wave', 'orange_money', 'mtn_momo', 'moov_money', 'bank_transfer', 'cash'
);
create type public.payment_provider as enum ('jeko', 'manual');
create type public.payment_purpose as enum (
  'rental', 'rental_extension', 'deposit', 'damage_charge', 'extra_km_charge',
  'sale_reservation_deposit', 'featured_listing', 'other'
);
-- Caution : empreinte carte (non débitée) ou versement remboursable (Mobile Money) ou en agence
create type public.deposit_mode as enum ('card_preauthorization', 'refundable_payment', 'at_pickup');
create type public.deposit_status as enum (
  'pending', 'authorized', 'partially_captured', 'captured', 'released', 'refunded', 'expired', 'failed'
);
create type public.refund_status as enum ('pending', 'processing', 'succeeded', 'failed');
create type public.payout_status as enum ('pending', 'processing', 'paid', 'failed', 'cancelled');
create type public.payout_method as enum ('mobile_money', 'bank_transfer');

create type public.inspection_type as enum ('pickup', 'return');
create type public.damage_severity as enum ('minor', 'moderate', 'major');

create type public.test_drive_status as enum ('requested', 'confirmed', 'completed', 'cancelled', 'declined', 'no_show');
create type public.sale_reservation_status as enum (
  'pending_payment', 'active', 'converted', 'refunded', 'expired', 'cancelled'
);
create type public.financing_status as enum ('submitted', 'contacted', 'approved', 'rejected', 'cancelled');

create type public.conversation_subject as enum (
  'listing', 'booking', 'test_drive', 'sale_reservation', 'dispute'
);
create type public.message_kind as enum ('text', 'system', 'attachment');
create type public.review_direction as enum ('customer_to_partner', 'partner_to_customer');

create type public.notification_channel as enum ('in_app', 'email', 'sms', 'whatsapp', 'push');
create type public.delivery_status as enum ('queued', 'sent', 'delivered', 'failed');

create type public.flag_entity as enum (
  'user', 'partner', 'listing', 'vehicle', 'photo', 'message', 'review', 'document', 'booking', 'payment'
);
create type public.flag_source as enum ('ai', 'user_report', 'system', 'admin');
create type public.flag_status as enum ('open', 'in_review', 'confirmed', 'dismissed');
create type public.sanction_type as enum ('warning', 'suspension', 'ban');
create type public.blocklist_kind as enum ('email', 'phone', 'device', 'ip', 'license_plate', 'document_number');

create type public.ai_job_type as enum (
  'listing_moderation', 'photo_moderation', 'message_screening',
  'document_precheck', 'booking_risk_scoring', 'review_moderation'
);
create type public.job_status as enum ('pending', 'processing', 'succeeded', 'failed', 'cancelled');

create type public.dispute_type as enum (
  'damage', 'deposit', 'refund', 'no_show', 'not_as_described', 'behavior', 'payment', 'other'
);
create type public.dispute_status as enum (
  'open', 'awaiting_evidence', 'under_review', 'resolved_customer', 'resolved_partner', 'resolved_split', 'closed'
);

create type public.ticket_priority as enum ('urgent', 'standard');
create type public.ticket_channel as enum ('form', 'chatbot', 'whatsapp', 'phone', 'email');
create type public.ticket_status as enum ('open', 'pending_customer', 'in_progress', 'resolved', 'closed');

create type public.legal_document_type as enum (
  'terms_of_use', 'terms_of_sale', 'privacy_policy', 'cookie_policy', 'legal_notice', 'partner_agreement'
);
create type public.consent_type as enum (
  'terms', 'privacy', 'marketing_email', 'marketing_sms', 'marketing_whatsapp',
  'cookies_analytics', 'biometric_processing'
);
create type public.deletion_status as enum ('requested', 'cancelled', 'completed');

-- -----------------------------------------------------------------------------
-- Utilitaires génériques
-- -----------------------------------------------------------------------------

-- Met à jour updated_at automatiquement
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Vrai quand le code s'exécute côté serveur de confiance : service_role, postgres,
-- ou à l'intérieur d'une fonction SECURITY DEFINER (current_user = propriétaire).
-- Faux pour les requêtes directes des rôles anon / authenticated.
create or replace function private.is_trusted_context()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_user not in ('anon', 'authenticated');
$$;

-- Code aléatoire lisible (sans 0/O/1/I) pour les références publiques : LOC-7K3M9QXA
create or replace function private.random_code(p_length integer default 8)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  v_bytes bytea := extensions.gen_random_bytes(p_length);
  v_out text := '';
  i integer;
begin
  for i in 0 .. p_length - 1 loop
    v_out := v_out || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
  end loop;
  return v_out;
end;
$$;

create or replace function private.generate_reference(p_prefix text)
returns text
language sql
volatile
set search_path = ''
as $$
  select p_prefix || '-' || private.random_code(8);
$$;

-- Jeton secret (QR code de prise en charge, invitations…)
create or replace function private.random_token(p_bytes integer default 32)
returns text
language sql
volatile
set search_path = ''
as $$
  select encode(extensions.gen_random_bytes(p_bytes), 'hex');
$$;

-- Distance à vol d'oiseau en km (Haversine) — suffisant pour « les plus proches de moi »
create or replace function private.distance_km(
  lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric
)
returns numeric
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when lat1 is null or lng1 is null or lat2 is null or lng2 is null then null
    else round((6371 * 2 * asin(sqrt(
      power(sin(radians((lat2 - lat1)::double precision) / 2), 2)
      + cos(radians(lat1::double precision)) * cos(radians(lat2::double precision))
      * power(sin(radians((lng2 - lng1)::double precision) / 2), 2)
    )))::numeric, 2)
  end;
$$;

-- Conversion sûre texte → uuid (utilisée par les policies de stockage)
create or replace function private.try_uuid(p_value text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return p_value::uuid;
exception when others then
  return null;
end;
$$;

-- Slug : « Toyota Corolla 2021 » → « toyota-corolla-2021 »
create or replace function private.slugify(p_value text)
returns text
language sql
stable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(
    lower(extensions.unaccent(coalesce(p_value, ''))),
    '[^a-z0-9]+', '-', 'g'
  ));
$$;

-- Hash d'une valeur normalisée (liste noire sans stocker la donnée en clair)
create or replace function private.hash_value(p_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(extensions.digest(lower(trim(coalesce(p_value, ''))), 'sha256'), 'hex');
$$;
