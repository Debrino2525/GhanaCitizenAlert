-- =============================================================
-- PRE-FLIGHT: run in the Supabase SQL editor BEFORE applying
-- migrations/20261112000000_rls_lockdown.sql. Read-only.
--
-- The repo's infra/supabase_schema.sql has drifted from the live
-- database (officers, sos_pings, incident_feedback, public_feed_incidents
-- and several RPCs exist only live). Compare these results against the
-- assumptions listed at the top of the migration.
-- =============================================================

-- 1. Every current RLS policy (the migration drops all of these on the
--    tables it manages, plus storage policies that mention evidence /
--    alert-photos).
select schemaname, tablename, policyname, cmd, roles::text, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, cmd, policyname;

-- 2. Which tables have RLS enabled at all.
select c.relname as table_name, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by 1;

-- 3. Columns the migration relies on (all should return a row).
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and (table_name, column_name) in (
    ('incidents', 'reporter_id'), ('incidents', 'assigned_agency'),
    ('incidents', 'is_public_published'), ('incidents', 'location_source'),
    ('incidents', 'gps_fix_age_s'), ('incidents', 'reporter_data'),
    ('sos_pings', 'reporter_id'), ('sos_pings', 'incident_id'),
    ('officers', 'id'), ('officers', 'role'), ('officers', 'is_active'),
    ('statutory_appeals', 'status'), ('emergency_alerts', 'is_active')
  )
order by 1, 2;

-- 4. Source of the RPCs that are NOT in the repo. These are likely
--    SECURITY DEFINER and therefore bypass RLS - review each one.
select p.proname, p.prosecdef as security_definer,
       pg_get_function_identity_arguments(p.oid) as args,
       array_to_string(p.proacl::text[], ', ') as grants,
       pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('attach_incident_media', 'update_incident_location',
                    'increment_corroboration', 'adjust_citizen_trust_score');

-- 5. Current definition of the public feed view (it is dropped and
--    recreated by the migration).
select pg_get_viewdef('public.public_feed_incidents'::regclass, true);

-- 6. Storage buckets and their public flag.
select id, name, public from storage.buckets order by id;

-- 7. Officer roles actually in use (migration assumes the OfficerRole
--    values from web-portal/src/types/index.ts).
select role, count(*) from public.officers group by role order by role;
