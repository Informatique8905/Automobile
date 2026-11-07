-- =============================================================================
-- 1000 — Support (urgent / standard, formulaire dynamique, chatbot, WhatsApp)
-- et FAQ (recherche prédictive, onglets, accordéon)
-- =============================================================================

create table public.support_tickets (
  id                  uuid primary key default gen_random_uuid(),
  reference           text not null unique default private.generate_reference('SUP'),
  user_id             uuid references public.profiles(id) on delete set null,
  contact_email       extensions.citext,
  contact_phone       public.phone_e164,
  booking_id          uuid references public.bookings(id) on delete set null,
  booking_reference   text,              -- saisi dans le formulaire dynamique
  priority            public.ticket_priority not null default 'standard',
  category            text not null check (category in (
                        'booking', 'payment', 'deposit', 'account', 'listing', 'partner',
                        'accident', 'breakdown', 'safety', 'technical', 'other')),
  channel             public.ticket_channel not null default 'form',
  status              public.ticket_status not null default 'open',
  subject             text not null check (char_length(subject) between 3 and 200),
  assigned_to         uuid references public.profiles(id) on delete set null,
  first_response_at   timestamptz,
  resolved_at         timestamptz,
  satisfaction_rating public.rating_1_5,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (user_id is not null or contact_email is not null or contact_phone is not null)
);
create index support_tickets_queue_idx on public.support_tickets(priority, created_at) where status in ('open', 'in_progress');
create index support_tickets_user_idx on public.support_tickets(user_id, created_at desc);

create trigger support_tickets_updated_at
  before update on public.support_tickets
  for each row execute function private.set_updated_at();

-- Accident, panne, sécurité = urgent automatiquement
create or replace function private.support_ticket_defaults()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.category in ('accident', 'breakdown', 'safety') then
    new.priority := 'urgent';
  end if;
  return new;
end;
$$;

create trigger support_tickets_defaults
  before insert on public.support_tickets
  for each row execute function private.support_ticket_defaults();

create table public.support_messages (
  id               uuid primary key default gen_random_uuid(),
  ticket_id        uuid not null references public.support_tickets(id) on delete cascade,
  author_id        uuid references public.profiles(id) on delete set null,
  is_internal_note boolean not null default false,
  body             text not null check (char_length(body) between 1 and 5000),
  attachments      jsonb not null default '[]'::jsonb check (jsonb_typeof(attachments) = 'array'),
  created_at       timestamptz not null default now()
);
create index support_messages_ticket_idx on public.support_messages(ticket_id, created_at);

-- -----------------------------------------------------------------------------
-- FAQ
-- -----------------------------------------------------------------------------
create table public.faq_categories (
  id         integer generated always as identity primary key,
  slug       text not null unique,
  name       text not null,
  audience   text not null check (audience in ('rental', 'sale', 'payment_security', 'partner', 'general')),
  sort_order integer not null default 0
);

create table public.faq_articles (
  id                uuid primary key default gen_random_uuid(),
  category_id       integer not null references public.faq_categories(id) on delete cascade,
  slug              text not null unique,
  question          text not null check (char_length(question) between 5 and 300),
  answer_md         text not null,
  sort_order        integer not null default 0,
  is_published      boolean not null default true,
  helpful_count     integer not null default 0,
  not_helpful_count integer not null default 0,
  search_vector     tsvector,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index faq_articles_category_idx on public.faq_articles(category_id, sort_order);
create index faq_articles_search_idx on public.faq_articles using gin (search_vector);
create index faq_articles_question_trgm on public.faq_articles using gin (question extensions.gin_trgm_ops);

create or replace function private.faq_search_vector()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.search_vector :=
       setweight(to_tsvector('french', extensions.unaccent(coalesce(new.question, ''))), 'A')
    || setweight(to_tsvector('french', extensions.unaccent(coalesce(new.answer_md, ''))), 'B');
  new.updated_at := now();
  return new;
end;
$$;

create trigger faq_articles_search_vector
  before insert or update on public.faq_articles
  for each row execute function private.faq_search_vector();
