-- =============================================================================
-- Back-office (écritures admin sous RLS) et seed relançable sans écraser
-- (s'exécute après 01_parcours_complets.sql, dans la même base)
-- =============================================================================
\set ON_ERROR_STOP 1
\set QUIET 1
\pset format unaligned
\pset tuples_only on

\set as_customer 'reset role; do $x$ begin perform set_config(''request.jwt.claims'', ''{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}'', false); end $x$; set role authenticated;'
\set as_admin    'reset role; do $x$ begin perform set_config(''request.jwt.claims'', ''{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated","aal":"aal2"}'', false); end $x$; set role authenticated;'
\set as_postgres 'reset role; do $x$ begin perform set_config(''request.jwt.claims'', '''', false); end $x$;'

\echo '23. Back-office : l''admin gère référentiels, réglages, FAQ et certification'
:as_admin
insert into public.cities (name, slug, region, latitude, longitude, sort_order)
values ('Odienné', 'odienne', 'Kabadougou', 9.5100, -7.5690, 11);
update public.platform_settings set value = '0.12' where key = 'commission_rate';
insert into public.faq_articles (category_id, slug, question, answer_md)
select id, 'retard-retour', 'Que se passe-t-il si je rends le véhicule en retard ?', 'Prévenez le loueur depuis la messagerie.'
  from public.faq_categories where slug = 'location';
select public.certify_sale_listing((select id from public.listings where type = 'sale' limit 1), true) \gset dummy_
do $$ begin
  assert (select count(*) from public.cities where slug = 'odienne') = 1, 'ville non créée par l''admin';
  assert (select value #>> '{}' from public.platform_settings where key = 'commission_rate') = '0.12', 'réglage non modifié';
  assert (select is_certified from public.sale_terms limit 1), 'certification KO';
end $$;

\echo '24. Back-office : un client ne peut rien modifier'
:as_customer
do $$ begin
  begin
    insert into public.cities (name, slug, latitude, longitude) values ('Fausse', 'fausse', 0, 0);
    raise exception 'TEST FAILED: ville créée par un client';
  exception when insufficient_privilege then null;
  end;
  update public.platform_settings set value = '0' where key = 'service_fee_rate';
  begin
    perform public.certify_sale_listing((select id from public.listings where type = 'sale' limit 1), false);
    raise exception 'TEST FAILED: certification par un client';
  exception when others then
    if sqlerrm <> 'FORBIDDEN' then raise; end if;
  end;
end $$;
:as_postgres
do $$ begin
  assert (select value #>> '{}' from public.platform_settings where key = 'service_fee_rate') = '0.05', 'réglage modifié par un client';
end $$;

\echo '25. Seed relancé : rien n''est écrasé ni dupliqué'
\ir ../supabase/seed.sql
do $$ begin
  assert (select value #>> '{}' from public.platform_settings where key = 'commission_rate') = '0.12', 'le seed a écrasé un réglage';
  assert (select count(*) from public.insurance_plans where partner_id is null) = 3, 'assurances dupliquées';
  assert (select count(*) from public.cities) = 11, 'villes dupliquées';
end $$;
\echo '✔ Back-office et seed OK'
