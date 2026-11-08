-- =============================================================================
-- 20261108000100 — Mise à jour du trigger handle_new_user
--
-- Changements :
--   1. Lecture et stockage de city_id + district_id depuis raw_user_meta_data
--      vers profiles (FK vers cities et districts)
--   2. Insertion des consentements initiaux dans public.consents lors de
--      l'inscription : terms, privacy (toujours vrais), marketing_email (optionnel)
--
-- Référence : loi CI n° 2013-450 sur la protection des données personnelles / RGPD
-- =============================================================================

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta         jsonb    := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_full         text     := coalesce(v_meta ->> 'full_name', v_meta ->> 'name', '');
  v_first        text;
  v_last         text;
  v_phone        text;
  v_city_id      integer;
  v_district_id  integer;
  v_marketing    boolean;
begin
  -- Prénom / Nom
  v_first := nullif(trim(coalesce(
    v_meta ->> 'first_name',
    v_meta ->> 'given_name',
    split_part(v_full, ' ', 1)
  )), '');
  v_last := nullif(trim(coalesce(
    v_meta ->> 'last_name',
    v_meta ->> 'family_name',
    nullif(substr(v_full, length(split_part(v_full, ' ', 1)) + 2), '')
  )), '');

  -- Téléphone (format E.164 obligatoire, sinon on l'ignore)
  v_phone := coalesce(new.phone, v_meta ->> 'phone');
  if v_phone is not null and v_phone !~ '^\+[1-9][0-9]{7,14}$' then
    v_phone := null;
  end if;

  -- Géographie (IDs entiers, passés par le formulaire d'inscription)
  begin
    v_city_id := (v_meta ->> 'city_id')::integer;
  exception when others then
    v_city_id := null;
  end;
  begin
    v_district_id := (v_meta ->> 'district_id')::integer;
  exception when others then
    v_district_id := null;
  end;

  -- Consentement marketing (par défaut : non accordé)
  v_marketing := coalesce((v_meta ->> 'marketing_consent')::boolean, false);

  -- ── Profil ──────────────────────────────────────────────────────────────
  insert into public.profiles (
    id, email, first_name, last_name, phone, phone_verified_at,
    avatar_path, city_id, district_id
  )
  values (
    new.id,
    new.email,
    left(v_first, 100),
    left(v_last, 100),
    v_phone,
    new.phone_confirmed_at,
    coalesce(v_meta ->> 'avatar_url', v_meta ->> 'picture'),
    v_city_id,
    v_district_id
  );

  -- ── Rôle par défaut ─────────────────────────────────────────────────────
  insert into public.user_roles (user_id, role) values (new.id, 'client');

  -- ── Préférences de notification : tout activé sauf marketing ────────────
  insert into public.notification_preferences (user_id, channel, category, enabled)
  select new.id, c.channel, k.category, k.category <> 'marketing'
  from unnest(array['in_app', 'email', 'sms', 'whatsapp', 'push']::public.notification_channel[]) as c(channel)
  cross join unnest(array['booking', 'message', 'payment', 'security', 'reminder', 'marketing']) as k(category);

  -- ── Consentements horodatés ─────────────────────────────────────────────
  -- ip_address et user_agent sont NULL car le trigger s'exécute côté serveur.
  -- Pour les enregistrer, passer par un appel RPC authentifié depuis le client.
  insert into public.consents (user_id, consent_type, granted)
  values
    (new.id, 'terms',          true),         -- CGU : obligatoire à l'inscription
    (new.id, 'privacy',        true),         -- Politique de confidentialité : obligatoire
    (new.id, 'marketing_email', v_marketing); -- E-mails marketing : optionnel

  return new;
end;
$$;
