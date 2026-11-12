import AsyncStorage from '@react-native-async-storage/async-storage';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { GoogleSignin } from '../lib/googleAuth';

export const PENDING_REPORTS_KEY = '@citizen_alert_pending_reports_v1';

export type DeleteAccountResult =
  | { ok: true; incidentsAnonymised: number }
  | { ok: false; message: string };

/**
 * Removes everything this app keeps on the phone for the given citizen and
 * signs out of Supabase and Google. Never throws.
 */
export async function clearLocalCitizenData(citizenId?: string, email?: string): Promise<void> {
  const keys = [
    PENDING_REPORTS_KEY,
    '@citizen_avatar_data',
    '@active_sos_incident_id',
    '@active_sos_tracking_code',
  ];
  if (citizenId) keys.push(`@citizen_avatar_${citizenId}`);
  if (email) keys.push(`@citizen_phone_${email.trim().toLowerCase()}`);
  await AsyncStorage.multiRemove(keys).catch(() => {});

  await supabase.auth.signOut().catch(() => {});
  if (GoogleSignin && GoogleSignin.signOut) {
    await GoogleSignin.signOut().catch(() => {});
  }
}

/**
 * Asks the server (Edge Function `delete-account`) to delete the signed-in
 * user's account. Does not touch local data; call clearLocalCitizenData after
 * a successful result.
 */
export async function requestServerAccountDeletion(): Promise<DeleteAccountResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return {
      ok: false,
      message: 'You are not signed in on this phone, so the app cannot confirm which account to delete. Sign in again, then retry.'
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke('delete-account', { method: 'POST', body: {} });

    if (error) {
      let serverMessage: string | undefined;
      if (error instanceof FunctionsHttpError) {
        const body = await error.context.json().catch(() => null);
        serverMessage = body?.message;
      }
      return {
        ok: false,
        message: serverMessage
          ? `Your account was not deleted. ${serverMessage}`
          : 'Your account was not deleted because the server could not be reached. Check your connection and try again.'
      };
    }

    if (!data?.ok) {
      return { ok: false, message: 'Your account was not deleted. The server did not confirm the deletion. Please try again.' };
    }
    return { ok: true, incidentsAnonymised: Number(data.incidentsAnonymised) || 0 };
  } catch {
    return {
      ok: false,
      message: 'Your account was not deleted because the server could not be reached. Check your connection and try again.'
    };
  }
}
