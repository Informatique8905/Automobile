-- =============================================================================
-- 0900 — Confiance & sécurité : signalements, modération, signaux de fraude,
-- sanctions, liste noire, file des agents IA, journal IA, litiges, audit
-- Principe : l'IA signale, un humain décide.
-- =============================================================================

-- Signalements (IA, utilisateurs, système) → file de modération
-- entity_id sans clé étrangère : un signalement peut viser plusieurs types d'objets
create table public.moderation_flags (
  id              uuid primary key default gen_random_uuid(),
  entity_type     public.flag_entity not null,
  entity_id       uuid not null,
  source          public.flag_source not null,
  reporter_id     uuid references public.profiles(id) on delete set null,
  reason_code     text not null check (reason_code ~ '^[a-z0-9_]{2,60}$'),  -- ex. off_platform_payment
  description     text check (char_length(description) <= 2000),
  risk_score      smallint check (risk_score between 0 and 100),
  details         jsonb not null default '{}'::jsonb,   -- explication de l'IA, extraits…
  status          public.flag_status not null default 'open',
  assigned_to     uuid references public.profiles(id) on delete set null,
  resolved_by     uuid references public.profiles(id) on delete set null,
  resolved_at     timestamptz,
  resolution_note text,
  created_at      timestamptz not null default now(),
  check (source <> 'user_report' or reporter_id is not null)
);
create index moderation_flags_queue_idx on public.moderation_flags(status, risk_score desc nulls last, created_at)
  where status in ('open', 'in_review');
create index moderation_flags_entity_idx on public.moderation_flags(entity_type, entity_id);
-- Un utilisateur ne signale qu'une fois le même objet tant que le signalement est ouvert
create unique index moderation_flags_one_open_report on public.moderation_flags(entity_type, entity_id, reporter_id)
  where source = 'user_report' and status in ('open', 'in_review');

-- Signaux de fraude (comptes multiples, cartes refusées, annulations répétées…)
create table public.fraud_signals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade,
  partner_id  uuid references public.partners(id) on delete cascade,
  booking_id  uuid references public.bookings(id) on delete cascade,
  signal_type text not null check (signal_type ~ '^[a-z0-9_]{2,60}$'),
  severity    smallint not null check (severity between 1 and 5),
  source      public.flag_source not null default 'system',
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  check (num_nonnulls(user_id, partner_id, booking_id) >= 1)
);
create index fraud_signals_user_idx on public.fraud_signals(user_id, created_at desc);
create index fraud_signals_partner_idx on public.fraud_signals(partner_id, created_at desc);

-- Sanctions (avertissement, suspension, bannissement)
create table public.user_sanctions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade,
  partner_id uuid references public.partners(id) on delete cascade,
  type       public.sanction_type not null,
  reason     text not null,
  flag_id    uuid references public.moderation_flags(id) on delete set null,
  starts_at  timestamptz not null default now(),
  ends_at    timestamptz,
  issued_by  uuid references public.profiles(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (num_nonnulls(user_id, partner_id) = 1),
  check (ends_at is null or ends_at > starts_at)
);
create index user_sanctions_user_idx on public.user_sanctions(user_id) where revoked_at is null;

create or replace function private.sync_sanctions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_until timestamptz;
  v_active boolean;
begin
  if new.user_id is not null then
    select bool_or(true), max(coalesce(ends_at, 'infinity'::timestamptz))
      into v_active, v_until
      from public.user_sanctions
     where user_id = new.user_id and type in ('suspension', 'ban')
       and revoked_at is null and starts_at <= now()
       and (ends_at is null or ends_at > now());
    update public.profiles
       set is_suspended = coalesce(v_active, false),
           suspended_until = case when v_until = 'infinity'::timestamptz then null else v_until end
     where id = new.user_id;
  end if;
  if new.partner_id is not null then
    update public.partners
       set is_active = not exists (
             select 1 from public.user_sanctions
              where partner_id = new.partner_id and type in ('suspension', 'ban')
                and revoked_at is null and starts_at <= now()
                and (ends_at is null or ends_at > now())),
           suspended_at = case when new.revoked_at is null and new.type in ('suspension', 'ban') then now() else null end
     where id = new.partner_id;
  end if;
  return null;
end;
$$;

create trigger user_sanctions_sync
  after insert or update on public.user_sanctions
  for each row execute function private.sync_sanctions();

-- Liste noire : on stocke un hash, jamais la valeur en clair
create table public.blocklist (
  id         uuid primary key default gen_random_uuid(),
  kind       public.blocklist_kind not null,
  value_hash text not null check (value_hash ~ '^[a-f0-9]{64}$'),
  reason     text not null,
  expires_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (kind, value_hash)
);

create or replace function private.is_blocked(p_kind public.blocklist_kind, p_value text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocklist
     where kind = p_kind
       and value_hash = private.hash_value(p_value)
       and (expires_at is null or expires_at > now())
  );
$$;

-- -----------------------------------------------------------------------------
-- File de travail des agents IA (traitée par une tâche serveur / cron)
-- -----------------------------------------------------------------------------
create table public.ai_jobs (
  id           bigint generated always as identity primary key,
  job_type     public.ai_job_type not null,
  entity_type  public.flag_entity not null,
  entity_id    uuid not null,
  status       public.job_status not null default 'pending',
  priority     smallint not null default 0,
  attempts     smallint not null default 0,
  max_attempts smallint not null default 3,
  run_after    timestamptz not null default now(),
  locked_at    timestamptz,
  locked_by    text,
  result       jsonb,
  last_error   text,
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);
create index ai_jobs_queue_idx on public.ai_jobs(priority desc, run_after) where status = 'pending';
create unique index ai_jobs_one_pending on public.ai_jobs(job_type, entity_id) where status in ('pending', 'processing');

create or replace function private.enqueue_ai_job(
  p_job_type public.ai_job_type,
  p_entity_type public.flag_entity,
  p_entity_id uuid,
  p_priority smallint default 0
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.ai_jobs (job_type, entity_type, entity_id, priority)
  values (p_job_type, p_entity_type, p_entity_id, p_priority)
  on conflict (job_type, entity_id) where status in ('pending', 'processing') do nothing;
$$;

-- Traçabilité de chaque décision d'un agent IA (sans donnée personnelle brute)
create table public.ai_agent_runs (
  id            bigint generated always as identity primary key,
  job_id        bigint references public.ai_jobs(id) on delete set null,
  agent         text not null,
  model         text not null,
  entity_type   public.flag_entity not null,
  entity_id     uuid not null,
  input_hash    text,                 -- hash de l'entrée, pas l'entrée elle-même
  output        jsonb not null default '{}'::jsonb,
  risk_score    smallint check (risk_score between 0 and 100),
  decision      text not null check (decision in ('pass', 'flag', 'block', 'error')),
  tokens_input  integer,
  tokens_output integer,
  latency_ms    integer,
  cost_usd      numeric(10,6),
  created_at    timestamptz not null default now()
);
create index ai_agent_runs_entity_idx on public.ai_agent_runs(entity_type, entity_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Litiges (dommages, caution, remboursement…)
-- -----------------------------------------------------------------------------
create table public.disputes (
  id              uuid primary key default gen_random_uuid(),
  reference       text not null unique default private.generate_reference('LIT'),
  booking_id      uuid not null references public.bookings(id) on delete restrict,
  opened_by       uuid not null references public.profiles(id) on delete restrict,
  type            public.dispute_type not null,
  status          public.dispute_status not null default 'open',
  description     text not null check (char_length(description) between 10 and 5000),
  amount_claimed  public.xof,
  amount_awarded  public.xof,
  resolution_note text,
  assigned_to     uuid references public.profiles(id) on delete set null,
  resolved_by     uuid references public.profiles(id) on delete set null,
  resolved_at     timestamptz,
  respond_by      timestamptz not null default (now() + interval '72 hours'),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index disputes_one_open_per_booking_type on public.disputes(booking_id, type)
  where status in ('open', 'awaiting_evidence', 'under_review');

create trigger disputes_updated_at
  before update on public.disputes
  for each row execute function private.set_updated_at();

create table public.dispute_evidence (
  id           uuid primary key default gen_random_uuid(),
  dispute_id   uuid not null references public.disputes(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id) on delete cascade,
  kind         text not null check (kind in ('photo', 'document', 'statement', 'other')),
  storage_path text unique,          -- bucket privé « dispute-evidence » : {dispute_id}/…
  description  text check (char_length(description) <= 2000),
  created_at   timestamptz not null default now(),
  check (storage_path is not null or description is not null)
);
create index dispute_evidence_dispute_idx on public.dispute_evidence(dispute_id);

-- -----------------------------------------------------------------------------
-- Journal d'audit (ajout seulement)
-- -----------------------------------------------------------------------------
create table public.audit_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid,
  actor_role  text,
  action      text not null,          -- ex. bookings.update, document.view
  entity_type text not null,
  entity_id   text,
  changes     jsonb,                  -- uniquement les colonnes modifiées
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id, created_at desc);
create index audit_logs_actor_idx on public.audit_logs(actor_id, created_at desc);

-- Trigger générique : enregistre qui a changé quoi sur les tables sensibles
create or replace function private.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_changes jsonb;
  v_id text;
  v_ignored constant text[] := array['updated_at', 'search_vector', 'provider_payload', 'price_breakdown', 'content_md'];
begin
  if tg_op = 'INSERT' then
    v_new := to_jsonb(new) - v_ignored;
    v_changes := jsonb_build_object('new', v_new);
    v_id := v_new ->> coalesce(tg_argv[0], 'id');
  elsif tg_op = 'UPDATE' then
    v_old := to_jsonb(old) - v_ignored;
    v_new := to_jsonb(new) - v_ignored;
    select jsonb_object_agg(n.key, jsonb_build_object('old', v_old -> n.key, 'new', n.value))
      into v_changes
      from jsonb_each(v_new) n
     where v_old -> n.key is distinct from n.value;
    if v_changes is null then
      return null;   -- rien de significatif n'a changé
    end if;
    v_id := v_new ->> coalesce(tg_argv[0], 'id');
  else
    v_old := to_jsonb(old) - v_ignored;
    v_changes := jsonb_build_object('old', v_old);
    v_id := v_old ->> coalesce(tg_argv[0], 'id');
  end if;

  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, changes)
  values (
    (select auth.uid()),
    coalesce((select auth.role()), current_user),
    tg_table_name || '.' || lower(tg_op),
    tg_table_name,
    v_id,
    v_changes
  );
  return null;
end;
$$;

-- Journalisation explicite (ex. consultation d'un document d'identité)
create or replace function private.log_action(
  p_action text, p_entity_type text, p_entity_id text, p_details jsonb default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, changes)
  values ((select auth.uid()), coalesce((select auth.role()), current_user), p_action, p_entity_type, p_entity_id, p_details);
$$;
