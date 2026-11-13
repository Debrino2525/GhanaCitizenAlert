-- =============================================================
-- CitizenAlert Ghana — database security checks
--
-- Run against any environment (SQL editor, `psql`, or the Supabase MCP
-- execute_sql tool). Everything runs inside a transaction that is ROLLED BACK,
-- so it never changes data. It raises an exception at the first failed check
-- and otherwise ends with: ALL SECURITY CHECKS PASSED.
--
-- Run it after every migration, and any time the database is touched by hand.
-- It would have caught the 2026-11-12 incident where the lockdown was undone
-- by running the emergency rollback script.
-- =============================================================
begin;

-- ---------- configuration ----------
do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and policyname like 'Allow public%') then
    raise exception 'FAIL: legacy "Allow public ..." policies exist (lockdown undone?)';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public'
             and roles::text like '%public%' and cmd in ('UPDATE', 'DELETE', 'ALL')) then
    raise exception 'FAIL: a policy lets role "public" UPDATE/DELETE';
  end if;
  if (select public from storage.buckets where id = 'evidence') then
    raise exception 'FAIL: evidence bucket is public';
  end if;
  if exists (select 1 from information_schema.role_table_grants
             where table_schema = 'public' and grantee = 'anon'
               and table_name in ('incidents', 'emergency_alerts', 'statutory_appeals', 'audit_evidence_ledger', 'sos_pings')
               and privilege_type in ('UPDATE', 'DELETE', 'TRUNCATE')) then
    raise exception 'FAIL: anon has UPDATE/DELETE/TRUNCATE on a protected table';
  end if;
  if (select count(*) from pg_trigger where not tgisinternal and tgname in (
        'incidents_sanitize_insert', 'alerts_stamp_issuer', 'alerts_guard_update',
        'incidents_audit_update', 'alerts_audit_change', 'appeals_stamp_resolver')) <> 6 then
    raise exception 'FAIL: one of the safety/audit triggers is missing';
  end if;
end $$;

-- ---------- as the public (anon key) ----------
set local role anon;
do $$
declare n int;
begin
  select count(*) into n from public.incidents;
  if n > 0 then raise exception 'FAIL: anon can read % incident rows', n; end if;
  select count(*) into n from public.statutory_appeals;
  if n > 0 then raise exception 'FAIL: anon can read takedown applicants'; end if;
  select count(*) into n from public.emergency_alerts
   where not (is_active and active_until > now() and approval_status in ('APPROVED', 'SELF_APPROVED_NO_SECOND_OFFICER'));
  if n > 0 then raise exception 'FAIL: anon can see % unapproved/inactive alerts', n; end if;

  begin
    update public.incidents set title = title;
    raise exception 'FAIL: anon UPDATE on incidents was not refused';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.emergency_alerts (alert_type, title, last_seen_location, latitude, longitude, details, active_until)
    values ('AMBER', 'security-check', 'x', 0, 0, 'x', now() + interval '1 hour');
    raise exception 'FAIL: anon could create an emergency alert';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.incidents (title, description, category, status, is_public_published, is_public_eligible)
    values ('security-check', 'x', 'CRIMINAL_OFFENSE', 'RESOLVED', true, true);
    -- Insert is allowed (citizens report anonymously) but must be sanitised:
    if exists (select 1 from public.incidents where title = 'security-check' and (is_public_published or status <> 'RECEIVED_PENDING_TRIAGE')) then
      raise exception 'FAIL: anon insert was not sanitised (self-published or status set)';
    end if;
  exception when insufficient_privilege then null; -- anon cannot read it back; that is fine too
  end;
end $$;
reset role;

-- ---------- as an active officer ----------
select set_config('request.jwt.claims', json_build_object(
  'sub', (select id from public.officers where is_active and not must_change_password limit 1)::text,
  'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare n int; v text;
begin
  if not app_private.is_officer() then raise exception 'FAIL: active officer is not recognised'; end if;
  select count(*) into n from public.incidents;
  if n = 0 then raise exception 'FAIL: officer sees no incidents'; end if;

  insert into public.emergency_alerts (alert_type, title, last_seen_location, latitude, longitude, details, active_until, is_active)
  values ('AMBER', 'security-check', 'x', 0, 0, 'x', now() + interval '1 hour', true);
  select approval_status || '/' || is_active::text into v from public.emergency_alerts where title = 'security-check';
  if v <> 'PENDING_APPROVAL/false' then raise exception 'FAIL: new alert was not pending/inactive (%)', v; end if;

  begin
    update public.emergency_alerts set is_active = true where title = 'security-check';
    raise exception 'FAIL: unapproved alert could be switched on directly';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select 'ALL SECURITY CHECKS PASSED' as result;
rollback;
