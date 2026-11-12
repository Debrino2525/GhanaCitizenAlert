import { supabase } from '../lib/supabase';

export interface TrustScoreUpdateResult {
  newScore: number;
  bonusEarned: boolean;
  message: string;
}

const clampScore = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
};

/**
 * The authoritative Civic Trust score lives in app_metadata, which only the server
 * (claim_daily_post_trust_bonus / adjust_citizen_trust_score) can write.
 * user_metadata.trust_score is user-editable and must never be trusted.
 */
export function readTrustScore(user: { app_metadata?: Record<string, any> } | null | undefined): number {
  return clampScore(user?.app_metadata?.trust_score);
}

/**
 * Claims the +5% Civic Trust reward for posting a report.
 * The server enforces the one-per-24h limit and requires a non-anonymous report
 * from this user in the last hour, so call this only after the incident insert succeeds.
 */
export async function awardPostSubmissionTrustBonus(
  userId: string,
  currentScore: number
): Promise<TrustScoreUpdateResult> {
  const safeCurrentScore = clampScore(currentScore);

  if (!userId || userId.startsWith('anon-') || userId === 'cit-guest') {
    return {
      newScore: safeCurrentScore,
      bonusEarned: false,
      message: 'Anonymous submissions preserve statutory immunity and do not affect personal trust ratings.'
    };
  }

  try {
    const { data, error } = await supabase.rpc('claim_daily_post_trust_bonus');
    if (error || !data) {
      console.warn('[TrustScoreService] Trust bonus claim notice:', error?.message);
      return { newScore: safeCurrentScore, bonusEarned: false, message: 'Report submitted!' };
    }

    const result = data as { awarded: boolean; trust_score?: number; reason?: string; next_eligible_at?: string };
    const newScore = clampScore(result.trust_score ?? safeCurrentScore);

    // Refresh the cached session so app_metadata reflects the new score.
    supabase.auth.refreshSession().catch(() => {});

    if (result.awarded) {
      return {
        newScore,
        bonusEarned: true,
        message: `🎉 +5% Civic Trust awarded! Your trust rating is now ${newScore}%.`
      };
    }

    if (result.reason === 'cooldown' && result.next_eligible_at) {
      const msRemaining = new Date(result.next_eligible_at).getTime() - Date.now();
      const hoursRemaining = Math.max(1, Math.ceil(msRemaining / (60 * 60 * 1000)));
      return {
        newScore,
        bonusEarned: false,
        message: `Report submitted! Next 24h posting trust bonus available in ~${hoursRemaining}h.`
      };
    }

    return { newScore, bonusEarned: false, message: 'Report submitted!' };
  } catch (err) {
    console.warn('[TrustScoreService] Trust bonus claim exception:', err);
    return { newScore: safeCurrentScore, bonusEarned: false, message: 'Report submitted!' };
  }
}

/**
 * Reads the latest server-owned trust score, or the fallback when offline.
 */
export async function resolveLatestTrustScore(fallbackScore: number = 0): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.app_metadata?.trust_score !== undefined) {
      return readTrustScore(user);
    }
  } catch {}
  return clampScore(fallbackScore);
}
