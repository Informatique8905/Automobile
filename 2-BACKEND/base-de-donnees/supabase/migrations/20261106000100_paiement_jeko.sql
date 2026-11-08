-- =============================================================================
-- 20261106-0100 — PAIEMENT : Jeko comme prestataire unique
--
-- Jeko encaisse cartes Visa/Mastercard/GIM-UEMOA, Wave, Orange Money, MTN MoMo,
-- Moov Money, Djamo et le QR interopérable PI-SPI (BCEAO).
--
-- 1. Base déjà déployée : renomme l'ancienne valeur du type payment_provider en
--    'jeko' (sans effet sur une base neuve, où le type est déjà créé avec 'jeko').
-- 2. Nouveaux moyens de paiement : Djamo, QR PI-SPI.
-- 3. Plafond par transaction annoncé par Jeko (2 000 000 FCFA, à confirmer par
--    écrit avec Jeko) : refus clair AVANT d'envoyer le client vers la page Jeko.
-- 4. Webhook : contrôle du montant et de la devise reçus avant de valider un
--    paiement (un webhook falsifié ou un montant modifié ne valide rien).
-- =============================================================================

-- 1. Renommage de l'ancienne valeur (base déjà en ligne)
do $$
declare
  v_old text;
begin
  if not exists (
    select 1 from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      join pg_namespace n on n.oid = t.typnamespace
     where n.nspname = 'public' and t.typname = 'payment_provider' and e.enumlabel = 'jeko'
  ) then
    select e.enumlabel into v_old
      from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      join pg_namespace n on n.oid = t.typnamespace
     where n.nspname = 'public' and t.typname = 'payment_provider' and e.enumlabel <> 'manual'
     order by e.enumsortorder
     limit 1;
    if v_old is not null then
      execute format('alter type public.payment_provider rename value %L to %L', v_old, 'jeko');
    end if;
  end if;
end $$;

alter table public.payments alter column provider set default 'jeko';

-- 2. Moyens de paiement supplémentaires proposés par Jeko
alter type public.payment_method add value if not exists 'djamo' after 'moov_money';
alter type public.payment_method add value if not exists 'pi_spi_qr' after 'djamo';

-- 3. Plafonds du prestataire (modifiables par l'admin)
insert into public.platform_settings (key, value, description, is_public) values
  ('payment_provider_max_amount', '2000000',
   'Plafond Jeko par transaction en FCFA (annoncé publiquement, à confirmer par écrit avec Jeko)', true),
  ('payment_provider_min_amount', '100',
   'Montant minimum accepté par transaction en FCFA', true)
on conflict (key) do nothing;

create or replace function private.payments_check_provider_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.provider = 'jeko' then
    if new.amount > private.setting_int('payment_provider_max_amount', 2000000) then
      -- Le front affiche : « Montant trop élevé pour un paiement en ligne : contactez l'agence »
      raise exception 'AMOUNT_ABOVE_PROVIDER_LIMIT';
    end if;
    if new.amount < private.setting_int('payment_provider_min_amount', 100) then
      raise exception 'AMOUNT_BELOW_PROVIDER_LIMIT';
    end if;
  end if;
  return new;
end;
$$;

create trigger payments_check_provider_limits
  before insert on public.payments
  for each row execute function private.payments_check_provider_limits();

-- 4. Validation d'un paiement Jeko avec contrôle du montant
--    Appelée UNIQUEMENT par le backend (Render) après vérification de la signature
--    HMAC du webhook. Ne lève pas d'erreur en cas d'écart, pour conserver la trace.
create or replace function public.handle_jeko_payment_success(
  p_payment_id              uuid,
  p_provider_transaction_id text,
  p_method                  public.payment_method,
  p_amount                  bigint,
  p_currency                text default 'XOF',
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
begin
  select * into v_payment from public.payments where id = p_payment_id;
  if v_payment.id is null then
    raise exception 'PAYMENT_NOT_FOUND';
  end if;

  if p_amount is distinct from v_payment.amount
     or upper(coalesce(p_currency, '')) <> v_payment.currency then
    insert into public.fraud_signals (user_id, booking_id, signal_type, severity, source, details)
    values (v_payment.payer_id, v_payment.booking_id, 'payment_amount_mismatch', 5, 'system',
            jsonb_build_object('payment_id', v_payment.id, 'expected_amount', v_payment.amount,
                               'received_amount', p_amount, 'received_currency', p_currency,
                               'provider_transaction_id', p_provider_transaction_id));
    update public.payments
       set failure_reason = 'AMOUNT_MISMATCH',
           provider_payload = coalesce(p_payload, provider_payload)
     where id = v_payment.id;
    return jsonb_build_object('status', 'amount_mismatch', 'payment_id', v_payment.id);
  end if;

  return public.handle_payment_success(p_payment_id, p_provider_transaction_id, p_method, p_payload);
end;
$$;

revoke execute on function public.handle_jeko_payment_success(uuid, text, public.payment_method, bigint, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.handle_jeko_payment_success(uuid, text, public.payment_method, bigint, text, jsonb)
  to service_role;
grant execute on function private.payments_check_provider_limits() to anon, authenticated, service_role;
