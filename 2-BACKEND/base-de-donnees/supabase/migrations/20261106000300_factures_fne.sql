-- =============================================================================
-- 20261106-0300 — FACTURATION : facture normalisée électronique (FNE) de la DGI
--
-- Depuis janvier 2026, les factures doivent être certifiées via la plateforme FNE
-- de la Direction générale des impôts (référence + QR code de certification).
-- Un PDF généré par la plateforme seul ne suffit pas.
--
-- Fonctionnement :
--   1. handle_payment_success crée la facture (statut FNE « pending »)
--   2. le backend (Render) réclame les factures à certifier : claim_invoices_for_fne
--   3. il appelle l'API FNE, puis enregistre le résultat : record_fne_result
--   4. le client ne télécharge la facture qu'une fois certifiée
-- À valider avec un expert-comptable : qui émet la facture (plateforme ou loueur),
-- et pour quel montant (total ou frais de service seulement).
-- =============================================================================

create type public.fne_status as enum ('not_required', 'pending', 'processing', 'certified', 'failed');

alter table public.invoices
  add column fne_status       public.fne_status not null default 'pending',
  add column fne_reference    text unique,
  add column fne_qr_url       text,
  add column fne_certified_at timestamptz,
  add column fne_attempts     smallint not null default 0,
  add column fne_locked_at    timestamptz,
  add column fne_last_error   text;

create index invoices_fne_queue_idx on public.invoices(issued_at)
  where fne_status in ('pending', 'failed');

-- Le backend réclame un lot de factures à certifier (verrouillage sans conflit)
create or replace function public.claim_invoices_for_fne(p_limit integer default 20)
returns setof public.invoices
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  -- Libère les lots bloqués (backend arrêté en cours de traitement)
  update public.invoices set fne_status = 'pending', fne_locked_at = null
   where fne_status = 'processing' and fne_locked_at < now() - interval '15 minutes';

  return query
  update public.invoices i
     set fne_status = 'processing', fne_attempts = i.fne_attempts + 1, fne_locked_at = now()
   where i.id in (
     select id from public.invoices
      where fne_status in ('pending', 'failed') and fne_attempts < 10
      order by issued_at
      limit least(greatest(coalesce(p_limit, 20), 1), 100)
      for update skip locked
   )
  returning i.*;
end;
$$;

create or replace function public.record_fne_result(
  p_invoice_id uuid,
  p_success    boolean,
  p_reference  text default null,
  p_qr_url     text default null,
  p_error      text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if p_success and nullif(trim(p_reference), '') is null then
    raise exception 'FNE_REFERENCE_REQUIRED';
  end if;

  update public.invoices
     set fne_status       = case when p_success then 'certified' else 'failed' end::public.fne_status,
         fne_reference    = case when p_success then p_reference else fne_reference end,
         fne_qr_url       = case when p_success then p_qr_url else fne_qr_url end,
         fne_certified_at = case when p_success then now() else fne_certified_at end,
         fne_last_error   = case when p_success then null else left(p_error, 1000) end,
         fne_locked_at    = null
   where id = p_invoice_id and fne_status = 'processing';

  if not found then
    raise exception 'INVOICE_NOT_PROCESSING';
  end if;

  perform private.log_action(case when p_success then 'invoice.fne_certified' else 'invoice.fne_failed' end,
                             'invoices', p_invoice_id::text,
                             jsonb_build_object('reference', p_reference, 'error', left(p_error, 200)));
end;
$$;

revoke execute on function public.claim_invoices_for_fne(integer) from public, anon, authenticated;
revoke execute on function public.record_fne_result(uuid, boolean, text, text, text) from public, anon, authenticated;
grant execute on function public.claim_invoices_for_fne(integer) to service_role;
grant execute on function public.record_fne_result(uuid, boolean, text, text, text) to service_role;
