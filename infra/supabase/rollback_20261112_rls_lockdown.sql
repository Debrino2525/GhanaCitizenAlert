-- =============================================================
-- EMERGENCY ROLLBACK for migrations/20261112000000_rls_lockdown.sql
-- Restores the policies, grants, feed view and bucket flags exactly as
-- captured from the live database on 2026-11-12 immediately before the
-- migration was applied. WARNING: this re-opens the database to the
-- public (that was the pre-migration state). Use only to unblock an outage.
-- New helper functions/RPCs are left in place (harmless when unused).
-- =============================================================

begin;

-- 1. Drop the lockdown's policies on the managed tables and storage
do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies
    where (schemaname = 'public' and tablename = any (array['incidents','emergency_alerts','alert_sightings','audit_evidence_ledger','statutory_appeals','sos_pings']))
       or (schemaname = 'storage' and tablename = 'objects'
           and (coalesce(qual,'') || coalesce(with_check,'')) ~ '(''evidence''|''alert-photos''|''avatars'')')
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

drop trigger if exists incidents_sanitize_insert on public.incidents;
drop trigger if exists alerts_stamp_issuer on public.emergency_alerts;

-- 2. Pre-migration policies (verbatim from pg_policies)
create policy alert_photos_officer_delete on storage.objects as PERMISSIVE for DELETE to authenticated using (((bucket_id = 'alert-photos'::text) AND ( SELECT is_active_officer() AS is_active_officer)));
create policy alert_photos_officer_insert on storage.objects as PERMISSIVE for INSERT to authenticated with check (((bucket_id = 'alert-photos'::text) AND ( SELECT is_active_officer() AS is_active_officer)));
create policy alert_photos_officer_select on storage.objects as PERMISSIVE for SELECT to authenticated using (((bucket_id = 'alert-photos'::text) AND ( SELECT is_active_officer() AS is_active_officer)));
create policy alert_photos_officer_update on storage.objects as PERMISSIVE for UPDATE to authenticated using (((bucket_id = 'alert-photos'::text) AND ( SELECT is_active_officer() AS is_active_officer))) with check (((bucket_id = 'alert-photos'::text) AND ( SELECT is_active_officer() AS is_active_officer)));
create policy "evidence 6c0biv_0" on storage.objects as PERMISSIVE for INSERT to anon, authenticated with check ((bucket_id = 'evidence'::text));
create policy evidence_officer_select on storage.objects as PERMISSIVE for SELECT to authenticated using (((bucket_id = 'evidence'::text) AND ( SELECT is_active_officer() AS is_active_officer)));
create policy "Allow public delete on incidents" on public.incidents as PERMISSIVE for DELETE to public using (true);
create policy "Allow public update on incidents" on public.incidents as PERMISSIVE for UPDATE to public using (true) with check (true);
create policy "Officers can view all incidents" on public.incidents as PERMISSIVE for SELECT to authenticated using ((EXISTS ( SELECT 1 FROM officers WHERE (officers.id = auth.uid()))));
create policy "Public can view published incidents" on public.incidents as PERMISSIVE for SELECT to public using ((is_public_published = true));
create policy incidents_citizen_select_own on public.incidents as PERMISSIVE for SELECT to authenticated using ((reporter_id = ( SELECT auth.uid() AS uid)));
create policy incidents_insert_public on public.incidents as PERMISSIVE for INSERT to anon, authenticated with check (((COALESCE(is_public_published, false) = false) AND (COALESCE(is_public_eligible, false) = false) AND (COALESCE(public_corroborations, 0) = 0) AND ((reporter_id IS NULL) OR (reporter_id = ( SELECT auth.uid() AS uid)))));
create policy incidents_officer_select on public.incidents as PERMISSIVE for SELECT to authenticated using (( SELECT is_active_officer() AS is_active_officer));
create policy incidents_officer_update on public.incidents as PERMISSIVE for UPDATE to authenticated using (( SELECT is_active_officer() AS is_active_officer)) with check (( SELECT is_active_officer() AS is_active_officer));
create policy "Allow public insert on audit_ledger" on public.audit_evidence_ledger as PERMISSIVE for INSERT to public with check (true);
create policy "Allow public read on audit_ledger" on public.audit_evidence_ledger as PERMISSIVE for SELECT to public using (true);
create policy "Officers can view sightings" on public.alert_sightings as PERMISSIVE for SELECT to authenticated using ((EXISTS ( SELECT 1 FROM officers WHERE (officers.id = auth.uid()))));
create policy "Public can submit sightings" on public.alert_sightings as PERMISSIVE for INSERT to public with check (true);
create policy sightings_insert_public on public.alert_sightings as PERMISSIVE for INSERT to anon, authenticated with check (((alert_id IS NOT NULL) AND (COALESCE(is_verified, false) = false)));
create policy sightings_officer_select on public.alert_sightings as PERMISSIVE for SELECT to authenticated using (( SELECT is_active_officer() AS is_active_officer));
create policy sightings_officer_update on public.alert_sightings as PERMISSIVE for UPDATE to authenticated using (( SELECT is_active_officer() AS is_active_officer)) with check (( SELECT is_active_officer() AS is_active_officer));
create policy "Allow public delete on emergency_alerts" on public.emergency_alerts as PERMISSIVE for DELETE to public using (true);
create policy "Allow public insert on emergency_alerts" on public.emergency_alerts as PERMISSIVE for INSERT to public with check (true);
create policy "Allow public read on emergency_alerts" on public.emergency_alerts as PERMISSIVE for SELECT to public using (true);
create policy "Allow public update on emergency_alerts" on public.emergency_alerts as PERMISSIVE for UPDATE to public using (true) with check (true);
create policy alerts_officer_insert on public.emergency_alerts as PERMISSIVE for INSERT to authenticated with check (( SELECT is_active_officer() AS is_active_officer));
create policy alerts_officer_select on public.emergency_alerts as PERMISSIVE for SELECT to authenticated using (( SELECT is_active_officer() AS is_active_officer));
create policy alerts_officer_update on public.emergency_alerts as PERMISSIVE for UPDATE to authenticated using (( SELECT is_active_officer() AS is_active_officer)) with check (( SELECT is_active_officer() AS is_active_officer));
create policy alerts_public_read_active on public.emergency_alerts as PERMISSIVE for SELECT to anon, authenticated using (((is_active = true) AND (active_until > now())));
create policy "Allow public insert on statutory_appeals" on public.statutory_appeals as PERMISSIVE for INSERT to public with check (true);
create policy "Allow public read on statutory_appeals" on public.statutory_appeals as PERMISSIVE for SELECT to public using (true);
create policy "Allow public update on statutory_appeals" on public.statutory_appeals as PERMISSIVE for UPDATE to public using (true);
create policy "Citizens can transmit SOS pings" on public.sos_pings as PERMISSIVE for INSERT to public with check (true);
create policy "Officers can read live SOS pings" on public.sos_pings as PERMISSIVE for SELECT to authenticated using ((EXISTS ( SELECT 1 FROM officers WHERE (officers.id = auth.uid()))));
create policy sos_insert on public.sos_pings as PERMISSIVE for INSERT to anon, authenticated with check (((reporter_id IS NULL) OR (reporter_id = ( SELECT auth.uid() AS uid))));
create policy sos_select on public.sos_pings as PERMISSIVE for SELECT to authenticated using ((( SELECT is_active_officer() AS is_active_officer) OR (reporter_id = ( SELECT auth.uid() AS uid))));

-- 3. Pre-migration grants
grant insert, select, update, delete, truncate, references, trigger on public.alert_sightings, public.audit_evidence_ledger, public.emergency_alerts, public.incidents, public.statutory_appeals to anon, authenticated;
grant insert on public.sos_pings to anon;
grant select, insert on public.sos_pings to authenticated;

-- 4. Pre-migration feed view
drop view if exists public.public_takedowns;
drop view if exists public.public_feed_incidents;
create view public.public_feed_incidents as
 SELECT id, tracking_code, category, title, description, location_name, region,
    round(latitude::numeric, 3)::double precision AS latitude,
    round(longitude::numeric, 3)::double precision AS longitude,
    severity, status, public_corroborations, created_at, updated_at
   FROM incidents
  WHERE is_public_published IS TRUE AND is_public_eligible IS TRUE;
grant select on public.public_feed_incidents to anon, authenticated;

-- 5. Pre-migration bucket flags
update storage.buckets set public = true where id = 'evidence';
update storage.buckets set public = true where id = 'alert-photos';

commit;
