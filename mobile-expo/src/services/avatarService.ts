import { decode } from 'base64-arraybuffer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const AVATAR_BUCKET = 'avatars';

/**
 * Avatars uploaded before the evidence bucket went private live at
 * .../object/public/evidence/avatars/... and no longer load.
 */
function isLegacyEvidenceAvatar(url: unknown): boolean {
  return typeof url === 'string' && url.includes('/storage/v1/object/public/evidence/');
}

/**
 * Uploads citizen avatar to the public 'avatars' bucket, inside a folder named after
 * the signed-in user's id (required by storage policy avatars_owner_insert), and
 * updates user_metadata.custom_avatar_url so it persists across all devices.
 */
export async function uploadAndSyncCitizenAvatar(
  userId: string,
  base64Data?: string | null,
  fallbackUri?: string
): Promise<string> {
  let publicAvatarUrl = '';

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const authUid = session?.user?.id;

    if (base64Data && authUid) {
      const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
      const arrayBuffer = decode(cleanBase64);
      const filePath = `${authUid}/${Date.now()}.jpg`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(filePath, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (!uploadErr && uploadData?.path) {
        const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(uploadData.path);
        publicAvatarUrl = data.publicUrl;
      } else if (uploadErr) {
        console.warn('[Avatar Upload] Storage error, falling back:', uploadErr.message);
      }
    }
  } catch (err) {
    console.warn('[Avatar Upload] Exception:', err);
  }

  // If cloud upload succeeded, use the permanent URL; otherwise use local fallback
  const effectiveUrl = publicAvatarUrl || (base64Data ? `data:image/jpeg;base64,${base64Data}` : (fallbackUri || ''));

  // 1. Cache on this device
  if (userId && effectiveUrl) {
    await AsyncStorage.setItem(`@citizen_avatar_${userId}`, effectiveUrl).catch(() => {});
  }

  // 2. Persist to Supabase Auth metadata for cross-device synchronization
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.auth.updateUser({
        data: {
          custom_avatar_url: publicAvatarUrl || effectiveUrl,
          avatar_url: publicAvatarUrl || effectiveUrl
        }
      });
    }
  } catch (authErr) {
    console.warn('[Avatar Sync] Could not sync to user_metadata:', authErr);
  }

  return effectiveUrl;
}

/**
 * Resolves the effective avatar for a citizen with proper priority:
 * 1. user_metadata.custom_avatar_url (uploaded custom picture, syncs across all devices)
 * 2. local AsyncStorage cached avatar
 * 3. user_metadata.avatar_url (Google/Apple OAuth picture)
 * 4. user_metadata.picture / userMeta.photo
 */
export function resolveEffectiveAvatar(
  userMetadata: Record<string, any> | undefined,
  cachedLocalAvatar: string | null | undefined
): string | undefined {
  const meta = userMetadata || {};
  const usable = (url: any): string | undefined => (isLegacyEvidenceAvatar(url) ? undefined : url || undefined);
  return (
    usable(meta.custom_avatar_url) ||
    usable(cachedLocalAvatar) ||
    meta.avatar_url ||
    meta.avatarUrl ||
    meta.picture ||
    meta.photo ||
    undefined
  );
}
