-- =============================================================================
-- 1300 — Messagerie, parcours vente (essai, acompte), avis, vérification
-- d'identité, modération, agents IA, suppression de compte, FAQ, statistiques
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Messagerie contextuelle
-- -----------------------------------------------------------------------------
create or replace function private.can_access_conversation(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversations c
     where c.id = p_conversation_id
       and (c.customer_id = (select auth.uid()) or private.is_partner_member(c.partner_id))
  ) or private.is_staff();
$$;

-- Premier contact depuis une annonce (« Contacter le vendeur »)
create or replace function public.start_listing_conversation(p_listing_id uuid, p_body text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_listing public.listings;
  v_conv uuid;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if (select is_suspended from public.profiles where id = v_uid) then
    raise exception 'ACCOUNT_SUSPENDED';
  end if;
  select * into v_listing from public.listings where id = p_listing_id and status = 'published';
  if v_listing.id is null then
    raise exception 'LISTING_NOT_FOUND';
  end if;
  if private.is_partner_member(v_listing.partner_id) then
    raise exception 'CANNOT_CONTACT_SELF';
  end if;

  insert into public.conversations (subject, listing_id, customer_id, partner_id)
  values ('listing', p_listing_id, v_uid, v_listing.partner_id)
  on conflict (listing_id, customer_id) where subject = 'listing' do update set status = public.conversations.status
  returning id into v_conv;

  insert into public.messages (conversation_id, sender_id, kind, body)
  values (v_conv, v_uid, 'text', p_body);

  perform public.track_listing_event(p_listing_id, 'contact');
  return v_conv;
end;
$$;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not private.can_access_conversation(p_conversation_id) then
    raise exception 'CONVERSATION_NOT_FOUND';
  end if;
  insert into public.conversation_reads (conversation_id, user_id, last_read_at)
  values (p_conversation_id, auth.uid(), now())
  on conflict (conversation_id, user_id) do update set last_read_at = now();
end;
$$;

-- Après chaque message : aperçu, délai de réponse, filtre anti-contournement, notification
create or replace function private.messages_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conv public.conversations;
  v_is_partner boolean;
  v_flags text[] := '{}';
  v_text text := lower(extensions.unaccent(new.body));
begin
  select * into v_conv from public.conversations where id = new.conversation_id;
  v_is_partner := new.sender_id is not null and exists (
    select 1 from public.partner_members where partner_id = v_conv.partner_id and user_id = new.sender_id);

  update public.conversations
     set last_message_at = new.created_at,
         last_message_preview = left(new.body, 140),
         first_customer_message_at = case when new.sender_id = v_conv.customer_id and first_customer_message_at is null
                                          then new.created_at else first_customer_message_at end,
         first_partner_reply_at = case when v_is_partner and first_partner_reply_at is null and first_customer_message_at is not null
                                       then new.created_at else first_partner_reply_at end
   where id = new.conversation_id;

  if new.kind = 'text' then
    -- Pré-filtre par règles (instantané) ; l'agent IA affine ensuite
    if v_text ~ '(\+?225[\s.-]?)?0?[1-9]([\s.-]?[0-9]{2}){4}' then
      v_flags := array_append(v_flags, 'phone_number');
    end if;
    if v_text ~ '(payer|paiement|envoie|envoyer|transfert).{0,40}(direct|hors|wave|orange money|momo|moov|western union|ria|depot)'
       or v_text ~ '(hors (de la )?plateforme|en dehors du site|sans passer par)' then
      v_flags := array_append(v_flags, 'off_platform_payment');
    end if;
    if array_length(v_flags, 1) > 0 then
      update public.messages set risk_flags = v_flags where id = new.id;
    end if;
    perform private.enqueue_ai_job('message_screening', 'message', new.id,
                                   case when array_length(v_flags, 1) > 0 then 2 else 0 end::smallint);

    -- Notification au destinataire
    if v_is_partner then
      perform private.notify_user(v_conv.customer_id, 'message', 'message.new', 'Nouveau message', left(new.body, 140),
        '/compte/messages/' || v_conv.id, jsonb_build_object('conversation_id', v_conv.id));
    elsif new.sender_id = v_conv.customer_id then
      perform private.notify_partner(v_conv.partner_id, 'message', 'message.new', 'Nouveau message', left(new.body, 140),
        '/partenaire/messages/' || v_conv.id, jsonb_build_object('conversation_id', v_conv.id));
    end if;
  end if;
  return null;
end;
$$;

create trigger messages_after_insert
  after insert on public.messages
  for each row execute function private.messages_after_insert();

-- -----------------------------------------------------------------------------
-- Parcours vente : essai et acompte
-- -----------------------------------------------------------------------------
create or replace function public.request_test_drive(
  p_listing_id       uuid,
  p_scheduled_at     timestamptz,
  p_duration_minutes integer default 30,
  p_license_number   text default null,
  p_note             text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_listing public.listings;
  v_profile public.profiles;
  v_td public.test_drives;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  select * into v_profile from public.profiles where id = v_uid;
  if v_profile.is_suspended then
    raise exception 'ACCOUNT_SUSPENDED';
  end if;
  select li.* into v_listing
    from public.listings li join public.sale_terms st on st.listing_id = li.id
   where li.id = p_listing_id and li.status = 'published' and li.type = 'sale' and st.test_drive_available;
  if v_listing.id is null then
    raise exception 'TEST_DRIVE_NOT_AVAILABLE';
  end if;
  if private.is_partner_member(v_listing.partner_id) then
    raise exception 'CANNOT_BOOK_OWN_VEHICLE';
  end if;
  if p_scheduled_at < now() + interval '2 hours' or p_scheduled_at > now() + interval '60 days' then
    raise exception 'INVALID_TEST_DRIVE_DATE';
  end if;
  if coalesce(p_duration_minutes, 30) not between 15 and 240 then
    raise exception 'INVALID_DURATION';
  end if;
  if v_profile.kyc_status <> 'approved' and nullif(trim(p_license_number), '') is null then
    raise exception 'LICENSE_REQUIRED';
  end if;

  begin
    insert into public.test_drives (listing_id, vehicle_id, partner_id, buyer_id, scheduled_at, ends_at,
                                    location_id, license_number, buyer_note)
    select p_listing_id, v_listing.vehicle_id, v_listing.partner_id, v_uid, p_scheduled_at,
           p_scheduled_at + make_interval(mins => coalesce(p_duration_minutes, 30)),
           ve.home_location_id, nullif(trim(p_license_number), ''), left(p_note, 1000)
      from public.vehicles ve where ve.id = v_listing.vehicle_id
    returning * into v_td;
  exception when exclusion_violation then
    raise exception 'SLOT_UNAVAILABLE';
  end;

  insert into public.conversations (subject, test_drive_id, listing_id, customer_id, partner_id)
  values ('test_drive', v_td.id, p_listing_id, v_uid, v_listing.partner_id);

  perform private.notify_partner(v_listing.partner_id, 'booking', 'test_drive.request', 'Nouvelle demande d''essai',
    v_listing.title || ' — ' || to_char(p_scheduled_at at time zone 'Africa/Abidjan', 'DD/MM/YYYY HH24:MI'),
    '/partenaire/essais/' || v_td.id, jsonb_build_object('test_drive_id', v_td.id), 2::smallint);

  return jsonb_build_object('test_drive_id', v_td.id, 'reference', v_td.reference, 'status', v_td.status);
end;
$$;

-- Le vendeur confirme / refuse ; puis marque l'essai effectué ou « absent » ; l'acheteur peut annuler
create or replace function public.update_test_drive_status(
  p_test_drive_id uuid, p_status public.test_drive_status, p_note text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_td public.test_drives;
  v_is_partner boolean;
begin
  select * into v_td from public.test_drives where id = p_test_drive_id for update;
  if v_td.id is null then
    raise exception 'TEST_DRIVE_NOT_FOUND';
  end if;
  v_is_partner := private.is_partner_member(v_td.partner_id);
  if not (v_is_partner or v_td.buyer_id = auth.uid()) then
    raise exception 'TEST_DRIVE_NOT_FOUND';
  end if;

  if not (
       (v_is_partner and v_td.status = 'requested' and p_status in ('confirmed', 'declined'))
    or (v_is_partner and v_td.status = 'confirmed' and p_status in ('completed', 'no_show', 'cancelled'))
    or (v_td.buyer_id = auth.uid() and v_td.status in ('requested', 'confirmed') and p_status = 'cancelled')
  ) then
    raise exception 'INVALID_TEST_DRIVE_TRANSITION' using detail = v_td.status || ' → ' || p_status;
  end if;

  update public.test_drives
     set status = p_status,
         partner_note = case when v_is_partner then coalesce(left(p_note, 1000), partner_note) else partner_note end,
         confirmed_at = case when p_status = 'confirmed' then now() else confirmed_at end,
         completed_at = case when p_status = 'completed' then now() else completed_at end,
         cancelled_at = case when p_status in ('cancelled', 'declined') then now() else cancelled_at end,
         cancel_reason = case when p_status in ('cancelled', 'declined') then left(p_note, 500) else cancel_reason end
   where id = p_test_drive_id;

  if v_is_partner then
    perform private.notify_user(v_td.buyer_id, 'booking', 'test_drive.' || p_status, 'Votre demande d''essai',
      'Statut : ' || p_status, '/compte/essais/' || v_td.id, jsonb_build_object('test_drive_id', v_td.id), 1::smallint);
  else
    perform private.notify_partner(v_td.partner_id, 'booking', 'test_drive.cancelled', 'Essai annulé par l''acheteur',
      v_td.reference, '/partenaire/essais/' || v_td.id, jsonb_build_object('test_drive_id', v_td.id), 1::smallint);
  end if;
end;
$$;

-- Acompte de réservation (achat)
create or replace function public.create_sale_reservation(p_listing_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_listing public.listings;
  v_terms public.sale_terms;
  v_sr public.sale_reservations;
  v_payment public.payments;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if (select is_suspended or phone is null from public.profiles where id = v_uid) then
    raise exception 'PROFILE_INCOMPLETE_OR_SUSPENDED';
  end if;
  select * into v_listing from public.listings where id = p_listing_id and status = 'published' and type = 'sale';
  select * into v_terms from public.sale_terms where listing_id = p_listing_id;
  if v_listing.id is null or v_terms.reservation_deposit_amount is null or v_terms.reservation_deposit_amount = 0 then
    raise exception 'RESERVATION_NOT_AVAILABLE';
  end if;
  if private.is_partner_member(v_listing.partner_id) then
    raise exception 'CANNOT_BOOK_OWN_VEHICLE';
  end if;

  begin
    insert into public.sale_reservations (listing_id, vehicle_id, partner_id, buyer_id, amount, expires_at)
    values (p_listing_id, v_listing.vehicle_id, v_listing.partner_id, v_uid, v_terms.reservation_deposit_amount,
            now() + make_interval(mins => private.setting_int('booking_payment_window_minutes', 30)))
    returning * into v_sr;
  exception when unique_violation then
    raise exception 'VEHICLE_ALREADY_RESERVED';
  end;

  insert into public.payments (payer_id, sale_reservation_id, purpose, amount, idempotency_key)
  values (v_uid, v_sr.id, 'sale_reservation_deposit', v_sr.amount, 'sale_reservation:' || v_sr.id)
  returning * into v_payment;

  return jsonb_build_object('sale_reservation_id', v_sr.id, 'reference', v_sr.reference, 'amount', v_sr.amount,
                            'expires_at', v_sr.expires_at, 'payment_id', v_payment.id, 'payment_reference', v_payment.reference);
end;
$$;

create or replace function public.expire_sale_reservations()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  with x as (
    update public.sale_reservations
       set status = case when status = 'pending_payment' then 'cancelled' else 'expired' end::public.sale_reservation_status,
           cancelled_at = case when status = 'pending_payment' then now() else cancelled_at end
     where status in ('pending_payment', 'active') and expires_at < now()
    returning 1
  )
  select count(*) into v_count from x;
  return v_count;
end;
$$;

-- -----------------------------------------------------------------------------
-- Avis (après location terminée) et réponse du partenaire
-- -----------------------------------------------------------------------------
create or replace function public.submit_review(
  p_booking_id           uuid,
  p_rating               smallint,
  p_comment              text default null,
  p_rating_cleanliness   smallint default null,
  p_rating_communication smallint default null,
  p_rating_punctuality   smallint default null,
  p_rating_accuracy      smallint default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_booking public.bookings;
  v_direction public.review_direction;
  v_id uuid;
begin
  select * into v_booking from public.bookings where id = p_booking_id;
  if v_booking.id is null then
    raise exception 'BOOKING_NOT_FOUND';
  end if;
  if v_booking.customer_id = v_uid then
    v_direction := 'customer_to_partner';
  elsif private.is_partner_member(v_booking.partner_id) then
    v_direction := 'partner_to_customer';
  else
    raise exception 'BOOKING_NOT_FOUND';
  end if;
  if v_booking.status <> 'completed' then
    raise exception 'BOOKING_NOT_COMPLETED';
  end if;
  if v_booking.completed_at < now() - interval '30 days' then
    raise exception 'REVIEW_PERIOD_OVER';
  end if;

  begin
    insert into public.reviews (booking_id, direction, author_id, partner_id, subject_user_id, listing_id, vehicle_id,
                                rating, rating_cleanliness, rating_communication, rating_punctuality, rating_accuracy, comment)
    values (p_booking_id, v_direction, v_uid, v_booking.partner_id,
            case when v_direction = 'partner_to_customer' then v_booking.customer_id end,
            v_booking.listing_id, v_booking.vehicle_id,
            p_rating, p_rating_cleanliness, p_rating_communication, p_rating_punctuality, p_rating_accuracy,
            left(p_comment, 2000))
    returning id into v_id;
  exception when unique_violation then
    raise exception 'REVIEW_ALREADY_EXISTS';
  end;

  perform private.enqueue_ai_job('review_moderation', 'review', v_id, 0::smallint);
  return v_id;
end;
$$;

create or replace function public.respond_to_review(p_review_id uuid, p_response text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_review public.reviews;
begin
  select * into v_review from public.reviews where id = p_review_id for update;
  if v_review.id is null or v_review.direction <> 'customer_to_partner' or not private.is_partner_manager(v_review.partner_id) then
    raise exception 'REVIEW_NOT_FOUND';
  end if;
  if v_review.partner_response is not null then
    raise exception 'ALREADY_RESPONDED';
  end if;
  update public.reviews set partner_response = left(p_response, 1000), partner_responded_at = now() where id = p_review_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Coffre-fort numérique et vérification d'identité
-- -----------------------------------------------------------------------------
create or replace function private.user_documents_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set kyc_status = 'pending'
   where id = new.user_id and kyc_status in ('not_started', 'rejected', 'expired');
  perform private.enqueue_ai_job('document_precheck', 'document', new.id, 1::smallint);
  return null;
end;
$$;

create trigger user_documents_after_insert
  after insert on public.user_documents
  for each row execute function private.user_documents_after_insert();

-- Décision sur un document (équipe interne)
create or replace function public.review_user_document(
  p_document_id uuid, p_approve boolean, p_reason text default null,
  p_document_number text default null, p_issued_on date default null, p_expires_on date default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_doc public.user_documents;
begin
  if not private.is_moderator() then
    raise exception 'FORBIDDEN';
  end if;
  select * into v_doc from public.user_documents where id = p_document_id for update;
  if v_doc.id is null then
    raise exception 'DOCUMENT_NOT_FOUND';
  end if;
  if not p_approve and nullif(trim(p_reason), '') is null then
    raise exception 'REASON_REQUIRED';
  end if;
  update public.user_documents
     set status = case when p_approve then 'approved' else 'rejected' end::public.verification_status,
         rejection_reason = case when p_approve then null else p_reason end,
         reviewed_by = auth.uid(), reviewed_at = now(),
         document_number = coalesce(p_document_number, document_number),
         issued_on = coalesce(p_issued_on, issued_on),
         expires_on = coalesce(p_expires_on, expires_on)
   where id = p_document_id;
  perform private.log_action('user_document.review', 'user_documents', p_document_id::text,
                             jsonb_build_object('approved', p_approve));
  if not p_approve then
    perform private.notify_user(v_doc.user_id, 'security', 'document.rejected', 'Document refusé',
      p_reason, '/compte/verification', jsonb_build_object('document_id', p_document_id), 1::smallint);
  end if;
end;
$$;

-- Décision finale KYC (manuelle) : alimente le profil (statut, permis, date de naissance)
create or replace function public.decide_kyc(
  p_user_id            uuid,
  p_approve            boolean,
  p_reason             text default null,
  p_license_number     text default null,
  p_license_issued_on  date default null,
  p_license_expires_on date default null,
  p_date_of_birth      date default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not private.is_moderator() then
    raise exception 'FORBIDDEN';
  end if;
  if p_approve and exists (
    select 1 from unnest(array['driver_license_front', 'driver_license_back']::public.user_document_type[]) t(type)
     where not exists (select 1 from public.user_documents d
                        where d.user_id = p_user_id and d.type = t.type and d.status = 'approved')
  ) then
    raise exception 'DRIVER_LICENSE_NOT_APPROVED';
  end if;
  if p_approve and p_date_of_birth is not null
     and p_date_of_birth > current_date - make_interval(years => private.setting_int('legal_driving_age', 18)) then
    raise exception 'UNDER_LEGAL_AGE';
  end if;

  insert into public.kyc_verifications (user_id, provider, status, license_number, license_issued_on, license_expires_on,
                                        date_of_birth, decided_by, decided_at, rejection_reason,
                                        document_ids)
  values (p_user_id, 'manual', case when p_approve then 'approved' else 'rejected' end::public.kyc_status,
          p_license_number, p_license_issued_on, p_license_expires_on, p_date_of_birth, auth.uid(), now(),
          case when p_approve then null else p_reason end,
          array(select id from public.user_documents where user_id = p_user_id and status = 'approved'))
  returning id into v_id;

  update public.booking_drivers bd set verification_status = case when p_approve then 'approved' else 'rejected' end::public.verification_status
   where bd.user_id = p_user_id and bd.is_primary
     and exists (select 1 from public.bookings b where b.id = bd.booking_id and b.status in ('pending_payment', 'pending_confirmation', 'confirmed'));

  perform private.notify_user(p_user_id, 'security',
    case when p_approve then 'kyc.approved' else 'kyc.rejected' end,
    case when p_approve then 'Identité vérifiée' else 'Vérification d''identité refusée' end,
    p_reason, '/compte/verification', '{}'::jsonb, 1::smallint);
  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Photos : contrôle IA à chaque ajout
-- -----------------------------------------------------------------------------
create or replace function private.vehicle_photos_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.enqueue_ai_job('photo_moderation', 'photo', new.id, 0::smallint);
  return null;
end;
$$;

create trigger vehicle_photos_after_insert
  after insert on public.vehicle_photos
  for each row execute function private.vehicle_photos_after_insert();

-- -----------------------------------------------------------------------------
-- Agents IA : le serveur réclame des tâches, puis rend son verdict
-- -----------------------------------------------------------------------------
create or replace function public.claim_ai_jobs(p_limit integer default 10, p_worker text default 'worker')
returns setof public.ai_jobs
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  -- Récupère les tâches bloquées (travailleur arrêté en cours de route)
  update public.ai_jobs set status = 'pending', locked_at = null, locked_by = null
   where status = 'processing' and locked_at < now() - interval '10 minutes';

  return query
  update public.ai_jobs j
     set status = 'processing', locked_at = now(), locked_by = p_worker, attempts = j.attempts + 1
   where j.id in (
     select id from public.ai_jobs
      where status = 'pending' and run_after <= now()
      order by priority desc, run_after
      limit least(greatest(coalesce(p_limit, 10), 1), 100)
      for update skip locked
   )
  returning j.*;
end;
$$;

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
  v_auto_publish_max smallint := private.setting_int('ai_auto_publish_max_risk', 30)::smallint;
  v_listing public.listings;
begin
  select * into v_job from public.ai_jobs where id = p_job_id for update;
  if v_job.id is null or v_job.status <> 'processing' then
    raise exception 'JOB_NOT_PROCESSING';
  end if;

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

  update public.ai_jobs
     set status = 'succeeded', completed_at = now(), locked_at = null,
         result = jsonb_build_object('decision', p_decision, 'risk_score', p_risk_score, 'reason_code', p_reason_code)
   where id = p_job_id;

  insert into public.ai_agent_runs (job_id, agent, model, entity_type, entity_id, input_hash, output, risk_score, decision,
                                    tokens_input, tokens_output, latency_ms, cost_usd)
  values (p_job_id, coalesce(p_agent, v_job.job_type::text), coalesce(p_model, 'unknown'), v_job.entity_type, v_job.entity_id,
          p_input_hash, coalesce(p_explanation, '{}'::jsonb), p_risk_score, p_decision,
          p_tokens_input, p_tokens_output, p_latency_ms, p_cost_usd);

  -- Signalement pour revue humaine
  if p_decision in ('flag', 'block') then
    insert into public.moderation_flags (entity_type, entity_id, source, reason_code, risk_score, details)
    values (v_job.entity_type, v_job.entity_id, 'ai', coalesce(p_reason_code, 'ai_' || p_decision), p_risk_score,
            coalesce(p_explanation, '{}'::jsonb) || jsonb_build_object('job_id', p_job_id, 'decision', p_decision));
  end if;

  -- Effets selon le type de tâche (aucune suppression : masquer ou mettre en attente seulement)
  case v_job.job_type
    when 'listing_moderation' then
      select * into v_listing from public.listings where id = v_job.entity_id for update;
      update public.listings set risk_score = p_risk_score, last_moderated_at = now() where id = v_job.entity_id;
      -- Publication automatique : risque faible + partenaire vérifié ; sinon décision humaine
      if v_listing.status = 'pending_review' and p_decision = 'pass'
         and coalesce(p_risk_score, 100) <= v_auto_publish_max
         and exists (select 1 from public.partners where id = v_listing.partner_id and verification_status = 'approved') then
        update public.listings set status = 'published', published_at = coalesce(published_at, now()) where id = v_listing.id;
        perform private.notify_partner(v_listing.partner_id, 'booking', 'listing.published', 'Annonce publiée',
          v_listing.title, '/partenaire/annonces/' || v_listing.id, '{}'::jsonb, 1::smallint);
      elsif v_listing.status = 'published' and p_decision = 'block' then
        update public.listings set status = 'pending_review' where id = v_listing.id;
      end if;
    when 'photo_moderation' then
      if p_decision = 'block' then
        update public.vehicle_photos set status = 'hidden' where id = v_job.entity_id;
      elsif p_decision = 'flag' then
        update public.vehicle_photos set status = 'flagged' where id = v_job.entity_id and status = 'visible';
      end if;
    when 'message_screening' then
      update public.messages
         set status = case p_decision when 'block' then 'hidden' when 'flag' then 'flagged' else status end::public.content_status,
             risk_flags = case when p_explanation ? 'flags'
                               then array(select distinct unnest(risk_flags || array(select jsonb_array_elements_text(p_explanation -> 'flags'))))
                               else risk_flags end
       where id = v_job.entity_id;
    when 'review_moderation' then
      if p_decision in ('flag', 'block') then
        update public.reviews set status = case p_decision when 'block' then 'hidden' else 'flagged' end::public.content_status
         where id = v_job.entity_id;
      end if;
    when 'document_precheck' then
      update public.user_documents
         set ai_precheck = coalesce(p_explanation, '{}'::jsonb) || jsonb_build_object('risk_score', p_risk_score, 'decision', p_decision)
       where id = v_job.entity_id;
    when 'booking_risk_scoring' then
      if coalesce(p_risk_score, 0) >= 70 then
        insert into public.fraud_signals (booking_id, user_id, signal_type, severity, source, details)
        select b.id, b.customer_id, coalesce(p_reason_code, 'high_risk_booking'), 4, 'ai', coalesce(p_explanation, '{}'::jsonb)
          from public.bookings b where b.id = v_job.entity_id;
      end if;
  end case;
end;
$$;

-- Décision humaine sur un signalement
create or replace function public.resolve_flag(p_flag_id uuid, p_confirmed boolean, p_note text default null)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_flag public.moderation_flags;
begin
  if not private.is_moderator() then
    raise exception 'FORBIDDEN';
  end if;
  select * into v_flag from public.moderation_flags where id = p_flag_id for update;
  if v_flag.id is null then
    raise exception 'FLAG_NOT_FOUND';
  end if;
  update public.moderation_flags
     set status = case when p_confirmed then 'confirmed' else 'dismissed' end::public.flag_status,
         resolved_by = auth.uid(), resolved_at = now(), resolution_note = p_note
   where id = p_flag_id;
  -- Faux positif : on rétablit le contenu
  if not p_confirmed then
    case v_flag.entity_type
      when 'message' then update public.messages set status = 'visible' where id = v_flag.entity_id;
      when 'review' then update public.reviews set status = 'visible' where id = v_flag.entity_id;
      when 'photo' then update public.vehicle_photos set status = 'visible' where id = v_flag.entity_id;
      else null;
    end case;
  else
    case v_flag.entity_type
      when 'message' then update public.messages set status = 'hidden' where id = v_flag.entity_id;
      when 'review' then update public.reviews set status = 'hidden' where id = v_flag.entity_id;
      when 'photo' then update public.vehicle_photos set status = 'hidden' where id = v_flag.entity_id;
      else null;
    end case;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- « Supprimer mon compte » : demande, annulation, anonymisation (serveur)
-- -----------------------------------------------------------------------------
create or replace function public.request_account_deletion(p_reason text default null)
returns timestamptz
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_when timestamptz;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if exists (select 1 from public.bookings where customer_id = v_uid and status in ('confirmed', 'in_progress', 'disputed'))
     or exists (select 1 from public.bookings b join public.partner_members pm on pm.partner_id = b.partner_id
                 where pm.user_id = v_uid and pm.role = 'owner' and b.status in ('confirmed', 'in_progress', 'disputed')) then
    raise exception 'ACTIVE_BOOKINGS_EXIST';
  end if;
  insert into public.account_deletion_requests (user_id, reason)
  values (v_uid, left(p_reason, 1000))
  on conflict (user_id) where status = 'requested' do update set reason = excluded.reason
  returning scheduled_for into v_when;
  perform private.notify_user(v_uid, 'security', 'account.deletion_requested', 'Suppression de compte programmée',
    'Votre compte sera supprimé le ' || to_char(v_when at time zone 'Africa/Abidjan', 'DD/MM/YYYY') || '. Vous pouvez annuler d''ici là.',
    '/compte/securite', '{}'::jsonb, 2::smallint);
  return v_when;
end;
$$;

create or replace function public.cancel_account_deletion()
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.account_deletion_requests set status = 'cancelled', cancelled_at = now()
   where user_id = auth.uid() and status = 'requested';
$$;

-- Anonymisation : on garde les traces comptables (factures, paiements) sans données personnelles.
-- Le serveur supprime ensuite les fichiers et bannit le compte auth (pas de suppression physique).
create or replace function public.anonymize_user(p_user_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  update public.profiles
     set first_name = 'Utilisateur', last_name = 'supprimé', email = null, phone = null, phone_verified_at = null,
         date_of_birth = null, avatar_path = null, address_line = null, city_id = null, district_id = null,
         driver_license_issued_on = null, driver_license_expires_on = null,
         deleted_at = now(), anonymized_at = now()
   where id = p_user_id;
  update public.user_documents set document_number = null, ai_precheck = null where user_id = p_user_id;
  update public.kyc_verifications
     set license_number = null, full_name_on_document = null, date_of_birth = null, result = null
   where user_id = p_user_id;
  update public.booking_drivers set full_name = 'Conducteur supprimé', date_of_birth = null, license_number = null
   where user_id = p_user_id;
  delete from public.push_subscriptions where user_id = p_user_id;
  delete from public.saved_searches where user_id = p_user_id;
  delete from public.favorites where user_id = p_user_id;
  delete from public.notifications where user_id = p_user_id;
  delete from public.conversation_reads where user_id = p_user_id;
  update public.account_deletion_requests set status = 'completed', completed_at = now()
   where user_id = p_user_id and status = 'requested';
  perform private.log_action('user.anonymize', 'profiles', p_user_id::text, null);
end;
$$;

-- -----------------------------------------------------------------------------
-- FAQ : recherche prédictive et votes « utile / pas utile »
-- -----------------------------------------------------------------------------
create or replace function public.search_faq(p_query text, p_audience text default null, p_limit integer default 8)
returns table (id uuid, slug text, question text, category_slug text, rank real)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.slug, a.question, c.slug,
         greatest(coalesce(ts_rank(a.search_vector, private.prefix_tsquery(p_query)), 0),
                  extensions.similarity(a.question, coalesce(p_query, '')))::real as rank
    from public.faq_articles a
    join public.faq_categories c on c.id = a.category_id
   where a.is_published
     and (p_audience is null or c.audience = p_audience)
     and (a.search_vector @@ private.prefix_tsquery(p_query) or extensions.similarity(a.question, coalesce(p_query, '')) > 0.2)
   order by 5 desc
   limit least(greatest(coalesce(p_limit, 8), 1), 20);
$$;

create or replace function public.vote_faq(p_article_id uuid, p_helpful boolean)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.faq_articles
     set helpful_count = helpful_count + case when p_helpful then 1 else 0 end,
         not_helpful_count = not_helpful_count + case when p_helpful then 0 else 1 end
   where id = p_article_id and is_published;
$$;

-- -----------------------------------------------------------------------------
-- Statistiques partenaires (cron quotidien) : taux de réponse, Super hôte
-- -----------------------------------------------------------------------------
create or replace function public.refresh_partner_stats()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  with resp as (
    select c.partner_id,
           count(*) as total,
           count(*) filter (where c.first_partner_reply_at is not null
                              and c.first_partner_reply_at <= c.first_customer_message_at + interval '24 hours') as answered,
           avg(extract(epoch from (c.first_partner_reply_at - c.first_customer_message_at)) / 60)
             filter (where c.first_partner_reply_at is not null) as avg_minutes
      from public.conversations c
     where c.first_customer_message_at > now() - interval '30 days'
     group by c.partner_id
  ),
  upd as (
    update public.partners p
       set response_rate = case when r.total > 0 then round(100.0 * r.answered / r.total, 2) end,
           avg_response_minutes = round(r.avg_minutes)::integer
      from resp r
     where r.partner_id = p.id
    returning p.id
  )
  select count(*) into v_count from upd;

  -- Super hôte : note ≥ 4,8 sur ≥ 10 avis, ≥ 10 locations, réponse ≥ 90 %, aucune annulation loueur sur 90 jours
  update public.partners p
     set is_super_host = q.ok,
         super_host_since = case when q.ok and not p.is_super_host then now() when not q.ok then null else p.super_host_since end
    from (
      select pa.id,
             (pa.rating_avg >= 4.8 and pa.rating_count >= 10 and pa.completed_bookings >= 10
              and coalesce(pa.response_rate, 0) >= 90 and pa.verification_status = 'approved'
              and not exists (select 1 from public.fraud_signals fs
                               where fs.partner_id = pa.id and fs.signal_type = 'partner_cancellation'
                                 and fs.created_at > now() - interval '90 days')) as ok
        from public.partners pa
    ) q
   where q.id = p.id and (p.is_super_host is distinct from q.ok);

  return v_count;
end;
$$;

-- -----------------------------------------------------------------------------
-- Profil public (prénom, initiale, note, badge vérifié) — pour les partenaires
-- -----------------------------------------------------------------------------
create view public.public_profiles
with (security_barrier = true)
as
select p.id,
       p.first_name,
       left(p.last_name, 1) as last_initial,
       p.avatar_path,
       p.rating_avg,
       p.rating_count,
       (p.kyc_status = 'approved') as is_verified,
       p.created_at as member_since
  from public.profiles p
 where p.deleted_at is null;
comment on view public.public_profiles is 'Projection publique et minimale des profils (lecture : utilisateurs connectés).';
