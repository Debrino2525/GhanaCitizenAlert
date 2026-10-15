import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export interface TrustScoreUpdateResult {
  newScore: number;
  bonusEarned: boolean;
  message: string;
}

/**
 * Awards +5% Civic Trust score when a citizen posts a report.
 * Rate-limited to at most one +5% reward per 24-hour rolling window (Option B).
 */
export async function awardPostSubmissionTrustBonus(
  userId: string,
  currentScore: number
): Promise<TrustScoreUpdateResult> {
  const safeCurrentScore = typeof currentScore === 'number' && !isNaN(currentScore) ? currentScore : 0;

  if (!userId || userId.startsWith('anon-') || userId === 'cit-guest') {
    return {
      newScore: safeCurrentScore,
      bonusEarned: false,
      message: 'Anonymous submissions preserve statutory immunity and do not affect personal trust ratings.'
    };
  }

  const cacheKey = `@citizen_last_post_trust_${userId}`;
  let lastAwardedTimestamp: number | null = null;

  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      lastAwardedTimestamp = parseInt(cached, 10);
    }
  } catch (readErr) {
    console.warn('[TrustScoreService] Failed to read last post trust cache:', readErr);
  }

  const now = Date.now();

  // If user already received bonus within the last 24 hours, do not grant another +5%
  if (lastAwardedTimestamp && now - lastAwardedTimestamp < TWENTY_FOUR_HOURS_MS) {
    const msRemaining = TWENTY_FOUR_HOURS_MS - (now - lastAwardedTimestamp);
    const hoursRemaining = Math.max(1, Math.ceil(msRemaining / (60 * 60 * 1000)));
    return {
      newScore: safeCurrentScore,
      bonusEarned: false,
      message: `Report submitted! Next 24h posting trust bonus available in ~${hoursRemaining}h.`
    };
  }

  const newScore = Math.min(100, Math.max(0, safeCurrentScore + 5));

  try {
    await AsyncStorage.setItem(cacheKey, String(now));
    await supabase.auth.updateUser({
      data: {
        trust_score: newScore,
        last_post_trust_at: new Date(now).toISOString()
      }
    });
  } catch (syncErr) {
    console.warn('[TrustScoreService] Failed to sync trust score to Supabase auth:', syncErr);
  }

  return {
    newScore,
    bonusEarned: true,
    message: `🎉 +5% Civic Trust awarded! Your trust rating is now ${newScore}%.`
  };
}

/**
 * Reads the latest trust score from user metadata or local fallback.
 */
export async function resolveLatestTrustScore(fallbackScore: number = 0): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.user_metadata?.trust_score !== undefined) {
      const score = Number(user.user_metadata.trust_score);
      if (!isNaN(score)) return Math.min(100, Math.max(0, score));
    }
  } catch {}
  return Math.min(100, Math.max(0, fallbackScore));
}
