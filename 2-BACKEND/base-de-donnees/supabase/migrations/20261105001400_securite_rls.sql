-- =============================================================================
-- 1400 — SÉCURITÉ : Row Level Security sur toutes les tables, droits par colonne,
-- droits d'exécution des fonctions, journal d'audit
--
-- Stratégie « tout refuser par défaut » :
--   1. RLS activé partout (aucune policy = aucun accès pour anon / authenticated)
--   2. INSERT / UPDATE / DELETE retirés aux rôles clients, puis rendus colonne
--      par colonne là où c'est nécessaire (un utilisateur ne peut pas modifier
--      son statut KYC, une annonce ne peut pas s'auto-publier, etc.)
--   3. Les actions sensibles passent par des fonctions SECURITY DEFINER qui
--      vérifient les droits et la cohérence métier
--   4. service_role (serveur uniquement, jamais dans le navigateur) contourne RLS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. RLS partout
-- -----------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', r.tablename);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 2. Écritures retirées aux clients, puis rendues au cas par cas
-- -----------------------------------------------------------------------------
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant all on all tables in schema public to service_role;

-- Colonnes modifiables par l'utilisateur
grant update (first_name, last_name, phone, date_of_birth, avatar_path, address_line, city_id, district_id,
              preferred_language, last_seen_at)
  on public.profiles to authenticated;

grant insert, update, delete on public.notification_preferences to authenticated;
grant insert (user_id, consent_type, granted, legal_document_id, ip_address, user_agent) on public.consents to authenticated;
grant insert (user_id, type, storage_path, mime_type, file_size_bytes, country_code, issued_on, expires_on)
  on public.user_documents to authenticated;
grant delete on public.user_documents to authenticated;
grant insert, delete on public.push_subscriptions to authenticated;

-- Partenaires
grant update (display_name, description, logo_path, cover_path, city_id, district_id) on public.partners to authenticated;
grant update (legal_name, rccm_number, tax_id, contact_email, contact_phone, whatsapp_phone, billing_address)
  on public.partner_private to authenticated;
revoke select on public.partner_private from anon, authenticated;
grant select (partner_id, legal_name, rccm_number, tax_id, contact_email, contact_phone, whatsapp_phone,
              billing_address, commission_rate, updated_at)
  on public.partner_private to authenticated;               -- internal_notes : back-office uniquement
grant update (role) on public.partner_members to authenticated;
grant delete on public.partner_members to authenticated;
grant update (revoked_at) on public.partner_invitations to authenticated;
grant insert, update, delete on public.partner_locations to authenticated;
grant insert (partner_id, method, wallet_provider, bank_name, account_holder_name, account_last4, account_ciphertext, is_default)
  on public.partner_payout_accounts to authenticated;
grant update (account_holder_name, is_default) on public.partner_payout_accounts to authenticated;
grant delete on public.partner_payout_accounts to authenticated;
grant insert (partner_id, type, storage_path, expires_on, uploaded_by) on public.partner_documents to authenticated;
grant delete on public.partner_documents to authenticated;

-- Flotte et annonces
grant insert (partner_id, make_id, model_id, category_id, model_year, trim, color, fuel, transmission, mileage_km, seats,
              doors, engine_power_hp, engine_displacement_cc, fleet_status, home_location_id, city_id, district_id,
              latitude, longitude, description)
  on public.vehicles to authenticated;
grant update (make_id, model_id, category_id, model_year, trim, color, fuel, transmission, mileage_km, seats, doors,
              engine_power_hp, engine_displacement_cc, fleet_status, home_location_id, city_id, district_id,
              latitude, longitude, description, archived_at)
  on public.vehicles to authenticated;
grant delete on public.vehicles to authenticated;
grant insert, update, delete on public.vehicle_private to authenticated;
grant insert, delete on public.vehicle_equipment to authenticated;
grant insert (vehicle_id, storage_path, angle, position, is_cover, width, height, blurhash) on public.vehicle_photos to authenticated;
grant update (angle, position, is_cover) on public.vehicle_photos to authenticated;
grant delete on public.vehicle_photos to authenticated;
grant insert (vehicle_id, type, storage_path, title, is_public, issued_on, expires_on, uploaded_by) on public.vehicle_documents to authenticated;
grant update (title, is_public) on public.vehicle_documents to authenticated;
grant delete on public.vehicle_documents to authenticated;
grant insert, update, delete on public.vehicle_maintenance_logs to authenticated;

grant insert (vehicle_id, type, description, instant_booking, offer_discount_pct, offer_ends_at) on public.listings to authenticated;
grant update (description, instant_booking, offer_discount_pct, offer_ends_at) on public.listings to authenticated;
grant delete on public.listings to authenticated;
grant insert, update on public.rental_terms to authenticated;
grant insert (listing_id, price, is_negotiable, warranty_months, is_customs_cleared, import_origin, previous_owners,
              last_service_on, technical_inspection_valid_until, financing_available, test_drive_available,
              reservation_deposit_amount, reservation_hold_days)
  on public.sale_terms to authenticated;
grant update (price, is_negotiable, warranty_months, is_customs_cleared, import_origin, previous_owners,
              last_service_on, technical_inspection_valid_until, financing_available, test_drive_available,
              reservation_deposit_amount, reservation_hold_days)
  on public.sale_terms to authenticated;                     -- is_certified : équipe interne uniquement
grant insert, update, delete on public.seasonal_prices to authenticated;
grant insert, update, delete on public.listing_extras to authenticated;
grant insert (partner_id, code, level, name, description, coverage, deductible_amount, price_per_day,
              is_included_by_default, is_active, sort_order)
  on public.insurance_plans to authenticated;
grant update (name, description, coverage, deductible_amount, price_per_day, is_included_by_default, is_active, sort_order)
  on public.insurance_plans to authenticated;
grant insert (vehicle_id, period, kind, note, created_by) on public.availability_blocks to authenticated;
grant delete on public.availability_blocks to authenticated;
grant insert, delete on public.favorites to authenticated;
grant insert, update, delete on public.saved_searches to authenticated;

-- Réservations : écritures via fonctions, sauf conducteurs supp. et état des lieux
grant insert (booking_id, full_name, date_of_birth, license_number, license_issued_on, license_document_id)
  on public.booking_drivers to authenticated;
grant delete on public.booking_drivers to authenticated;
grant insert (booking_id, type, mileage_km, fuel_level_pct, exterior_condition, interior_condition, notes, performed_by)
  on public.vehicle_inspections to authenticated;
grant update (mileage_km, fuel_level_pct, exterior_condition, interior_condition, notes) on public.vehicle_inspections to authenticated;
grant insert (inspection_id, storage_path, angle, caption, taken_by) on public.inspection_photos to authenticated;
grant insert (inspection_id, location, severity, description, photo_id, is_preexisting, estimated_cost)
  on public.inspection_damages to authenticated;
grant update (severity, description, estimated_cost) on public.inspection_damages to authenticated;

-- Codes promo partenaire
grant insert (code, description, discount_type, discount_value, max_discount, min_amount, applies_to, partner_id,
              starts_at, ends_at, max_redemptions, max_per_user, is_active, created_by)
  on public.promo_codes to authenticated;
grant update (description, max_discount, min_amount, ends_at, max_redemptions, is_active) on public.promo_codes to authenticated;

-- Vente
grant insert (listing_id, buyer_id, vehicle_price, down_payment, duration_months, annual_rate_pct,
              estimated_monthly_payment, employment_status, monthly_income_range)
  on public.financing_requests to authenticated;

-- Messagerie, notifications
grant insert (conversation_id, sender_id, kind, body, attachments) on public.messages to authenticated;
grant update (deleted_at) on public.messages to authenticated;
grant insert, update on public.conversation_reads to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant delete on public.notifications to authenticated;

-- Signalements, litiges, support
grant insert (entity_type, entity_id, source, reporter_id, reason_code, description) on public.moderation_flags to authenticated;
grant insert (booking_id, opened_by, type, description, amount_claimed) on public.disputes to authenticated;
grant insert (dispute_id, submitted_by, kind, storage_path, description) on public.dispute_evidence to authenticated;
grant insert (user_id, contact_email, contact_phone, booking_id, booking_reference, priority, category, channel, subject)
  on public.support_tickets to authenticated;
grant update (satisfaction_rating) on public.support_tickets to authenticated;
grant insert (ticket_id, author_id, body, attachments) on public.support_messages to authenticated;

-- Données strictement internes : même pas en lecture pour les clients
revoke select on public.payment_events, public.invoice_counters, public.blocklist, public.audit_logs,
                 public.ai_agent_runs, public.ai_jobs, public.fraud_signals, public.notification_deliveries
  from anon;
revoke select on public.payment_events, public.invoice_counters from authenticated;

-- Vue publique des profils : utilisateurs connectés uniquement
revoke all on public.public_profiles from anon;
grant select on public.public_profiles to authenticated;

-- -----------------------------------------------------------------------------
-- 3. Policies
-- -----------------------------------------------------------------------------

-- Référentiels : lecture publique, écriture admin
do $$
declare
  t text;
begin
  foreach t in array array['cities', 'districts', 'vehicle_categories', 'vehicle_makes', 'vehicle_models',
                           'equipment', 'extras', 'faq_categories'] loop
    execute format('create policy %I on public.%I for select to anon, authenticated using (true)', t || '_read', t);
    execute format('create policy %I on public.%I for all to authenticated using (private.is_admin()) with check (private.is_admin())',
                   t || '_admin_write', t);
  end loop;
end $$;

create policy platform_settings_read on public.platform_settings for select to anon, authenticated
  using (is_public or private.is_admin());
create policy legal_documents_read on public.legal_documents for select to anon, authenticated
  using (published_at is not null or private.is_admin());
create policy cms_pages_read on public.cms_pages for select to anon, authenticated
  using (is_published or private.is_staff());
create policy faq_articles_read on public.faq_articles for select to anon, authenticated
  using (is_published or private.is_staff());

create policy insurance_plans_read on public.insurance_plans for select to anon, authenticated
  using (is_active or (partner_id is not null and private.is_partner_member(partner_id)) or private.is_staff());
create policy insurance_plans_partner_insert on public.insurance_plans for insert to authenticated
  with check (partner_id is not null and private.is_partner_manager(partner_id));
create policy insurance_plans_partner_update on public.insurance_plans for update to authenticated
  using (partner_id is not null and private.is_partner_manager(partner_id))
  with check (partner_id is not null and private.is_partner_manager(partner_id));

-- Comptes
create policy profiles_select_own on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.is_staff());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy user_roles_select on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or private.is_admin());

create policy notification_preferences_own on public.notification_preferences for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy consents_select on public.consents for select to authenticated
  using (user_id = (select auth.uid()) or private.is_admin());
create policy consents_insert on public.consents for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy user_documents_select on public.user_documents for select to authenticated
  using (user_id = (select auth.uid()) or private.is_moderator());
create policy user_documents_insert on public.user_documents for insert to authenticated
  with check (user_id = (select auth.uid())
              and storage_path like (select auth.uid())::text || '/%');
create policy user_documents_delete on public.user_documents for delete to authenticated
  using (user_id = (select auth.uid()) and status = 'pending');

create policy kyc_verifications_select on public.kyc_verifications for select to authenticated
  using (user_id = (select auth.uid()) or private.is_moderator());

create policy account_deletion_select on public.account_deletion_requests for select to authenticated
  using (user_id = (select auth.uid()) or private.is_admin());

create policy push_subscriptions_own on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Partenaires
create policy partners_read on public.partners for select to anon, authenticated
  using (is_active or private.is_partner_member(id) or private.is_staff());
create policy partners_update on public.partners for update to authenticated
  using (private.is_partner_manager(id)) with check (private.is_partner_manager(id));

create policy partner_private_select on public.partner_private for select to authenticated
  using (private.is_partner_member(partner_id) or private.is_staff());
create policy partner_private_update on public.partner_private for update to authenticated
  using (private.is_partner_manager(partner_id)) with check (private.is_partner_manager(partner_id));

create policy partner_members_select on public.partner_members for select to authenticated
  using (user_id = (select auth.uid()) or private.is_partner_member(partner_id) or private.is_staff());
create policy partner_members_update on public.partner_members for update to authenticated
  using (private.is_partner_manager(partner_id) and role <> 'owner')
  with check (private.is_partner_manager(partner_id) and role <> 'owner');
create policy partner_members_delete on public.partner_members for delete to authenticated
  using (role <> 'owner' and (private.is_partner_manager(partner_id) or user_id = (select auth.uid())));

create policy partner_invitations_manage on public.partner_invitations for select to authenticated
  using (private.is_partner_manager(partner_id));
create policy partner_invitations_revoke on public.partner_invitations for update to authenticated
  using (private.is_partner_manager(partner_id)) with check (private.is_partner_manager(partner_id));

create policy partner_locations_read on public.partner_locations for select to anon, authenticated
  using (is_active or private.is_partner_member(partner_id) or private.is_staff());
create policy partner_locations_write on public.partner_locations for all to authenticated
  using (private.is_partner_manager(partner_id)) with check (private.is_partner_manager(partner_id));

create policy partner_payout_accounts_select on public.partner_payout_accounts for select to authenticated
  using (private.is_partner_manager(partner_id) or private.is_admin());
create policy partner_payout_accounts_write on public.partner_payout_accounts for all to authenticated
  using (private.is_partner_manager(partner_id)) with check (private.is_partner_manager(partner_id));

create policy partner_documents_select on public.partner_documents for select to authenticated
  using (private.is_partner_manager(partner_id) or private.is_moderator());
create policy partner_documents_insert on public.partner_documents for insert to authenticated
  with check (private.is_partner_manager(partner_id) and uploaded_by = (select auth.uid())
              and storage_path like partner_id::text || '/%');
create policy partner_documents_delete on public.partner_documents for delete to authenticated
  using (private.is_partner_manager(partner_id) and status = 'pending');

-- Véhicules
create policy vehicles_read on public.vehicles for select to anon, authenticated
  using (private.vehicle_is_public(id) or private.is_partner_member(partner_id) or private.is_staff());
create policy vehicles_insert on public.vehicles for insert to authenticated
  with check (private.is_partner_manager(partner_id));
create policy vehicles_update on public.vehicles for update to authenticated
  using (private.is_partner_member(partner_id)) with check (private.is_partner_member(partner_id));
create policy vehicles_delete on public.vehicles for delete to authenticated
  using (private.is_partner_manager(partner_id)
         and not exists (select 1 from public.bookings b where b.vehicle_id = vehicles.id));

create policy vehicle_private_member on public.vehicle_private for select to authenticated
  using (private.is_vehicle_member(vehicle_id) or private.is_staff());
create policy vehicle_private_write on public.vehicle_private for all to authenticated
  using (private.is_vehicle_manager(vehicle_id)) with check (private.is_vehicle_manager(vehicle_id));

create policy vehicle_equipment_read on public.vehicle_equipment for select to anon, authenticated
  using (private.vehicle_is_public(vehicle_id) or private.is_vehicle_member(vehicle_id) or private.is_staff());
create policy vehicle_equipment_write on public.vehicle_equipment for all to authenticated
  using (private.is_vehicle_member(vehicle_id)) with check (private.is_vehicle_member(vehicle_id));

create policy vehicle_photos_read on public.vehicle_photos for select to anon, authenticated
  using ((status = 'visible' and private.vehicle_is_public(vehicle_id))
         or private.is_vehicle_member(vehicle_id) or private.is_staff());
create policy vehicle_photos_insert on public.vehicle_photos for insert to authenticated
  with check (private.is_vehicle_member(vehicle_id));
create policy vehicle_photos_update on public.vehicle_photos for update to authenticated
  using (private.is_vehicle_member(vehicle_id)) with check (private.is_vehicle_member(vehicle_id));
create policy vehicle_photos_delete on public.vehicle_photos for delete to authenticated
  using (private.is_vehicle_member(vehicle_id));

create policy vehicle_documents_read on public.vehicle_documents for select to authenticated
  using (private.is_vehicle_member(vehicle_id) or private.is_staff()
         or (is_public and status = 'approved'
             and exists (select 1 from public.listings l where l.vehicle_id = vehicle_documents.vehicle_id
                          and l.type = 'sale' and l.status = 'published')));
create policy vehicle_documents_insert on public.vehicle_documents for insert to authenticated
  with check (private.is_vehicle_member(vehicle_id) and uploaded_by = (select auth.uid()));
create policy vehicle_documents_update on public.vehicle_documents for update to authenticated
  using (private.is_vehicle_member(vehicle_id)) with check (private.is_vehicle_member(vehicle_id));
create policy vehicle_documents_delete on public.vehicle_documents for delete to authenticated
  using (private.is_vehicle_manager(vehicle_id));

create policy vehicle_maintenance_member on public.vehicle_maintenance_logs for all to authenticated
  using (private.is_vehicle_member(vehicle_id) or private.is_staff())
  with check (private.is_vehicle_member(vehicle_id));

-- Annonces
create policy listings_read on public.listings for select to anon, authenticated
  using (status = 'published' or private.is_partner_member(partner_id) or private.is_staff());
create policy listings_insert on public.listings for insert to authenticated
  with check (private.is_partner_manager(partner_id) and status = 'draft');
create policy listings_update on public.listings for update to authenticated
  using (private.is_partner_manager(partner_id)) with check (private.is_partner_manager(partner_id));
create policy listings_delete on public.listings for delete to authenticated
  using (private.is_partner_manager(partner_id) and status = 'draft');

create policy rental_terms_read on public.rental_terms for select to anon, authenticated
  using (private.can_view_listing(listing_id));
create policy rental_terms_write on public.rental_terms for all to authenticated
  using (private.is_listing_manager(listing_id)) with check (private.is_listing_manager(listing_id));

create policy sale_terms_read on public.sale_terms for select to anon, authenticated
  using (private.can_view_listing(listing_id));
create policy sale_terms_write on public.sale_terms for all to authenticated
  using (private.is_listing_manager(listing_id)) with check (private.is_listing_manager(listing_id));

create policy seasonal_prices_read on public.seasonal_prices for select to anon, authenticated
  using (private.can_view_listing(listing_id));
create policy seasonal_prices_write on public.seasonal_prices for all to authenticated
  using (private.is_listing_manager(listing_id)) with check (private.is_listing_manager(listing_id));

create policy listing_extras_read on public.listing_extras for select to anon, authenticated
  using (private.can_view_listing(listing_id));
create policy listing_extras_write on public.listing_extras for all to authenticated
  using (private.is_listing_manager(listing_id)) with check (private.is_listing_manager(listing_id));

create policy availability_blocks_select on public.availability_blocks for select to authenticated
  using (private.is_vehicle_member(vehicle_id) or private.is_staff());
create policy availability_blocks_insert on public.availability_blocks for insert to authenticated
  with check (private.is_vehicle_member(vehicle_id) and kind in ('maintenance', 'owner_block')
              and created_by = (select auth.uid()));
create policy availability_blocks_delete on public.availability_blocks for delete to authenticated
  using (private.is_vehicle_member(vehicle_id) and kind in ('maintenance', 'owner_block'));

create policy favorites_own on public.favorites for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy saved_searches_own on public.saved_searches for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy listing_stats_member on public.listing_stats_daily for select to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id and private.is_partner_member(l.partner_id))
         or private.is_staff());

-- Réservations
create policy bookings_select on public.bookings for select to authenticated
  using (customer_id = (select auth.uid()) or private.is_partner_member(partner_id) or private.is_staff());
create policy booking_extras_select on public.booking_extras for select to authenticated
  using (private.can_access_booking(booking_id));
create policy booking_status_history_select on public.booking_status_history for select to authenticated
  using (private.can_access_booking(booking_id));

create policy booking_drivers_select on public.booking_drivers for select to authenticated
  using (private.can_access_booking(booking_id));
create policy booking_drivers_insert on public.booking_drivers for insert to authenticated
  with check (exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = (select auth.uid())
                       and b.status in ('pending_payment', 'pending_confirmation', 'confirmed')));
create policy booking_drivers_delete on public.booking_drivers for delete to authenticated
  using (not is_primary and exists (select 1 from public.bookings b where b.id = booking_id
                                     and b.customer_id = (select auth.uid())
                                     and b.status in ('pending_payment', 'pending_confirmation', 'confirmed')));

create policy vehicle_inspections_select on public.vehicle_inspections for select to authenticated
  using (private.can_access_booking(booking_id));
create policy vehicle_inspections_insert on public.vehicle_inspections for insert to authenticated
  with check (performed_by = (select auth.uid())
              and exists (select 1 from public.bookings b where b.id = booking_id and private.is_partner_member(b.partner_id)
                           and b.status in ('confirmed', 'in_progress')));
create policy vehicle_inspections_update on public.vehicle_inspections for update to authenticated
  using (customer_signed_at is null
         and exists (select 1 from public.bookings b where b.id = booking_id and private.is_partner_member(b.partner_id)))
  with check (exists (select 1 from public.bookings b where b.id = booking_id and private.is_partner_member(b.partner_id)));

create policy inspection_photos_select on public.inspection_photos for select to authenticated
  using (private.can_access_inspection(inspection_id));
create policy inspection_photos_insert on public.inspection_photos for insert to authenticated
  with check (taken_by = (select auth.uid()) and private.can_access_inspection(inspection_id));

create policy inspection_damages_select on public.inspection_damages for select to authenticated
  using (private.can_access_inspection(inspection_id));
create policy inspection_damages_insert on public.inspection_damages for insert to authenticated
  with check (private.can_access_inspection(inspection_id));
create policy inspection_damages_update on public.inspection_damages for update to authenticated
  using (exists (select 1 from public.vehicle_inspections vi join public.bookings b on b.id = vi.booking_id
                  where vi.id = inspection_id and private.is_partner_member(b.partner_id)))
  with check (private.can_access_inspection(inspection_id));

create policy contracts_select on public.contracts for select to authenticated
  using (private.can_access_booking(booking_id));

-- Promo
create policy promo_codes_select on public.promo_codes for select to authenticated
  using ((partner_id is not null and private.is_partner_member(partner_id)) or private.is_staff());
create policy promo_codes_partner_insert on public.promo_codes for insert to authenticated
  with check (partner_id is not null and private.is_partner_manager(partner_id) and created_by = (select auth.uid()));
create policy promo_codes_partner_update on public.promo_codes for update to authenticated
  using (partner_id is not null and private.is_partner_manager(partner_id))
  with check (partner_id is not null and private.is_partner_manager(partner_id));
create policy promo_redemptions_select on public.promo_redemptions for select to authenticated
  using (user_id = (select auth.uid()) or private.is_staff());

-- Paiements (lecture seule côté client)
create policy payments_select on public.payments for select to authenticated
  using (payer_id = (select auth.uid())
         or (booking_id is not null and exists (select 1 from public.bookings b where b.id = booking_id and private.is_partner_member(b.partner_id)))
         or (sale_reservation_id is not null and exists (select 1 from public.sale_reservations s where s.id = sale_reservation_id and private.is_partner_member(s.partner_id)))
         or private.is_staff());
create policy deposits_select on public.deposits for select to authenticated
  using (private.can_access_booking(booking_id));
create policy refunds_select on public.refunds for select to authenticated
  using (exists (select 1 from public.payments p where p.id = payment_id and p.payer_id = (select auth.uid()))
         or private.is_staff());
create policy invoices_select on public.invoices for select to authenticated
  using (customer_id = (select auth.uid()) or (partner_id is not null and private.is_partner_member(partner_id)) or private.is_staff());
create policy payouts_select on public.payouts for select to authenticated
  using (private.is_partner_manager(partner_id) or private.is_admin());
create policy payout_items_select on public.payout_items for select to authenticated
  using (exists (select 1 from public.payouts p where p.id = payout_id and (private.is_partner_manager(p.partner_id) or private.is_admin())));

-- Vente
create policy test_drives_select on public.test_drives for select to authenticated
  using (buyer_id = (select auth.uid()) or private.is_partner_member(partner_id) or private.is_staff());
create policy sale_reservations_select on public.sale_reservations for select to authenticated
  using (buyer_id = (select auth.uid()) or private.is_partner_member(partner_id) or private.is_staff());
create policy financing_requests_select on public.financing_requests for select to authenticated
  using (buyer_id = (select auth.uid())
         or exists (select 1 from public.listings l where l.id = listing_id and private.is_partner_member(l.partner_id))
         or private.is_staff());
create policy financing_requests_insert on public.financing_requests for insert to authenticated
  with check (buyer_id = (select auth.uid())
              and exists (select 1 from public.listings l where l.id = listing_id and l.type = 'sale' and l.status = 'published'));
create policy vehicle_sales_select on public.vehicle_sales for select to authenticated
  using (buyer_id = (select auth.uid()) or private.is_partner_member(partner_id) or private.is_staff());

-- Messagerie
create policy conversations_select on public.conversations for select to authenticated
  using (customer_id = (select auth.uid()) or private.is_partner_member(partner_id) or private.is_staff());
create policy conversation_reads_own on public.conversation_reads for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and private.can_access_conversation(conversation_id));
create policy messages_select on public.messages for select to authenticated
  using (private.can_access_conversation(conversation_id)
         and (status <> 'hidden' or sender_id = (select auth.uid()) or private.is_staff()));
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid())
              and kind in ('text', 'attachment')
              and not coalesce((select p.is_suspended from public.profiles p where p.id = (select auth.uid())), true)
              and exists (select 1 from public.conversations c
                           where c.id = conversation_id and c.status = 'open'
                             and (c.customer_id = (select auth.uid()) or private.is_partner_member(c.partner_id))));
create policy messages_soft_delete on public.messages for update to authenticated
  using (sender_id = (select auth.uid()) and created_at > now() - interval '15 minutes')
  with check (sender_id = (select auth.uid()));

-- Avis
create policy reviews_read on public.reviews for select to anon, authenticated
  using (status = 'visible' or author_id = (select auth.uid()) or private.is_partner_member(partner_id)
         or subject_user_id = (select auth.uid()) or private.is_staff());

-- Notifications
create policy notifications_own_select on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_own_update on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy notifications_own_delete on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));
create policy notification_deliveries_staff on public.notification_deliveries for select to authenticated
  using (private.is_admin());

-- Confiance & sécurité
create policy moderation_flags_report on public.moderation_flags for insert to authenticated
  with check (source = 'user_report' and reporter_id = (select auth.uid()));
create policy moderation_flags_select on public.moderation_flags for select to authenticated
  using (reporter_id = (select auth.uid()) or private.is_moderator());
create policy fraud_signals_staff on public.fraud_signals for select to authenticated using (private.is_moderator());
create policy user_sanctions_select on public.user_sanctions for select to authenticated
  using (user_id = (select auth.uid()) or (partner_id is not null and private.is_partner_manager(partner_id)) or private.is_moderator());
create policy blocklist_admin on public.blocklist for select to authenticated using (private.is_admin());
create policy ai_jobs_staff on public.ai_jobs for select to authenticated using (private.is_moderator());
create policy ai_agent_runs_staff on public.ai_agent_runs for select to authenticated using (private.is_moderator());
create policy audit_logs_admin on public.audit_logs for select to authenticated using (private.is_admin());

-- Litiges
create policy disputes_select on public.disputes for select to authenticated
  using (private.can_access_booking(booking_id));
create policy disputes_insert on public.disputes for insert to authenticated
  with check (opened_by = (select auth.uid())
              and exists (select 1 from public.bookings b where b.id = booking_id
                           and (b.customer_id = (select auth.uid()) or private.is_partner_member(b.partner_id))
                           and b.status in ('in_progress', 'completed', 'disputed', 'cancelled_by_partner', 'cancelled_by_customer')));
create policy dispute_evidence_select on public.dispute_evidence for select to authenticated
  using (private.can_access_dispute(dispute_id));
create policy dispute_evidence_insert on public.dispute_evidence for insert to authenticated
  with check (submitted_by = (select auth.uid()) and private.can_access_dispute(dispute_id));

-- Support
create policy support_tickets_select on public.support_tickets for select to authenticated
  using (user_id = (select auth.uid()) or private.is_staff());
create policy support_tickets_insert on public.support_tickets for insert to authenticated
  with check (user_id = (select auth.uid())
              and (booking_id is null or exists (select 1 from public.bookings b where b.id = booking_id
                                                  and (b.customer_id = (select auth.uid()) or private.is_partner_member(b.partner_id)))));
create policy support_tickets_rate on public.support_tickets for update to authenticated
  using (user_id = (select auth.uid()) and status in ('resolved', 'closed'))
  with check (user_id = (select auth.uid()));
create policy support_messages_select on public.support_messages for select to authenticated
  using (exists (select 1 from public.support_tickets t where t.id = ticket_id
                  and ((t.user_id = (select auth.uid()) and not support_messages.is_internal_note) or private.is_staff())));
create policy support_messages_insert on public.support_messages for insert to authenticated
  with check (author_id = (select auth.uid())
              and exists (select 1 from public.support_tickets t where t.id = ticket_id
                           and (t.user_id = (select auth.uid()) or private.is_staff())));

-- -----------------------------------------------------------------------------
-- 4. Droits d'exécution des fonctions
-- -----------------------------------------------------------------------------
-- Fonctions internes : schéma « private » non exposé par l'API ; exécutables par les
-- rôles uniquement parce que les policies, valeurs par défaut et triggers les appellent.
revoke all on all functions in schema private from public;
grant execute on all functions in schema private to anon, authenticated, service_role;

revoke execute on all functions in schema public from public, anon, authenticated;

-- Accessibles sans compte (catalogue, devis, FAQ)
grant execute on function
  public.search_listings(public.listing_type, text, integer, numeric, numeric, numeric, integer[], integer[], integer[],
                         bigint, bigint, integer, integer, public.fuel_type[], public.transmission_type[], integer, integer,
                         text, boolean, boolean, boolean, boolean, boolean, boolean, boolean, timestamptz, timestamptz,
                         text, integer, integer),
  public.suggest_similar_listings(public.listing_type, uuid, integer, integer, bigint, integer),
  public.quote_rental(uuid, timestamptz, timestamptz, jsonb, integer, boolean, boolean, text),
  public.get_listing_busy_periods(uuid, timestamptz, timestamptz),
  public.get_platform_stats(),
  public.track_listing_event(uuid, text),
  public.search_faq(text, text, integer),
  public.vote_faq(uuid, boolean)
to anon, authenticated;

-- Utilisateurs connectés
grant execute on function
  public.create_rental_booking(uuid, timestamptz, timestamptz, jsonb, integer, boolean, boolean, text, numeric, numeric,
                               text, public.deposit_mode, text),
  public.create_booking_payment(uuid, public.payment_purpose),
  public.cancel_booking(uuid, text),
  public.respond_to_booking(uuid, boolean, text),
  public.start_booking(uuid, text, integer),
  public.complete_booking(uuid, integer),
  public.sign_inspection(uuid),
  public.get_booking_contacts(uuid),
  public.become_partner(public.partner_type, text, integer, integer, text, text, text, text, text, text),
  public.verify_partner(uuid, boolean, text),
  public.submit_listing_for_review(uuid),
  public.set_listing_status(uuid, public.listing_status),
  public.moderate_listing(uuid, boolean, text),
  public.record_vehicle_sale(uuid, bigint, uuid, boolean),
  public.get_partner_kpis(uuid, date, date, integer),
  public.get_partner_revenue_series(uuid, date, date, text, integer),
  public.get_partner_todos(uuid),
  public.get_my_reminders(),
  public.start_listing_conversation(uuid, text),
  public.mark_conversation_read(uuid),
  public.request_test_drive(uuid, timestamptz, integer, text, text),
  public.update_test_drive_status(uuid, public.test_drive_status, text),
  public.create_sale_reservation(uuid),
  public.submit_review(uuid, smallint, text, smallint, smallint, smallint, smallint),
  public.respond_to_review(uuid, text),
  public.review_user_document(uuid, boolean, text, text, date, date),
  public.decide_kyc(uuid, boolean, text, text, date, date, date),
  public.resolve_flag(uuid, boolean, text),
  public.request_account_deletion(text),
  public.cancel_account_deletion(),
  public.invite_partner_member(uuid, text, public.partner_member_role),
  public.accept_partner_invitation(text)
to authenticated;

-- Serveur uniquement (webhooks, cron, agents IA, back-office)
grant execute on function
  public.handle_payment_success(uuid, text, public.payment_method, jsonb),
  public.handle_payment_failure(uuid, text, jsonb),
  public.record_deposit_authorization(uuid, text, timestamptz),
  public.handle_refund_result(uuid, boolean, text, text),
  public.expire_stale_bookings(),
  public.release_due_deposits(),
  public.expire_sale_reservations(),
  public.refresh_partner_stats(),
  public.claim_ai_jobs(integer, text),
  public.complete_ai_job(bigint, boolean, text, smallint, text, jsonb, text, text, text, integer, integer, integer, numeric, text),
  public.anonymize_user(uuid)
to service_role;

-- Les futures fonctions du schéma public ne seront pas exécutables par défaut
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. Journal d'audit sur les tables sensibles
-- -----------------------------------------------------------------------------
create trigger audit_user_roles after insert or update or delete on public.user_roles
  for each row execute function private.audit_trigger('user_id');
create trigger audit_user_documents after update of status on public.user_documents
  for each row execute function private.audit_trigger();
create trigger audit_kyc_verifications after insert or update on public.kyc_verifications
  for each row execute function private.audit_trigger();
create trigger audit_partners after update of verification_status, is_active, is_super_host on public.partners
  for each row execute function private.audit_trigger();
create trigger audit_partner_private after update on public.partner_private
  for each row execute function private.audit_trigger('partner_id');
create trigger audit_partner_payout_accounts after insert or update or delete on public.partner_payout_accounts
  for each row execute function private.audit_trigger();
create trigger audit_listings after update of status, is_featured on public.listings
  for each row execute function private.audit_trigger();
create trigger audit_bookings after update of status, refund_amount on public.bookings
  for each row execute function private.audit_trigger();
create trigger audit_payments after insert or update of status, refunded_amount on public.payments
  for each row execute function private.audit_trigger();
create trigger audit_deposits after update of status, captured_amount on public.deposits
  for each row execute function private.audit_trigger();
create trigger audit_refunds after insert or update of status on public.refunds
  for each row execute function private.audit_trigger();
create trigger audit_payouts after insert or update of status on public.payouts
  for each row execute function private.audit_trigger();
create trigger audit_user_sanctions after insert or update on public.user_sanctions
  for each row execute function private.audit_trigger();
create trigger audit_platform_settings after insert or update or delete on public.platform_settings
  for each row execute function private.audit_trigger('key');
create trigger audit_moderation_flags after update of status on public.moderation_flags
  for each row execute function private.audit_trigger();
create trigger audit_vehicle_private after update on public.vehicle_private
  for each row execute function private.audit_trigger('vehicle_id');
