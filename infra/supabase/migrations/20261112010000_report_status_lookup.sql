-- =============================================================
-- Anonymous report status lookup (My Reports > "Track with your code")
--
-- Anonymous reports have no reporter_id, so RLS correctly hides them from
-- the person who filed them. This function lets anyone who holds a tracking
-- code (an unguessable ~40-bit capability) see ONLY the coarse stage of that
-- report - never its content, location, category or reporter details.
-- =============================================================

create or replace function public.get_report_status(p_tracking_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'found', true,
        'stage', case
          when i.status = 'RECEIVED_PENDING_TRIAGE' then 'RECEIVED'
          when i.status in ('DISPATCHED', 'UNDER_ACTIVE_INVESTIGATION', 'COURT_EVIDENCE_PACKAGED') then 'UNDER_REVIEW'
          when i.status = 'RESOLVED' then 'RESOLVED'
          when i.status = 'DISMISSED' then 'CLOSED'
          else 'RECEIVED'
        end,
        'submitted_on', to_char(i.created_at at time zone 'UTC', 'YYYY-MM-DD')
      )
      from public.incidents i
      where i.tracking_code = upper(trim(p_tracking_code))
      limit 1
    ),
    jsonb_build_object('found', false)
  )
$$;

revoke all on function public.get_report_status(text) from public;
grant execute on function public.get_report_status(text) to anon, authenticated;
