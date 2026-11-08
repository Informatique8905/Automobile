-- =============================================================================
-- 1100 — Logique métier LOCATION : devis transparent, réservation atomique,
-- machine à états, paiements, caution, annulation et remboursements
-- Règle d'or : les prix sont TOUJOURS calculés ici, jamais acceptés du navigateur.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------

-- Nombre de jours facturés : tranches de 24 h, avec 1 h de tolérance au retour
create or replace function private.rental_days(p_pickup timestamptz, p_return timestamptz)
returns integer
language sql
immutable
set search_path = ''
as $$
  select greatest(1, ceil((extract(epoch from (p_return - p_pickup)) - 3600) / 86400.0))::integer;
$$;

create or replace function private.can_access_booking(p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.bookings b
     where b.id = p_booking_id
       and (b.customer_id = (select auth.uid()) or private.is_partner_member(b.partner_id))
  ) or private.is_staff();
$$;

-- Requête de recherche « commence par » pour l'autocomplétion : « toyo cor » → toyot:* & cor:*
create or replace function private.prefix_tsquery(p_text text)
returns tsquery
language sql
stable
set search_path = ''
as $$
  select case when count(*) = 0 then null
              else to_tsquery('french', string_agg(quote_literal(w) || ':*', ' & ')) end
    from regexp_split_to_table(lower(extensions.unaccent(coalesce(p_text, ''))), '[^a-z0-9]+') as w
   where length(w) >= 2;
$$;

-- -----------------------------------------------------------------------------
-- Devis de location (source unique de vérité pour l'affichage ET la réservation)
-- -----------------------------------------------------------------------------
create or replace function private.compute_rental_quote(
  p_listing_id        uuid,
  p_pickup_at         timestamptz,
  p_return_at         timestamptz,
  p_extras            jsonb default '[]'::jsonb,   -- [{"extra_id":1,"quantity":2}]
  p_insurance_plan_id integer default null,
  p_with_driver       boolean default false,
  p_with_delivery     boolean default false,
  p_promo_code        text default null,
  p_user_id           uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  l                 record;
  v_days            integer;
  v_subtotal        bigint := 0;
  v_discount_pct    numeric := 0;
  v_duration_disc   bigint := 0;
  v_extras          jsonb := '[]'::jsonb;
  v_extras_total    bigint := 0;
  e                 record;
  v_ins             record;
  v_ins_total       bigint := 0;
  v_driver_total    bigint := 0;
  v_delivery_fee    bigint := 0;
  v_base            bigint;
  v_service_rate    numeric := private.setting_numeric('service_fee_rate', 0.05);
  v_service_fee     bigint;
  v_promo           record;
  v_promo_discount  bigint := 0;
  v_promo_error     text;
  v_promo_is_platform boolean := false;
  v_promo_id        uuid;
  v_tax_rate        numeric := private.setting_numeric('vat_rate', 0.18);
  v_incl_tax        boolean := private.setting_bool('prices_include_tax', true);
  v_tax             bigint;
  v_total           bigint;
  v_available       boolean;
  v_commission_rate numeric;
  v_partner_gross   bigint;
  v_partner_payout  bigint;
  v_lines           jsonb := '[]'::jsonb;
begin
  -- Annonce, conditions et véhicule
  select li.id, li.partner_id, li.vehicle_id, li.status, li.type, li.offer_discount_pct, li.offer_ends_at,
         rt.*, ve.fleet_status
    into l
    from public.listings li
    join public.rental_terms rt on rt.listing_id = li.id
    join public.vehicles ve on ve.id = li.vehicle_id
   where li.id = p_listing_id;

  if not found or l.type <> 'rental' then
    raise exception 'LISTING_NOT_FOUND';
  end if;
  if l.status <> 'published' then
    raise exception 'LISTING_NOT_AVAILABLE';
  end if;
  if l.fleet_status in ('out_of_service', 'sold') then
    raise exception 'VEHICLE_OUT_OF_SERVICE';
  end if;
  if p_pickup_at is null or p_return_at is null or p_return_at <= p_pickup_at then
    raise exception 'INVALID_DATES';
  end if;
  if p_pickup_at < now() + make_interval(hours => l.advance_notice_hours) then
    raise exception 'PICKUP_TOO_SOON' using detail = l.advance_notice_hours::text;
  end if;

  v_days := private.rental_days(p_pickup_at, p_return_at);
  if v_days < l.min_rental_days or v_days > l.max_rental_days then
    raise exception 'DURATION_OUT_OF_RANGE' using detail = l.min_rental_days || '-' || l.max_rental_days;
  end if;

  -- Prix des journées (avec tarifs saisonniers jour par jour)
  select coalesce(sum(coalesce(sp.price_per_day, l.price_per_day)), 0)
    into v_subtotal
    from generate_series(0, v_days - 1) as g(i)
    left join public.seasonal_prices sp
      on sp.listing_id = l.listing_id
     and ((p_pickup_at at time zone 'Africa/Abidjan')::date + g.i) between sp.starts_on and sp.ends_on;

  -- Remise durée ou offre du moment (la plus avantageuse, non cumulables)
  v_discount_pct := case
    when v_days >= 28 then l.monthly_discount_pct
    when v_days >= 7 then l.weekly_discount_pct
    else 0 end;
  if l.offer_discount_pct is not null and (l.offer_ends_at is null or l.offer_ends_at > now()) then
    v_discount_pct := greatest(v_discount_pct, l.offer_discount_pct);
  end if;
  v_duration_disc := round(v_subtotal * v_discount_pct / 100.0);

  -- Options
  for e in
    select x.extra_id, x.quantity, le.price, le.max_quantity, le.is_available,
           ex.code, ex.name, ex.pricing_unit
      from (
        select (item ->> 'extra_id')::integer as extra_id,
               sum(greatest(coalesce((item ->> 'quantity')::integer, 1), 1))::integer as quantity
          from jsonb_array_elements(coalesce(p_extras, '[]'::jsonb)) as item
         group by 1
      ) x
      left join public.listing_extras le on le.listing_id = l.listing_id and le.extra_id = x.extra_id
      left join public.extras ex on ex.id = x.extra_id
  loop
    if e.price is null or not e.is_available or not coalesce((select is_active from public.extras where id = e.extra_id), false) then
      raise exception 'EXTRA_NOT_AVAILABLE' using detail = e.extra_id::text;
    end if;
    if e.quantity > e.max_quantity then
      raise exception 'EXTRA_QUANTITY_TOO_HIGH' using detail = e.extra_id::text;
    end if;
    v_extras := v_extras || jsonb_build_object(
      'extra_id', e.extra_id, 'code', e.code, 'name', e.name, 'quantity', e.quantity,
      'unit_price', e.price, 'pricing_unit', e.pricing_unit,
      'total', case e.pricing_unit when 'per_day' then e.price * e.quantity * v_days else e.price * e.quantity end
    );
    v_extras_total := v_extras_total
      + case e.pricing_unit when 'per_day' then e.price * e.quantity * v_days else e.price * e.quantity end;
  end loop;

  -- Assurance : formule choisie, sinon formule incluse par défaut
  if p_insurance_plan_id is not null then
    select * into v_ins from public.insurance_plans ip
     where ip.id = p_insurance_plan_id and ip.is_active
       and (ip.partner_id is null or ip.partner_id = l.partner_id);
    if not found then
      raise exception 'INSURANCE_PLAN_NOT_AVAILABLE';
    end if;
  else
    select * into v_ins from public.insurance_plans ip
     where ip.is_active and ip.is_included_by_default
       and (ip.partner_id is null or ip.partner_id = l.partner_id)
     order by (ip.partner_id is null), ip.sort_order
     limit 1;
  end if;
  if v_ins.id is not null then
    v_ins_total := v_ins.price_per_day * v_days;
  end if;

  -- Chauffeur et livraison
  if p_with_driver then
    if not l.with_driver_available then
      raise exception 'DRIVER_NOT_AVAILABLE';
    end if;
    v_driver_total := l.driver_price_per_day * v_days;
  end if;
  if p_with_delivery then
    if not l.delivery_available then
      raise exception 'DELIVERY_NOT_AVAILABLE';
    end if;
    v_delivery_fee := l.delivery_fee;
  end if;

  v_base := v_subtotal - v_duration_disc + v_extras_total + v_ins_total + v_driver_total + v_delivery_fee;

  -- Code promo (une erreur de code n'empêche pas d'afficher le devis)
  if nullif(trim(p_promo_code), '') is not null then
    select * into v_promo from public.promo_codes pc
     where pc.code = trim(p_promo_code)::extensions.citext;
    if not found or not v_promo.is_active then
      v_promo_error := 'PROMO_NOT_FOUND';
    elsif v_promo.starts_at > now() or (v_promo.ends_at is not null and v_promo.ends_at <= now()) then
      v_promo_error := 'PROMO_EXPIRED';
    elsif v_promo.applies_to is not null and v_promo.applies_to <> 'rental' then
      v_promo_error := 'PROMO_NOT_APPLICABLE';
    elsif v_promo.partner_id is not null and v_promo.partner_id <> l.partner_id then
      v_promo_error := 'PROMO_NOT_APPLICABLE';
    elsif v_base < v_promo.min_amount then
      v_promo_error := 'PROMO_MIN_AMOUNT';
    elsif v_promo.max_redemptions is not null and v_promo.redemptions_count >= v_promo.max_redemptions then
      v_promo_error := 'PROMO_EXHAUSTED';
    elsif p_user_id is not null and (
      select count(*) from public.promo_redemptions pr
       where pr.promo_code_id = v_promo.id and pr.user_id = p_user_id
    ) >= v_promo.max_per_user then
      v_promo_error := 'PROMO_ALREADY_USED';
    else
      v_promo_discount := case v_promo.discount_type
        when 'percent' then round((v_subtotal - v_duration_disc) * v_promo.discount_value / 100.0)
        else least(v_promo.discount_value, v_subtotal - v_duration_disc)::bigint end;
      if v_promo.max_discount is not null then
        v_promo_discount := least(v_promo_discount, v_promo.max_discount);
      end if;
      v_promo_is_platform := v_promo.partner_id is null;
      v_promo_id := v_promo.id;
    end if;
  end if;

  -- Frais de service plateforme (sur le montant avant promo)
  v_service_fee := round(v_base * v_service_rate);
  v_total := v_base - v_promo_discount + v_service_fee;

  -- TVA : incluse dans les prix affichés (par défaut) ou ajoutée
  if v_incl_tax then
    v_tax := round(v_total * v_tax_rate / (1 + v_tax_rate));
  else
    v_tax := round(v_total * v_tax_rate);
    v_total := v_total + v_tax;
  end if;

  -- Disponibilité réelle du véhicule
  v_available := not exists (
    select 1 from public.availability_blocks ab
     where ab.vehicle_id = l.vehicle_id
       and ab.period && tstzrange(p_pickup_at, p_return_at, '[)')
  );

  -- Répartition plateforme / loueur (une promo plateforme est absorbée par la plateforme)
  select coalesce(pp.commission_rate, private.setting_numeric('commission_rate', 0.15))
    into v_commission_rate
    from public.partners pa
    left join public.partner_private pp on pp.partner_id = pa.id
   where pa.id = l.partner_id;
  v_partner_gross := v_total - v_service_fee + case when v_promo_is_platform then v_promo_discount else 0 end
                     - case when v_incl_tax then 0 else v_tax end;
  v_partner_payout := v_partner_gross - round(v_partner_gross * v_commission_rate);

  -- Lignes lisibles pour l'écran récapitulatif et le contrat
  v_lines := jsonb_build_array(jsonb_build_object('code', 'days', 'label', v_days || ' jour(s) de location', 'amount', v_subtotal));
  if v_duration_disc > 0 then
    v_lines := v_lines || jsonb_build_object('code', 'duration_discount', 'label', 'Remise', 'amount', -v_duration_disc);
  end if;
  if v_extras_total > 0 then
    v_lines := v_lines || jsonb_build_object('code', 'extras', 'label', 'Options', 'amount', v_extras_total);
  end if;
  if v_ins.id is not null then
    v_lines := v_lines || jsonb_build_object('code', 'insurance', 'label', 'Assurance ' || v_ins.name, 'amount', v_ins_total);
  end if;
  if v_driver_total > 0 then
    v_lines := v_lines || jsonb_build_object('code', 'driver', 'label', 'Chauffeur', 'amount', v_driver_total);
  end if;
  if v_delivery_fee > 0 then
    v_lines := v_lines || jsonb_build_object('code', 'delivery', 'label', 'Livraison / restitution', 'amount', v_delivery_fee);
  end if;
  if v_promo_discount > 0 then
    v_lines := v_lines || jsonb_build_object('code', 'promo', 'label', 'Code promo', 'amount', -v_promo_discount);
  end if;
  v_lines := v_lines || jsonb_build_object('code', 'service_fee', 'label', 'Frais de service', 'amount', v_service_fee);
  if not v_incl_tax then
    v_lines := v_lines || jsonb_build_object('code', 'tax', 'label', 'TVA', 'amount', v_tax);
  end if;

  return jsonb_build_object(
    'listing_id', l.listing_id,
    'vehicle_id', l.vehicle_id,
    'partner_id', l.partner_id,
    'pickup_at', p_pickup_at,
    'return_at', p_return_at,
    'rental_days', v_days,
    'daily_rate', round(v_subtotal::numeric / v_days),
    'rental_subtotal', v_subtotal,
    'duration_discount_pct', v_discount_pct,
    'duration_discount', v_duration_disc,
    'extras', v_extras,
    'extras_total', v_extras_total,
    'insurance', case when v_ins.id is null then null else jsonb_build_object(
      'id', v_ins.id, 'code', v_ins.code, 'name', v_ins.name, 'level', v_ins.level,
      'price_per_day', v_ins.price_per_day, 'deductible_amount', v_ins.deductible_amount) end,
    'insurance_total', v_ins_total,
    'with_driver', coalesce(p_with_driver, false),
    'driver_total', v_driver_total,
    'with_delivery', coalesce(p_with_delivery, false),
    'delivery_fee', v_delivery_fee,
    'service_fee_rate', v_service_rate,
    'service_fee', v_service_fee,
    'promo_code', nullif(trim(p_promo_code), ''),
    'promo_code_id', v_promo_id,
    'promo_discount', v_promo_discount,
    'promo_error', v_promo_error,
    'tax_rate', v_tax_rate,
    'tax_amount', v_tax,
    'prices_include_tax', v_incl_tax,
    'total_amount', v_total,
    'deposit_amount', l.deposit_amount,
    'deposit_modes', to_jsonb(l.deposit_modes),
    'included_km_total', case when l.included_km_per_day is null then null else l.included_km_per_day * v_days end,
    'extra_km_price', l.extra_km_price,
    'fuel_policy', l.fuel_policy,
    'cancellation_policy', l.cancellation_policy,
    'is_available', v_available,
    'currency', 'XOF',
    'lines', v_lines,
    -- usage interne (retiré du devis public)
    '_commission_amount', v_total - v_partner_payout,
    '_partner_payout_amount', v_partner_payout
  );
end;
$$;

-- Devis public (page annonce, étape « Options et assurances ») — sans données internes
create or replace function public.quote_rental(
  p_listing_id        uuid,
  p_pickup_at         timestamptz,
  p_return_at         timestamptz,
  p_extras            jsonb default '[]'::jsonb,
  p_insurance_plan_id integer default null,
  p_with_driver       boolean default false,
  p_with_delivery     boolean default false,
  p_promo_code        text default null
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select private.compute_rental_quote(
           p_listing_id, p_pickup_at, p_return_at, p_extras, p_insurance_plan_id,
           p_with_driver, p_with_delivery, p_promo_code, (select auth.uid())
         ) - '_commission_amount' - '_partner_payout_amount' - 'promo_code_id';
$$;

-- Créneaux occupés d'une annonce (calendrier) — sans détail des réservations
create or replace function public.get_listing_busy_periods(
  p_listing_id uuid,
  p_from timestamptz default now(),
  p_to timestamptz default now() + interval '180 days'
)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select lower(ab.period), upper(ab.period)
    from public.listings li
    join public.availability_blocks ab on ab.vehicle_id = li.vehicle_id
   where li.id = p_listing_id
     and li.status = 'published'
     and ab.period && tstzrange(p_from, p_to, '[)')
   order by 1;
$$;

-- -----------------------------------------------------------------------------
-- Création d'une réservation (atomique : prix + calendrier + caution)
-- -----------------------------------------------------------------------------
create or replace function public.create_rental_booking(
  p_listing_id         uuid,
  p_pickup_at          timestamptz,
  p_return_at          timestamptz,
  p_extras             jsonb default '[]'::jsonb,
  p_insurance_plan_id  integer default null,
  p_with_driver        boolean default false,
  p_with_delivery      boolean default false,
  p_delivery_address   text default null,
  p_delivery_latitude  numeric default null,
  p_delivery_longitude numeric default null,
  p_promo_code         text default null,
  p_deposit_mode       public.deposit_mode default null,
  p_customer_note      text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := auth.uid();
  v_profile   public.profiles;
  v_quote     jsonb;
  v_terms     public.rental_terms;
  v_vehicle   public.vehicles;
  v_booking   public.bookings;
  v_deposit_mode public.deposit_mode;
  v_window    integer := private.setting_int('booking_payment_window_minutes', 30);
  v_pickup_loc uuid;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  select * into v_profile from public.profiles where id = v_uid;
  if v_profile.id is null or v_profile.deleted_at is not null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;
  if v_profile.is_suspended then
    raise exception 'ACCOUNT_SUSPENDED';
  end if;
  if v_profile.phone is null or v_profile.first_name is null or v_profile.last_name is null then
    raise exception 'PROFILE_INCOMPLETE';
  end if;
  if (select count(*) from public.bookings
       where customer_id = v_uid and status = 'pending_payment' and expires_at > now()) >= 3 then
    raise exception 'TOO_MANY_PENDING_BOOKINGS';
  end if;

  v_quote := private.compute_rental_quote(
    p_listing_id, p_pickup_at, p_return_at, p_extras, p_insurance_plan_id,
    p_with_driver, p_with_delivery, p_promo_code, v_uid
  );
  if v_quote ->> 'promo_error' is not null then
    raise exception 'PROMO_INVALID' using detail = v_quote ->> 'promo_error';
  end if;
  if not (v_quote ->> 'is_available')::boolean then
    raise exception 'VEHICLE_UNAVAILABLE';
  end if;
  if private.is_partner_member((v_quote ->> 'partner_id')::uuid) then
    raise exception 'CANNOT_BOOK_OWN_VEHICLE';
  end if;

  select * into v_terms from public.rental_terms where listing_id = p_listing_id;
  select * into v_vehicle from public.vehicles where id = (v_quote ->> 'vehicle_id')::uuid;

  v_deposit_mode := coalesce(p_deposit_mode, v_terms.deposit_modes[1]);
  if not (v_deposit_mode = any (v_terms.deposit_modes)) then
    raise exception 'DEPOSIT_MODE_NOT_ALLOWED';
  end if;
  if p_with_delivery and nullif(trim(p_delivery_address), '') is null then
    raise exception 'DELIVERY_ADDRESS_REQUIRED';
  end if;
  v_pickup_loc := coalesce(v_terms.pickup_location_id, v_vehicle.home_location_id);

  insert into public.bookings (
    listing_id, vehicle_id, partner_id, customer_id, status,
    pickup_at, return_at, rental_days,
    pickup_kind, pickup_location_id, pickup_address, pickup_latitude, pickup_longitude,
    return_kind, return_location_id, return_address, return_latitude, return_longitude,
    insurance_plan_id, with_driver, with_delivery, promo_code_id,
    daily_rate, rental_subtotal, duration_discount, extras_total, insurance_total, driver_total,
    delivery_fee, service_fee, promo_discount, tax_rate, tax_amount, prices_include_tax, total_amount,
    commission_amount, partner_payout_amount, price_breakdown,
    deposit_amount, deposit_mode, included_km_total, extra_km_price, fuel_policy, cancellation_policy,
    customer_note, expires_at
  ) values (
    p_listing_id, v_vehicle.id, v_vehicle.partner_id, v_uid, 'pending_payment',
    p_pickup_at, p_return_at, (v_quote ->> 'rental_days')::integer,
    case when p_with_delivery then 'customer_address' else 'agency' end::public.location_kind,
    case when p_with_delivery then null else v_pickup_loc end,
    case when p_with_delivery then p_delivery_address end, p_delivery_latitude, p_delivery_longitude,
    case when p_with_delivery then 'customer_address' else 'agency' end::public.location_kind,
    case when p_with_delivery then null else v_pickup_loc end,
    case when p_with_delivery then p_delivery_address end, p_delivery_latitude, p_delivery_longitude,
    (v_quote -> 'insurance' ->> 'id')::integer, coalesce(p_with_driver, false), coalesce(p_with_delivery, false),
    (v_quote ->> 'promo_code_id')::uuid,
    (v_quote ->> 'daily_rate')::bigint, (v_quote ->> 'rental_subtotal')::bigint, (v_quote ->> 'duration_discount')::bigint,
    (v_quote ->> 'extras_total')::bigint, (v_quote ->> 'insurance_total')::bigint, (v_quote ->> 'driver_total')::bigint,
    (v_quote ->> 'delivery_fee')::bigint, (v_quote ->> 'service_fee')::bigint, (v_quote ->> 'promo_discount')::bigint,
    (v_quote ->> 'tax_rate')::numeric, (v_quote ->> 'tax_amount')::bigint, (v_quote ->> 'prices_include_tax')::boolean,
    (v_quote ->> 'total_amount')::bigint,
    (v_quote ->> '_commission_amount')::bigint, (v_quote ->> '_partner_payout_amount')::bigint,
    v_quote - '_commission_amount' - '_partner_payout_amount',
    (v_quote ->> 'deposit_amount')::bigint, v_deposit_mode,
    (v_quote ->> 'included_km_total')::integer, (v_quote ->> 'extra_km_price')::bigint,
    (v_quote ->> 'fuel_policy')::public.fuel_policy, (v_quote ->> 'cancellation_policy')::public.cancellation_policy,
    left(p_customer_note, 1000), now() + make_interval(mins => v_window)
  )
  returning * into v_booking;

  insert into public.booking_extras (booking_id, extra_id, quantity, unit_price, pricing_unit, total)
  select v_booking.id, (x ->> 'extra_id')::integer, (x ->> 'quantity')::smallint,
         (x ->> 'unit_price')::bigint, (x ->> 'pricing_unit')::public.extra_pricing_unit, (x ->> 'total')::bigint
    from jsonb_array_elements(v_quote -> 'extras') as x;

  -- Bloque le calendrier (la contrainte d'exclusion empêche toute double réservation)
  begin
    insert into public.availability_blocks (vehicle_id, period, kind, booking_id, created_by)
    values (v_vehicle.id, tstzrange(p_pickup_at, p_return_at, '[)'), 'booking', v_booking.id, v_uid);
  exception when exclusion_violation then
    raise exception 'VEHICLE_UNAVAILABLE';
  end;

  if v_booking.deposit_amount > 0 then
    insert into public.deposits (booking_id, amount, mode) values (v_booking.id, v_booking.deposit_amount, v_deposit_mode);
  end if;

  insert into public.booking_drivers (booking_id, user_id, full_name, date_of_birth, is_primary, verification_status)
  values (
    v_booking.id, v_uid, v_profile.first_name || ' ' || v_profile.last_name, v_profile.date_of_birth, true,
    case when v_profile.kyc_status = 'approved' then 'approved' else 'pending' end::public.verification_status
  );

  insert into public.listing_stats_daily (listing_id, day, booking_requests)
  values (p_listing_id, (now() at time zone 'Africa/Abidjan')::date, 1)
  on conflict (listing_id, day) do update set booking_requests = public.listing_stats_daily.booking_requests + 1;

  perform private.enqueue_ai_job('booking_risk_scoring', 'booking', v_booking.id, 1::smallint);

  return jsonb_build_object(
    'booking_id', v_booking.id,
    'reference', v_booking.reference,
    'status', v_booking.status,
    'total_amount', v_booking.total_amount,
    'deposit_amount', v_booking.deposit_amount,
    'deposit_mode', v_booking.deposit_mode,
    'expires_at', v_booking.expires_at,
    'kyc_required', v_profile.kyc_status <> 'approved'
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Machine à états des réservations
-- -----------------------------------------------------------------------------
create or replace function private.booking_transition_allowed(
  p_from public.booking_status, p_to public.booking_status
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_from
    when 'pending_payment' then p_to in ('pending_confirmation', 'confirmed', 'cancelled_by_customer', 'cancelled_by_admin', 'expired')
    when 'pending_confirmation' then p_to in ('confirmed', 'declined', 'cancelled_by_customer', 'cancelled_by_admin', 'expired')
    when 'confirmed' then p_to in ('in_progress', 'cancelled_by_customer', 'cancelled_by_partner', 'cancelled_by_admin')
    when 'in_progress' then p_to in ('completed', 'disputed')
    when 'completed' then p_to in ('disputed')
    when 'disputed' then p_to in ('completed', 'cancelled_by_admin')
    else false
  end;
$$;

create or replace function private.bookings_before_status_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if not private.booking_transition_allowed(old.status, new.status) then
      raise exception 'INVALID_BOOKING_TRANSITION' using detail = old.status || ' → ' || new.status;
    end if;
    case new.status
      when 'confirmed' then new.confirmed_at := coalesce(new.confirmed_at, now()); new.expires_at := null;
      when 'in_progress' then new.started_at := coalesce(new.started_at, now());
      when 'completed' then new.completed_at := coalesce(new.completed_at, now());
      when 'cancelled_by_customer', 'cancelled_by_partner', 'cancelled_by_admin', 'declined', 'expired' then
        new.cancelled_at := coalesce(new.cancelled_at, now());
        new.cancelled_by := coalesce(new.cancelled_by, (select auth.uid()));
      else null;
    end case;
  end if;
  -- Les prix sont figés : aucune modification après création
  if new.total_amount is distinct from old.total_amount
     or new.rental_subtotal is distinct from old.rental_subtotal
     or new.pickup_at is distinct from old.pickup_at
     or new.return_at is distinct from old.return_at then
    raise exception 'BOOKING_PRICE_LOCKED';
  end if;
  return new;
end;
$$;

create trigger bookings_before_status_change
  before update on public.bookings
  for each row execute function private.bookings_before_status_change();

create or replace function private.bookings_after_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conv uuid;
  v_title text;
begin
  if tg_op = 'INSERT' then
    insert into public.booking_status_history (booking_id, from_status, to_status, changed_by)
    values (new.id, null, new.status, new.customer_id);
    return null;
  end if;

  if new.status is not distinct from old.status then
    return null;
  end if;

  insert into public.booking_status_history (booking_id, from_status, to_status, changed_by, reason)
  values (new.id, old.status, new.status, (select auth.uid()), new.cancellation_reason);

  select title into v_title from public.listings where id = new.listing_id;

  -- Libère le calendrier et la caution quand la réservation n'aura pas lieu
  if new.status in ('cancelled_by_customer', 'cancelled_by_partner', 'cancelled_by_admin', 'declined', 'expired') then
    delete from public.availability_blocks where booking_id = new.id;
    update public.deposits set status = 'released', released_at = now()
     where booking_id = new.id and status in ('pending', 'authorized') and mode <> 'refundable_payment';
    update public.deposits set status = 'expired'
     where booking_id = new.id and status = 'pending';
  end if;

  case new.status
    when 'pending_confirmation' then
      perform private.notify_partner(new.partner_id, 'booking', 'booking.request',
        'Nouvelle demande de réservation', v_title || ' — ' || new.reference,
        '/partenaire/reservations/' || new.id, jsonb_build_object('booking_id', new.id), 2::smallint);
      perform private.notify_user(new.customer_id, 'booking', 'booking.paid',
        'Paiement reçu', 'Votre demande pour ' || v_title || ' attend la confirmation du loueur.',
        '/compte/reservations/' || new.id, jsonb_build_object('booking_id', new.id));
    when 'confirmed' then
      -- Fil de discussion dédié à la réservation
      insert into public.conversations (subject, booking_id, listing_id, customer_id, partner_id)
      values ('booking', new.id, new.listing_id, new.customer_id, new.partner_id)
      on conflict (booking_id) where subject = 'booking' do nothing
      returning id into v_conv;
      if v_conv is not null then
        insert into public.messages (conversation_id, kind, body)
        values (v_conv, 'system', 'Réservation ' || new.reference || ' confirmée. Vous pouvez échanger ici avec votre interlocuteur.');
      end if;
      perform private.notify_user(new.customer_id, 'booking', 'booking.confirmed',
        'Réservation confirmée', v_title || ' — ' || new.reference,
        '/compte/reservations/' || new.id, jsonb_build_object('booking_id', new.id), 2::smallint);
      perform private.notify_partner(new.partner_id, 'booking', 'booking.confirmed',
        'Réservation confirmée', v_title || ' — ' || new.reference,
        '/partenaire/reservations/' || new.id, jsonb_build_object('booking_id', new.id));
    when 'in_progress' then
      update public.vehicles set fleet_status = 'rented' where id = new.vehicle_id;
    when 'completed' then
      update public.vehicles set fleet_status = 'available'
       where id = new.vehicle_id and fleet_status = 'rented';
      update public.partners set completed_bookings = completed_bookings + 1 where id = new.partner_id;
      perform private.notify_user(new.customer_id, 'reminder', 'review.request',
        'Comment s''est passée votre location ?', 'Laissez un avis sur ' || v_title,
        '/compte/reservations/' || new.id || '/avis', jsonb_build_object('booking_id', new.id));
    when 'declined' then
      perform private.notify_user(new.customer_id, 'booking', 'booking.declined',
        'Demande refusée', 'Le loueur n''a pas pu accepter votre demande. Vous êtes intégralement remboursé.',
        '/compte/reservations/' || new.id, jsonb_build_object('booking_id', new.id), 1::smallint);
    when 'cancelled_by_customer' then
      perform private.notify_partner(new.partner_id, 'booking', 'booking.cancelled',
        'Réservation annulée par le client', v_title || ' — ' || new.reference,
        '/partenaire/reservations/' || new.id, jsonb_build_object('booking_id', new.id), 1::smallint);
    when 'cancelled_by_partner', 'cancelled_by_admin' then
      perform private.notify_user(new.customer_id, 'booking', 'booking.cancelled',
        'Réservation annulée', v_title || ' — ' || new.reference || '. Vous êtes intégralement remboursé.',
        '/compte/reservations/' || new.id, jsonb_build_object('booking_id', new.id), 2::smallint);
    when 'expired' then
      perform private.notify_user(new.customer_id, 'booking', 'booking.expired',
        'Réservation expirée', v_title || ' — ' || new.reference,
        '/compte/reservations/' || new.id, jsonb_build_object('booking_id', new.id));
    else null;
  end case;
  return null;
end;
$$;

create trigger bookings_after_change
  after insert or update of status on public.bookings
  for each row execute function private.bookings_after_change();

-- -----------------------------------------------------------------------------
-- Paiements
-- -----------------------------------------------------------------------------

-- Crée (ou retrouve) le paiement à envoyer à Jeko. Idempotent.
create or replace function public.create_booking_payment(
  p_booking_id uuid,
  p_purpose public.payment_purpose default 'rental'
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_payment public.payments;
  v_amount bigint;
  v_key text;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if v_booking.id is null or v_booking.customer_id is distinct from auth.uid() then
    raise exception 'BOOKING_NOT_FOUND';
  end if;

  if p_purpose = 'rental' then
    if v_booking.status <> 'pending_payment' then
      raise exception 'BOOKING_NOT_PAYABLE';
    end if;
    if v_booking.expires_at < now() then
      raise exception 'BOOKING_EXPIRED';
    end if;
    v_amount := v_booking.total_amount;
  elsif p_purpose = 'deposit' then
    if v_booking.deposit_mode <> 'refundable_payment' or v_booking.deposit_amount = 0 then
      raise exception 'DEPOSIT_NOT_PAYABLE_ONLINE';
    end if;
    if v_booking.status not in ('pending_payment', 'pending_confirmation', 'confirmed') then
      raise exception 'BOOKING_NOT_PAYABLE';
    end if;
    v_amount := v_booking.deposit_amount;
  else
    raise exception 'UNSUPPORTED_PAYMENT_PURPOSE';
  end if;

  v_key := 'booking:' || p_booking_id || ':' || p_purpose;
  select * into v_payment from public.payments
   where idempotency_key = v_key and status in ('initiated', 'pending', 'succeeded');
  if v_payment.id is null then
    -- Un essai précédent échoué/annulé : nouvelle clé suffixée
    if exists (select 1 from public.payments where idempotency_key = v_key) then
      v_key := v_key || ':' || private.random_code(6);
    end if;
    insert into public.payments (payer_id, booking_id, purpose, amount, idempotency_key)
    values (v_booking.customer_id, p_booking_id, p_purpose, v_amount, v_key)
    returning * into v_payment;
  end if;

  return jsonb_build_object(
    'payment_id', v_payment.id, 'reference', v_payment.reference, 'amount', v_payment.amount,
    'currency', v_payment.currency, 'status', v_payment.status, 'provider_payment_url', v_payment.provider_payment_url
  );
end;
$$;

-- Appelée par le serveur après vérification de la signature du webhook Jeko (préférer handle_jeko_payment_success, qui contrôle aussi le montant)
create or replace function public.handle_payment_success(
  p_payment_id              uuid,
  p_provider_transaction_id text,
  p_method                  public.payment_method,
  p_payload                 jsonb default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_payment public.payments;
  v_booking public.bookings;
  v_instant boolean;
  v_sr public.sale_reservations;
  v_hold smallint;
  v_tax bigint;
  v_result text := 'ok';
begin
  select * into v_payment from public.payments where id = p_payment_id for update;
  if v_payment.id is null then
    raise exception 'PAYMENT_NOT_FOUND';
  end if;
  if v_payment.status = 'succeeded' then
    return jsonb_build_object('status', 'already_processed', 'payment_id', v_payment.id);
  end if;

  update public.payments
     set status = 'succeeded', paid_at = now(), method = p_method,
         provider_transaction_id = p_provider_transaction_id,
         provider_payload = coalesce(p_payload, provider_payload)
   where id = p_payment_id;

  if v_payment.booking_id is not null and v_payment.purpose = 'rental' then
    select * into v_booking from public.bookings where id = v_payment.booking_id for update;

    -- Paiement arrivé trop tard (réservation expirée ou annulée) : remboursement automatique
    if v_booking.status <> 'pending_payment' then
      insert into public.refunds (payment_id, amount, reason)
      values (p_payment_id, v_payment.amount, 'Paiement reçu sur une réservation non payable (' || v_booking.status || ')');
      return jsonb_build_object('status', 'refund_created', 'payment_id', p_payment_id);
    end if;

    select instant_booking into v_instant from public.listings where id = v_booking.listing_id;
    update public.bookings
       set paid_at = now(),
           status = case when v_instant then 'confirmed' else 'pending_confirmation' end::public.booking_status,
           expires_at = case when v_instant then null
                             else now() + make_interval(hours => private.setting_int('partner_response_hours', 24)) end
     where id = v_booking.id;

    if v_booking.promo_code_id is not null then
      insert into public.promo_redemptions (promo_code_id, user_id, booking_id, discount_amount)
      values (v_booking.promo_code_id, v_booking.customer_id, v_booking.id, v_booking.promo_discount)
      on conflict (booking_id) do nothing;
      update public.promo_codes set redemptions_count = redemptions_count + 1 where id = v_booking.promo_code_id;
    end if;

    -- Facture (le PDF est généré ensuite par le serveur)
    v_tax := v_booking.tax_amount;
    insert into public.invoices (number, booking_id, payment_id, customer_id, partner_id,
                                 amount_ht, tax_rate, tax_amount, amount_ttc, line_items)
    values (private.next_invoice_number(), v_booking.id, p_payment_id, v_booking.customer_id, v_booking.partner_id,
            v_booking.total_amount - v_tax, v_booking.tax_rate, v_tax, v_booking.total_amount,
            coalesce(v_booking.price_breakdown -> 'lines', '[]'::jsonb));
    v_result := case when v_instant then 'confirmed' else 'pending_confirmation' end;

  elsif v_payment.booking_id is not null and v_payment.purpose = 'deposit' then
    update public.deposits
       set status = 'authorized', payment_id = p_payment_id, authorized_at = now()
     where booking_id = v_payment.booking_id;
    v_result := 'deposit_held';

  elsif v_payment.sale_reservation_id is not null then
    select * into v_sr from public.sale_reservations where id = v_payment.sale_reservation_id for update;
    if v_sr.status <> 'pending_payment' then
      insert into public.refunds (payment_id, amount, reason)
      values (p_payment_id, v_payment.amount, 'Acompte reçu sur une réservation inactive');
      return jsonb_build_object('status', 'refund_created', 'payment_id', p_payment_id);
    end if;
    select st.reservation_hold_days into v_hold from public.sale_terms st where st.listing_id = v_sr.listing_id;
    update public.sale_reservations
       set status = 'active', paid_at = now(), expires_at = now() + make_interval(days => coalesce(v_hold, 3))
     where id = v_sr.id;
    perform private.notify_partner(v_sr.partner_id, 'booking', 'sale_reservation.active',
      'Acompte reçu', 'Un acheteur a réservé votre véhicule (' || v_sr.reference || ').',
      '/partenaire/ventes/' || v_sr.id, jsonb_build_object('sale_reservation_id', v_sr.id), 2::smallint);
    perform private.notify_user(v_sr.buyer_id, 'payment', 'sale_reservation.active',
      'Véhicule réservé', 'Votre acompte est confirmé. Le véhicule vous est réservé ' || coalesce(v_hold, 3) || ' jours.',
      '/compte/achats/' || v_sr.id, jsonb_build_object('sale_reservation_id', v_sr.id));
    v_result := 'sale_reserved';
  end if;

  return jsonb_build_object('status', v_result, 'payment_id', p_payment_id);
end;
$$;

create or replace function public.handle_payment_failure(p_payment_id uuid, p_reason text, p_payload jsonb default null)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.payments
     set status = 'failed', failure_reason = left(p_reason, 500), provider_payload = coalesce(p_payload, provider_payload)
   where id = p_payment_id and status in ('initiated', 'pending');
$$;

-- Empreinte bancaire de la caution enregistrée par le serveur (carte)
create or replace function public.record_deposit_authorization(
  p_booking_id uuid, p_authorization_reference text, p_expires_at timestamptz
)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.deposits
     set status = 'authorized', authorization_reference = p_authorization_reference,
         authorized_at = now(), authorization_expires_at = p_expires_at
   where booking_id = p_booking_id and mode = 'card_preauthorization' and status = 'pending';
$$;

-- Résultat d'un remboursement (serveur)
create or replace function public.handle_refund_result(
  p_refund_id uuid, p_success boolean, p_provider_reference text default null, p_error text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_refund public.refunds;
  v_payment public.payments;
begin
  select * into v_refund from public.refunds where id = p_refund_id for update;
  if v_refund.id is null or v_refund.status = 'succeeded' then
    return;
  end if;
  if not p_success then
    update public.refunds set status = 'failed', failure_reason = left(p_error, 500), processed_at = now() where id = p_refund_id;
    return;
  end if;
  update public.refunds set status = 'succeeded', provider_reference = p_provider_reference, processed_at = now()
   where id = p_refund_id;
  update public.payments
     set refunded_amount = least(amount, refunded_amount + v_refund.amount),
         status = case when refunded_amount + v_refund.amount >= amount then 'refunded' else 'partially_refunded' end::public.payment_status
   where id = v_refund.payment_id
  returning * into v_payment;
  if v_payment.booking_id is not null and v_payment.purpose = 'rental' then
    update public.bookings set refund_amount = refund_amount + v_refund.amount where id = v_payment.booking_id;
  elsif v_payment.booking_id is not null and v_payment.purpose = 'deposit' then
    update public.deposits set status = 'refunded', refunded_at = now() where booking_id = v_payment.booking_id;
  elsif v_payment.sale_reservation_id is not null then
    update public.sale_reservations set status = 'refunded', refunded_at = now()
     where id = v_payment.sale_reservation_id and status in ('active', 'expired', 'cancelled');
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Annulation et remboursement selon la politique d'annulation
--   flexible       : 100 % si ≥ 24 h avant, sinon 50 %
--   moderate       : 100 % si ≥ 72 h, 50 % si ≥ 24 h, sinon 0
--   strict         : 50 % si ≥ 7 jours, sinon 0
--   non_refundable : 0
-- Frais de service non remboursés, sauf annulation par le loueur ou la plateforme (100 %).
-- -----------------------------------------------------------------------------
create or replace function private.compute_refund_amount(p_booking public.bookings, p_by_customer boolean)
returns bigint
language plpgsql
stable
set search_path = ''
as $$
declare
  v_hours numeric := extract(epoch from (p_booking.pickup_at - now())) / 3600.0;
  v_pct numeric;
begin
  if p_booking.paid_at is null then
    return 0;
  end if;
  if not p_by_customer then
    return p_booking.total_amount;
  end if;
  v_pct := case p_booking.cancellation_policy
    when 'flexible' then case when v_hours >= 24 then 1 else 0.5 end
    when 'moderate' then case when v_hours >= 72 then 1 when v_hours >= 24 then 0.5 else 0 end
    when 'strict' then case when v_hours >= 168 then 0.5 else 0 end
    else 0 end;
  -- Avant acceptation par le loueur : remboursement intégral hors frais de service
  if p_booking.status = 'pending_confirmation' then
    v_pct := 1;
  end if;
  return round((p_booking.total_amount - p_booking.service_fee) * v_pct);
end;
$$;

create or replace function public.cancel_booking(p_booking_id uuid, p_reason text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_booking public.bookings;
  v_new_status public.booking_status;
  v_refund bigint;
  v_payment_id uuid;
  v_deposit public.deposits;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if v_booking.id is null then
    raise exception 'BOOKING_NOT_FOUND';
  end if;

  if v_booking.customer_id = v_uid then
    v_new_status := 'cancelled_by_customer';
  elsif private.is_partner_manager(v_booking.partner_id) then
    v_new_status := 'cancelled_by_partner';
  elsif private.is_staff() then
    v_new_status := 'cancelled_by_admin';
  else
    raise exception 'FORBIDDEN';
  end if;

  if not private.booking_transition_allowed(v_booking.status, v_new_status) then
    raise exception 'BOOKING_NOT_CANCELLABLE' using detail = v_booking.status::text;
  end if;
  if v_new_status = 'cancelled_by_partner' and nullif(trim(p_reason), '') is null then
    raise exception 'REASON_REQUIRED';
  end if;

  v_refund := private.compute_refund_amount(v_booking, v_new_status = 'cancelled_by_customer');

  update public.bookings
     set status = v_new_status, cancellation_reason = left(p_reason, 1000), cancelled_by = v_uid
   where id = p_booking_id;

  if v_refund > 0 then
    select id into v_payment_id from public.payments
     where booking_id = p_booking_id and purpose = 'rental' and status = 'succeeded'
     order by paid_at desc limit 1;
    if v_payment_id is not null then
      insert into public.refunds (payment_id, amount, reason, requested_by)
      values (v_payment_id, v_refund, 'Annulation ' || v_new_status, v_uid);
    end if;
  end if;

  -- Caution versée en Mobile Money : remboursement intégral
  select * into v_deposit from public.deposits where booking_id = p_booking_id;
  if v_deposit.mode = 'refundable_payment' and v_deposit.status = 'authorized' and v_deposit.payment_id is not null then
    insert into public.refunds (payment_id, amount, reason, requested_by)
    values (v_deposit.payment_id, v_deposit.amount, 'Restitution de caution (annulation)', v_uid);
    update public.deposits set status = 'released', released_at = now() where id = v_deposit.id;
  end if;

  -- Une annulation par le loueur pèse sur sa réputation
  if v_new_status = 'cancelled_by_partner' then
    insert into public.fraud_signals (partner_id, booking_id, signal_type, severity, details)
    values (v_booking.partner_id, p_booking_id, 'partner_cancellation', 2,
            jsonb_build_object('hours_before_pickup', round(extract(epoch from (v_booking.pickup_at - now())) / 3600)));
  end if;

  return jsonb_build_object('status', v_new_status, 'refund_amount', v_refund);
end;
$$;

-- Le loueur accepte ou refuse une demande (réservation sans confirmation instantanée)
create or replace function public.respond_to_booking(p_booking_id uuid, p_accept boolean, p_reason text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_payment_id uuid;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if v_booking.id is null or not private.is_partner_member(v_booking.partner_id) then
    raise exception 'BOOKING_NOT_FOUND';
  end if;
  if v_booking.status <> 'pending_confirmation' then
    raise exception 'BOOKING_NOT_PENDING';
  end if;

  if p_accept then
    update public.bookings set status = 'confirmed' where id = p_booking_id;
  else
    update public.bookings set status = 'declined', cancellation_reason = left(p_reason, 1000) where id = p_booking_id;
    select id into v_payment_id from public.payments
     where booking_id = p_booking_id and purpose = 'rental' and status = 'succeeded' limit 1;
    if v_payment_id is not null then
      insert into public.refunds (payment_id, amount, reason, requested_by)
      values (v_payment_id, v_booking.total_amount, 'Demande refusée par le loueur', auth.uid());
    end if;
    insert into public.fraud_signals (partner_id, booking_id, signal_type, severity)
    values (v_booking.partner_id, p_booking_id, 'partner_declined', 1);
  end if;
  return jsonb_build_object('status', case when p_accept then 'confirmed' else 'declined' end);
end;
$$;

-- -----------------------------------------------------------------------------
-- Remise du véhicule (scan du QR code) et retour
-- -----------------------------------------------------------------------------
create or replace function public.start_booking(p_booking_id uuid, p_qr_token text, p_mileage_start integer)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_terms public.rental_terms;
  v_profile public.profiles;
  v_age integer;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if v_booking.id is null or not private.is_partner_member(v_booking.partner_id) then
    raise exception 'BOOKING_NOT_FOUND';
  end if;
  if v_booking.status <> 'confirmed' then
    raise exception 'BOOKING_NOT_CONFIRMED';
  end if;
  if p_qr_token is null or p_qr_token <> v_booking.pickup_qr_token then
    raise exception 'INVALID_QR_CODE';
  end if;
  if now() < v_booking.pickup_at - interval '12 hours' then
    raise exception 'PICKUP_TOO_EARLY';
  end if;

  -- Vérifications conducteur : identité validée, permis valide, âge et ancienneté du permis
  select * into v_terms from public.rental_terms where listing_id = v_booking.listing_id;
  select * into v_profile from public.profiles where id = v_booking.customer_id;
  if v_profile.kyc_status <> 'approved' then
    raise exception 'DRIVER_NOT_VERIFIED';
  end if;
  if v_profile.driver_license_expires_on is not null and v_profile.driver_license_expires_on < v_booking.return_at::date then
    raise exception 'DRIVER_LICENSE_EXPIRED';
  end if;
  if v_profile.date_of_birth is not null then
    v_age := extract(year from age(v_booking.pickup_at::date, v_profile.date_of_birth));
    if v_age < v_terms.min_driver_age then
      raise exception 'DRIVER_TOO_YOUNG' using detail = v_terms.min_driver_age::text;
    end if;
  end if;
  if v_profile.driver_license_issued_on is not null
     and v_profile.driver_license_issued_on > (v_booking.pickup_at - make_interval(years => v_terms.min_license_years))::date then
    raise exception 'DRIVER_LICENSE_TOO_RECENT' using detail = v_terms.min_license_years::text;
  end if;

  update public.bookings set status = 'in_progress', mileage_start = p_mileage_start where id = p_booking_id;
  return jsonb_build_object('status', 'in_progress');
end;
$$;

create or replace function public.complete_booking(p_booking_id uuid, p_mileage_end integer)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_driven integer;
  v_extra_km integer := 0;
  v_charge bigint := 0;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if v_booking.id is null or not private.is_partner_member(v_booking.partner_id) then
    raise exception 'BOOKING_NOT_FOUND';
  end if;
  if v_booking.status <> 'in_progress' then
    raise exception 'BOOKING_NOT_IN_PROGRESS';
  end if;
  if p_mileage_end < coalesce(v_booking.mileage_start, 0) then
    raise exception 'INVALID_MILEAGE';
  end if;

  v_driven := p_mileage_end - coalesce(v_booking.mileage_start, p_mileage_end);
  if v_booking.included_km_total is not null and v_driven > v_booking.included_km_total then
    v_extra_km := v_driven - v_booking.included_km_total;
    v_charge := v_extra_km * v_booking.extra_km_price;
  end if;

  update public.bookings
     set status = 'completed', mileage_end = p_mileage_end, extra_km_charge = v_charge
   where id = p_booking_id;
  update public.vehicles set mileage_km = greatest(mileage_km, p_mileage_end) where id = v_booking.vehicle_id;

  return jsonb_build_object('status', 'completed', 'km_driven', v_driven, 'extra_km', v_extra_km, 'extra_km_charge', v_charge);
end;
$$;

-- Signature de l'état des lieux par le client ou le loueur
create or replace function public.sign_inspection(p_inspection_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  select b.* into v_booking
    from public.vehicle_inspections vi join public.bookings b on b.id = vi.booking_id
   where vi.id = p_inspection_id;
  if v_booking.id is null then
    raise exception 'INSPECTION_NOT_FOUND';
  end if;
  if v_booking.customer_id = auth.uid() then
    update public.vehicle_inspections set customer_signed_at = coalesce(customer_signed_at, now()) where id = p_inspection_id;
  elsif private.is_partner_member(v_booking.partner_id) then
    update public.vehicle_inspections set partner_signed_at = coalesce(partner_signed_at, now()) where id = p_inspection_id;
  else
    raise exception 'FORBIDDEN';
  end if;
end;
$$;

-- Coordonnées de l'autre partie, uniquement pour une réservation confirmée ou en cours
create or replace function public.get_booking_contacts(p_booking_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_result jsonb;
begin
  select * into v_booking from public.bookings where id = p_booking_id;
  if v_booking.id is null or not private.can_access_booking(p_booking_id) then
    raise exception 'BOOKING_NOT_FOUND';
  end if;
  if v_booking.status not in ('confirmed', 'in_progress') and not private.is_staff() then
    raise exception 'CONTACTS_NOT_AVAILABLE';
  end if;
  select jsonb_build_object(
    'customer', jsonb_build_object('first_name', pr.first_name, 'last_name', pr.last_name, 'phone', pr.phone),
    'partner', jsonb_build_object('name', pa.display_name, 'phone', pp.contact_phone, 'whatsapp', pp.whatsapp_phone),
    'pickup', jsonb_build_object(
      'kind', v_booking.pickup_kind, 'address', coalesce(v_booking.pickup_address, loc.address_line),
      'latitude', coalesce(v_booking.pickup_latitude, loc.latitude), 'longitude', coalesce(v_booking.pickup_longitude, loc.longitude),
      'location_name', loc.name, 'opening_hours', loc.opening_hours)
  ) into v_result
    from public.profiles pr
    join public.partners pa on pa.id = v_booking.partner_id
    left join public.partner_private pp on pp.partner_id = pa.id
    left join public.partner_locations loc on loc.id = v_booking.pickup_location_id
   where pr.id = v_booking.customer_id;
  return v_result;
end;
$$;

-- -----------------------------------------------------------------------------
-- Tâches planifiées (cron) — exécution serveur uniquement
-- -----------------------------------------------------------------------------
create or replace function public.expire_stale_bookings()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  r record;
  v_count integer := 0;
  v_payment_id uuid;
begin
  for r in
    select * from public.bookings
     where status in ('pending_payment', 'pending_confirmation') and expires_at < now()
     for update skip locked
  loop
    update public.bookings set status = 'expired' where id = r.id;
    if r.status = 'pending_confirmation' then
      select id into v_payment_id from public.payments
       where booking_id = r.id and purpose = 'rental' and status = 'succeeded' limit 1;
      if v_payment_id is not null then
        insert into public.refunds (payment_id, amount, reason)
        values (v_payment_id, r.total_amount, 'Demande non traitée par le loueur dans les délais');
      end if;
      insert into public.fraud_signals (partner_id, booking_id, signal_type, severity)
      values (r.partner_id, r.id, 'partner_no_response', 2);
    end if;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- Libère les cautions quelques heures après le retour, s'il n'y a pas de litige
create or replace function public.release_due_deposits()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  r record;
  v_count integer := 0;
  v_hold integer := private.setting_int('deposit_hold_hours_after_return', 72);
begin
  for r in
    select d.* from public.deposits d
      join public.bookings b on b.id = d.booking_id
     where d.status = 'authorized'
       and b.status = 'completed'
       and b.completed_at < now() - make_interval(hours => v_hold)
       and not exists (
         select 1 from public.disputes di
          where di.booking_id = b.id and di.status in ('open', 'awaiting_evidence', 'under_review'))
     for update of d skip locked
  loop
    if r.mode = 'refundable_payment' and r.payment_id is not null then
      insert into public.refunds (payment_id, amount, reason)
      values (r.payment_id, r.amount - r.captured_amount, 'Restitution de caution');
    end if;
    update public.deposits set status = 'released', released_at = now() where id = r.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
