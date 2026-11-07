-- =============================================================================
-- Tests de bout en bout : sécurité (RLS, droits), parcours location, paiement,
-- KYC, état des lieux, avis, KPIs, annulation, expiration, parcours vente,
-- IA, stockage, suppression de compte.
-- Chaque assertion lève une erreur en cas d'échec (ON_ERROR_STOP).
-- =============================================================================
\set ON_ERROR_STOP 1
\set QUIET 1
\pset format unaligned
\pset tuples_only on

\set customer  '11111111-1111-1111-1111-111111111111'
\set owner     '22222222-2222-2222-2222-222222222222'
\set intruder  '33333333-3333-3333-3333-333333333333'
\set admin     '44444444-4444-4444-4444-444444444444'

\set as_customer 'reset role; do $x$ begin perform set_config(''request.jwt.claims'', ''{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}'', false); end $x$; set role authenticated;'
\set as_owner    'reset role; do $x$ begin perform set_config(''request.jwt.claims'', ''{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}'', false); end $x$; set role authenticated;'
\set as_intruder 'reset role; do $x$ begin perform set_config(''request.jwt.claims'', ''{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}'', false); end $x$; set role authenticated;'
\set as_admin    'reset role; do $x$ begin perform set_config(''request.jwt.claims'', ''{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated","aal":"aal2"}'', false); end $x$; set role authenticated;'
\set as_anon     'reset role; do $x$ begin perform set_config(''request.jwt.claims'', ''{"role":"anon"}'', false); end $x$; set role anon;'
\set as_service  'reset role; do $x$ begin perform set_config(''request.jwt.claims'', ''{"role":"service_role"}'', false); end $x$; set role service_role;'
\set as_postgres 'reset role; do $x$ begin perform set_config(''request.jwt.claims'', '''', false); end $x$;'

\echo '1. Inscription : profils créés automatiquement'
:as_postgres
insert into auth.users (id, email, raw_user_meta_data) values
  (:'customer', 'awa.kone@example.ci', '{"first_name":"Awa","last_name":"Koné"}'),
  (:'owner',    'jean.kouassi@example.ci', '{"full_name":"Jean Kouassi"}'),
  (:'intruder', 'moussa@example.ci', '{"given_name":"Moussa","family_name":"Traoré"}'),
  (:'admin',    'admin@example.ci', '{"first_name":"Admin","last_name":"Plateforme"}');
insert into public.user_roles (user_id, role) values (:'admin', 'admin');
do $$ begin
  assert (select count(*) from public.profiles) = 4, 'profils non créés';
  assert (select last_name from public.profiles where id = '22222222-2222-2222-2222-222222222222') = 'Kouassi', 'nom Google mal découpé';
  assert (select count(*) from public.user_roles where role = 'client') = 4, 'rôle client manquant';
  assert (select count(*) from public.notification_preferences where user_id = '11111111-1111-1111-1111-111111111111') = 30, 'préférences manquantes';
end $$;

\echo '2. Profil : champs modifiables / protégés'
:as_customer
update public.profiles set phone = '+2250701020304', date_of_birth = '1995-04-12' where id = :'customer';
do $$ begin
  begin
    update public.profiles set kyc_status = 'approved' where id = '11111111-1111-1111-1111-111111111111';
    raise exception 'TEST FAILED: kyc_status modifiable par le client';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.user_roles (user_id, role) values ('11111111-1111-1111-1111-111111111111', 'admin');
    raise exception 'TEST FAILED: auto-attribution du rôle admin';
  exception when insufficient_privilege then null;
  end;
  assert (select profile_completed_at is not null from public.profiles where id = '11111111-1111-1111-1111-111111111111'), 'profil non marqué complet';
  assert (select count(*) from public.profiles) = 1, 'le client voit d''autres profils';
end $$;
:as_owner
update public.profiles set phone = '+2250505050505' where id = :'owner';
:as_intruder
update public.profiles set phone = '+2250102030405' where id = :'intruder';

\echo '3. Devenir partenaire + vérification'
:as_owner
select public.become_partner('rental_agency', 'Abidjan Auto Location',
  (select id from public.cities where slug = 'abidjan'),
  (select id from public.districts where slug = 'cocody'),
  'Agence de location à Cocody', 'AAL SARL', 'CI-ABJ-2024-B-12345', 'NCC123456', null, '+2250505050505') as partner_id \gset
do $$ begin
  begin
    perform public.become_partner('dealership', 'Sans RCCM', 1);
    raise exception 'TEST FAILED: concessionnaire sans RCCM accepté';
  exception when others then
    if sqlerrm <> 'RCCM_REQUIRED' then raise; end if;
  end;
end $$;
:as_intruder
do $$ begin
  begin
    perform public.verify_partner((select id from public.partners limit 1), true);
    raise exception 'TEST FAILED: un client a vérifié un partenaire';
  exception when others then
    if sqlerrm <> 'FORBIDDEN' then raise; end if;
  end;
end $$;
:as_admin
select public.verify_partner(:'partner_id', true);

\echo '4. Flotte : agence, véhicule, photos, annonce'
:as_owner
insert into public.partner_locations (partner_id, name, address_line, city_id, district_id, latitude, longitude, is_public_agency,
                                      opening_hours)
values (:'partner_id', 'Agence Riviera', 'Riviera 2, près du carrefour', (select id from public.cities where slug = 'abidjan'),
        (select id from public.districts where slug = 'cocody'), 5.3640, -3.9600, true,
        '{"mon":[["08:00","18:00"]],"sat":[["09:00","13:00"]]}')
returning id as location_id \gset

insert into public.vehicles (partner_id, make_id, model_id, category_id, model_year, trim, color, fuel, transmission,
                             mileage_km, seats, doors, home_location_id, city_id, district_id, description)
select :'partner_id', mk.id, md.id, md.default_category_id, 2022, 'Hybrid Premium', 'Blanc', 'hybrid', 'automatic',
       24000, 5, 5, :'location_id', (select id from public.cities where slug = 'abidjan'),
       (select id from public.districts where slug = 'cocody'), 'RAV4 climatisé, idéal pour Abidjan et l''intérieur du pays.'
  from public.vehicle_makes mk join public.vehicle_models md on md.make_id = mk.id
 where mk.slug = 'toyota' and md.slug = 'rav4'
returning id as vehicle_id \gset

insert into public.vehicle_private (vehicle_id, license_plate, vin) values (:'vehicle_id', '1234 AB 01', 'JTMW1RFV0ND000001');
insert into public.vehicle_equipment (vehicle_id, equipment_id)
select :'vehicle_id', id from public.equipment where code in ('air_conditioning', 'bluetooth', 'reversing_camera', 'abs');
insert into public.vehicle_photos (vehicle_id, storage_path, angle, position, is_cover)
select :'vehicle_id', :'partner_id' || '/' || :'vehicle_id' || '/' || g || '.webp',
       (array['front', 'rear', 'left', 'interior_front', 'dashboard'])[g]::public.photo_angle, g, g = 1
  from generate_series(1, 5) g;

do $$ begin
  begin
    insert into public.listings (vehicle_id, type, status)
    values ((select id from public.vehicles limit 1), 'rental', 'published');
    raise exception 'TEST FAILED: annonce auto-publiée';
  exception when insufficient_privilege then null;
  end;
end $$;

insert into public.listings (vehicle_id, type, description) values (:'vehicle_id', 'rental', null)
returning id as listing_id, slug as listing_slug \gset
insert into public.rental_terms (listing_id, price_per_day, weekly_discount_pct, deposit_amount, included_km_per_day,
                                 extra_km_price, cancellation_policy, delivery_available, delivery_fee, pickup_location_id)
values (:'listing_id', 35000, 10, 300000, 250, 150, 'moderate', true, 10000, :'location_id');
insert into public.listing_extras (listing_id, extra_id, price, max_quantity)
select :'listing_id', id, default_price, max_quantity from public.extras where code in ('child_seat', 'gps_device', 'additional_driver');

do $$ begin
  assert (select title from public.listings limit 1) = 'Toyota RAV4 2022 Hybrid Premium', 'titre auto incorrect';
  assert (select slug from public.listings limit 1) like 'toyota-rav4-2022-hybrid-premium-%', 'slug incorrect';
end $$;
select public.submit_listing_for_review(:'listing_id');

\echo '5. Agents IA : modération puis publication automatique'
:as_service
do $$
declare
  j record;
begin
  for j in select * from public.claim_ai_jobs(50, 'test-worker') loop
    perform public.complete_ai_job(j.id, true, 'pass', 8::smallint, null, '{"summary":"RAS"}'::jsonb,
                                   'moderation-agent', 'test-model', null, 120, 40, 300, 0.0001, null);
  end loop;
  assert (select status from public.listings limit 1) = 'published', 'annonce non publiée automatiquement';
  assert (select count(*) from public.ai_agent_runs) >= 6, 'journal IA incomplet';
end $$;

\echo '6. Visiteur anonyme : catalogue visible, données privées invisibles'
:as_anon
do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.search_listings('rental', p_city_id => (select id from public.cities where slug = 'abidjan'));
  assert v_count = 1, 'recherche : ' || v_count || ' résultat(s) au lieu de 1';
  assert (select count(*) from public.search_listings('rental', p_query => 'toyo rav')) = 1, 'recherche prédictive KO';
  assert (select count(*) from public.search_listings('rental', p_query => 'mercedes')) = 0, 'recherche trop large';
  assert (select count(*) from public.search_listings('rental', p_child_seat => true, p_fuels => array['hybrid']::public.fuel_type[])) = 1, 'filtres KO';
  assert (select count(*) from public.search_listings('rental', p_max_price => 20000)) = 0, 'filtre prix KO';
  assert (select array_length(photo_paths, 1) from public.search_listings('rental') limit 1) = 5, 'carrousel photos KO';
  assert (select count(*) from public.vehicle_private) = 0, 'plaque visible par un anonyme';
  assert (select count(*) from public.profiles) = 0, 'profils visibles par un anonyme';
  assert (select count(*) from public.vehicles) = 1, 'véhicule publié invisible';
  assert (select count(*) from public.rental_terms) = 1, 'conditions invisibles';
  begin
    perform 1 from public.partner_private;
    raise exception 'TEST FAILED: partner_private lisible par anon';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.create_rental_booking((select id from public.listings limit 1), now() + interval '1 day', now() + interval '2 days');
    raise exception 'TEST FAILED: réservation anonyme';
  exception when insufficient_privilege then null;
  end;
end $$;

\echo '7. Devis transparent (3 jours, siège enfant, tous risques)'
:as_anon
select public.quote_rental(:'listing_id', now() + interval '3 hours', now() + interval '3 hours 3 days',
  jsonb_build_array(jsonb_build_object('extra_id', (select id from public.extras where code = 'child_seat'), 'quantity', 1)),
  (select id from public.insurance_plans where code = 'comprehensive' and partner_id is null)) as quote \gset
select set_config('test.quote', :'quote', false) as _ \gset
do $$
declare
  q jsonb := current_setting('test.quote')::jsonb;
begin
  assert (q ->> 'rental_days')::int = 3, 'jours : ' || (q ->> 'rental_days');
  assert (q ->> 'rental_subtotal')::bigint = 105000, 'sous-total : ' || (q ->> 'rental_subtotal');
  assert (q ->> 'extras_total')::bigint = 6000, 'options : ' || (q ->> 'extras_total');
  assert (q ->> 'insurance_total')::bigint = 27000, 'assurance : ' || (q ->> 'insurance_total');
  assert (q ->> 'service_fee')::bigint = 6900, 'frais de service : ' || (q ->> 'service_fee');
  assert (q ->> 'total_amount')::bigint = 144900, 'total : ' || (q ->> 'total_amount');
  assert (q ->> 'tax_amount')::bigint = 22103, 'TVA incluse : ' || (q ->> 'tax_amount');
  assert (q ->> 'included_km_total')::int = 750, 'km inclus : ' || (q ->> 'included_km_total');
  assert not (q ? '_commission_amount'), 'commission exposée au public';
end $$;

\echo '8. Réservation atomique + anti double réservation'
:as_customer
select public.create_rental_booking(:'listing_id', now() + interval '3 hours', now() + interval '3 hours 3 days',
  jsonb_build_array(jsonb_build_object('extra_id', (select id from public.extras where code = 'child_seat'), 'quantity', 1)),
  (select id from public.insurance_plans where code = 'comprehensive' and partner_id is null)) ->> 'booking_id' as booking_id \gset
select set_config('test.booking', :'booking_id', false) as _ \gset
do $$ begin
  assert (select total_amount from public.bookings where id = current_setting('test.booking')::uuid) = 144900, 'total réservation ≠ devis';
  assert (select status from public.bookings where id = current_setting('test.booking')::uuid) = 'pending_payment', 'statut initial';
  assert (select count(*) from public.booking_extras where booking_id = current_setting('test.booking')::uuid) = 1, 'options non copiées';
  assert (select count(*) from public.deposits where booking_id = current_setting('test.booking')::uuid) = 1, 'caution non créée';
  begin
    update public.bookings set total_amount = 1 where id = current_setting('test.booking')::uuid;
    raise exception 'TEST FAILED: prix modifiable par le client';
  exception when insufficient_privilege then null;
  end;
end $$;
:as_intruder
do $$ begin
  assert (select count(*) from public.bookings) = 0, 'un tiers voit la réservation';
  begin
    perform public.create_rental_booking((select id from public.listings limit 1), now() + interval '1 day', now() + interval '2 days');
    raise exception 'TEST FAILED: double réservation acceptée';
  exception when others then
    if sqlerrm <> 'VEHICLE_UNAVAILABLE' then raise; end if;
  end;
  begin
    perform public.get_booking_contacts(current_setting('test.booking')::uuid);
    raise exception 'TEST FAILED: coordonnées accessibles à un tiers';
  exception when others then
    if sqlerrm <> 'BOOKING_NOT_FOUND' then raise; end if;
  end;
end $$;
:as_owner
do $$ begin
  begin
    perform public.create_rental_booking((select id from public.listings limit 1), now() + interval '20 days', now() + interval '22 days');
    raise exception 'TEST FAILED: le loueur réserve son propre véhicule';
  exception when others then
    if sqlerrm <> 'CANNOT_BOOK_OWN_VEHICLE' then raise; end if;
  end;
  assert (select count(*) from public.bookings) = 1, 'le loueur ne voit pas la réservation';
end $$;

\echo '9. Paiement (webhook) → demande au loueur → confirmation'
:as_customer
select public.create_booking_payment(:'booking_id') ->> 'payment_id' as payment_id \gset
select (public.create_booking_payment(:'booking_id') ->> 'payment_id') = :'payment_id' as idem \gset
do $$ begin
  begin
    perform public.handle_payment_success((select id from public.payments limit 1), 'tx', 'wave');
    raise exception 'TEST FAILED: le client valide son propre paiement';
  exception when insufficient_privilege then null;
  end;
end $$;
:as_service
select public.handle_payment_success(:'payment_id', 'CP-TX-0001', 'wave', '{"source":"test"}') ->> 'status' as pay_status \gset
select public.handle_payment_success(:'payment_id', 'CP-TX-0001', 'wave') ->> 'status' as pay_again \gset
select set_config('test.pay', :'pay_status' || '|' || :'pay_again' || '|' || :'idem', false) as _ \gset
do $$ begin
  assert current_setting('test.pay') = 'pending_confirmation|already_processed|t', 'paiement : ' || current_setting('test.pay');
  assert (select count(*) from public.invoices) = 1, 'facture non créée';
  assert (select number from public.invoices limit 1) ~ '^FAC-20[0-9]{2}-000001$', 'numérotation facture';
  assert (select amount_ht + tax_amount = amount_ttc from public.invoices limit 1), 'facture HT/TTC incohérente';
  assert (select count(*) from public.notifications n join public.partner_members pm on pm.user_id = n.user_id
           where n.type = 'booking.request') = 1, 'loueur non notifié';
end $$;
:as_owner
select public.respond_to_booking(:'booking_id', true) ->> 'status' as resp \gset
do $$ begin
  assert (select status from public.bookings where id = current_setting('test.booking')::uuid) = 'confirmed', 'non confirmée';
  assert (select count(*) from public.conversations where subject = 'booking') = 1, 'fil de discussion non créé';
  assert (select count(*) from public.messages where kind = 'system') = 1, 'message système absent';
  assert (public.get_booking_contacts(current_setting('test.booking')::uuid) -> 'customer' ->> 'phone') = '+2250701020304', 'contact client';
end $$;

\echo '10. Messagerie : pré-filtre anti-contournement'
:as_customer
insert into public.messages (conversation_id, sender_id, body)
select id, :'customer', 'Bonjour, je peux vous payer directement par Wave au 07 01 02 03 04 ?' from public.conversations limit 1;
do $$ begin
  assert (select risk_flags @> array['phone_number', 'off_platform_payment'] from public.messages where kind = 'text' limit 1),
         'contournement non détecté : ' || (select risk_flags::text from public.messages where kind = 'text' limit 1);
end $$;
:as_owner
insert into public.messages (conversation_id, sender_id, body)
select id, :'owner', 'Merci, le paiement se fait uniquement sur la plateforme.' from public.conversations limit 1;
:as_intruder
do $$ begin
  assert (select count(*) from public.messages) = 0, 'messages visibles par un tiers';
  begin
    insert into public.messages (conversation_id, sender_id, body)
    values ((select id from public.conversations limit 1), '33333333-3333-3333-3333-333333333333', 'spam');
    raise exception 'TEST FAILED: message injecté par un tiers';
  exception when insufficient_privilege or check_violation then null;
  end;
end $$;

\echo '11. KYC : remise refusée tant que le permis n''est pas vérifié'
:as_owner
select pickup_qr_token as qr from public.bookings where id = :'booking_id' \gset
do $$ begin
  begin
    perform public.start_booking(current_setting('test.booking')::uuid,
      (select pickup_qr_token from public.bookings where id = current_setting('test.booking')::uuid), 24000);
    raise exception 'TEST FAILED: remise sans KYC';
  exception when others then
    if sqlerrm <> 'DRIVER_NOT_VERIFIED' then raise; end if;
  end;
end $$;
:as_customer
insert into public.user_documents (user_id, type, storage_path, mime_type) values
  (:'customer', 'driver_license_front', :'customer' || '/permis-recto.jpg', 'image/jpeg'),
  (:'customer', 'driver_license_back',  :'customer' || '/permis-verso.jpg', 'image/jpeg'),
  (:'customer', 'national_id_front',    :'customer' || '/cni.jpg', 'image/jpeg');
do $$ begin
  begin
    insert into public.user_documents (user_id, type, storage_path)
    values ('11111111-1111-1111-1111-111111111111', 'passport', '33333333-3333-3333-3333-333333333333/x.jpg');
    raise exception 'TEST FAILED: document déposé dans le dossier d''un autre';
  exception when insufficient_privilege or check_violation then null;
  end;
  assert (select kyc_status from public.profiles limit 1) = 'pending', 'KYC non passé en attente';
end $$;
:as_admin
select count(*) as reviewed from (
  select public.review_user_document(id, true, null, 'CI-PC-987654', '2015-06-01', '2030-06-01')
    from public.user_documents where user_id = :'customer') x \gset
select public.decide_kyc(:'customer', true, null, 'CI-PC-987654', '2015-06-01', '2030-06-01', '1995-04-12') \gset dummy_
do $$ begin
  assert (select kyc_status from public.profiles where id = '11111111-1111-1111-1111-111111111111') = 'approved', 'KYC non approuvé';
  assert (select driver_license_expires_on from public.profiles where id = '11111111-1111-1111-1111-111111111111') = '2030-06-01', 'permis non reporté';
end $$;
:as_customer
do $$ begin
  begin
    update public.profiles set date_of_birth = '2001-01-01' where id = '11111111-1111-1111-1111-111111111111';
    raise exception 'TEST FAILED: date de naissance modifiable après KYC';
  exception when others then
    if sqlerrm <> 'DOB_LOCKED_AFTER_KYC' then raise; end if;
  end;
end $$;

\echo '12. Remise (QR code), état des lieux, retour, kilomètres supplémentaires'
:as_owner
do $$ begin
  begin
    perform public.start_booking(current_setting('test.booking')::uuid, 'mauvais-code', 24000);
    raise exception 'TEST FAILED: mauvais QR accepté';
  exception when others then
    if sqlerrm <> 'INVALID_QR_CODE' then raise; end if;
  end;
end $$;
select public.start_booking(:'booking_id', :'qr', 24000) ->> 'status' as started \gset
insert into public.vehicle_inspections (booking_id, type, mileage_km, fuel_level_pct, exterior_condition, performed_by)
values (:'booking_id', 'pickup', 24000, 100, 'Rayure légère portière arrière droite', :'owner')
returning id as inspection_id \gset
select public.sign_inspection(:'inspection_id') \gset dummy_
:as_customer
select public.sign_inspection(:'inspection_id') \gset dummy_
:as_owner
select public.complete_booking(:'booking_id', 24900) as completion \gset
select set_config('test.completion', :'completion', false) as _ \gset
do $$
declare
  c jsonb := current_setting('test.completion')::jsonb;
begin
  assert (c ->> 'extra_km')::int = 150, 'km supp : ' || (c ->> 'extra_km');
  assert (c ->> 'extra_km_charge')::bigint = 22500, 'facturation km : ' || (c ->> 'extra_km_charge');
  assert (select fleet_status from public.vehicles limit 1) = 'available', 'véhicule non remis disponible';
  assert (select customer_signed_at is not null and partner_signed_at is not null from public.vehicle_inspections limit 1), 'signatures';
end $$;

\echo '13. Avis et note moyenne'
:as_customer
select public.submit_review(:'booking_id', 5::smallint, 'Véhicule impeccable, loueur ponctuel.', 5::smallint, 5::smallint, 5::smallint, 5::smallint) \gset dummy_
do $$ begin
  begin
    perform public.submit_review(current_setting('test.booking')::uuid, 1::smallint);
    raise exception 'TEST FAILED: double avis';
  exception when others then
    if sqlerrm <> 'REVIEW_ALREADY_EXISTS' then raise; end if;
  end;
end $$;
:as_owner
select public.submit_review(:'booking_id', 4::smallint, 'Client soigneux.') \gset dummy_
select public.respond_to_review((select id from public.reviews where direction = 'customer_to_partner'), 'Merci Awa !') \gset dummy_
do $$ begin
  assert (select rating_avg from public.partners limit 1) = 5.00, 'note partenaire';
  assert (select rating_count from public.partners limit 1) = 1, 'nombre d''avis';
end $$;

\echo '14. Tableau de bord partenaire (KPIs filtrés, série, to-do) et rappels client'
:as_owner
select public.get_partner_kpis(:'partner_id', current_date - 1, current_date + 10) as kpis \gset
select public.get_partner_kpis(:'partner_id', current_date - 1, current_date + 10,
  (select id from public.vehicle_categories where slug = 'berline')) as kpis_berline \gset
select set_config('test.kpis', :'kpis', false) as _ \gset
select set_config('test.kpis_b', :'kpis_berline', false) as _ \gset
do $$
declare
  k jsonb := current_setting('test.kpis')::jsonb;
  kb jsonb := current_setting('test.kpis_b')::jsonb;
begin
  assert (k ->> 'revenue_gross')::bigint = 144900, 'CA brut : ' || (k ->> 'revenue_gross');
  assert (k ->> 'revenue_net')::bigint = 117300, 'CA net : ' || (k ->> 'revenue_net');
  assert (k ->> 'bookings_total')::int = 1, 'réservations';
  assert (k ->> 'occupancy_rate')::numeric > 0, 'occupation';
  assert (kb ->> 'bookings_total')::int = 0, 'filtre catégorie KO';
  assert (select count(*) from public.get_partner_revenue_series(
            (select id from public.partners limit 1), current_date - 7, current_date, 'day')) = 8, 'série temporelle';
end $$;
select count(*) as todos from public.get_partner_todos(:'partner_id') \gset
:as_intruder
do $$ begin
  begin
    perform public.get_partner_kpis((select id from public.partners limit 1), current_date - 30, current_date);
    raise exception 'TEST FAILED: KPIs d''un autre partenaire';
  exception when others then
    if sqlerrm <> 'FORBIDDEN' then raise; end if;
  end;
end $$;
:as_customer
do $$ begin
  assert exists (select 1 from public.get_my_reminders() where kind = 'review_pending') is false, 'avis déjà laissé : pas de rappel attendu';
end $$;

\echo '15. Annulation selon la politique (modérée, ≥ 72 h → 100 % hors frais)'
:as_customer
select public.create_rental_booking(:'listing_id', now() + interval '10 days', now() + interval '12 days') ->> 'booking_id' as b2 \gset
select public.create_booking_payment(:'b2') ->> 'payment_id' as p2 \gset
:as_service
select public.handle_payment_success(:'p2', 'CP-TX-0002', 'orange_money') \gset dummy_
:as_owner
select public.respond_to_booking(:'b2', true) \gset dummy_
:as_customer
select public.cancel_booking(:'b2', 'Changement de programme') as cancel \gset
select set_config('test.cancel', :'cancel', false) as _ \gset
do $$
declare
  c jsonb := current_setting('test.cancel')::jsonb;
begin
  assert c ->> 'status' = 'cancelled_by_customer', 'statut annulation';
  assert (c ->> 'refund_amount')::bigint = 70000, 'remboursement : ' || (c ->> 'refund_amount');
end $$;
:as_service
select public.handle_refund_result((select id from public.refunds order by created_at desc limit 1), true, 'CP-RF-1') \gset dummy_
do $$ begin
  assert (select count(*) from public.availability_blocks where kind = 'booking') = 1, 'créneau non libéré';
  assert (select status from public.payments where provider_transaction_id = 'CP-TX-0002') = 'partially_refunded', 'statut paiement';
  assert (select refund_amount from public.bookings where status = 'cancelled_by_customer') = 70000, 'remboursement non reporté';
end $$;

\echo '16. Expiration automatique des réservations non payées'
:as_intruder
select public.create_rental_booking(:'listing_id', now() + interval '30 days', now() + interval '31 days') ->> 'booking_id' as b3 \gset
:as_postgres
update public.bookings set expires_at = now() - interval '1 minute' where id = :'b3';
:as_service
select public.expire_stale_bookings() as expired \gset
select set_config('test.expired', :'expired', false) as _ \gset
do $$ begin
  assert current_setting('test.expired')::int = 1, 'expiration';
  assert (select count(*) from public.availability_blocks where kind = 'booking') = 1, 'créneau expiré non libéré';
end $$;

\echo '17. Parcours vente : essai, acompte, vente conclue'
:as_owner
insert into public.vehicles (partner_id, make_id, model_id, category_id, model_year, fuel, transmission, mileage_km, seats, city_id)
select :'partner_id', mk.id, md.id, md.default_category_id, 2019, 'diesel', 'manual', 85000, 5, (select id from public.cities where slug = 'abidjan')
  from public.vehicle_makes mk join public.vehicle_models md on md.make_id = mk.id
 where mk.slug = 'toyota' and md.slug = 'hilux'
returning id as v2 \gset
insert into public.vehicle_photos (vehicle_id, storage_path, position, is_cover)
select :'v2', :'partner_id' || '/' || :'v2' || '/' || g || '.webp', g, g = 1 from generate_series(1, 4) g;
insert into public.listings (vehicle_id, type) values (:'v2', 'sale') returning id as l2 \gset
insert into public.sale_terms (listing_id, price, warranty_months, reservation_deposit_amount)
values (:'l2', 18500000, 12, 500000);
do $$ begin
  begin
    update public.sale_terms set is_certified = true;
    raise exception 'TEST FAILED: le vendeur s''auto-certifie';
  exception when insufficient_privilege then null;
  end;
end $$;
select public.submit_listing_for_review(:'l2') \gset dummy_
:as_admin
select public.moderate_listing(:'l2', true) \gset dummy_
:as_customer
select public.request_test_drive(:'l2', date_trunc('hour', now()) + interval '2 days 10 hours', 45) ->> 'status' as td \gset
:as_intruder
do $$ begin
  begin
    perform public.request_test_drive((select id from public.listings where type = 'sale'),
                                      date_trunc('hour', now()) + interval '2 days 10 hours 15 minutes', 30, 'CI-PC-111');
    raise exception 'TEST FAILED: essais qui se chevauchent';
  exception when others then
    if sqlerrm <> 'SLOT_UNAVAILABLE' then raise; end if;
  end;
end $$;
:as_customer
select public.create_sale_reservation(:'l2') ->> 'payment_id' as p_sale \gset
:as_intruder
do $$ begin
  begin
    perform public.create_sale_reservation((select id from public.listings where type = 'sale'));
    raise exception 'TEST FAILED: double acompte';
  exception when others then
    if sqlerrm <> 'VEHICLE_ALREADY_RESERVED' then raise; end if;
  end;
end $$;
:as_service
select public.handle_payment_success(:'p_sale', 'CP-TX-0003', 'mtn_momo') ->> 'status' as sale_status \gset
:as_owner
select public.record_vehicle_sale(:'l2', 18000000, null, true) \gset dummy_
do $$ begin
  assert (select status from public.listings where type = 'sale') = 'sold', 'annonce non vendue';
  assert (select status from public.sale_reservations limit 1) = 'converted', 'acompte non converti';
  assert (select buyer_id from public.vehicle_sales limit 1) = '11111111-1111-1111-1111-111111111111', 'acheteur non rattaché';
  assert (select count(*) from public.search_listings('sale')) = 0, 'véhicule vendu encore listé';
end $$;

\echo '18. Stockage : coffre-fort KYC cloisonné'
:as_customer
insert into storage.objects (bucket_id, name, owner) values ('kyc-documents', :'customer' || '/permis-recto.jpg', :'customer');
do $$ begin
  begin
    insert into storage.objects (bucket_id, name) values ('kyc-documents', '33333333-3333-3333-3333-333333333333/x.jpg');
    raise exception 'TEST FAILED: dépôt dans le coffre d''un autre';
  exception when insufficient_privilege or check_violation then null;
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('vehicle-photos', (select id from public.partners limit 1) || '/x.webp');
    raise exception 'TEST FAILED: photo déposée chez un partenaire';
  exception when insufficient_privilege or check_violation then null;
  end;
end $$;
:as_intruder
do $$ begin
  assert (select count(*) from storage.objects where bucket_id = 'kyc-documents') = 0, 'document KYC lisible par un tiers';
end $$;
:as_admin
do $$ begin
  assert (select count(*) from storage.objects where bucket_id = 'kyc-documents') = 1, 'la modération ne voit pas le document';
end $$;

\echo '19. Signalement utilisateur, résolution, audit'
:as_intruder
insert into public.moderation_flags (entity_type, entity_id, source, reporter_id, reason_code, description)
values ('listing', :'listing_id', 'user_report', :'intruder', 'suspicious_price', 'Prix trop bas');
:as_admin
select public.resolve_flag((select id from public.moderation_flags where source = 'user_report'), false, 'Prix cohérent') \gset dummy_
do $$ begin
  assert (select count(*) from public.audit_logs where entity_type = 'bookings') > 0, 'audit réservations vide';
  assert (select count(*) from public.audit_logs where entity_type = 'payments') > 0, 'audit paiements vide';
end $$;
:as_customer
do $$ begin
  assert (select count(*) from public.audit_logs) = 0, 'journal d''audit lisible par un client';
end $$;

\echo '20. FAQ prédictive et chiffres clés'
:as_anon
do $$ begin
  assert (select count(*) from public.search_faq('caut')) >= 1, 'FAQ prédictive';
  assert (select count(*) from public.search_faq('wave', 'payment_security')) >= 1, 'FAQ par onglet';
  assert (public.get_platform_stats() ->> 'completed_rentals')::int = 1, 'chiffres clés';
end $$;

\echo '21. Supprimer mon compte : demande puis anonymisation'
:as_intruder
select public.request_account_deletion('Je n''utilise plus le service') \gset dummy_
:as_service
select public.anonymize_user(:'intruder') \gset dummy_
do $$ begin
  assert (select email is null and phone is null and anonymized_at is not null from public.profiles
           where id = '33333333-3333-3333-3333-333333333333'), 'anonymisation incomplète';
  assert (select status from public.account_deletion_requests limit 1) = 'completed', 'demande non clôturée';
end $$;

\echo '22. Maintenance planifiée'
:as_service
select public.refresh_partner_stats() as refreshed \gset
select public.release_due_deposits() as released \gset
select public.expire_sale_reservations() as exp_sales \gset

:as_postgres
\echo '✔ Tous les scénarios passent'
