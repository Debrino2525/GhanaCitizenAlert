# `delete-account` Edge Function

Lets a signed-in citizen delete their own CitizenAlert account from the
mobile app (Profile → **Delete my account**). Required by Google Play and the
App Store for apps that let people create accounts.

**Deployed** to the live project (`fqgujgwdgqlxnpmpmiui`) on 2026-11-12 as
version 1, Verify JWT on. Not yet exercised end-to-end with a real account.

## What it does

The caller is identified only from the JWT in the `Authorization` header. In
order, each step safe to repeat:

| Step | Effect |
|---|---|
| `officer_check` | If the uid is in `public.officers`, stop with **403** — officers are offboarded by an admin, not from the citizen app. |
| `incidents` | For rows where `reporter_id = uid` **or** `reporter_data->>'userId' = uid`: set `reporter_id = null`, `is_anonymous = true`, remove `userId, name, email, phone, ghanaCard, ghanaCardId, avatarUrl, isGoogleVerified, loginMethod` from `reporter_data`, add `reporterAccountDeleted: true`. The report, media, location and case notes stay. |
| `sos_pings` | `reporter_id = null` where it was the uid (the location points stay with the incident). |
| `avatars` | Deletes every file in `avatars/<uid>/`, and legacy `evidence/avatars/<uid>_*` uploads. |
| `profile` | Deletes `public.profiles` where `id = uid` (skipped if the table does not exist). |
| `auth_user` | `auth.admin.deleteUser(uid)`. |

Responses: `200 {ok:true, incidentsAnonymised, sosPingsUnlinked, avatarFilesDeleted}`
or `{ok:false, step, code, message}` with 401 / 403 / 405 / 500. If a step
fails, earlier steps stay done and the account still exists, so the user can
simply retry; the app tells them the account was **not** deleted.

## Before deploying: check nothing else blocks `deleteUser`

`deleteUser` fails if another table references `auth.users` with
`ON DELETE RESTRICT/NO ACTION` and still has a row for this user. Run this
read-only query in the SQL editor:

```sql
select c.conrelid::regclass as table_name, a.attname as column_name,
       case c.confdeltype when 'a' then 'NO ACTION' when 'r' then 'RESTRICT'
            when 'c' then 'CASCADE' when 'n' then 'SET NULL' when 'd' then 'SET DEFAULT' end as on_delete
from pg_constraint c
join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
where c.contype = 'f' and c.confrelid = 'auth.users'::regclass
order by 1;
```

Anything that is `NO ACTION`/`RESTRICT` (other than `incidents.reporter_id`,
`sos_pings.reporter_id`, `profiles.id`, `officers.id`, which the function
handles) needs a step added to the function — e.g. `moderation_appeals` if
it stores a user id.

**Result on the live project, 2026-11-12 (read-only):** nothing blocks.
`incidents.reporter_id`, `moderation_appeals.reviewed_by`,
`officer_audit_log.actor_id`, `officers.invited_by` are `SET NULL`;
`officers.id`, `profiles.id`, `sos_pings.reporter_id` are `CASCADE`. The
function un-links `sos_pings` before deleting the user, so SOS location
points are kept for officers instead of being cascade-deleted.

Not covered (no link to the account, so they can't be matched to it):
free-text contacts in `alert_sightings.reporter_phone`,
`moderation_appeals.contact` and `statutory_appeals.contact_info`, plus
evidence files the user uploaded (kept as case evidence; `storage.objects.owner`
still holds the old uid, which no longer resolves to anyone).

## Deploy (needs the owner's OK)

From the repo root, with the Supabase CLI logged in:

```bash
supabase functions deploy delete-account --project-ref fqgujgwdgqlxnpmpmiui --use-api
```

(Or paste `index.ts` into Dashboard → Edge Functions → New function, name
`delete-account`.) Leave **Verify JWT** on. `SUPABASE_URL`,
`SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected by Supabase;
no secrets need setting.

## Test

1. Create a throwaway citizen account in the app (Google/email), send one
   non-anonymous report, set a profile photo.
2. In the SQL editor note the uid and confirm the incident has
   `reporter_id = <uid>` and the name/phone in `reporter_data`, and that
   `storage.objects` has a row under `avatars/<uid>/`.
3. In the app: Profile → **Delete my account** → Continue → Delete my account.
   Expect "Account deleted … 1 report you sent stay with officers…" and the
   sign-in screen.
4. Verify:
   ```sql
   select reporter_id, is_anonymous, reporter_data from public.incidents where tracking_code = '<code>';
   select count(*) from storage.objects where bucket_id = 'avatars' and name like '<uid>/%';
   select count(*) from auth.users where id = '<uid>';
   ```
   Expect `null / true / no name,email,phone,userId`, `0`, `0`.
5. Failure paths: sign in as an officer account → expect "Officer accounts
   cannot be deleted…"; turn on airplane mode → expect "Your account was not
   deleted because the server could not be reached".

Quick curl check (needs a real user access token; this **deletes that user**):

```bash
curl -i -X POST https://fqgujgwdgqlxnpmpmiui.supabase.co/functions/v1/delete-account -H "Authorization: Bearer <USER_ACCESS_TOKEN>" -H "apikey: <ANON_KEY>"
```
