-- =============================================================================
-- 1600 — Back-office : l'équipe interne peut gérer référentiels et contenus
-- avec sa propre session (sans clé secrète), toujours sous contrôle de la RLS.
--
-- Contexte : depuis mai 2026, les nouveaux projets Supabase n'exposent plus
-- automatiquement les tables à l'API. Les droits ci-dessous sont donc explicites.
-- =============================================================================

-- Référentiels : les policies « admin_write » existent déjà (migration 1400),
-- il manquait les droits d'écriture correspondants.
grant insert, update, delete on
  public.cities, public.districts, public.vehicle_categories, public.vehicle_makes,
  public.vehicle_models, public.equipment, public.extras, public.faq_categories
to authenticated;

-- Réglages plateforme et documents légaux : administrateurs uniquement
grant insert, update, delete on public.platform_settings, public.legal_documents to authenticated;

create policy platform_settings_admin_write on public.platform_settings for all to authenticated
  using (private.is_admin()) with check (private.is_admin());
create policy legal_documents_admin_write on public.legal_documents for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- Pages et FAQ : toute l'équipe interne (admin, modération, support)
grant insert, update, delete on public.cms_pages, public.faq_articles to authenticated;

create policy cms_pages_staff_write on public.cms_pages for all to authenticated
  using (private.is_staff()) with check (private.is_staff());
create policy faq_articles_staff_write on public.faq_articles for all to authenticated
  using (private.is_staff()) with check (private.is_staff());

-- Formules d'assurance de la plateforme (partner_id null) : administrateurs
create policy insurance_plans_admin_write on public.insurance_plans for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- Certification d'un véhicule en vente (badge « Véhicule inspecté ») : modération
create or replace function public.certify_sale_listing(p_listing_id uuid, p_certified boolean)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not private.is_moderator() then
    raise exception 'FORBIDDEN';
  end if;
  update public.sale_terms set is_certified = p_certified where listing_id = p_listing_id;
  if not found then
    raise exception 'LISTING_NOT_FOUND';
  end if;
  perform private.log_action('sale_terms.certify', 'listings', p_listing_id::text,
                             jsonb_build_object('certified', p_certified));
end;
$$;

revoke execute on function public.certify_sale_listing(uuid, boolean) from public, anon;
grant execute on function public.certify_sale_listing(uuid, boolean) to authenticated, service_role;
