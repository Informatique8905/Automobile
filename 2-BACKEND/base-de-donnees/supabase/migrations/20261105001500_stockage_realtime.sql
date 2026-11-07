-- =============================================================================
-- 1500 — Supabase Storage (buckets + policies) et Realtime
-- Convention des chemins : le 1er dossier identifie le propriétaire
--   vehicle-photos     {partner_id}/{vehicle_id}/{uuid}.webp      public
--   avatars            {user_id}/{uuid}.webp                      public
--   partner-logos      {partner_id}/{uuid}.webp                   public
--   kyc-documents      {user_id}/{uuid}.jpg                       privé
--   partner-documents  {partner_id}/{uuid}.pdf                    privé
--   vehicle-documents  {partner_id}/{vehicle_id}/{uuid}.pdf       privé
--   inspection-photos  {booking_id}/{uuid}.jpg                    privé
--   message-attachments {conversation_id}/{uuid}.jpg              privé
--   dispute-evidence   {dispute_id}/{uuid}.jpg                    privé
--   contracts          {booking_id}/{uuid}.pdf                    privé (écrit par le serveur)
--   invoices           {booking_id}/{uuid}.pdf                    privé (écrit par le serveur)
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('vehicle-photos',      'vehicle-photos',      true,  10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('avatars',             'avatars',             true,   5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('partner-logos',       'partner-logos',       true,   5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
  ('kyc-documents',       'kyc-documents',       false, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']),
  ('partner-documents',   'partner-documents',   false, 15728640, array['image/jpeg', 'image/png', 'application/pdf']),
  ('vehicle-documents',   'vehicle-documents',   false, 15728640, array['image/jpeg', 'image/png', 'application/pdf']),
  ('inspection-photos',   'inspection-photos',   false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('message-attachments', 'message-attachments', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('dispute-evidence',    'dispute-evidence',    false, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('contracts',           'contracts',           false,  5242880, array['application/pdf']),
  ('invoices',            'invoices',            false,  5242880, array['application/pdf'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Raccourci : n-ième dossier du chemin converti en uuid (null si invalide)
create or replace function private.storage_owner(p_name text, p_level integer default 1)
returns uuid
language sql
stable
set search_path = ''
as $$
  select private.try_uuid((storage.foldername(p_name))[p_level]);
$$;
grant execute on function private.storage_owner(text, integer) to anon, authenticated, service_role;

-- Photos de véhicules (public en lecture)
create policy "vehicle_photos_public_read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'vehicle-photos');
create policy "vehicle_photos_member_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'vehicle-photos' and private.is_partner_member(private.storage_owner(name)));
create policy "vehicle_photos_member_update" on storage.objects for update to authenticated
  using (bucket_id = 'vehicle-photos' and private.is_partner_member(private.storage_owner(name)));
create policy "vehicle_photos_member_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'vehicle-photos' and private.is_partner_member(private.storage_owner(name)));

-- Avatars
create policy "avatars_public_read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'avatars');
create policy "avatars_owner_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and private.storage_owner(name) = (select auth.uid()));
create policy "avatars_owner_update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and private.storage_owner(name) = (select auth.uid()));
create policy "avatars_owner_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and private.storage_owner(name) = (select auth.uid()));

-- Logos partenaires
create policy "partner_logos_public_read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'partner-logos');
create policy "partner_logos_manager_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'partner-logos' and private.is_partner_manager(private.storage_owner(name)));
create policy "partner_logos_manager_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'partner-logos' and private.is_partner_manager(private.storage_owner(name)));

-- Coffre-fort KYC : propriétaire + modération (lecture), jamais public
create policy "kyc_owner_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'kyc-documents' and private.storage_owner(name) = (select auth.uid()));
create policy "kyc_owner_or_moderator_read" on storage.objects for select to authenticated
  using (bucket_id = 'kyc-documents'
         and (private.storage_owner(name) = (select auth.uid()) or private.is_moderator()));
create policy "kyc_owner_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'kyc-documents' and private.storage_owner(name) = (select auth.uid()));

-- Justificatifs partenaires
create policy "partner_documents_manager_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'partner-documents' and private.is_partner_manager(private.storage_owner(name)));
create policy "partner_documents_read" on storage.objects for select to authenticated
  using (bucket_id = 'partner-documents'
         and (private.is_partner_manager(private.storage_owner(name)) or private.is_moderator()));

-- Documents véhicules (les documents publics sont servis par URL signée générée côté serveur)
create policy "vehicle_documents_member_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'vehicle-documents' and private.is_partner_member(private.storage_owner(name)));
create policy "vehicle_documents_member_read" on storage.objects for select to authenticated
  using (bucket_id = 'vehicle-documents'
         and (private.is_partner_member(private.storage_owner(name)) or private.is_staff()));
create policy "vehicle_documents_member_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'vehicle-documents' and private.is_partner_manager(private.storage_owner(name)));

-- État des lieux : les deux parties de la réservation
create policy "inspection_photos_party_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'inspection-photos' and private.can_access_booking(private.storage_owner(name)));
create policy "inspection_photos_party_read" on storage.objects for select to authenticated
  using (bucket_id = 'inspection-photos' and private.can_access_booking(private.storage_owner(name)));

-- Pièces jointes de messagerie : participants
create policy "message_attachments_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'message-attachments' and private.can_access_conversation(private.storage_owner(name)));
create policy "message_attachments_read" on storage.objects for select to authenticated
  using (bucket_id = 'message-attachments' and private.can_access_conversation(private.storage_owner(name)));

-- Preuves de litige
create policy "dispute_evidence_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'dispute-evidence' and private.can_access_dispute(private.storage_owner(name)));
create policy "dispute_evidence_read" on storage.objects for select to authenticated
  using (bucket_id = 'dispute-evidence' and (private.can_access_dispute(private.storage_owner(name)) or private.is_staff()));

-- Contrats et factures : lecture par les parties, écriture serveur (service_role) uniquement
create policy "contracts_party_read" on storage.objects for select to authenticated
  using (bucket_id = 'contracts' and private.can_access_booking(private.storage_owner(name)));
create policy "invoices_party_read" on storage.objects for select to authenticated
  using (bucket_id = 'invoices' and private.can_access_booking(private.storage_owner(name)));

-- -----------------------------------------------------------------------------
-- Realtime : messagerie, notifications, statut de flotte, suivi de réservation
-- (Realtime applique les policies RLS : chacun ne reçoit que ce qu'il peut lire)
-- -----------------------------------------------------------------------------
alter publication supabase_realtime add table
  public.messages,
  public.conversations,
  public.notifications,
  public.bookings,
  public.vehicles;
