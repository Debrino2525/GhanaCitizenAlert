// CitizenAlert Ghana: delete-account Edge Function
//
// Deletes the CALLER's own account. The caller is identified only by the
// JWT in the Authorization header; the request body is ignored.
//
// Steps (each is safe to repeat, so a retry after a partial failure works):
//   1. Refuse officer accounts (officers are offboarded by an admin).
//   2. Anonymise the caller's incidents: reporter_id -> null,
//      is_anonymous -> true, identifying keys removed from reporter_data.
//      The reports themselves stay with officers.
//   3. Unlink the caller's sos_pings (reporter_id -> null).
//   4. Delete the caller's avatar files (bucket "avatars", folder <uid>/,
//      plus legacy evidence/avatars/<uid>_* uploads).
//   5. Delete the caller's profiles row, if any.
//   6. Delete the auth user.
//
// Deploy: see ./README.md. Requires SUPABASE_URL, SUPABASE_ANON_KEY and
// SUPABASE_SERVICE_ROLE_KEY, which Supabase injects automatically.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// reporter_data keys that identify the reporter. Everything else (trust
// score, consent flags, landmark note, isEmergencyPanic) is kept so officers
// can still work the case.
const IDENTIFYING_KEYS = [
  'userId',
  'name',
  'email',
  'phone',
  'ghanaCard',
  'ghanaCardId',
  'avatarUrl',
  'isGoogleVerified',
  'loginMethod',
];

type Step =
  | 'auth'
  | 'officer_check'
  | 'incidents'
  | 'sos_pings'
  | 'avatars'
  | 'profile'
  | 'auth_user';

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function fail(status: number, step: Step, code: string, message: string): Response {
  console.error(`[delete-account] ${step}: ${code} ${message}`);
  return json(status, { ok: false, step, code, message });
}

// Postgres "undefined_table" / PostgREST "relation not found": the table does
// not exist in this project, so there is nothing to delete.
function isMissingTable(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return err.code === '42P01' || err.code === 'PGRST205' || /does not exist|Could not find the table/i.test(err.message ?? '');
}

// Deletes every file directly inside `folder` (optionally only names starting
// with `prefix`). Re-lists from offset 0 after each batch because removal
// shifts the listing; stops when nothing matching is left.
async function removeAll(
  admin: SupabaseClient,
  bucket: string,
  folder: string,
  prefix = '',
): Promise<number> {
  let removed = 0;
  for (let guard = 0; guard < 100; guard++) {
    const { data, error } = await admin.storage
      .from(bucket)
      .list(folder, { limit: 100, offset: 0, search: prefix || undefined });
    if (error) {
      if (/not found/i.test(error.message)) return removed; // bucket does not exist
      throw error;
    }
    const paths = (data ?? [])
      .filter((o) => o.id !== null && o.name.startsWith(prefix)) // files only, exact prefix
      .map((o) => `${folder}/${o.name}`);
    if (paths.length === 0) return removed;
    const { error: rmErr } = await admin.storage.from(bucket).remove(paths);
    if (rmErr) throw rmErr;
    removed += paths.length;
  }
  return removed;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return fail(405, 'auth', 'method_not_allowed', 'Use POST.');

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) {
    return fail(500, 'auth', 'misconfigured', 'Server is missing Supabase credentials.');
  }

  // ---- 0. Verify the caller -------------------------------------------------
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return fail(401, 'auth', 'no_token', 'Sign in again, then retry.');

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser(jwt);
  const user = userData?.user;
  if (userErr || !user) {
    // A user that is already deleted also lands here: their token no longer
    // resolves. The client treats this as "nothing left on the server".
    return fail(401, 'auth', 'invalid_token', 'Your sign-in has expired or the account no longer exists.');
  }
  const uid = user.id;

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ---- 1. Officers are not self-service ---------------------------------------
  {
    const { data, error } = await admin.from('officers').select('id').eq('id', uid).maybeSingle();
    if (error && !isMissingTable(error)) {
      return fail(500, 'officer_check', 'db_error', error.message);
    }
    if (data) {
      return fail(
        403,
        'officer_check',
        'officer_account',
        'Officer accounts cannot be deleted from the citizen app. Ask your command administrator.',
      );
    }
  }

  // ---- 2. Anonymise incidents ---------------------------------------------------
  // Match on reporter_id, and on reporter_data.userId for older rows written
  // before reporter_id was populated.
  let incidentsAnonymised = 0;
  {
    const { data: rows, error } = await admin
      .from('incidents')
      .select('id, reporter_data')
      .or(`reporter_id.eq.${uid},reporter_data->>userId.eq.${uid}`);
    if (error) return fail(500, 'incidents', 'db_error', error.message);

    for (const row of rows ?? []) {
      const rd: Record<string, unknown> =
        row.reporter_data && typeof row.reporter_data === 'object' ? { ...row.reporter_data } : {};
      for (const k of IDENTIFYING_KEYS) delete rd[k];
      rd.isAnonymous = true;
      rd.reporterAccountDeleted = true;

      const { error: upErr } = await admin
        .from('incidents')
        .update({ reporter_id: null, is_anonymous: true, reporter_data: rd })
        .eq('id', row.id);
      if (upErr) return fail(500, 'incidents', 'db_error', upErr.message);
      incidentsAnonymised++;
    }
  }

  // ---- 3. Unlink SOS location pings -------------------------------------------
  let sosPingsUnlinked = 0;
  {
    const { data, error } = await admin
      .from('sos_pings')
      .update({ reporter_id: null })
      .eq('reporter_id', uid)
      .select('id');
    if (error && !isMissingTable(error)) return fail(500, 'sos_pings', 'db_error', error.message);
    sosPingsUnlinked = data?.length ?? 0;
  }

  // ---- 4. Avatar files ------------------------------------------------------------
  let avatarFilesDeleted = 0;
  try {
    avatarFilesDeleted += await removeAll(admin, 'avatars', uid);
    // Legacy uploads: evidence/avatars/<uid>_<timestamp>.jpg
    avatarFilesDeleted += await removeAll(admin, 'evidence', 'avatars', `${uid}_`);
  } catch (e) {
    return fail(500, 'avatars', 'storage_error', e instanceof Error ? e.message : String(e));
  }

  // ---- 5. Profile row (if the table exists) ---------------------------------------
  {
    const { error } = await admin.from('profiles').delete().eq('id', uid);
    if (error && !isMissingTable(error)) return fail(500, 'profile', 'db_error', error.message);
  }

  // ---- 6. Auth user -----------------------------------------------------------------
  {
    const { error } = await admin.auth.admin.deleteUser(uid);
    if (error && !/not found/i.test(error.message)) {
      return fail(500, 'auth_user', 'auth_error', error.message);
    }
  }

  console.log(
    `[delete-account] deleted ${uid}: incidents=${incidentsAnonymised} sos_pings=${sosPingsUnlinked} avatars=${avatarFilesDeleted}`,
  );
  return json(200, {
    ok: true,
    incidentsAnonymised,
    sosPingsUnlinked,
    avatarFilesDeleted,
  });
});
