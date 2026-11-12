-- =============================================================
-- CitizenAlert Ghana — phase 3c: finish the RLS lockdown (DRAFT)
--
-- Written against the LIVE database (project fqgujgwdgqlxnpmpmiui) as
-- inspected on 2026-11-12, on top of migrations phase1 .. update_incident_location_rpc.
--
-- Live state this fixes: phase3a/3b added correct officer-scoped policies
-- but left the original "Allow public ..." policies in place. Permissive
-- policies are OR-ed, so today anyone with the anon key can still:
--   * UPDATE and DELETE any incident; read published rows incl. reporter_data
--   * INSERT / UPDATE / DELETE emergency (Amber/Red) alerts
--   * read, insert and update statutory_appeals (names, contacts, DPO notes)
--   * read and insert the audit_evidence_ledger
--   * download any evidence file (bucket "evidence" is public)
--
-- Untouched on purpose (already correct live): officers, profiles,
-- moderation_appeals, officer_audit_log, attach_incident_media,
-- update_incident_location, submit_moderation_appeal, is_active_officer,
-- is_admin. Unrelated tables bookings / disruption_events / tracked_flights
-- are not touched.
--
-- REQUIRES CLIENT CHANGES - see "CLIENT IMPACT" notes. Supabase runs each
-- migration in a single transaction, so a failure rolls everything back.
-- =============================================================

-- -------------------------------------------------------------
-- 0. Private helpers (schema not exposed through PostgREST)
--    Same officer definition as public.is_active_officer(), plus role.
-- -------------------------------------------------------------
create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to anon, authenticated;

create or replace function app_private.officer_role()
returns text
language sql stable security definer
set search_path = ''
as $$
  select o.role
  from public.officers o
  where o.id = auth.uid()
    and o.is_active = true
    and o.must_change_password = false
  limit 1
$$;

create or replace function app_private.is_officer()
returns boolean
language sql stable security definer
set search_path = ''
as $$ select app_private.officer_role() is not null $$;

create or replace function app_private.officer_has_role(roles text[])
returns boolean
language sql stable security definer
set search_path = ''
as $$ select coalesce(app_private.officer_role() = any(roles), false) $$;

create or replace function app_private.can_view_dovvsu()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select app_private.officer_has_role(
    array['ADMIN', 'NATIONAL_COMMAND_SUPERVISOR', 'DOVVSU_INVESTIGATOR'])
$$;

-- True when an evidence object is referenced by a published, eligible,
-- non-DOVVSU, not-taken-down incident (public bulletin playback).
create or replace function app_private.is_published_media(p_name text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.incidents i
    where i.is_public_published is true
      and i.is_public_eligible is true
      and i.assigned_agency is distinct from 'DOVVSU'
      and position(p_name in i.media::text) > 0
      and not exists (
        select 1 from public.statutory_appeals a
        where a.status = 'GRANTED'
          and (a.incident_id = i.id or a.tracking_code = i.tracking_code))
  )
$$;

revoke all on all functions in schema app_private from public;
grant execute on all functions in schema app_private to anon, authenticated;

-- -------------------------------------------------------------
-- 1. Drop every policy on the tables this migration owns, then rebuild
-- -------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any (array[
        'incidents', 'emergency_alerts', 'alert_sightings',
        'audit_evidence_ledger', 'statutory_appeals', 'sos_pings'])
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

revoke update, delete, truncate on
  public.incidents, public.emergency_alerts, public.alert_sightings,
  public.audit_evidence_ledger, public.statutory_appeals, public.sos_pings
from anon;
revoke delete, truncate on
  public.incidents, public.emergency_alerts, public.alert_sightings,
  public.audit_evidence_ledger, public.statutory_appeals, public.sos_pings
from authenticated;
revoke insert, update on public.audit_evidence_ledger from anon, authenticated;

-- -------------------------------------------------------------
-- 2. incidents
-- -------------------------------------------------------------
create policy incidents_officer_select on public.incidents
  for select to authenticated
  using ((select app_private.is_officer())
         and (assigned_agency is distinct from 'DOVVSU'
              or (select app_private.can_view_dovvsu())));

create policy incidents_reporter_select on public.incidents
  for select to authenticated
  using (reporter_id = (select auth.uid()));

-- Field sanitising for citizens happens in the trigger below.
create policy incidents_public_insert on public.incidents
  for insert to anon, authenticated
  with check (reporter_id is null or reporter_id = (select auth.uid()));

create policy incidents_officer_update on public.incidents
  for update to authenticated
  using ((select app_private.is_officer())
         and (assigned_agency is distinct from 'DOVVSU'
              or (select app_private.can_view_dovvsu())))
  with check ((select app_private.is_officer()));

-- Citizens cannot self-publish, fake trust or impersonate another user.
-- (Complements the existing incidents_anon_reporter_guard trigger.)
create or replace function app_private.incidents_sanitize_insert()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_trust int  := 0;
begin
  if app_private.is_officer() then
    return new;
  end if;

  new.status                := 'RECEIVED_PENDING_TRIAGE';
  new.is_public_eligible    := false;
  new.is_public_published   := false;
  new.public_corroborations := 0;
  new.investigator_notes    := '[]'::jsonb;
  new.created_at            := now();
  new.updated_at            := now();

  if new.is_anonymous is true or v_uid is null then
    new.reporter_id := null;
  else
    new.reporter_id := v_uid;
    select coalesce((u.raw_app_meta_data ->> 'trust_score')::int, 0)
      into v_trust
      from auth.users u where u.id = v_uid;
  end if;

  new.reporter_trust_score := coalesce(v_trust, 0);
  new.reporter_data := coalesce(new.reporter_data, '{}'::jsonb)
                       || jsonb_build_object('trustScore', coalesce(v_trust, 0));
  return new;
end $$;

drop trigger if exists incidents_sanitize_insert on public.incidents;
create trigger incidents_sanitize_insert
  before insert on public.incidents
  for each row execute function app_private.incidents_sanitize_insert();

-- CLIENT IMPACT: SosPanicScreen "stand down" must call this RPC instead of
-- .from('incidents').update(...). Same capability model as the existing
-- update_incident_location RPC (tracking code + reporter match + 24h).
create or replace function public.cancel_sos_beacon(p_tracking_code text)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare n int;
begin
  update public.incidents
     set title           = '🛑 EMERGENCY SOS BEACON (STAND DOWN / CANCELLED)',
         location_source = 'LAST_KNOWN',
         status          = 'RESOLVED',
         updated_at      = now()
   where tracking_code = p_tracking_code
     and coalesce((reporter_data ->> 'isEmergencyPanic')::boolean, false)
     and status <> 'RESOLVED'
     and created_at > now() - interval '24 hours'
     and (reporter_id is null or reporter_id = auth.uid());
  get diagnostics n = row_count;
  return n = 1;
end $$;

revoke all on function public.cancel_sos_beacon(text) from public;
grant execute on function public.cancel_sos_beacon(text) to anon, authenticated;

-- Existing RPC: pin search_path (advisor 0011). Body unchanged.
alter function public.increment_corroboration(uuid) set search_path = public;

-- -------------------------------------------------------------
-- 3. Public feed view
--    Keeps the live view's privacy choices (rounded coords, requires
--    is_public_eligible) and adds what the mobile feed needs, while
--    excluding DOVVSU cases and granted takedowns.
-- CLIENT IMPACT: AmberAlertsScreen must read this view instead of
-- .from('incidents'); PublicWebFeed's fallback to incidents can go.
-- -------------------------------------------------------------
drop view if exists public.public_feed_incidents;
create view public.public_feed_incidents
  with (security_invoker = false) as
select i.id, i.tracking_code, i.category, i.title, i.description,
       i.location_name, i.ghanapost_code, i.region,
       round(i.latitude::numeric, 3)::double precision  as latitude,
       round(i.longitude::numeric, 3)::double precision as longitude,
       i.location_source, i.gps_fix_age_s,
       i.severity, i.status, i.assigned_agency,
       i.public_corroborations, i.media, i.created_at, i.updated_at
from public.incidents i
where i.is_public_published is true
  and i.is_public_eligible is true
  and i.assigned_agency is distinct from 'DOVVSU'
  and not exists (
    select 1 from public.statutory_appeals a
    where a.status = 'GRANTED'
      and (a.incident_id = i.id or a.tracking_code = i.tracking_code));

revoke all on public.public_feed_incidents from anon, authenticated;
grant select on public.public_feed_incidents to anon, authenticated;

-- Takedown list without applicant names or contacts.
-- CLIENT IMPACT: AmberAlertsScreen:214 and PublicWebFeed:44 read
-- statutory_appeals directly; point them here (or drop the call - the
-- feed view already excludes granted takedowns).
drop view if exists public.public_takedowns;
create view public.public_takedowns
  with (security_invoker = false) as
select distinct a.incident_id, a.tracking_code
from public.statutory_appeals a
where a.status = 'GRANTED';

revoke all on public.public_takedowns from anon, authenticated;
grant select on public.public_takedowns to anon, authenticated;

-- -------------------------------------------------------------
-- 4. emergency_alerts
-- -------------------------------------------------------------
alter table public.emergency_alerts
  add column if not exists issued_by_officer_id uuid;

create policy alerts_public_select_active on public.emergency_alerts
  for select to anon, authenticated
  using (is_active = true and active_until > now());

create policy alerts_officer_select on public.emergency_alerts
  for select to authenticated
  using ((select app_private.is_officer()));

create policy alerts_officer_insert on public.emergency_alerts
  for insert to authenticated
  with check ((select app_private.officer_has_role(array[
    'ADMIN', 'NATIONAL_COMMAND_SUPERVISOR', 'POLICE_CID_OFFICER',
    'DOVVSU_INVESTIGATOR', 'CAD_DISPATCHER'])));

create policy alerts_officer_update on public.emergency_alerts
  for update to authenticated
  using ((select app_private.is_officer()))
  with check ((select app_private.is_officer()));

-- Record who actually issued the alert (server-side, not free text).
create or replace function app_private.alerts_stamp_issuer()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  new.issued_by_officer_id := auth.uid();
  return new;
end $$;

drop trigger if exists alerts_stamp_issuer on public.emergency_alerts;
create trigger alerts_stamp_issuer
  before insert on public.emergency_alerts
  for each row execute function app_private.alerts_stamp_issuer();

-- -------------------------------------------------------------
-- 5. alert_sightings, sos_pings
-- -------------------------------------------------------------
create policy sightings_public_insert on public.alert_sightings
  for insert to anon, authenticated
  with check (coalesce(is_verified, false) = false
              and exists (select 1 from public.emergency_alerts e
                          where e.id = alert_sightings.alert_id
                            and e.is_active = true));

create policy sightings_officer_select on public.alert_sightings
  for select to authenticated
  using ((select app_private.is_officer()));

create policy sightings_officer_update on public.alert_sightings
  for update to authenticated
  using ((select app_private.is_officer()))
  with check ((select app_private.is_officer()));

create policy sos_pings_public_insert on public.sos_pings
  for insert to anon, authenticated
  with check (reporter_id is null or reporter_id = (select auth.uid()));

create policy sos_pings_select on public.sos_pings
  for select to authenticated
  using ((select app_private.is_officer()) or reporter_id = (select auth.uid()));

-- -------------------------------------------------------------
-- 6. statutory_appeals
-- -------------------------------------------------------------
create policy appeals_public_insert on public.statutory_appeals
  for insert to anon, authenticated
  with check (status = 'PENDING_REVIEW'
              and resolved_by is null and resolved_at is null and dpo_notes is null);

create policy appeals_officer_select on public.statutory_appeals
  for select to authenticated
  using ((select app_private.is_officer()));

create policy appeals_officer_update on public.statutory_appeals
  for update to authenticated
  using ((select app_private.is_officer()))
  with check ((select app_private.is_officer()));

-- -------------------------------------------------------------
-- 7. audit_evidence_ledger: no API writes; officers may read
-- -------------------------------------------------------------
create policy ledger_officer_select on public.audit_evidence_ledger
  for select to authenticated
  using ((select app_private.is_officer()));

-- -------------------------------------------------------------
-- 8. Trust score: server-owned, stored in app_metadata
--    (user_metadata is user-writable via auth.updateUser; it is mirrored
--    only so current app builds keep displaying the score).
--    Note: adjust_citizen_trust_score does not exist live today, so the
--    web dashboard's call to it currently fails silently.
-- -------------------------------------------------------------
create or replace function public.adjust_citizen_trust_score(target_user_id uuid, delta_score int)
returns int
language plpgsql security definer
set search_path = ''
as $$
declare
  v_current int;
  v_new int;
begin
  if not app_private.is_officer() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select coalesce((u.raw_app_meta_data ->> 'trust_score')::int, 0)
    into v_current
    from auth.users u where u.id = target_user_id
    for update;
  if not found then
    return 0;
  end if;

  v_new := greatest(0, least(100, v_current + greatest(-10, least(10, delta_score))));

  update auth.users
     set raw_app_meta_data  = coalesce(raw_app_meta_data, '{}'::jsonb)  || jsonb_build_object('trust_score', v_new),
         raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('trust_score', v_new)
   where id = target_user_id;

  return v_new;
end $$;

revoke all on function public.adjust_citizen_trust_score(uuid, int) from public, anon;
grant execute on function public.adjust_citizen_trust_score(uuid, int) to authenticated;

-- CLIENT IMPACT: trustScoreService.awardPostSubmissionTrustBonus must call
-- this instead of auth.updateUser({ data: { trust_score } }), and the apps
-- must read app_metadata.trust_score.
create or replace function public.claim_daily_post_trust_bonus()
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_meta jsonb;
  v_current int;
  v_last timestamptz;
  v_new int;
begin
  if v_uid is null then
    return jsonb_build_object('awarded', false, 'reason', 'not_signed_in', 'trust_score', 0);
  end if;

  select coalesce(u.raw_app_meta_data, '{}'::jsonb) into v_meta
    from auth.users u where u.id = v_uid
    for update;

  v_current := coalesce((v_meta ->> 'trust_score')::int, 0);
  v_last    := (v_meta ->> 'last_post_trust_at')::timestamptz;

  if v_last is not null and v_last > now() - interval '24 hours' then
    return jsonb_build_object('awarded', false, 'reason', 'cooldown',
                              'trust_score', v_current,
                              'next_eligible_at', v_last + interval '24 hours');
  end if;

  if not exists (select 1 from public.incidents i
                 where i.reporter_id = v_uid
                   and i.created_at > now() - interval '1 hour') then
    return jsonb_build_object('awarded', false, 'reason', 'no_recent_report',
                              'trust_score', v_current);
  end if;

  v_new := least(100, v_current + 5);

  update auth.users
     set raw_app_meta_data  = coalesce(raw_app_meta_data, '{}'::jsonb)
                              || jsonb_build_object('trust_score', v_new,
                                                    'last_post_trust_at', now()),
         raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
                              || jsonb_build_object('trust_score', v_new)
   where id = v_uid;

  return jsonb_build_object('awarded', true, 'trust_score', v_new);
end $$;

revoke all on function public.claim_daily_post_trust_bonus() from public, anon;
grant execute on function public.claim_daily_post_trust_bonus() to authenticated;

-- -------------------------------------------------------------
-- 9. Storage
-- -------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') || coalesce(with_check, ''))
          ~ '(''evidence''|''alert-photos''|''avatars'')'
  loop
    execute format('drop policy %I on storage.objects', r.policyname);
  end loop;
end $$;

-- CLIENT IMPACT (breaking): evidence becomes private, so getPublicUrl()
-- links stop working. Mobile must (a) stop HEAD-verifying uploads via the
-- public URL (evidenceUploader.verifyRemoteStorageFile) and trust the
-- upload response, (b) use createSignedUrl() for bulletin playback in
-- AmberAlertsScreen. The web dashboard already falls back to signed URLs.
update storage.buckets set public = false where id = 'evidence';

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- evidence: anyone may upload (no overwrite, no read-back, no delete)
create policy evidence_public_insert on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'evidence' and name not like 'avatars/%');

create policy evidence_officer_select on storage.objects
  for select to authenticated
  using (bucket_id = 'evidence' and (select app_private.is_officer()));

create policy evidence_published_select on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'evidence' and app_private.is_published_media(name));

-- alert-photos: bucket stays public for reading; only officers write.
create policy alert_photos_officer_all on storage.objects
  for all to authenticated
  using (bucket_id = 'alert-photos' and (select app_private.is_officer()))
  with check (bucket_id = 'alert-photos' and (select app_private.is_officer()));

-- avatars: each user writes only inside a folder named after their uid.
-- CLIENT IMPACT: avatarService must upload to bucket 'avatars' at
-- `${uid}/${Date.now()}.jpg` instead of evidence/avatars/...
create policy avatars_owner_select on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy avatars_owner_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy avatars_owner_update on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
