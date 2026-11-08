-- =============================================================================
-- 20261106-0500 — SÉCURITÉ : agents IA pilotables, journal de sécurité,
-- délai de carence des comptes de versement, droits des personnes, registre des
-- violations de données, journal d'audit inviolable
--
-- Principe directeur : « l'IA propose, l'humain dispose ».
--   - chaque agent a un interrupteur (mode off / shadow / assist / auto) ;
--   - un agent ne peut BLOQUER que si son score dépasse le seuil fixé par l'admin ;
--   - un budget quotidien plafonne la dépense de chaque agent ;
--   - aucune suppression, aucune validation KYC, aucune sanction automatique.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Registre des agents IA
-- -----------------------------------------------------------------------------
create table public.ai_agents (
  job_type         public.ai_job_type primary key,
  name             text not null,
  description      text not null,
  mode             public.ai_agent_mode not null default 'shadow',
  model            text,                                   -- ex. le modèle LLM retenu
  prompt_version   text not null default 'v1',
  flag_threshold   smallint not null default 50 check (flag_threshold between 0 and 100),
  block_threshold  smallint not null default 85 check (block_threshold between 0 and 101),  -- 101 = ne bloque jamais
  daily_budget_usd numeric(10,2) not null default 2 check (daily_budget_usd >= 0),
  updated_at       timestamptz not null default now(),
  updated_by       uuid references public.profiles(id) on delete set null,
  check (block_threshold >= flag_threshold)
);

create trigger ai_agents_updated_at
  before update on public.ai_agents
  for each row execute function private.set_updated_at();

insert into public.ai_agents (job_type, name, description, mode, flag_threshold, block_threshold, daily_budget_usd) values
  ('listing_moderation',    'Modération des annonces',
   'Arnaques, prix anormaux, coordonnées dans le texte, contenu interdit', 'auto', 50, 85, 3),
  ('photo_moderation',      'Modération des photos',
   'Photos inappropriées, plaques ou visages visibles, captures d''écran', 'auto', 50, 85, 3),
  ('message_screening',     'Filtrage de la messagerie',
   'Demandes de paiement hors plateforme, liens d''hameçonnage, harcèlement', 'auto', 40, 80, 3),
  ('document_precheck',     'Pré-contrôle des documents',
   'Lisibilité, date d''expiration, cohérence nom/date de naissance — jamais de décision KYC', 'assist', 50, 101, 2),
  ('booking_risk_scoring',  'Score de risque des réservations',
   'Compte récent, vélocité, incohérences, signaux de fraude connus', 'assist', 50, 101, 2),
  ('review_moderation',     'Modération des avis',
   'Avis injurieux, faux avis, données personnelles', 'auto', 50, 85, 1),
  ('login_anomaly',         'Surveillance des connexions',
   'Rafales d''échecs, nouvel appareil ou pays, changement d''e-mail ou de mot de passe', 'shadow', 50, 101, 1),
  ('payout_account_review', 'Contrôle des comptes de versement',
   'Nouveau compte de versement d''un partenaire : nom du titulaire, historique, signaux', 'shadow', 40, 101, 1),
  ('payment_risk_scoring',  'Risque des paiements',
   'Échecs de paiement répétés (test de cartes volées, numéros Mobile Money multiples)', 'shadow', 50, 101, 1),
  ('duplicate_photo_check', 'Détection de photos copiées',
   'Même photo utilisée par plusieurs partenaires : annonce clonée ou volée', 'shadow', 50, 90, 1)
on conflict (job_type) do nothing;
-- block_threshold = 101 : l'agent ne peut jamais bloquer, seulement signaler.

-- -----------------------------------------------------------------------------
-- 2. claim_ai_jobs : ignore les agents arrêtés ou ayant épuisé leur budget du jour
-- -----------------------------------------------------------------------------
create or replace function public.claim_ai_jobs(p_limit integer default 10, p_worker text default 'worker')
returns setof public.ai_jobs
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  update public.ai_jobs set status = 'pending', locked_at = null, locked_by = null
   where status = 'processing' and locked_at < now() - interval '10 minutes';

  return query
  update public.ai_jobs j
     set status = 'processing', locked_at = now(), locked_by = p_worker, attempts = j.attempts + 1
   where j.id in (
     select q.id from public.ai_jobs q
      where q.status = 'pending' and q.run_after <= now()
        and exists (
          select 1 from public.ai_agents a
           where a.job_type = q.job_type
             and a.mode <> 'off'
             and (select coalesce(sum(r.cost_usd), 0)
                    from public.ai_agent_runs r
                    join public.ai_jobs j2 on j2.id = r.job_id
                   where j2.job_type = a.job_type
                     and r.created_at >= date_trunc('day', now())) < a.daily_budget_usd
        )
      order by q.priority desc, q.run_after
      limit least(greatest(coalesce(p_limit, 10), 1), 100)
      for update of q skip locked
   )
  returning j.*;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. complete_ai_job : modes, seuils et nouveaux agents
-- -----------------------------------------------------------------------------
create or replace function public.complete_ai_job(
  p_job_id        bigint,
  p_success       boolean,
  p_decision      text default 'pass',      -- pass | flag | block
  p_risk_score    smallint default null,
  p_reason_code   text default null,
  p_explanation   jsonb default '{}'::jsonb,
  p_agent         text default null,
  p_model         text default null,
  p_input_hash    text default null,
  p_tokens_input  integer default null,
  p_tokens_output integer default null,
  p_latency_ms    integer default null,
  p_cost_usd      numeric default null,
  p_error         text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_job public.ai_jobs;
  v_agent public.ai_agents;
  v_mode public.ai_agent_mode;
  v_decision text;
  v_auto_publish_max smallint := private.setting_int('ai_auto_publish_max_risk', 30)::smallint;
  v_listing public.listings;
  v_payer uuid;
begin
  select * into v_job from public.ai_jobs where id = p_job_id for update;
  if v_job.id is null or v_job.status <> 'processing' then
    raise exception 'JOB_NOT_PROCESSING';
  end if;

  select * into v_agent from public.ai_agents where job_type = v_job.job_type;
  v_mode := coalesce(v_agent.mode, 'shadow');

  if not p_success then
    update public.ai_jobs
       set status = case when attempts >= max_attempts then 'failed' else 'pending' end::public.job_status,
           run_after = now() + make_interval(mins => (attempts * attempts)::integer),
           last_error = left(p_error, 1000), locked_at = null, locked_by = null
     where id = p_job_id;
    insert into public.ai_agent_runs (job_id, agent, model, entity_type, entity_id, input_hash, decision,
                                      tokens_input, tokens_output, latency_ms, cost_usd, output)
    values (p_job_id, coalesce(p_agent, v_job.job_type::text), coalesce(p_model, 'unknown'), v_job.entity_type, v_job.entity_id,
            p_input_hash, 'error', p_tokens_input, p_tokens_output, p_latency_ms, p_cost_usd, jsonb_build_object('error', p_error));
    return;
  end if;

  if p_decision not in ('pass', 'flag', 'block') then
    raise exception 'INVALID_DECISION';
  end if;

  -- Garde-fous : le score commande, pas le seul verdict du modèle
  v_decision := p_decision;
  if p_risk_score is not null and v_agent.job_type is not null then
    if v_decision = 'block' and p_risk_score < v_agent.block_threshold then
      v_decision := 'flag';
    end if;
    if v_decision = 'pass' and p_risk_score >= v_agent.flag_threshold then
      v_decision := 'flag';
    end if;
  end if;
  -- Mode assist : jamais de blocage automatique
  if v_mode = 'assist' and v_decision = 'block' then
    v_decision := 'flag';
  end if;

  update public.ai_jobs
     set status = 'succeeded', completed_at = now(), locked_at = null,
         result = jsonb_build_object('decision', v_decision, 'model_decision', p_decision,
                                     'risk_score', p_risk_score, 'reason_code', p_reason_code, 'mode', v_mode)
   where id = p_job_id;

  insert into public.ai_agent_runs (job_id, agent, model, entity_type, entity_id, input_hash, output, risk_score, decision,
                                    tokens_input, tokens_output, latency_ms, cost_usd)
  values (p_job_id, coalesce(p_agent, v_job.job_type::text), coalesce(p_model, 'unknown'), v_job.entity_type, v_job.entity_id,
          p_input_hash, coalesce(p_explanation, '{}'::jsonb) || jsonb_build_object('mode', v_mode, 'model_decision', p_decision),
          p_risk_score, v_decision, p_tokens_input, p_tokens_output, p_latency_ms, p_cost_usd);

  -- Mode shadow : on observe, on n'agit pas
  if v_mode = 'shadow' then
    return;
  end if;

  -- Signalement pour revue humaine
  if v_decision in ('flag', 'block') then
    insert into public.moderation_flags (entity_type, entity_id, source, reason_code, risk_score, details)
    values (v_job.entity_type, v_job.entity_id, 'ai', coalesce(p_reason_code, 'ai_' || v_decision), p_risk_score,
            coalesce(p_explanation, '{}'::jsonb) || jsonb_build_object('job_id', p_job_id, 'decision', v_decision));
  end if;

  -- Effets (aucune suppression : masquer ou remettre en revue seulement)
  case v_job.job_type
    when 'listing_moderation' then
      select * into v_listing from public.listings where id = v_job.entity_id for update;
      update public.listings set risk_score = p_risk_score, last_moderated_at = now() where id = v_job.entity_id;
      if v_mode = 'auto' and v_listing.status = 'pending_review' and v_decision = 'pass'
         and coalesce(p_risk_score, 100) <= v_auto_publish_max
         and exists (select 1 from public.partners where id = v_listing.partner_id and verification_status = 'approved') then
        update public.listings set status = 'published', published_at = coalesce(published_at, now()) where id = v_listing.id;
        perform private.notify_partner(v_listing.partner_id, 'booking', 'listing.published', 'Annonce publiée',
          v_listing.title, '/partenaire/annonces/' || v_listing.id, '{}'::jsonb, 1::smallint);
      elsif v_listing.status = 'published' and v_decision = 'block' then
        update public.listings set status = 'pending_review' where id = v_listing.id;
      end if;
    when 'photo_moderation', 'duplicate_photo_check' then
      if v_decision = 'block' then
        update public.vehicle_photos set status = 'hidden' where id = v_job.entity_id;
      elsif v_decision = 'flag' then
        update public.vehicle_photos set status = 'flagged' where id = v_job.entity_id and status = 'visible';
      end if;
    when 'message_screening' then
      update public.messages
         set status = case v_decision when 'block' then 'hidden' when 'flag' then 'flagged' else status end::public.content_status,
             risk_flags = case when p_explanation ? 'flags'
                               then array(select distinct unnest(risk_flags || array(select jsonb_array_elements_text(p_explanation -> 'flags'))))
                               else risk_flags end
       where id = v_job.entity_id;
    when 'review_moderation' then
      if v_decision in ('flag', 'block') then
        update public.reviews set status = case v_decision when 'block' then 'hidden' else 'flagged' end::public.content_status
         where id = v_job.entity_id;
      end if;
    when 'document_precheck' then
      update public.user_documents
         set ai_precheck = coalesce(p_explanation, '{}'::jsonb) || jsonb_build_object('risk_score', p_risk_score, 'decision', v_decision)
       where id = v_job.entity_id;
    when 'booking_risk_scoring' then
      if coalesce(p_risk_score, 0) >= 70 then
        insert into public.fraud_signals (booking_id, user_id, signal_type, severity, source, details)
        select b.id, b.customer_id, coalesce(p_reason_code, 'high_risk_booking'), 4, 'ai', coalesce(p_explanation, '{}'::jsonb)
          from public.bookings b where b.id = v_job.entity_id;
      end if;
    when 'login_anomaly' then
      if v_decision in ('flag', 'block') then
        insert into public.fraud_signals (user_id, signal_type, severity, source, details)
        values (v_job.entity_id, coalesce(p_reason_code, 'suspicious_login'),
                case v_decision when 'block' then 4 else 3 end, 'ai', coalesce(p_explanation, '{}'::jsonb));
        perform private.notify_user(v_job.entity_id, 'security', 'security.suspicious_login',
          'Activité inhabituelle sur votre compte',
          'Si ce n''était pas vous, changez votre mot de passe et activez la double authentification.',
          '/compte/securite', '{}'::jsonb, 2::smallint);
      end if;
    when 'payout_account_review' then
      if v_decision in ('flag', 'block') then
        insert into public.fraud_signals (partner_id, signal_type, severity, source, details)
        values (v_job.entity_id, coalesce(p_reason_code, 'suspicious_payout_account'), 4, 'ai', coalesce(p_explanation, '{}'::jsonb));
      end if;
    when 'payment_risk_scoring' then
      if v_decision in ('flag', 'block') then
        select payer_id into v_payer from public.payments where id = v_job.entity_id;
        if v_payer is not null then
          insert into public.fraud_signals (user_id, signal_type, severity, source, details)
          values (v_payer, coalesce(p_reason_code, 'payment_velocity'), 3, 'ai',
                  coalesce(p_explanation, '{}'::jsonb) || jsonb_build_object('payment_id', v_job.entity_id));
        end if;
      end if;
    else
      null;  -- agent sans effet automatique : la trace et le signalement suffisent
  end case;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. Journal de sécurité (connexions, changements sensibles)
--    Alimenté par le backend depuis les événements Supabase Auth.
-- -----------------------------------------------------------------------------
create table public.security_events (
  id          bigint generated always as identity primary key,
  user_id     uuid references public.profiles(id) on delete cascade,
  event_type  text not null check (event_type ~ '^[a-z0-9_.]{2,60}$'),  -- ex. login.failed, mfa.disabled
  severity    smallint not null default 1 check (severity between 1 and 5),
  ip_hash     text,          -- adresse IP hachée (pas en clair)
  country     char(2),
  device_hash text,
  user_agent  text,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index security_events_user_idx on public.security_events(user_id, created_at desc);
create index security_events_type_idx on public.security_events(event_type, created_at desc);

-- Un événement de gravité >= 3 déclenche l'agent de surveillance des connexions
create or replace function private.security_events_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is not null and new.severity >= 3 then
    perform private.enqueue_ai_job('login_anomaly', 'user', new.user_id, 2::smallint);
  end if;
  return new;
end;
$$;

create trigger security_events_after_insert
  after insert on public.security_events
  for each row execute function private.security_events_after_insert();

-- -----------------------------------------------------------------------------
-- 5. Comptes de versement : délai de carence + contrôle IA + alerte
--    Fraude classique : un compte partenaire piraté change le numéro de versement.
-- -----------------------------------------------------------------------------
alter table public.partner_payout_accounts
  add column usable_after timestamptz not null default now();

insert into public.platform_settings (key, value, description, is_public) values
  ('payout_account_cooling_hours', '72',
   'Délai avant qu''un nouveau compte de versement puisse recevoir de l''argent', true)
on conflict (key) do nothing;

create or replace function private.payout_accounts_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.usable_after := now() + make_interval(hours => private.setting_int('payout_account_cooling_hours', 72));
  new.verified_at := null;
  return new;
end;
$$;

create trigger payout_accounts_before_insert
  before insert on public.partner_payout_accounts
  for each row execute function private.payout_accounts_before_insert();

create or replace function private.payout_accounts_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.enqueue_ai_job('payout_account_review', 'partner', new.partner_id, 2::smallint);
  perform private.notify_partner(new.partner_id, 'security', 'payout_account.added',
    'Nouveau compte de versement ajouté',
    'Il sera utilisable dans ' || private.setting_int('payout_account_cooling_hours', 72)
      || ' h. Si ce n''est pas vous, contactez immédiatement le support.',
    '/partenaire/versements', jsonb_build_object('account_last4', new.account_last4), 2::smallint);
  return new;
end;
$$;

create trigger payout_accounts_after_insert
  after insert on public.partner_payout_accounts
  for each row execute function private.payout_accounts_after_insert();

-- Aucun versement vers un compte encore en période de carence
create or replace function private.payouts_check_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('processing', 'paid') and new.payout_account_id is not null
     and exists (select 1 from public.partner_payout_accounts a
                  where a.id = new.payout_account_id and a.usable_after > now()) then
    raise exception 'PAYOUT_ACCOUNT_COOLING_PERIOD';
  end if;
  return new;
end;
$$;

create trigger payouts_check_account
  before insert or update of status, payout_account_id on public.payouts
  for each row execute function private.payouts_check_account();

-- -----------------------------------------------------------------------------
-- 6. Paiements : 3 échecs ou plus en 1 h pour un même client → agent de risque
-- -----------------------------------------------------------------------------
create or replace function private.payments_after_failure()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'failed' and old.status is distinct from 'failed'
     and (select count(*) from public.payments
           where payer_id = new.payer_id and status = 'failed'
             and updated_at > now() - interval '1 hour') >= 3 then
    perform private.enqueue_ai_job('payment_risk_scoring', 'payment', new.id, 1::smallint);
  end if;
  return new;
end;
$$;

create trigger payments_after_failure
  after update of status on public.payments
  for each row execute function private.payments_after_failure();

-- -----------------------------------------------------------------------------
-- 7. Photos copiées : empreinte perceptuelle (pHash 64 bits) calculée par le backend
-- -----------------------------------------------------------------------------
alter table public.vehicle_photos add column perceptual_hash bigint;
create index vehicle_photos_phash_idx on public.vehicle_photos(perceptual_hash) where perceptual_hash is not null;

-- Photos très proches (distance de Hamming <= p_max_distance) chez d'AUTRES partenaires
create or replace function public.find_photo_duplicates(p_photo_id uuid, p_max_distance integer default 6)
returns table (photo_id uuid, vehicle_id uuid, partner_id uuid, distance integer)
language sql
stable
security definer
set search_path = ''
as $$
  with src as (
    select p.perceptual_hash, v.partner_id
      from public.vehicle_photos p join public.vehicles v on v.id = p.vehicle_id
     where p.id = p_photo_id and p.perceptual_hash is not null
  )
  select p.id, p.vehicle_id, v.partner_id,
         bit_count((p.perceptual_hash # src.perceptual_hash)::bit(64))::integer as distance
    from src
    join public.vehicle_photos p on p.perceptual_hash is not null and p.id <> p_photo_id
    join public.vehicles v on v.id = p.vehicle_id and v.partner_id <> src.partner_id
   where bit_count((p.perceptual_hash # src.perceptual_hash)::bit(64)) <= p_max_distance
   order by distance
   limit 20;
$$;

-- Dès que le backend a enregistré l'empreinte, l'agent de détection est lancé
create or replace function private.vehicle_photos_after_phash()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.perceptual_hash is not null and old.perceptual_hash is distinct from new.perceptual_hash then
    perform private.enqueue_ai_job('duplicate_photo_check', 'photo', new.id, 0::smallint);
  end if;
  return new;
end;
$$;

create trigger vehicle_photos_after_phash
  after update of perceptual_hash on public.vehicle_photos
  for each row execute function private.vehicle_photos_after_phash();

-- -----------------------------------------------------------------------------
-- 8. Droits des personnes (loi n° 2013-450) : accès, export, rectification…
-- -----------------------------------------------------------------------------
insert into public.platform_settings (key, value, description, is_public) values
  ('privacy_request_days', '30', 'Délai interne de réponse aux demandes (à confirmer avec l''ARTCI / un avocat)', true)
on conflict (key) do nothing;

create table public.privacy_requests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  request_type public.privacy_request_type not null,
  status       public.privacy_request_status not null default 'received',
  details      text check (char_length(details) <= 2000),
  response     text,
  export_path  text,                -- bucket privé : archive générée par le backend
  due_at       timestamptz not null,
  handled_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);
create index privacy_requests_open_idx on public.privacy_requests(due_at) where status in ('received', 'in_progress');

create or replace function public.request_privacy_action(p_type public.privacy_request_type, p_details text default null)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if exists (select 1 from public.privacy_requests
              where user_id = auth.uid() and request_type = p_type and status in ('received', 'in_progress')) then
    raise exception 'REQUEST_ALREADY_OPEN';
  end if;
  insert into public.privacy_requests (user_id, request_type, details, due_at)
  values (auth.uid(), p_type, left(p_details, 2000),
          now() + make_interval(days => private.setting_int('privacy_request_days', 30)))
  returning id into v_id;
  perform private.log_action('privacy_request.create', 'privacy_requests', v_id::text,
                             jsonb_build_object('type', p_type));
  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- 9. Registre des violations de données (administrateurs uniquement)
-- -----------------------------------------------------------------------------
create table public.data_incidents (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  description       text not null,
  severity          smallint not null check (severity between 1 and 5),
  status            public.incident_status not null default 'open',
  detected_at       timestamptz not null default now(),
  contained_at      timestamptz,
  data_categories   text[] not null default '{}',      -- ex. {identite, telephone, permis}
  affected_users    integer,
  artci_notified_at timestamptz,
  users_notified_at timestamptz,
  measures          text,
  created_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger data_incidents_updated_at
  before update on public.data_incidents
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- 10. Journal d'audit inviolable : ni modification, ni suppression
--     (purge de rétention possible uniquement via private.purge_audit_logs)
-- -----------------------------------------------------------------------------
create or replace function private.audit_logs_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and current_setting('app.audit_purge', true) = 'on' then
    return old;
  end if;
  raise exception 'AUDIT_LOG_IMMUTABLE';
end;
$$;

create trigger audit_logs_immutable
  before update or delete on public.audit_logs
  for each row execute function private.audit_logs_immutable();

create or replace function private.purge_audit_logs(p_older_than interval default interval '5 years')
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_older_than < interval '1 year' then
    raise exception 'RETENTION_TOO_SHORT';
  end if;
  perform set_config('app.audit_purge', 'on', true);
  delete from public.audit_logs where created_at < now() - p_older_than;
  get diagnostics v_count = row_count;
  perform set_config('app.audit_purge', 'off', true);
  return v_count;
end;
$$;

-- -----------------------------------------------------------------------------
-- 11. RLS et droits des nouvelles tables (tout refuser, puis ouvrir au cas par cas)
-- -----------------------------------------------------------------------------
alter table public.ai_agents        enable row level security;
alter table public.security_events  enable row level security;
alter table public.privacy_requests enable row level security;
alter table public.data_incidents   enable row level security;

revoke all on public.ai_agents, public.security_events, public.privacy_requests, public.data_incidents
  from anon, authenticated;
grant all on public.ai_agents, public.security_events, public.privacy_requests, public.data_incidents
  to service_role;

-- Agents IA : lecture par la modération, réglage par l'admin (mode, seuils, budget)
grant select on public.ai_agents to authenticated;
grant update (mode, model, prompt_version, flag_threshold, block_threshold, daily_budget_usd, updated_by)
  on public.ai_agents to authenticated;
create policy ai_agents_staff_read on public.ai_agents for select to authenticated
  using (private.is_moderator());
create policy ai_agents_admin_update on public.ai_agents for update to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- Journal de sécurité : chacun voit ses propres connexions, la modération voit tout
grant select on public.security_events to authenticated;
create policy security_events_own on public.security_events for select to authenticated
  using (user_id = (select auth.uid()) or private.is_moderator());

-- Demandes « vie privée » : création via request_privacy_action, suivi par l'équipe
grant select on public.privacy_requests to authenticated;
grant update (status, response, export_path, handled_by, completed_at) on public.privacy_requests to authenticated;
create policy privacy_requests_select on public.privacy_requests for select to authenticated
  using (user_id = (select auth.uid()) or private.is_staff());
create policy privacy_requests_staff_update on public.privacy_requests for update to authenticated
  using (private.is_staff()) with check (private.is_staff());

-- Violations de données : administrateurs uniquement
grant select, insert, update on public.data_incidents to authenticated;
create policy data_incidents_admin on public.data_incidents for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- Audit des tables sensibles ajoutées
create trigger audit_ai_agents after insert or update or delete on public.ai_agents
  for each row execute function private.audit_trigger();
create trigger audit_privacy_requests after insert or update or delete on public.privacy_requests
  for each row execute function private.audit_trigger();
create trigger audit_data_incidents after insert or update or delete on public.data_incidents
  for each row execute function private.audit_trigger();

-- Droits d'exécution
grant execute on function
  private.security_events_after_insert(), private.payout_accounts_before_insert(),
  private.payout_accounts_after_insert(), private.payouts_check_account(),
  private.payments_after_failure(), private.vehicle_photos_after_phash(),
  private.audit_logs_immutable()
to anon, authenticated, service_role;
revoke execute on function private.purge_audit_logs(interval) from public, anon, authenticated;

revoke execute on function public.request_privacy_action(public.privacy_request_type, text) from public, anon;
grant execute on function public.request_privacy_action(public.privacy_request_type, text) to authenticated, service_role;

revoke execute on function public.find_photo_duplicates(uuid, integer) from public, anon, authenticated;
grant execute on function public.find_photo_duplicates(uuid, integer) to service_role;
