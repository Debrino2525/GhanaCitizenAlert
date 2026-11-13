-- =============================================================
-- CitizenAlert Ghana — phase 4: accountability
--
-- Requires 20261112000000_rls_lockdown.sql (app_private helpers, alerts_stamp_issuer).
--
-- 1. Audit trail: every officer change to an incident, emergency alert or
--    takedown appeal is written to officer_audit_log by the database itself,
--    so it cannot be skipped or edited from a browser. (Officers have only
--    INSERT/SELECT on officer_audit_log; only admins can read it.)
-- 2. Two-person rule for Amber/Red alerts: a new alert is created PENDING and
--    inactive. A different officer approves it with approve_emergency_alert().
--    Only when no other approving officer is active may the issuer approve
--    their own alert; it is then stamped SELF_APPROVED_NO_SECOND_OFFICER on the
--    alert and in the audit log. The public sees approved alerts only.
-- 3. Takedown appeals: resolved_by / resolved_at are stamped from the signed-in
--    officer, not typed by the client.
-- =============================================================

-- -------------------------------------------------------------
-- 1. Audit trail
-- -------------------------------------------------------------
create or replace function app_private.write_audit(
  p_action text, p_target_type text, p_target_id text, p_incident_id uuid, p_details jsonb)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare v_uid uuid := auth.uid();
begin
  insert into public.officer_audit_log
    (actor_id, actor_service_id, action, target_type, target_id, incident_id, details)
  values
    (v_uid,
     (select o.service_id from public.officers o where o.id = v_uid),
     p_action, p_target_type, p_target_id, p_incident_id, coalesce(p_details, '{}'::jsonb));
end $$;

-- Returns {"field": {"from": .., "to": ..}} for the listed fields that changed.
create or replace function app_private.changed_fields(p_old jsonb, p_new jsonb, p_fields text[])
returns jsonb
language sql immutable
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(f, jsonb_build_object('from', p_old -> f, 'to', p_new -> f)), '{}'::jsonb)
  from unnest(p_fields) as f
  where (p_old -> f) is distinct from (p_new -> f)
$$;

create or replace function app_private.audit_incident_update()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare v_changes jsonb;
begin
  -- Citizen RPCs (location updates, SOS cancel) and service-role jobs are not officer actions.
  if auth.uid() is null or not app_private.is_officer() then
    return null;
  end if;
  v_changes := app_private.changed_fields(to_jsonb(old), to_jsonb(new), array[
    'status', 'assigned_agency', 'severity', 'category', 'title',
    'is_public_published', 'is_public_eligible', 'reporter_trust_score', 'investigator_notes']);
  if v_changes <> '{}'::jsonb then
    perform app_private.write_audit('incident.update', 'incident', new.id::text, new.id, v_changes);
  end if;
  return null;
end $$;

drop trigger if exists incidents_audit_update on public.incidents;
create trigger incidents_audit_update
  after update on public.incidents
  for each row execute function app_private.audit_incident_update();

-- -------------------------------------------------------------
-- 2. Emergency alerts: two-person approval
-- -------------------------------------------------------------
alter table public.emergency_alerts
  add column if not exists approval_status text not null default 'APPROVED',
  add column if not exists approved_by_officer_id uuid,
  add column if not exists approved_at timestamptz,
  add column if not exists approval_note text;

-- Rows that existed before this migration keep 'APPROVED'; new rows start pending.
alter table public.emergency_alerts alter column approval_status set default 'PENDING_APPROVAL';

alter table public.emergency_alerts drop constraint if exists emergency_alerts_approval_status_chk;
alter table public.emergency_alerts add constraint emergency_alerts_approval_status_chk
  check (approval_status in ('PENDING_APPROVAL', 'APPROVED', 'SELF_APPROVED_NO_SECOND_OFFICER', 'REJECTED'));

-- Roles allowed to issue and approve alerts (same list as alerts_officer_insert).
create or replace function app_private.alert_roles()
returns text[]
language sql immutable
set search_path = ''
as $$ select array['ADMIN', 'NATIONAL_COMMAND_SUPERVISOR', 'POLICE_CID_OFFICER',
                   'DOVVSU_INVESTIGATOR', 'CAD_DISPATCHER'] $$;

-- Every new alert starts pending and inactive, whatever the client sent.
create or replace function app_private.alerts_stamp_issuer()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  new.issued_by_officer_id   := auth.uid();
  new.is_active              := false;
  new.approval_status        := 'PENDING_APPROVAL';
  new.approved_by_officer_id := null;
  new.approved_at            := null;
  new.approval_note          := null;
  return new;
end $$;

-- Outside the approval functions, approval fields are frozen and an alert that
-- was never approved cannot be switched on by a plain UPDATE.
create or replace function app_private.alerts_guard_update()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if coalesce(current_setting('app.alert_approval', true), '') = 'on' then
    return new;
  end if;
  new.approval_status        := old.approval_status;
  new.approved_by_officer_id := old.approved_by_officer_id;
  new.approved_at            := old.approved_at;
  new.approval_note          := old.approval_note;
  new.issued_by_officer_id   := old.issued_by_officer_id;
  if new.is_active and not coalesce(old.is_active, false)
     and old.approval_status not in ('APPROVED', 'SELF_APPROVED_NO_SECOND_OFFICER') then
    raise exception 'This alert has not been approved, so it cannot go live.'
      using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists alerts_guard_update on public.emergency_alerts;
create trigger alerts_guard_update
  before update on public.emergency_alerts
  for each row execute function app_private.alerts_guard_update();

create or replace function app_private.audit_alert_change()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare v_changes jsonb;
begin
  if auth.uid() is null or not app_private.is_officer() then
    return null;
  end if;
  if tg_op = 'INSERT' then
    perform app_private.write_audit('alert.create', 'emergency_alert', new.id::text, null,
      jsonb_build_object('alert_type', new.alert_type, 'title', new.title,
                         'approving_commander_name_as_typed', new.approving_commander_name));
  else
    v_changes := app_private.changed_fields(to_jsonb(old), to_jsonb(new), array[
      'is_active', 'title', 'details', 'active_until', 'radius_km', 'approval_status']);
    if v_changes <> '{}'::jsonb then
      perform app_private.write_audit('alert.update', 'emergency_alert', new.id::text, null, v_changes);
    end if;
  end if;
  return null;
end $$;

drop trigger if exists alerts_audit_change on public.emergency_alerts;
create trigger alerts_audit_change
  after insert or update on public.emergency_alerts
  for each row execute function app_private.audit_alert_change();

-- Approve a pending alert and put it live. Returns the resulting approval_status.
create or replace function public.approve_emergency_alert(p_alert_id uuid)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_alert   public.emergency_alerts%rowtype;
  v_other   boolean;
  v_status  text;
begin
  if not app_private.officer_has_role(app_private.alert_roles()) then
    raise exception 'Only officers who can issue alerts can approve them.' using errcode = '42501';
  end if;

  select * into v_alert from public.emergency_alerts where id = p_alert_id for update;
  if not found then
    raise exception 'Alert not found.';
  end if;
  if v_alert.approval_status <> 'PENDING_APPROVAL' then
    raise exception 'This alert is not waiting for approval (status: %).', v_alert.approval_status;
  end if;

  if v_alert.issued_by_officer_id is distinct from v_uid then
    v_status := 'APPROVED';
  else
    select exists (
      select 1 from public.officers o
      where o.id <> v_uid and o.is_active and not o.must_change_password
        and o.role = any (app_private.alert_roles())
    ) into v_other;
    if v_other then
      raise exception 'Another officer must approve this alert.' using errcode = '42501';
    end if;
    v_status := 'SELF_APPROVED_NO_SECOND_OFFICER';
  end if;

  perform set_config('app.alert_approval', 'on', true);
  update public.emergency_alerts
     set approval_status        = v_status,
         approved_by_officer_id = v_uid,
         approved_at            = now(),
         is_active              = true
   where id = p_alert_id;
  perform set_config('app.alert_approval', 'off', true);

  perform app_private.write_audit('alert.approve', 'emergency_alert', p_alert_id::text, null,
    jsonb_build_object('approval_status', v_status,
                       'issued_by_officer_id', v_alert.issued_by_officer_id,
                       'title', v_alert.title));
  return v_status;
end $$;

-- Reject (or, for the issuer, withdraw) a pending alert.
create or replace function public.reject_emergency_alert(p_alert_id uuid, p_reason text default null)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_alert public.emergency_alerts%rowtype;
begin
  if not app_private.officer_has_role(app_private.alert_roles()) then
    raise exception 'Only officers who can issue alerts can reject them.' using errcode = '42501';
  end if;
  select * into v_alert from public.emergency_alerts where id = p_alert_id for update;
  if not found then
    raise exception 'Alert not found.';
  end if;
  if v_alert.approval_status <> 'PENDING_APPROVAL' then
    raise exception 'This alert is not waiting for approval (status: %).', v_alert.approval_status;
  end if;

  perform set_config('app.alert_approval', 'on', true);
  update public.emergency_alerts
     set approval_status        = 'REJECTED',
         approved_by_officer_id = v_uid,
         approved_at            = now(),
         approval_note          = left(nullif(trim(p_reason), ''), 500),
         is_active              = false
   where id = p_alert_id;
  perform set_config('app.alert_approval', 'off', true);

  perform app_private.write_audit('alert.reject', 'emergency_alert', p_alert_id::text, null,
    jsonb_build_object('reason', p_reason, 'issued_by_officer_id', v_alert.issued_by_officer_id,
                       'withdrawn_by_issuer', v_alert.issued_by_officer_id = v_uid));
  return 'REJECTED';
end $$;

revoke all on function public.approve_emergency_alert(uuid) from public, anon;
revoke all on function public.reject_emergency_alert(uuid, text) from public, anon;
grant execute on function public.approve_emergency_alert(uuid) to authenticated;
grant execute on function public.reject_emergency_alert(uuid, text) to authenticated;

-- The public only ever sees approved, active, unexpired alerts.
drop policy if exists alerts_public_select_active on public.emergency_alerts;
create policy alerts_public_select_active on public.emergency_alerts
  for select to anon, authenticated
  using (is_active = true and active_until > now()
         and approval_status in ('APPROVED', 'SELF_APPROVED_NO_SECOND_OFFICER'));

-- -------------------------------------------------------------
-- 3. Takedown appeals: stamp who decided, server-side
-- -------------------------------------------------------------
create or replace function app_private.appeals_stamp_resolver()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare v_uid uuid := auth.uid();
begin
  if new.status is distinct from old.status and new.status in ('GRANTED', 'REJECTED') then
    new.resolved_by := coalesce(
      (select nullif(trim(coalesce(o.service_id, '') || ' ' || coalesce(o.full_name, '')), '')
         from public.officers o where o.id = v_uid),
      case when v_uid is null then 'system' else v_uid::text end);
    new.resolved_at := now();
    perform app_private.write_audit('appeal.' || lower(new.status), 'statutory_appeal', new.id::text,
      new.incident_id, jsonb_build_object('tracking_code', new.tracking_code));
  else
    new.resolved_by := old.resolved_by;
    new.resolved_at := old.resolved_at;
  end if;
  return new;
end $$;

drop trigger if exists appeals_stamp_resolver on public.statutory_appeals;
create trigger appeals_stamp_resolver
  before update on public.statutory_appeals
  for each row execute function app_private.appeals_stamp_resolver();

revoke all on all functions in schema app_private from public;
grant execute on all functions in schema app_private to anon, authenticated;
