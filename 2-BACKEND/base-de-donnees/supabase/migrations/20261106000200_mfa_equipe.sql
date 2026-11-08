-- =============================================================================
-- 20261106-0200 — SÉCURITÉ : double authentification obligatoire pour l'équipe
--
-- Problème corrigé : un administrateur, modérateur ou agent de support qui se
-- connectait avec son seul mot de passe (jeton « aal1 ») obtenait tous ses droits.
-- Un mot de passe volé suffisait donc à prendre le contrôle du back-office.
--
-- Désormais, les rôles admin / moderator / support ne sont reconnus QUE si la
-- session a validé un second facteur (TOTP) : claim JWT « aal » = 'aal2'.
-- Sans second facteur, la personne est traitée comme un simple client.
--
-- Toutes les règles RLS et fonctions passent par private.has_role / is_admin /
-- is_staff / is_moderator : les redéfinir suffit à couvrir toute la base.
-- =============================================================================

create or replace function private.staff_session_ok()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt()) ->> 'aal', 'aal1') = 'aal2';
$$;

create or replace function private.has_role(p_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
     where user_id = (select auth.uid()) and role = p_role
  )
  and (p_role not in ('admin', 'moderator', 'support') or private.staff_session_ok());
$$;

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
     where user_id = (select auth.uid()) and role in ('admin', 'moderator', 'support')
  )
  and private.staff_session_ok();
$$;

create or replace function private.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
     where user_id = (select auth.uid()) and role in ('admin', 'moderator')
  )
  and private.staff_session_ok();
$$;

-- Le back-office demande à la base si la session doit d'abord valider son code TOTP
-- (affiche l'écran « Saisissez le code de votre application d'authentification »).
create or replace function public.staff_mfa_status()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'is_staff_account', exists (select 1 from public.user_roles
                                 where user_id = (select auth.uid())
                                   and role in ('admin', 'moderator', 'support')),
    'session_aal', coalesce((select auth.jwt()) ->> 'aal', 'aal1'),
    'mfa_required', exists (select 1 from public.user_roles
                             where user_id = (select auth.uid())
                               and role in ('admin', 'moderator', 'support'))
                    and not private.staff_session_ok()
  );
$$;

grant execute on function private.staff_session_ok() to anon, authenticated, service_role;
revoke execute on function public.staff_mfa_status() from public, anon;
grant execute on function public.staff_mfa_status() to authenticated, service_role;
