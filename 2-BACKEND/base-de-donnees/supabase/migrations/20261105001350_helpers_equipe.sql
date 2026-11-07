-- =============================================================================
-- 1350 — Helpers d'accès véhicules / annonces et gestion de l'équipe partenaire
-- =============================================================================

create or replace function private.is_vehicle_member(p_vehicle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.vehicles v
      join public.partner_members pm on pm.partner_id = v.partner_id
     where v.id = p_vehicle_id and pm.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_vehicle_manager(p_vehicle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.vehicles v
      join public.partner_members pm on pm.partner_id = v.partner_id
     where v.id = p_vehicle_id and pm.user_id = (select auth.uid()) and pm.role in ('owner', 'manager')
  );
$$;

-- Un véhicule est visible du public s'il a au moins une annonce publiée
create or replace function private.vehicle_is_public(p_vehicle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.listings where vehicle_id = p_vehicle_id and status = 'published');
$$;

create or replace function private.can_view_listing(p_listing_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.listings l
     where l.id = p_listing_id
       and (l.status = 'published' or private.is_partner_member(l.partner_id))
  ) or private.is_staff();
$$;

create or replace function private.is_listing_manager(p_listing_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.listings l
      join public.partner_members pm on pm.partner_id = l.partner_id
     where l.id = p_listing_id and pm.user_id = (select auth.uid()) and pm.role in ('owner', 'manager')
  );
$$;

create or replace function private.can_access_dispute(p_dispute_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.disputes d where d.id = p_dispute_id and private.can_access_booking(d.booking_id)
  );
$$;

create or replace function private.can_access_inspection(p_inspection_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.vehicle_inspections vi where vi.id = p_inspection_id and private.can_access_booking(vi.booking_id)
  );
$$;

-- -----------------------------------------------------------------------------
-- Équipe d'agence : invitation par email et acceptation
-- -----------------------------------------------------------------------------
create or replace function public.invite_partner_member(
  p_partner_id uuid, p_email text, p_role public.partner_member_role default 'agent'
)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_token text := private.random_token(32);
begin
  if not private.is_partner_manager(p_partner_id) then
    raise exception 'FORBIDDEN';
  end if;
  if p_role = 'owner' then
    raise exception 'CANNOT_INVITE_OWNER';
  end if;
  insert into public.partner_invitations (partner_id, email, role, token_hash, invited_by)
  values (p_partner_id, lower(trim(p_email)), p_role, private.hash_value(v_token), auth.uid());
  -- Le jeton en clair n'est renvoyé qu'une fois, pour l'email d'invitation
  return v_token;
end;
$$;

create or replace function public.accept_partner_invitation(p_token text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_inv public.partner_invitations;
  v_email text;
begin
  select * into v_inv from public.partner_invitations
   where token_hash = private.hash_value(p_token) and accepted_at is null and revoked_at is null and expires_at > now()
   for update;
  if v_inv.id is null then
    raise exception 'INVITATION_INVALID';
  end if;
  select email::text into v_email from public.profiles where id = auth.uid();
  if lower(v_email) is distinct from lower(v_inv.email::text) then
    raise exception 'INVITATION_EMAIL_MISMATCH';
  end if;
  insert into public.partner_members (partner_id, user_id, role, invited_by)
  values (v_inv.partner_id, auth.uid(), v_inv.role, v_inv.invited_by)
  on conflict (partner_id, user_id) do update set role = excluded.role;
  insert into public.user_roles (user_id, role) values (auth.uid(), 'partner') on conflict do nothing;
  update public.partner_invitations set accepted_at = now() where id = v_inv.id;
  return v_inv.partner_id;
end;
$$;
