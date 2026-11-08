-- =============================================================================
-- 1200 — Logique métier : devenir partenaire, cycle de vie des annonces,
-- recherche catalogue (filtres, tri, carte), suggestions « zéro résultat »,
-- tableaux de bord (KPIs, to-do automatisée, rappels contextuels)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Devenir partenaire (loueur pro / particulier / vendeur)
-- -----------------------------------------------------------------------------
create or replace function public.become_partner(
  p_type          public.partner_type,
  p_display_name  text,
  p_city_id       integer,
  p_district_id   integer default null,
  p_description   text default null,
  p_legal_name    text default null,
  p_rccm_number   text default null,
  p_tax_id        text default null,
  p_contact_phone text default null,
  p_whatsapp_phone text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_partner_id uuid;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if (select is_suspended from public.profiles where id = v_uid) then
    raise exception 'ACCOUNT_SUSPENDED';
  end if;
  if exists (
    select 1 from public.partner_members pm join public.partners pa on pa.id = pm.partner_id
     where pm.user_id = v_uid and pm.role = 'owner' and pa.type = p_type
  ) then
    raise exception 'PARTNER_ALREADY_EXISTS';
  end if;
  if p_type in ('rental_agency', 'dealership') and nullif(trim(p_rccm_number), '') is null then
    raise exception 'RCCM_REQUIRED';
  end if;

  insert into public.partners (type, display_name, slug, description, city_id, district_id, created_by)
  values (p_type, trim(p_display_name), private.slugify(p_display_name) || '-' || lower(private.random_code(5)),
          p_description, p_city_id, p_district_id, v_uid)
  returning id into v_partner_id;

  insert into public.partner_private (partner_id, legal_name, rccm_number, tax_id, contact_email, contact_phone, whatsapp_phone)
  select v_partner_id, p_legal_name, p_rccm_number, p_tax_id, pr.email,
         coalesce(p_contact_phone, pr.phone), p_whatsapp_phone
    from public.profiles pr where pr.id = v_uid;

  insert into public.partner_members (partner_id, user_id, role) values (v_partner_id, v_uid, 'owner');
  insert into public.user_roles (user_id, role) values (v_uid, 'partner') on conflict do nothing;

  return v_partner_id;
end;
$$;

-- Validation du partenaire par l'équipe (badge « Vérifié »)
create or replace function public.verify_partner(p_partner_id uuid, p_approve boolean, p_reason text default null)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_partner public.partners;
begin
  if not private.is_moderator() then
    raise exception 'FORBIDDEN';
  end if;
  select * into v_partner from public.partners where id = p_partner_id for update;
  if v_partner.id is null then
    raise exception 'PARTNER_NOT_FOUND';
  end if;
  if p_approve and v_partner.type in ('rental_agency', 'dealership')
     and not exists (select 1 from public.partner_private where partner_id = p_partner_id and rccm_number is not null) then
    raise exception 'RCCM_REQUIRED';
  end if;
  update public.partners
     set verification_status = case when p_approve then 'approved' else 'rejected' end::public.verification_status,
         verified_at = case when p_approve then now() else null end
   where id = p_partner_id;
  perform private.notify_partner(p_partner_id, 'security',
    case when p_approve then 'partner.verified' else 'partner.rejected' end,
    case when p_approve then 'Votre compte partenaire est vérifié' else 'Vérification du compte partenaire refusée' end,
    p_reason, '/partenaire/verification', '{}'::jsonb, 1::smallint);
end;
$$;

-- -----------------------------------------------------------------------------
-- Cycle de vie des annonces
-- -----------------------------------------------------------------------------
create or replace function public.submit_listing_for_review(p_listing_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_listing public.listings;
  v_min_photos integer := private.setting_int('min_photos_per_listing', 4);
begin
  select * into v_listing from public.listings where id = p_listing_id for update;
  if v_listing.id is null or not private.is_partner_manager(v_listing.partner_id) then
    raise exception 'LISTING_NOT_FOUND';
  end if;
  if v_listing.status not in ('draft', 'rejected', 'paused') then
    raise exception 'LISTING_NOT_SUBMITTABLE' using detail = v_listing.status::text;
  end if;
  if not (select is_active from public.partners where id = v_listing.partner_id) then
    raise exception 'PARTNER_INACTIVE';
  end if;
  if v_listing.type = 'rental' and not exists (select 1 from public.rental_terms where listing_id = p_listing_id) then
    raise exception 'RENTAL_TERMS_MISSING';
  end if;
  if v_listing.type = 'sale' and not exists (select 1 from public.sale_terms where listing_id = p_listing_id) then
    raise exception 'SALE_TERMS_MISSING';
  end if;
  if (select count(*) from public.vehicle_photos where vehicle_id = v_listing.vehicle_id and status = 'visible') < v_min_photos then
    raise exception 'NOT_ENOUGH_PHOTOS' using detail = v_min_photos::text;
  end if;

  update public.listings set status = 'pending_review', submitted_at = now(), rejection_reason = null
   where id = p_listing_id;
  perform private.enqueue_ai_job('listing_moderation', 'listing', p_listing_id, 1::smallint);
end;
$$;

-- Le partenaire met en pause, réactive ou archive son annonce
create or replace function public.set_listing_status(p_listing_id uuid, p_status public.listing_status)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_listing public.listings;
begin
  select * into v_listing from public.listings where id = p_listing_id for update;
  if v_listing.id is null or not private.is_partner_manager(v_listing.partner_id) then
    raise exception 'LISTING_NOT_FOUND';
  end if;
  if not (
       (v_listing.status = 'published' and p_status = 'paused')
    or (v_listing.status = 'paused' and p_status = 'published' and v_listing.published_at is not null)
    or (v_listing.status in ('draft', 'paused', 'published', 'rejected') and p_status = 'archived')
    or (v_listing.status in ('rejected', 'paused') and p_status = 'draft')
  ) then
    raise exception 'INVALID_LISTING_TRANSITION' using detail = v_listing.status || ' → ' || p_status;
  end if;
  update public.listings
     set status = p_status,
         paused_at = case when p_status = 'paused' then now() else paused_at end
   where id = p_listing_id;
end;
$$;

-- Décision humaine de modération
create or replace function public.moderate_listing(p_listing_id uuid, p_approve boolean, p_reason text default null)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_listing public.listings;
begin
  if not private.is_moderator() then
    raise exception 'FORBIDDEN';
  end if;
  select * into v_listing from public.listings where id = p_listing_id for update;
  if v_listing.id is null then
    raise exception 'LISTING_NOT_FOUND';
  end if;
  if not p_approve and nullif(trim(p_reason), '') is null then
    raise exception 'REASON_REQUIRED';
  end if;
  update public.listings
     set status = case when p_approve then 'published' else 'rejected' end::public.listing_status,
         published_at = case when p_approve then coalesce(published_at, now()) else published_at end,
         rejection_reason = case when p_approve then null else p_reason end,
         last_moderated_at = now()
   where id = p_listing_id;
  update public.moderation_flags
     set status = case when p_approve then 'dismissed' else 'confirmed' end::public.flag_status,
         resolved_by = auth.uid(), resolved_at = now(), resolution_note = p_reason
   where entity_type = 'listing' and entity_id = p_listing_id and status in ('open', 'in_review');
  perform private.notify_partner(v_listing.partner_id, 'booking',
    case when p_approve then 'listing.published' else 'listing.rejected' end,
    case when p_approve then 'Annonce publiée' else 'Annonce refusée' end,
    coalesce(p_reason, v_listing.title), '/partenaire/annonces/' || p_listing_id, '{}'::jsonb, 1::smallint);
end;
$$;

-- Une annonce publiée modifiée repasse en contrôle IA (post-modération)
create or replace function private.listings_after_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'published' and new.description is distinct from old.description then
    perform private.enqueue_ai_job('listing_moderation', 'listing', new.id, 0::smallint);
  end if;
  return null;
end;
$$;

create trigger listings_after_update
  after update of description on public.listings
  for each row execute function private.listings_after_update();

-- Mise en vente conclue → annonce « vendue », véhicule sorti de la flotte
create or replace function public.record_vehicle_sale(
  p_listing_id uuid, p_final_price bigint, p_buyer_id uuid default null, p_closed_offline boolean default true
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_listing public.listings;
  v_sr uuid;
  v_id uuid;
begin
  select * into v_listing from public.listings where id = p_listing_id for update;
  if v_listing.id is null or v_listing.type <> 'sale' or not private.is_partner_manager(v_listing.partner_id) then
    raise exception 'LISTING_NOT_FOUND';
  end if;
  if v_listing.status not in ('published', 'paused') then
    raise exception 'LISTING_NOT_SELLABLE';
  end if;
  select id into v_sr from public.sale_reservations where listing_id = p_listing_id and status = 'active';

  insert into public.vehicle_sales (listing_id, vehicle_id, partner_id, buyer_id, sale_reservation_id,
                                    final_price, commission_amount, closed_offline, recorded_by)
  values (p_listing_id, v_listing.vehicle_id, v_listing.partner_id,
          coalesce(p_buyer_id, (select buyer_id from public.sale_reservations where id = v_sr)), v_sr,
          p_final_price, round(p_final_price * private.setting_numeric('sale_commission_rate', 0)), p_closed_offline, auth.uid())
  returning id into v_id;

  update public.listings set status = 'sold', sold_at = now() where id = p_listing_id;
  update public.vehicles set fleet_status = 'sold' where id = v_listing.vehicle_id;
  -- La même voiture ne peut plus être louée
  update public.listings set status = 'archived'
   where vehicle_id = v_listing.vehicle_id and type = 'rental' and status in ('draft', 'pending_review', 'published', 'paused');
  if v_sr is not null then
    update public.sale_reservations set status = 'converted', converted_at = now() where id = v_sr;
  end if;
  return v_id;
end;
$$;

-- Statistiques d'audience (vue, clic contact, favori)
create or replace function public.track_listing_event(p_listing_id uuid, p_event text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_day date := (now() at time zone 'Africa/Abidjan')::date;
begin
  if p_event not in ('view', 'contact', 'favorite') then
    raise exception 'INVALID_EVENT';
  end if;
  if not exists (select 1 from public.listings where id = p_listing_id and status = 'published') then
    return;
  end if;
  insert into public.listing_stats_daily as s (listing_id, day, views, contact_clicks, favorites)
  values (p_listing_id, v_day,
          (p_event = 'view')::integer, (p_event = 'contact')::integer, (p_event = 'favorite')::integer)
  on conflict (listing_id, day) do update
     set views = s.views + excluded.views,
         contact_clicks = s.contact_clicks + excluded.contact_clicks,
         favorites = s.favorites + excluded.favorites;
  if p_event = 'view' then
    update public.listings set views_count = views_count + 1 where id = p_listing_id;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Recherche catalogue : filtres rapides + avancés, tri, distance, disponibilité
-- -----------------------------------------------------------------------------
create or replace function public.search_listings(
  p_type            public.listing_type,
  p_query           text default null,
  p_city_id         integer default null,
  p_latitude        numeric default null,
  p_longitude       numeric default null,
  p_radius_km       numeric default null,
  p_category_ids    integer[] default null,
  p_make_ids        integer[] default null,
  p_model_ids       integer[] default null,
  p_min_price       bigint default null,
  p_max_price       bigint default null,
  p_min_year        integer default null,
  p_max_year        integer default null,
  p_fuels           public.fuel_type[] default null,
  p_transmissions   public.transmission_type[] default null,
  p_min_seats       integer default null,
  p_max_mileage     integer default null,
  p_seller_kind     text default null,       -- 'professional' | 'private'
  p_delivery        boolean default null,
  p_child_seat      boolean default null,
  p_pets_allowed    boolean default null,
  p_with_driver     boolean default null,
  p_instant_booking boolean default null,
  p_with_warranty   boolean default null,
  p_certified       boolean default null,
  p_start_at        timestamptz default null,
  p_end_at          timestamptz default null,
  p_sort            text default 'relevance', -- relevance | price_asc | price_desc | mileage_asc | distance | rating | newest
  p_limit           integer default 24,
  p_offset          integer default 0
)
returns table (
  listing_id         uuid,
  slug               text,
  listing_type       public.listing_type,
  title              text,
  make_name          text,
  model_name         text,
  category_slug      text,
  model_year         smallint,
  fuel               public.fuel_type,
  transmission       public.transmission_type,
  seats              smallint,
  mileage_km         integer,
  city_name          text,
  district_name      text,
  latitude           numeric,
  longitude          numeric,
  distance_km        numeric,
  photo_paths        text[],
  price_per_day      bigint,
  rental_days        integer,
  estimated_total    bigint,
  sale_price         bigint,
  deposit_amount     bigint,
  partner_id         uuid,
  partner_name       text,
  partner_type       public.partner_type,
  partner_verified   boolean,
  is_super_host      boolean,
  rating_avg         numeric,
  rating_count       integer,
  instant_booking    boolean,
  warranty_months    smallint,
  is_certified       boolean,
  is_featured        boolean,
  offer_discount_pct numeric,
  is_reserved        boolean,
  total_count        bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tsq tsquery := private.prefix_tsquery(p_query);
  v_days integer := case when p_start_at is not null and p_end_at is not null and p_end_at > p_start_at
                         then private.rental_days(p_start_at, p_end_at) end;
  v_limit integer := least(greatest(coalesce(p_limit, 24), 1), 100);
  v_lat numeric := p_latitude;
  v_lng numeric := p_longitude;
begin
  if p_sort not in ('relevance', 'price_asc', 'price_desc', 'mileage_asc', 'distance', 'rating', 'newest') then
    raise exception 'INVALID_SORT';
  end if;
  -- Sans position GPS, on mesure depuis le centre de la ville choisie
  if (v_lat is null or v_lng is null) and p_city_id is not null then
    select c.latitude, c.longitude into v_lat, v_lng from public.cities c where c.id = p_city_id;
  end if;

  return query
  with base as (
    select
      li.id, li.slug, li.type, li.title, li.published_at, li.instant_booking, li.offer_discount_pct, li.offer_ends_at,
      (li.is_featured and (li.featured_until is null or li.featured_until > now())) as featured,
      case when v_tsq is not null then ts_rank(li.search_vector, v_tsq) else 0 end as rank,
      mk.name as make_name, md.name as model_name, cat.slug as category_slug,
      ve.id as vehicle_id, ve.model_year, ve.fuel, ve.transmission, ve.seats, ve.mileage_km,
      ve.latitude, ve.longitude,
      ci.name as city_name, di.name as district_name,
      private.distance_km(v_lat, v_lng, ve.latitude, ve.longitude) as distance,
      rt.price_per_day, rt.deposit_amount, st.price as sale_price, st.warranty_months, st.is_certified,
      pa.id as partner_id, pa.display_name, pa.type as partner_type,
      (pa.verification_status = 'approved') as partner_verified, pa.is_super_host, pa.rating_avg, pa.rating_count
    from public.listings li
    join public.vehicles ve on ve.id = li.vehicle_id
    join public.vehicle_makes mk on mk.id = ve.make_id
    join public.vehicle_models md on md.id = ve.model_id
    join public.vehicle_categories cat on cat.id = ve.category_id
    join public.cities ci on ci.id = ve.city_id
    left join public.districts di on di.id = ve.district_id
    join public.partners pa on pa.id = li.partner_id
    left join public.rental_terms rt on rt.listing_id = li.id
    left join public.sale_terms st on st.listing_id = li.id
    where li.status = 'published'
      and li.type = p_type
      and pa.is_active
      and ve.fleet_status not in ('out_of_service', 'sold')
      and (v_tsq is null or li.search_vector @@ v_tsq or extensions.similarity(li.title, p_query) > 0.3)
      and (p_city_id is null or p_radius_km is not null or ve.city_id = p_city_id)
      and (p_category_ids is null or ve.category_id = any (p_category_ids))
      and (p_make_ids is null or ve.make_id = any (p_make_ids))
      and (p_model_ids is null or ve.model_id = any (p_model_ids))
      and (p_min_year is null or ve.model_year >= p_min_year)
      and (p_max_year is null or ve.model_year <= p_max_year)
      and (p_fuels is null or ve.fuel = any (p_fuels))
      and (p_transmissions is null or ve.transmission = any (p_transmissions))
      and (p_min_seats is null or ve.seats >= p_min_seats)
      and (p_max_mileage is null or ve.mileage_km <= p_max_mileage)
      and (p_seller_kind is null
           or (p_seller_kind = 'professional' and pa.type in ('rental_agency', 'dealership'))
           or (p_seller_kind = 'private' and pa.type in ('private_owner', 'private_seller')))
      -- Prix : par jour pour la location, prix total pour la vente
      and (p_min_price is null or coalesce(rt.price_per_day, st.price) >= p_min_price)
      and (p_max_price is null or coalesce(rt.price_per_day, st.price) <= p_max_price)
      -- Conditions spécifiques location
      and (p_delivery is not true or rt.delivery_available)
      and (p_pets_allowed is not true or rt.pets_allowed)
      and (p_with_driver is not true or rt.with_driver_available)
      and (p_instant_booking is not true or li.instant_booking)
      and (p_child_seat is not true or exists (
            select 1 from public.listing_extras le join public.extras ex on ex.id = le.extra_id
             where le.listing_id = li.id and le.is_available and ex.code in ('child_seat', 'booster_seat')))
      -- Conditions spécifiques vente
      and (p_with_warranty is not true or st.warranty_months > 0)
      and (p_certified is not true or st.is_certified)
      -- Disponibilité sur les dates demandées
      and (p_type <> 'rental' or v_days is null or (
            v_days between rt.min_rental_days and rt.max_rental_days
            and not exists (
              select 1 from public.availability_blocks ab
               where ab.vehicle_id = ve.id and ab.period && tstzrange(p_start_at, p_end_at, '[)'))))
  )
  select
    b.id, b.slug, b.type, b.title, b.make_name, b.model_name, b.category_slug, b.model_year,
    b.fuel, b.transmission, b.seats, b.mileage_km, b.city_name, b.district_name,
    b.latitude, b.longitude, b.distance,
    array(
      select vp.storage_path from public.vehicle_photos vp
       where vp.vehicle_id = b.vehicle_id and vp.status = 'visible'
       order by vp.is_cover desc, vp.position
       limit 5
    ),
    b.price_per_day::bigint,
    v_days,
    case when b.price_per_day is not null and v_days is not null then (b.price_per_day * v_days)::bigint end,
    b.sale_price::bigint,
    b.deposit_amount::bigint,
    b.partner_id, b.display_name, b.partner_type, b.partner_verified, b.is_super_host,
    b.rating_avg, b.rating_count, b.instant_booking, b.warranty_months, b.is_certified, b.featured,
    case when b.offer_ends_at is null or b.offer_ends_at > now() then b.offer_discount_pct end,
    exists (select 1 from public.sale_reservations sr where sr.listing_id = b.id and sr.status in ('pending_payment', 'active')),
    count(*) over ()
  from base b
  where p_radius_km is null or b.distance is null or b.distance <= p_radius_km
  order by
    case when p_sort = 'price_asc' then coalesce(b.price_per_day, b.sale_price) end asc nulls last,
    case when p_sort = 'price_desc' then coalesce(b.price_per_day, b.sale_price) end desc nulls last,
    case when p_sort = 'mileage_asc' then b.mileage_km end asc nulls last,
    case when p_sort = 'distance' then b.distance end asc nulls last,
    case when p_sort = 'rating' then b.rating_avg end desc nulls last,
    case when p_sort = 'newest' then b.published_at end desc nulls last,
    -- Pertinence (par défaut) : mise en avant, texte, réputation, fraîcheur
    b.featured desc,
    b.rank desc,
    (b.rating_avg * ln(b.rating_count + 1)) desc,
    b.published_at desc
  limit v_limit offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

-- Suggestions de véhicules similaires (page annonce et « zéro résultat »)
create or replace function public.suggest_similar_listings(
  p_type        public.listing_type,
  p_listing_id  uuid default null,
  p_category_id integer default null,
  p_city_id     integer default null,
  p_price       bigint default null,
  p_limit       integer default 6
)
returns table (
  listing_id uuid, slug text, title text, cover_path text, city_name text,
  price_per_day bigint, sale_price bigint, rating_avg numeric, score integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_cat integer := p_category_id;
  v_city integer := p_city_id;
  v_make integer;
  v_price bigint := p_price;
begin
  if p_listing_id is not null then
    select ve.category_id, ve.city_id, ve.make_id, coalesce(rt.price_per_day, st.price)
      into v_cat, v_city, v_make, v_price
      from public.listings li
      join public.vehicles ve on ve.id = li.vehicle_id
      left join public.rental_terms rt on rt.listing_id = li.id
      left join public.sale_terms st on st.listing_id = li.id
     where li.id = p_listing_id;
  end if;

  return query
  select li.id, li.slug, li.title,
         (select vp.storage_path from public.vehicle_photos vp
           where vp.vehicle_id = ve.id and vp.status = 'visible' order by vp.is_cover desc, vp.position limit 1),
         ci.name, rt.price_per_day::bigint, st.price::bigint, pa.rating_avg,
         ((ve.category_id = v_cat)::integer * 3
          + (ve.city_id = v_city)::integer * 2
          + (ve.make_id = v_make)::integer
          + (v_price is not null and coalesce(rt.price_per_day, st.price) between v_price * 0.7 and v_price * 1.3)::integer * 2
         )::integer as score
    from public.listings li
    join public.vehicles ve on ve.id = li.vehicle_id
    join public.cities ci on ci.id = ve.city_id
    join public.partners pa on pa.id = li.partner_id
    left join public.rental_terms rt on rt.listing_id = li.id
    left join public.sale_terms st on st.listing_id = li.id
   where li.status = 'published' and li.type = p_type and pa.is_active
     and ve.fleet_status not in ('out_of_service', 'sold')
     and (p_listing_id is null or li.id <> p_listing_id)
   order by 9 desc, 8 desc nulls last, li.published_at desc
   limit least(greatest(coalesce(p_limit, 6), 1), 24);
end;
$$;

-- Chiffres clés publics (page « À propos »)
create or replace function public.get_platform_stats()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'rental_listings', (select count(*) from public.listings where status = 'published' and type = 'rental'),
    'sale_listings',   (select count(*) from public.listings where status = 'published' and type = 'sale'),
    'verified_partners', (select count(*) from public.partners where verification_status = 'approved' and is_active),
    'completed_rentals', (select count(*) from public.bookings where status = 'completed'),
    'cities', (select count(distinct ve.city_id) from public.listings li join public.vehicles ve on ve.id = li.vehicle_id where li.status = 'published'),
    'average_rating', (select round(avg(rating)::numeric, 2) from public.reviews where status = 'visible' and direction = 'customer_to_partner')
  );
$$;

-- -----------------------------------------------------------------------------
-- Tableau de bord business du partenaire
-- Filtres : période (p_from → p_to) et catégorie de véhicule
-- -----------------------------------------------------------------------------
create or replace function public.get_partner_kpis(
  p_partner_id  uuid,
  p_from        date,
  p_to          date,
  p_category_id integer default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_period tstzrange;
  v_prev tstzrange;
  v_days integer;
  v_vehicles integer;
  v_result jsonb;
begin
  if not (private.is_partner_member(p_partner_id) or private.is_staff()) then
    raise exception 'FORBIDDEN';
  end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 366 then
    raise exception 'INVALID_PERIOD';
  end if;
  v_days := p_to - p_from + 1;
  v_period := tstzrange((p_from::timestamp at time zone 'Africa/Abidjan'), ((p_to + 1)::timestamp at time zone 'Africa/Abidjan'), '[)');
  v_prev := tstzrange(lower(v_period) - make_interval(days => v_days), lower(v_period), '[)');

  select count(*) into v_vehicles
    from public.vehicles ve
   where ve.partner_id = p_partner_id and ve.archived_at is null and ve.fleet_status <> 'sold'
     and (p_category_id is null or ve.category_id = p_category_id);

  with bk as (
    select b.*,
           -- jours réservés à l'intérieur de la période (pour le taux d'occupation)
           greatest(0, extract(epoch from (least(b.return_at, upper(v_period)) - greatest(b.pickup_at, lower(v_period)))) / 86400.0) as days_in_period
      from public.bookings b
      join public.vehicles ve on ve.id = b.vehicle_id
     where b.partner_id = p_partner_id
       and (p_category_id is null or ve.category_id = p_category_id)
       and tstzrange(b.pickup_at, b.return_at, '[)') && v_period
  ),
  active as (
    select * from bk where status in ('confirmed', 'in_progress', 'completed', 'disputed')
  ),
  prev as (
    select coalesce(sum(b.partner_payout_amount), 0) as revenue_net
      from public.bookings b join public.vehicles ve on ve.id = b.vehicle_id
     where b.partner_id = p_partner_id
       and (p_category_id is null or ve.category_id = p_category_id)
       and b.status in ('confirmed', 'in_progress', 'completed', 'disputed')
       and b.pickup_at <@ v_prev
  ),
  stats as (
    select coalesce(sum(s.views), 0) as views, coalesce(sum(s.contact_clicks), 0) as contacts,
           coalesce(sum(s.booking_requests), 0) as requests
      from public.listing_stats_daily s
      join public.listings li on li.id = s.listing_id
      join public.vehicles ve on ve.id = li.vehicle_id
     where li.partner_id = p_partner_id and s.day between p_from and p_to
       and (p_category_id is null or ve.category_id = p_category_id)
  ),
  sales as (
    select count(*) as cnt, coalesce(sum(vs.final_price), 0) as amount
      from public.vehicle_sales vs join public.vehicles ve on ve.id = vs.vehicle_id
     where vs.partner_id = p_partner_id and vs.sold_at <@ v_period
       and (p_category_id is null or ve.category_id = p_category_id)
  )
  select jsonb_build_object(
    'period', jsonb_build_object('from', p_from, 'to', p_to, 'days', v_days, 'category_id', p_category_id),
    'revenue_gross', (select coalesce(sum(total_amount), 0) from active),
    'revenue_net', (select coalesce(sum(partner_payout_amount), 0) from active),
    'revenue_net_previous_period', (select revenue_net from prev),
    'bookings_total', (select count(*) from bk),
    'bookings_by_status', coalesce((select jsonb_object_agg(status, cnt) from (select status, count(*) as cnt from bk group by status) x), '{}'::jsonb),
    'cancellation_rate', (select case when count(*) = 0 then 0 else round(100.0 * count(*) filter (where status::text like 'cancelled%' or status = 'declined') / count(*), 1) end from bk),
    'booked_days', (select round(coalesce(sum(days_in_period), 0), 1) from active),
    'occupancy_rate', case when v_vehicles = 0 then 0
                           else round(100.0 * (select coalesce(sum(days_in_period), 0) from active) / (v_vehicles * v_days), 1) end,
    'average_daily_rate', (select coalesce(round(avg(daily_rate)), 0) from active),
    'vehicles', v_vehicles,
    'fleet_status', coalesce((
      select jsonb_object_agg(fleet_status, cnt) from (
        select ve.fleet_status, count(*) as cnt from public.vehicles ve
         where ve.partner_id = p_partner_id and ve.archived_at is null
           and (p_category_id is null or ve.category_id = p_category_id)
         group by ve.fleet_status) f), '{}'::jsonb),
    'listing_views', (select views from stats),
    'contact_clicks', (select contacts from stats),
    'booking_requests', (select requests from stats),
    'conversion_rate', (select case when views = 0 then 0 else round(100.0 * requests / views, 2) end from stats),
    'sales_count', (select cnt from sales),
    'sales_amount', (select amount from sales),
    'test_drives', (select count(*) from public.test_drives td where td.partner_id = p_partner_id and td.scheduled_at <@ v_period),
    'rating_avg', pa.rating_avg,
    'rating_count', pa.rating_count,
    'response_rate', pa.response_rate,
    'avg_response_minutes', pa.avg_response_minutes,
    'is_super_host', pa.is_super_host
  ) into v_result
    from public.partners pa where pa.id = p_partner_id;

  return v_result;
end;
$$;

-- Série temporelle des revenus (graphique du tableau de bord)
create or replace function public.get_partner_revenue_series(
  p_partner_id  uuid,
  p_from        date,
  p_to          date,
  p_granularity text default 'day',     -- day | week | month
  p_category_id integer default null
)
returns table (bucket date, bookings bigint, revenue_gross bigint, revenue_net bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (private.is_partner_member(p_partner_id) or private.is_staff()) then
    raise exception 'FORBIDDEN';
  end if;
  if p_granularity not in ('day', 'week', 'month') or p_to < p_from or p_to - p_from > 731 then
    raise exception 'INVALID_PERIOD';
  end if;
  return query
  with buckets as (
    select generate_series(date_trunc(p_granularity, p_from::timestamp), date_trunc(p_granularity, p_to::timestamp),
                           ('1 ' || p_granularity)::interval)::date as bucket
  )
  select bu.bucket,
         count(b.id),
         coalesce(sum(b.total_amount), 0)::bigint,
         coalesce(sum(b.partner_payout_amount), 0)::bigint
    from buckets bu
    left join (
      select bo.* from public.bookings bo
        join public.vehicles ve on ve.id = bo.vehicle_id
       where bo.partner_id = p_partner_id
         and bo.status in ('confirmed', 'in_progress', 'completed', 'disputed')
         and (p_category_id is null or ve.category_id = p_category_id)
         and (bo.pickup_at at time zone 'Africa/Abidjan')::date between p_from and p_to
    ) b on date_trunc(p_granularity, (b.pickup_at at time zone 'Africa/Abidjan'))::date = bu.bucket
   group by bu.bucket
   order by bu.bucket;
end;
$$;

-- To-do list automatisée du partenaire
create or replace function public.get_partner_todos(p_partner_id uuid)
returns table (kind text, priority smallint, title text, entity_type text, entity_id uuid, due_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (private.is_partner_member(p_partner_id) or private.is_staff()) then
    raise exception 'FORBIDDEN';
  end if;
  return query
  -- Demandes à accepter / refuser
  select 'booking_to_confirm', 2::smallint, 'Répondre à la demande ' || b.reference, 'booking', b.id, b.expires_at
    from public.bookings b where b.partner_id = p_partner_id and b.status = 'pending_confirmation'
  union all
  -- Départs dans les 24 h : préparer le véhicule et l'état des lieux
  select 'pickup_soon', 2::smallint, 'Remise du véhicule ' || b.reference, 'booking', b.id, b.pickup_at
    from public.bookings b where b.partner_id = p_partner_id and b.status = 'confirmed'
     and b.pickup_at between now() - interval '2 hours' and now() + interval '24 hours'
  union all
  -- Retours prévus dans les 24 h ou en retard
  select case when b.return_at < now() then 'return_overdue' else 'return_soon' end,
         case when b.return_at < now() then 2 else 1 end::smallint,
         'Retour du véhicule ' || b.reference, 'booking', b.id, b.return_at
    from public.bookings b where b.partner_id = p_partner_id and b.status = 'in_progress'
     and b.return_at < now() + interval '24 hours'
  union all
  -- Messages sans réponse depuis plus de 2 h
  select 'unanswered_message', 1::smallint, 'Message en attente de réponse', 'conversation', c.id, c.last_message_at
    from public.conversations c
    join lateral (
      select m.sender_id from public.messages m
       where m.conversation_id = c.id and m.kind = 'text' order by m.created_at desc limit 1
    ) lm on true
   where c.partner_id = p_partner_id and c.status = 'open'
     and lm.sender_id = c.customer_id and c.last_message_at < now() - interval '2 hours'
  union all
  -- Documents du véhicule expirant sous 30 jours (assurance, visite technique)
  select 'vehicle_document_expiring', 1::smallint, 'Document à renouveler : ' || vd.type, 'vehicle', vd.vehicle_id,
         vd.expires_on::timestamptz
    from public.vehicle_documents vd join public.vehicles ve on ve.id = vd.vehicle_id
   where ve.partner_id = p_partner_id and ve.archived_at is null
     and vd.expires_on is not null and vd.expires_on < current_date + 30
  union all
  -- Entretien à prévoir
  select 'maintenance_due', 1::smallint, 'Entretien à prévoir', 'vehicle', ve.id, ml.next_due_on::timestamptz
    from public.vehicles ve
    join lateral (
      select * from public.vehicle_maintenance_logs m where m.vehicle_id = ve.id order by m.performed_on desc limit 1
    ) ml on true
   where ve.partner_id = p_partner_id and ve.archived_at is null
     and ((ml.next_due_on is not null and ml.next_due_on < current_date + 14)
          or (ml.next_due_km is not null and ve.mileage_km >= ml.next_due_km - 500))
  union all
  -- Annonces refusées à corriger
  select 'listing_rejected', 1::smallint, 'Annonce refusée : ' || li.title, 'listing', li.id, li.updated_at
    from public.listings li where li.partner_id = p_partner_id and li.status = 'rejected'
  union all
  -- Demandes d'essai à traiter
  select 'test_drive_request', 2::smallint, 'Demande d''essai ' || td.reference, 'test_drive', td.id, td.scheduled_at
    from public.test_drives td where td.partner_id = p_partner_id and td.status = 'requested'
  union all
  -- Justificatifs partenaire refusés
  select 'partner_document_rejected', 2::smallint, 'Justificatif refusé : ' || pd.type, 'partner_document', pd.id, pd.reviewed_at
    from public.partner_documents pd where pd.partner_id = p_partner_id and pd.status = 'rejected'
  order by 2 desc, 6 asc nulls last;
end;
$$;

-- Rappels contextuels (Smart Cards) du tableau de bord locataire / acheteur
create or replace function public.get_my_reminders()
returns table (kind text, priority smallint, title text, body text, action_url text, due_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  select * into v_profile from public.profiles where id = v_uid;

  return query
  -- Paiement en attente
  select 'payment_pending', 2::smallint, 'Finalisez votre paiement', 'Réservation ' || b.reference || ' — ' || li.title,
         '/reservation/' || b.id || '/paiement', b.expires_at
    from public.bookings b join public.listings li on li.id = b.listing_id
   where b.customer_id = v_uid and b.status = 'pending_payment' and b.expires_at > now()
  union all
  -- Identité à vérifier avant un départ
  select 'kyc_required', 2::smallint, 'Vérifiez votre identité',
         'Ajoutez votre permis (recto/verso) et votre pièce d''identité avant le départ.',
         '/compte/verification', min(b.pickup_at)
    from public.bookings b
   where b.customer_id = v_uid and b.status in ('pending_confirmation', 'confirmed')
     and v_profile.kyc_status <> 'approved'
   having count(*) > 0
  union all
  -- Départ imminent
  select 'pickup_soon', 1::smallint, 'Votre location commence bientôt', li.title || ' — présentez votre QR code',
         '/compte/reservations/' || b.id, b.pickup_at
    from public.bookings b join public.listings li on li.id = b.listing_id
   where b.customer_id = v_uid and b.status = 'confirmed' and b.pickup_at between now() and now() + interval '48 hours'
  union all
  -- Retour à prévoir
  select 'return_soon', 1::smallint, 'Retour du véhicule', li.title, '/compte/reservations/' || b.id, b.return_at
    from public.bookings b join public.listings li on li.id = b.listing_id
   where b.customer_id = v_uid and b.status = 'in_progress' and b.return_at < now() + interval '24 hours'
  union all
  -- Avis à laisser (30 jours)
  select 'review_pending', 0::smallint, 'Donnez votre avis', li.title, '/compte/reservations/' || b.id || '/avis', b.completed_at + interval '30 days'
    from public.bookings b join public.listings li on li.id = b.listing_id
   where b.customer_id = v_uid and b.status = 'completed' and b.completed_at > now() - interval '30 days'
     and not exists (select 1 from public.reviews r where r.booking_id = b.id and r.direction = 'customer_to_partner')
  union all
  -- Permis bientôt expiré
  select 'license_expiring', 1::smallint, 'Votre permis expire bientôt', 'Mettez à jour votre permis de conduire.',
         '/compte/verification', v_profile.driver_license_expires_on::timestamptz
   where v_profile.driver_license_expires_on is not null and v_profile.driver_license_expires_on < current_date + 30
  union all
  -- Essai prévu demain
  select 'test_drive_soon', 1::smallint, 'Essai prévu', li.title, '/compte/essais/' || td.id, td.scheduled_at
    from public.test_drives td join public.listings li on li.id = td.listing_id
   where td.buyer_id = v_uid and td.status = 'confirmed' and td.scheduled_at between now() and now() + interval '36 hours'
  union all
  -- Profil incomplet
  select 'profile_incomplete', 1::smallint, 'Complétez votre profil', 'Nom, prénoms et numéro de téléphone sont nécessaires pour réserver.',
         '/compte/profil', null::timestamptz
   where v_profile.profile_completed_at is null
  order by 2 desc, 6 asc nulls last;
end;
$$;
