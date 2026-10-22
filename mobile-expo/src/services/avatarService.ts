import { decode } from 'base64-arraybuffer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

/**
 * Uploads citizen avatar to Supabase storage bucket 'evidence'
 * and updates user_metadata.custom_avatar_url so it persists across all devices.
 */
export async function uploadAndSyncCitizenAvatar(
  userId: string,
  base64Data?: string | null,
  fallbackUri?: string
): Promise<string> {
  let publicAvatarUrl = '';

  try {
    if (base64Data) {
      const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
      const arrayBuffer = decode(cleanBase64);
      const filePath = `avatars/${userId || 'citizen'}_${Date.now()}.jpg`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('evidence')
        .upload(filePath, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (!uploadErr && uploadData?.path) {
        const { data } = supabase.storage.from('evidence').getPublicUrl(uploadData.path);
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
  return (
    meta.custom_avatar_url ||
    cachedLocalAvatar ||
    meta.avatar_url ||
    meta.avatarUrl ||
    meta.picture ||
    meta.photo ||
    undefined
  );
}
