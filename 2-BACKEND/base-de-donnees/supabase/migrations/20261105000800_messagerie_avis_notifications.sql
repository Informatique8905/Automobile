-- =============================================================================
-- 0800 — Messagerie contextuelle (une boîte, des fils centrés sur l'objet),
-- avis et notes, notifications multicanal
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Conversations : toujours rattachées à un objet (annonce, réservation, essai…)
-- -----------------------------------------------------------------------------
create table public.conversations (
  id                       uuid primary key default gen_random_uuid(),
  subject                  public.conversation_subject not null,
  listing_id               uuid references public.listings(id) on delete set null,
  booking_id               uuid references public.bookings(id) on delete cascade,
  test_drive_id            uuid references public.test_drives(id) on delete cascade,
  sale_reservation_id      uuid references public.sale_reservations(id) on delete cascade,
  customer_id              uuid not null references public.profiles(id) on delete cascade,
  partner_id               uuid not null references public.partners(id) on delete cascade,
  status                   text not null default 'open' check (status in ('open', 'closed', 'blocked')),
  last_message_at          timestamptz,
  last_message_preview     text,
  first_customer_message_at timestamptz,
  first_partner_reply_at   timestamptz,           -- sert au calcul du taux / délai de réponse
  created_at               timestamptz not null default now(),
  check (
    (subject = 'listing' and listing_id is not null) or
    (subject = 'booking' and booking_id is not null) or
    (subject = 'test_drive' and test_drive_id is not null) or
    (subject = 'sale_reservation' and sale_reservation_id is not null) or
    (subject = 'dispute' and booking_id is not null)
  )
);
create unique index conversations_listing_unique on public.conversations(listing_id, customer_id) where subject = 'listing';
create unique index conversations_booking_unique on public.conversations(booking_id) where subject = 'booking';
create unique index conversations_test_drive_unique on public.conversations(test_drive_id) where subject = 'test_drive';
create index conversations_customer_idx on public.conversations(customer_id, last_message_at desc nulls last);
create index conversations_partner_idx on public.conversations(partner_id, last_message_at desc nulls last);

-- État de lecture par utilisateur
create table public.conversation_reads (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  last_read_at    timestamptz not null default now(),
  is_muted        boolean not null default false,
  is_archived     boolean not null default false,
  primary key (conversation_id, user_id)
);

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid references public.profiles(id) on delete set null,   -- null = message système
  kind            public.message_kind not null default 'text',
  body            text not null check (char_length(body) between 1 and 5000),
  -- [{"path":"{conversation_id}/x.jpg","mime":"image/jpeg","size":12345}]
  attachments     jsonb not null default '[]'::jsonb check (jsonb_typeof(attachments) = 'array'),
  status          public.content_status not null default 'visible',
  risk_flags      text[] not null default '{}',   -- ex. {off_platform_payment, phone_number}
  created_at      timestamptz not null default now(),
  edited_at       timestamptz,
  deleted_at      timestamptz,
  check (kind = 'system' or sender_id is not null)
);
create index messages_conversation_idx on public.messages(conversation_id, created_at);

-- -----------------------------------------------------------------------------
-- Avis et notes (après une location terminée ou une vente conclue)
-- -----------------------------------------------------------------------------
create table public.reviews (
  id                   uuid primary key default gen_random_uuid(),
  booking_id           uuid references public.bookings(id) on delete cascade,
  vehicle_sale_id      uuid references public.vehicle_sales(id) on delete cascade,
  direction            public.review_direction not null,
  author_id            uuid not null references public.profiles(id) on delete cascade,
  partner_id           uuid not null references public.partners(id) on delete cascade,
  subject_user_id      uuid references public.profiles(id) on delete cascade,  -- client noté (partner_to_customer)
  listing_id           uuid references public.listings(id) on delete set null,
  vehicle_id           uuid references public.vehicles(id) on delete set null,
  rating               public.rating_1_5 not null,
  rating_cleanliness   public.rating_1_5,
  rating_communication public.rating_1_5,
  rating_punctuality   public.rating_1_5,
  rating_accuracy      public.rating_1_5,     -- conformité à l'annonce
  comment              text check (char_length(comment) <= 2000),
  partner_response     text check (char_length(partner_response) <= 1000),
  partner_responded_at timestamptz,
  status               public.content_status not null default 'visible',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (num_nonnulls(booking_id, vehicle_sale_id) = 1),
  check (direction = 'customer_to_partner' or subject_user_id is not null)
);
create unique index reviews_booking_direction_unique on public.reviews(booking_id, direction) where booking_id is not null;
create unique index reviews_sale_direction_unique on public.reviews(vehicle_sale_id, direction) where vehicle_sale_id is not null;
create index reviews_partner_idx on public.reviews(partner_id, created_at desc) where status = 'visible';
create index reviews_subject_user_idx on public.reviews(subject_user_id) where subject_user_id is not null;

create trigger reviews_updated_at
  before update on public.reviews
  for each row execute function private.set_updated_at();

-- Recalcule les notes moyennes du partenaire et du client
create or replace function private.refresh_ratings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_partner uuid := coalesce(new.partner_id, old.partner_id);
  v_user uuid := coalesce(new.subject_user_id, old.subject_user_id);
begin
  update public.partners p
     set rating_avg = coalesce(s.avg, 0), rating_count = coalesce(s.cnt, 0)
    from (
      select round(avg(rating)::numeric, 2) as avg, count(*)::integer as cnt
        from public.reviews
       where partner_id = v_partner and direction = 'customer_to_partner' and status = 'visible'
    ) s
   where p.id = v_partner;

  if v_user is not null then
    update public.profiles pr
       set rating_avg = coalesce(s.avg, 0), rating_count = coalesce(s.cnt, 0)
      from (
        select round(avg(rating)::numeric, 2) as avg, count(*)::integer as cnt
          from public.reviews
         where subject_user_id = v_user and direction = 'partner_to_customer' and status = 'visible'
      ) s
     where pr.id = v_user;
  end if;
  return null;
end;
$$;

create trigger reviews_refresh_ratings
  after insert or update of rating, status or delete on public.reviews
  for each row execute function private.refresh_ratings();

-- -----------------------------------------------------------------------------
-- Notifications (in-app + envois email / SMS / WhatsApp / push)
-- -----------------------------------------------------------------------------
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  category   text not null check (category in ('booking', 'message', 'payment', 'security', 'reminder', 'marketing')),
  type       text not null,                  -- ex. booking.confirmed
  title      text not null,
  body       text,
  action_url text,
  data       jsonb not null default '{}'::jsonb,
  priority   smallint not null default 0 check (priority between 0 and 2),
  read_at    timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);
create index notifications_unread_idx on public.notifications(user_id) where read_at is null;

create table public.notification_deliveries (
  id                 uuid primary key default gen_random_uuid(),
  notification_id    uuid not null references public.notifications(id) on delete cascade,
  channel            public.notification_channel not null check (channel <> 'in_app'),
  status             public.delivery_status not null default 'queued',
  provider_reference text,
  attempts           smallint not null default 0,
  last_error         text,
  sent_at            timestamptz,
  created_at         timestamptz not null default now(),
  unique (notification_id, channel)
);
create index notification_deliveries_queue_idx on public.notification_deliveries(created_at) where status = 'queued';

-- Crée une notification + les envois selon les préférences de l'utilisateur
create or replace function private.notify_user(
  p_user_id uuid,
  p_category text,
  p_type text,
  p_title text,
  p_body text default null,
  p_action_url text default null,
  p_data jsonb default '{}'::jsonb,
  p_priority smallint default 0
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_user_id is null then
    return null;
  end if;
  insert into public.notifications (user_id, category, type, title, body, action_url, data, priority)
  values (p_user_id, p_category, p_type, p_title, p_body, p_action_url, coalesce(p_data, '{}'::jsonb), p_priority)
  returning id into v_id;

  insert into public.notification_deliveries (notification_id, channel)
  select v_id, np.channel
    from public.notification_preferences np
   where np.user_id = p_user_id
     and np.category = p_category
     and np.enabled
     and np.channel <> 'in_app'
     -- la sécurité passe toujours par email, même si désactivé ailleurs
  union
  select v_id, 'email'::public.notification_channel where p_category = 'security';

  return v_id;
end;
$$;

-- Notifie toute l'équipe d'un partenaire
create or replace function private.notify_partner(
  p_partner_id uuid,
  p_category text,
  p_type text,
  p_title text,
  p_body text default null,
  p_action_url text default null,
  p_data jsonb default '{}'::jsonb,
  p_priority smallint default 0
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  for r in select user_id from public.partner_members where partner_id = p_partner_id loop
    perform private.notify_user(r.user_id, p_category, p_type, p_title, p_body, p_action_url, p_data, p_priority);
  end loop;
end;
$$;
