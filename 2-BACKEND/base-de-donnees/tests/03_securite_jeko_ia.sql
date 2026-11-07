-- =============================================================================
-- Tests des ajouts du 6 novembre 2026 (s'exécute après 01 et 02, même base) :
-- paiement Jeko, double authentification de l'équipe, factures FNE, agents IA
-- pilotables, comptes de versement, journal de sécurité, droits « vie privée »,
-- journal d'audit inviolable, photos copiées.
-- =============================================================================
\set ON_ERROR_STOP 1
\set QUIET 1
\pset format unaligned
\pset tuples_only on

\set customer  '11111111-1111-1111-1111-111111111111'
\set owner     '22222222-2222-2222-2222-222222222222'
\set admin     '44444444-4444-4444-4444-444444444444'
\set owner2    '55555555-5555-5555-5555-555555555555'

\set as_customer   'reset role; do $x$ begin perform set_config(''request.jwt.claims'', ''{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}'', false); end $x$; set role authenticated;'
\set as_owner      'reset role; do $x$ begin perform set_config(''request.jwt.claims'', ''{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}'', false); end $x$; set role authenticated;'
\set as_owner2     'reset role; do $x$ begin perform set_config(''request.jwt.claims'', ''{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}'', false); end $x$; set role authenticated;'
\set as_admin      'reset role; do $x$ begin perform set_config(''request.jwt.claims'', ''{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated","aal":"aal2"}'', false); end $x$; set role authenticated;'
\set as_admin_aal1 'reset role; do $x$ begin perform set_config(''request.jwt.claims'', ''{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated","aal":"aal1"}'', false); end $x$; set role authenticated;'
\set as_service    'reset role; do $x$ begin perform set_config(''request.jwt.claims'', ''{"role":"service_role"}'', false); end $x$; set role service_role;'
\set as_postgres   'reset role; do $x$ begin perform set_config(''request.jwt.claims'', '''', false); end $x$;'

-- -----------------------------------------------------------------------------
\echo '26. Paiement Jeko : prestataire, plafond, contrôle du montant du webhook'
:as_postgres
do $$ begin
  assert (select count(*) from pg_enum e join pg_type t on t.oid = e.enumtypid
           where t.typname = 'payment_provider' and e.enumlabel = 'jeko') = 1, 'valeur jeko absente';
  assert (select count(*) from pg_enum e join pg_type t on t.oid = e.enumtypid
           where t.typname = 'payment_provider') = 2, 'le type ne doit contenir que jeko et manual';
  assert (select bool_and(provider = 'jeko') from public.payments where provider <> 'manual'), 'paiement hors Jeko';
end $$;

-- Plafond : 2 500 000 FCFA refusé avant d'aller chez Jeko
do $$ begin
  begin
    insert into public.payments (payer_id, purpose, amount, idempotency_key)
    values ('11111111-1111-1111-1111-111111111111', 'other', 2500000, 'test:plafond');
    raise exception 'TEST FAILED: montant au-dessus du plafond accepté';
  exception when others then
    if sqlerrm <> 'AMOUNT_ABOVE_PROVIDER_LIMIT' then raise; end if;
  end;
end $$;

insert into public.payments (payer_id, purpose, amount, idempotency_key)
values (:'customer', 'other', 50000, 'test:webhook') returning id as pay_id \gset

-- Le client ne peut pas appeler la fonction réservée au backend
:as_customer
do $$ begin
  begin
    perform public.handle_jeko_payment_success((select id from public.payments where idempotency_key = 'test:webhook'),
                                               'JK-1', 'wave', 50000, 'XOF', null);
    raise exception 'TEST FAILED: webhook appelé par un client';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Webhook avec un montant modifié : rien n'est validé, signal de fraude créé
:as_service
select public.handle_jeko_payment_success(:'pay_id', 'JK-FAKE', 'wave', 500, 'XOF', '{"x":1}'::jsonb) ->> 'status' as mismatch \gset
:as_postgres
select set_config('test.mismatch', :'mismatch', false) as _ \gset
do $$ begin
  assert current_setting('test.mismatch') = 'amount_mismatch', 'écart de montant non détecté';
  assert (select status from public.payments where idempotency_key = 'test:webhook') = 'initiated', 'paiement validé malgré l''écart';
  assert exists (select 1 from public.fraud_signals where signal_type = 'payment_amount_mismatch'), 'signal de fraude absent';
end $$;

-- Webhook correct : paiement validé
:as_service
select public.handle_jeko_payment_success(:'pay_id', 'JK-OK-1', 'wave', 50000, 'xof', null) ->> 'status' as ok_status \gset
:as_postgres
do $$ begin
  assert (select status from public.payments where idempotency_key = 'test:webhook') = 'succeeded', 'paiement non validé';
  assert (select provider_transaction_id from public.payments where idempotency_key = 'test:webhook') = 'JK-OK-1', 'référence Jeko absente';
end $$;

-- -----------------------------------------------------------------------------
\echo '27. Équipe : sans second facteur (aal1), un admin n''a aucun droit d''admin'
:as_admin_aal1
do $$ begin
  begin
    perform public.certify_sale_listing((select id from public.listings where type = 'sale' limit 1), false);
    raise exception 'TEST FAILED: certification sans double authentification';
  exception when others then
    if sqlerrm <> 'FORBIDDEN' then raise; end if;
  end;
  assert (select count(*) from public.audit_logs) = 0, 'journal d''audit lisible sans double authentification';
  assert (select (public.staff_mfa_status() ->> 'mfa_required')::boolean), 'le back-office doit demander le code TOTP';
  update public.platform_settings set value = '0.30' where key = 'commission_rate';
end $$;
:as_postgres
do $$ begin
  assert (select value #>> '{}' from public.platform_settings where key = 'commission_rate') = '0.12',
         'réglage modifié sans double authentification';
end $$;
:as_admin
do $$ begin
  assert (select count(*) from public.audit_logs) > 0, 'admin aal2 : journal d''audit invisible';
  assert not (select (public.staff_mfa_status() ->> 'mfa_required')::boolean), 'aal2 : code TOTP redemandé à tort';
end $$;
:as_customer
do $$ begin
  assert not (select (public.staff_mfa_status() ->> 'is_staff_account')::boolean), 'client vu comme membre de l''équipe';
end $$;

-- -----------------------------------------------------------------------------
\echo '28. Factures : certification FNE par le backend'
:as_service
select count(*) as claimed from public.claim_invoices_for_fne(10) \gset
select id as inv_id from public.invoices where fne_status = 'processing' order by issued_at limit 1 \gset
select public.record_fne_result(:'inv_id', true, 'FNE-2026-000001', 'https://fne.example/qr/1', null) \gset dummy_
:as_postgres
do $$ begin
  assert (select count(*) from public.invoices where fne_status = 'certified') = 1, 'facture non certifiée';
  assert (select fne_reference from public.invoices where fne_status = 'certified') = 'FNE-2026-000001', 'référence FNE absente';
end $$;
:as_customer
do $$ begin
  begin
    perform public.record_fne_result((select id from public.invoices limit 1), true, 'FAUX', null, null);
    raise exception 'TEST FAILED: un client a certifié une facture';
  exception when insufficient_privilege then null;
  end;
end $$;

-- -----------------------------------------------------------------------------
\echo '29. Agents IA : interrupteur, mode observation, seuils'
:as_postgres
insert into public.ai_jobs (job_type, entity_type, entity_id)
select 'review_moderation', 'review', id from public.reviews limit 1
on conflict (job_type, entity_id) where status in ('pending', 'processing') do nothing;

-- Interrupteur d'urgence : un agent « off » ne reçoit aucune tâche
update public.ai_agents set mode = 'off' where job_type = 'review_moderation';
:as_service
do $$ begin
  assert (select count(*) from public.claim_ai_jobs(50, 't') where job_type = 'review_moderation') = 0, 'agent arrêté mais tâche distribuée';
end $$;

-- Seuil : un « block » avec un score sous le seuil devient un simple signalement
:as_postgres
update public.ai_agents set mode = 'auto', block_threshold = 90 where job_type = 'review_moderation';
:as_service
do $$
declare j record;
begin
  for j in select * from public.claim_ai_jobs(50, 't') where job_type = 'review_moderation' loop
    perform public.complete_ai_job(j.id, true, 'block', 60::smallint, 'insult', '{}'::jsonb, 'review_moderation', 'test-model');
  end loop;
end $$;
:as_postgres
do $$ begin
  assert (select status from public.reviews limit 1) = 'flagged', 'avis masqué alors que le score est sous le seuil';
  assert (select result ->> 'decision' from public.ai_jobs where job_type = 'review_moderation' order by id desc limit 1) = 'flag',
         'décision non ramenée à « flag »';
end $$;

-- Mode observation : aucune conséquence
update public.reviews set status = 'visible';
update public.ai_agents set mode = 'shadow' where job_type = 'review_moderation';
insert into public.ai_jobs (job_type, entity_type, entity_id)
select 'review_moderation', 'review', id from public.reviews limit 1
on conflict (job_type, entity_id) where status in ('pending', 'processing') do nothing;
:as_service
do $$
declare j record;
begin
  for j in select * from public.claim_ai_jobs(50, 't') where job_type = 'review_moderation' loop
    perform public.complete_ai_job(j.id, true, 'block', 99::smallint, 'insult', '{}'::jsonb, 'review_moderation', 'test-model');
  end loop;
end $$;
:as_postgres
do $$ begin
  assert (select status from public.reviews limit 1) = 'visible', 'mode observation : l''avis a été masqué';
  assert (select count(*) from public.ai_agent_runs where agent = 'review_moderation' and output ->> 'mode' = 'shadow') = 1,
         'mode observation : décision non tracée';
end $$;

-- Seul l'admin (avec second facteur) règle les agents
:as_owner
do $$ begin
  update public.ai_agents set mode = 'off' where job_type = 'message_screening';
  assert (select count(*) from public.ai_agents) = 0, 'un partenaire voit le registre des agents';
end $$;
:as_admin
update public.ai_agents set daily_budget_usd = 5 where job_type = 'message_screening';
:as_postgres
do $$ begin
  assert (select mode from public.ai_agents where job_type = 'message_screening') = 'auto', 'agent modifié par un partenaire';
  assert (select daily_budget_usd from public.ai_agents where job_type = 'message_screening') = 5, 'réglage admin non appliqué';
end $$;

-- -----------------------------------------------------------------------------
\echo '30. Compte de versement : délai de carence, alerte, contrôle IA'
:as_owner
insert into public.partner_payout_accounts (partner_id, method, wallet_provider, account_holder_name, account_last4,
                                            account_ciphertext, is_default)
select id, 'mobile_money', 'wave', 'Jean Kouassi', '4321', 'chiffre', false from public.partners limit 1;
:as_postgres
do $$ begin
  assert (select usable_after > now() + interval '71 hours' from public.partner_payout_accounts where account_last4 = '4321'),
         'délai de carence absent';
  assert exists (select 1 from public.ai_jobs where job_type = 'payout_account_review' and status = 'pending'),
         'contrôle IA du compte non lancé';
  assert exists (select 1 from public.notifications where type = 'payout_account.added'), 'alerte partenaire absente';
end $$;
:as_service
do $$ begin
  begin
    insert into public.payouts (partner_id, payout_account_id, period_start, period_end, status)
    select partner_id, id, current_date - 7, current_date, 'processing'
      from public.partner_payout_accounts where account_last4 = '4321';
    raise exception 'TEST FAILED: versement vers un compte en période de carence';
  exception when others then
    if sqlerrm <> 'PAYOUT_ACCOUNT_COOLING_PERIOD' then raise; end if;
  end;
end $$;

-- -----------------------------------------------------------------------------
\echo '31. Journal de sécurité : alerte et cloisonnement'
:as_service
insert into public.security_events (user_id, event_type, severity, ip_hash, details)
values (:'customer', 'login.failed_burst', 3, 'h1', '{"count":12}'),
       (:'owner', 'login.success', 1, 'h2', '{}');
:as_postgres
do $$ begin
  assert exists (select 1 from public.ai_jobs where job_type = 'login_anomaly'
                  and entity_id = '11111111-1111-1111-1111-111111111111'), 'agent connexions non déclenché';
  assert not exists (select 1 from public.ai_jobs where job_type = 'login_anomaly'
                      and entity_id = '22222222-2222-2222-2222-222222222222'), 'événement bénin escaladé';
end $$;
:as_customer
do $$ begin
  assert (select count(*) from public.security_events) = 1, 'le client doit voir ses seules connexions';
  begin
    insert into public.security_events (user_id, event_type) values ('11111111-1111-1111-1111-111111111111', 'login.success');
    raise exception 'TEST FAILED: événement de sécurité inventé par un client';
  exception when insufficient_privilege then null;
  end;
end $$;

-- -----------------------------------------------------------------------------
\echo '32. Droits « vie privée » (loi 2013-450)'
:as_customer
select public.request_privacy_action('export', 'Je veux une copie de mes données') as pr_id \gset
do $$ begin
  begin
    perform public.request_privacy_action('export', 'encore');
    raise exception 'TEST FAILED: demande en double';
  exception when others then
    if sqlerrm <> 'REQUEST_ALREADY_OPEN' then raise; end if;
  end;
  assert (select count(*) from public.privacy_requests) = 1, 'demande invisible pour son auteur';
end $$;
:as_owner
do $$ begin
  assert (select count(*) from public.privacy_requests) = 0, 'demande visible par un autre utilisateur';
end $$;
:as_admin
update public.privacy_requests set status = 'in_progress', handled_by = '44444444-4444-4444-4444-444444444444' where id = :'pr_id';
:as_postgres
do $$ begin
  assert (select status from public.privacy_requests limit 1) = 'in_progress', 'traitement par l''équipe impossible';
end $$;

-- -----------------------------------------------------------------------------
\echo '33. Journal d''audit inviolable, même pour le serveur'
:as_service
do $$ begin
  begin
    update public.audit_logs set action = 'falsifie' where id = (select min(id) from public.audit_logs);
    raise exception 'TEST FAILED: journal modifié';
  exception when others then
    if sqlerrm <> 'AUDIT_LOG_IMMUTABLE' then raise; end if;
  end;
  begin
    delete from public.audit_logs;
    raise exception 'TEST FAILED: journal supprimé';
  exception when others then
    if sqlerrm <> 'AUDIT_LOG_IMMUTABLE' then raise; end if;
  end;
end $$;
:as_postgres
do $$ begin
  assert private.purge_audit_logs(interval '5 years') = 0, 'purge de rétention en échec';
  begin
    perform private.purge_audit_logs(interval '1 day');
    raise exception 'TEST FAILED: purge trop courte acceptée';
  exception when others then
    if sqlerrm <> 'RETENTION_TOO_SHORT' then raise; end if;
  end;
end $$;

-- -----------------------------------------------------------------------------
\echo '34. Photos copiées entre deux partenaires'
:as_postgres
insert into auth.users (id, email, raw_user_meta_data)
values (:'owner2', 'copieur@example.ci', '{"first_name":"Faux","last_name":"Loueur"}');
:as_owner2
select public.become_partner('private_owner', 'Loueur Douteux', (select id from public.cities where slug = 'abidjan')) as partner2 \gset
:as_postgres
insert into public.vehicles (partner_id, make_id, model_id, category_id, model_year, fuel, transmission, mileage_km, seats, city_id)
select :'partner2', mk.id, md.id, md.default_category_id, 2021, 'petrol', 'automatic', 50000, 5,
       (select id from public.cities where slug = 'abidjan')
  from public.vehicle_makes mk join public.vehicle_models md on md.make_id = mk.id
 where mk.slug = 'toyota' and md.slug = 'rav4'
returning id as vehicle2 \gset
insert into public.vehicle_photos (vehicle_id, storage_path, angle, position, is_cover)
values (:'vehicle2', 'copie/1.webp', 'front', 1, true) returning id as photo2 \gset
:as_service
update public.vehicle_photos set perceptual_hash = 1234567890123
 where id = (select id from public.vehicle_photos where position = 1 and storage_path <> 'copie/1.webp' order by created_at limit 1);
update public.vehicle_photos set perceptual_hash = 1234567890123 # 3 where id = :'photo2';   -- 2 bits d'écart
select count(*) as dups from public.find_photo_duplicates(:'photo2', 6) \gset
:as_postgres
select set_config('test.dups', :'dups', false) as _ \gset
do $$ begin
  assert current_setting('test.dups')::integer = 1, 'photo copiée non détectée';
  assert exists (select 1 from public.ai_jobs where job_type = 'duplicate_photo_check'), 'agent photos copiées non déclenché';
end $$;
:as_owner2
do $$ begin
  begin
    perform public.find_photo_duplicates((select id from public.vehicle_photos limit 1), 6);
    raise exception 'TEST FAILED: recherche de doublons ouverte aux partenaires';
  exception when insufficient_privilege then null;
  end;
end $$;

:as_postgres
\echo '✔ Sécurité, Jeko et agents IA OK'
