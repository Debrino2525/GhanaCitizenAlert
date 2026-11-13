import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Keyboard
} from 'react-native';
import { CloudOff, RotateCw, Trash2, TriangleAlert, Lock, Search, Check, FileText } from 'lucide-react-native';
import {
  getPendingReports,
  removePendingReport,
  processPendingReport,
  PendingReportItem
} from '../services/pendingReportsQueue';
import { supabase } from '../lib/supabase';
import { IncidentCategory } from '../types';
import { tokens } from '../theme/tokens';
import { safeHaptics } from '../utils/haptics';

interface PendingReportsScreenProps {
  onQueueCountChange?: (count: number) => void;
  /** True while the My Reports tab is on screen; the list refreshes each time it opens. */
  isVisible?: boolean;
}

/** Coarse, honest stages only — never officer names, units or ETAs. */
type Stage = 'RECEIVED' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED';

interface FiledReport {
  tracking_code: string;
  category: IncidentCategory;
  title: string;
  status: string;
  created_at: string;
  region: string | null;
}

const STAGE_LABEL: Record<Stage, string> = {
  RECEIVED: 'Received — awaiting review',
  UNDER_REVIEW: 'Under review',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed'
};

type StepState = 'done' | 'active' | 'todo';

/** Sent → Received → Under review → Resolved/Closed, from the coarse stage only. */
function pipelineFor(stage: Stage): { label: string; state: StepState }[] {
  const finished = stage === 'RESOLVED' || stage === 'CLOSED';
  return [
    { label: 'Sent', state: 'done' },
    { label: 'Received', state: 'done' },
    { label: 'Under review', state: finished ? 'done' : stage === 'UNDER_REVIEW' ? 'active' : 'todo' },
    { label: stage === 'CLOSED' ? 'Closed' : 'Resolved', state: finished ? 'done' : 'todo' }
  ];
}

function toStage(status: string): Stage {
  if (status === 'RESOLVED') return 'RESOLVED';
  if (status === 'DISMISSED') return 'CLOSED';
  if (status === 'DISPATCHED' || status === 'UNDER_ACTIVE_INVESTIGATION' || status === 'COURT_EVIDENCE_PACKAGED') {
    return 'UNDER_REVIEW';
  }
  return 'RECEIVED';
}

const CATEGORY_LABEL: Record<IncidentCategory, string> = {
  CRIMINAL_OFFENSE: 'Violent crime',
  DOMESTIC_ABUSE: 'Domestic abuse',
  TRAFFIC_RECKLESS: 'Road traffic',
  GALAMSEY_ENVIRONMENTAL: 'Galamsey & water',
  SANITATION_ZONING: 'Sanitation'
};

type Filter = 'ALL' | 'ACTIVE' | 'RESOLVED';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });

export const PendingReportsScreen: React.FC<PendingReportsScreenProps> = ({ onQueueCountChange, isVisible = true }) => {
  const [queue, setQueue] = useState<PendingReportItem[]>([]);
  const [filed, setFiled] = useState<FiledReport[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [progressText, setProgressText] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const [lookupCode, setLookupCode] = useState('');
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupResult, setLookupResult] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const items = await getPendingReports();
      setQueue(items);
      onQueueCountChange?.(items.length);
    } catch (e) {
      console.warn('[MyReports] Queue load notice:', e);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      setSignedIn(!!user);
      if (user) {
        // RLS returns only this person's own, non-anonymous reports.
        const { data, error } = await supabase
          .from('incidents')
          .select('tracking_code, category, title, status, created_at, region')
          .eq('reporter_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        if (!error && data) setFiled(data as FiledReport[]);
      } else {
        setFiled([]);
      }
    } catch (e) {
      console.warn('[MyReports] Filed reports notice:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onQueueCountChange]);

  useEffect(() => {
    if (isVisible) loadAll();
  }, [loadAll, isVisible]);

  const handleRetry = async (item: PendingReportItem) => {
    setProcessingId(item.id);
    setProgressText('Connecting…');
    safeHaptics.medium();
    try {
      const res = await processPendingReport(item, (_ratio, text) => setProgressText(text));
      if (res.success) {
        safeHaptics.success();
        Alert.alert('Report sent', `Report ${item.trackingCode} has been sent and is awaiting review.`);
      } else {
        safeHaptics.warning();
        Alert.alert('Not sent yet', res.error || 'It will try again automatically when you are back online.');
      }
    } catch (err: any) {
      safeHaptics.warning();
      Alert.alert('Not sent yet', err?.message || 'It will try again automatically when you are back online.');
    } finally {
      setProcessingId(null);
      setProgressText('');
      await loadAll();
    }
  };

  const handleDelete = (item: PendingReportItem) => {
    safeHaptics.warning();
    Alert.alert(
      'Delete this report?',
      `Report ${item.trackingCode} and its evidence will be permanently removed from this phone. It has not been sent yet, so this cannot be undone.`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await removePendingReport(item.id, true);
            safeHaptics.medium();
            await loadAll();
          }
        }
      ]
    );
  };

  const handleLookup = async () => {
    const code = lookupCode.trim().toUpperCase();
    if (!code) return;
    Keyboard.dismiss();
    setLookupBusy(true);
    setLookupResult(null);
    try {
      const { data, error } = await supabase.rpc('get_report_status', { p_tracking_code: code });
      if (error) {
        setLookupResult('Tracking lookup is not available right now. Please try again later.');
      } else if (!data?.found) {
        setLookupResult('No report found with that code. Check it and try again.');
      } else {
        const stage = (data.stage as Stage) || 'RECEIVED';
        setLookupResult(`${STAGE_LABEL[stage]}${data.submitted_on ? ` · sent ${formatDate(data.submitted_on)}` : ''}`);
      }
    } catch {
      setLookupResult('No connection. Please try again when you are online.');
    } finally {
      setLookupBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={tokens.colors.brand.gold} size="large" />
        <Text style={styles.bodyMuted}>Loading your reports…</Text>
      </View>
    );
  }

  const visibleFiled = filed.filter((r) => {
    const stage = toStage(r.status);
    if (filter === 'ACTIVE') return stage === 'RECEIVED' || stage === 'UNDER_REVIEW';
    if (filter === 'RESOLVED') return stage === 'RESOLVED' || stage === 'CLOSED';
    return true;
  });
  const activeCount = filed.filter((r) => ['RECEIVED', 'UNDER_REVIEW'].includes(toStage(r.status))).length;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadAll();
          }}
          tintColor={tokens.colors.brand.gold}
        />
      }
    >
      {/* Waiting to send */}
      {queue.length > 0 && (
        <View style={{ gap: tokens.spacing.sm }}>
          <Text style={styles.sectionTitle}>Waiting to send</Text>
          {queue.map((item) => {
            const busy = processingId === item.id;
            const sensitive = item.category === 'DOMESTIC_ABUSE';
            const chip =
              item.status === 'FAILED' ? 'Failed — retry' : item.status === 'UPLOADING' ? 'Uploading' : 'Saved on device';
            return (
              <View key={item.id} style={[styles.card, styles.queueCard]}>
                <View style={styles.rowBetween}>
                  <View style={styles.row}>
                    <CloudOff color={tokens.colors.brand.gold} size={18} />
                    <Text style={styles.chipGold}>{chip}</Text>
                  </View>
                  <Text style={styles.monoMuted}>
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <Text style={styles.cardTitle}>{sensitive ? 'Sensitive report' : item.title}</Text>
                <Text style={styles.monoMuted}>{item.trackingCode}</Text>
                <Text style={styles.bodyMuted}>
                  {item.reportInserted
                    ? 'Your report was sent. The evidence file will finish uploading automatically.'
                    : 'This will send automatically when you are back online.'}
                </Text>
                {!!item.lastError && item.status === 'FAILED' && (
                  <View style={[styles.row, { alignItems: 'flex-start' }]}>
                    <TriangleAlert color={tokens.colors.text.crimson} size={16} />
                    <Text style={[styles.bodyMuted, { flex: 1, color: tokens.colors.text.crimson }]}>{item.lastError}</Text>
                  </View>
                )}
                {busy && (
                  <View style={styles.row}>
                    <ActivityIndicator color={tokens.colors.brand.gold} size="small" />
                    <Text style={styles.bodyMuted}>{progressText}</Text>
                  </View>
                )}
                <View style={[styles.row, { marginTop: tokens.spacing.xs }]}>
                  <TouchableOpacity
                    onPress={() => handleRetry(item)}
                    disabled={busy}
                    style={[styles.primarySmall, busy && { opacity: 0.6 }]}
                    accessibilityRole="button"
                    accessibilityLabel={`Retry sending report ${item.trackingCode}`}
                  >
                    <RotateCw color={tokens.colors.text.inverse} size={16} />
                    <Text style={styles.primarySmallText}>Retry now</Text>
                  </TouchableOpacity>
                  {!item.reportInserted && (
                    <TouchableOpacity
                      onPress={() => handleDelete(item)}
                      disabled={busy}
                      style={styles.secondarySmall}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete unsent report ${item.trackingCode}`}
                    >
                      <Trash2 color={tokens.colors.text.crimson} size={16} />
                      <Text style={[styles.secondarySmallText, { color: tokens.colors.text.crimson }]}>Delete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Track with code */}
      <View style={styles.card}>
        <View style={styles.row}>
          <Search color={tokens.colors.brand.gold} size={18} />
          <Text style={styles.cardTitle}>Track a report with its code</Text>
        </View>
        <Text style={styles.bodyMuted}>
          For anonymous reports, your tracking code is the only way to follow up. Keep it somewhere safe.
        </Text>
        <View style={[styles.row, { marginTop: tokens.spacing.xs }]}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="GH-2026-XXXXXXXX"
            placeholderTextColor={tokens.colors.text.muted}
            value={lookupCode}
            onChangeText={setLookupCode}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={handleLookup}
            accessibilityLabel="Your tracking code"
          />
          <TouchableOpacity
            onPress={handleLookup}
            disabled={lookupBusy || !lookupCode.trim()}
            style={[styles.primarySmall, styles.trackButton, (lookupBusy || !lookupCode.trim()) && { opacity: 0.5 }]}
            accessibilityRole="button"
            accessibilityLabel="Track report"
          >
            {lookupBusy ? <ActivityIndicator color={tokens.colors.text.inverse} /> : <Text style={styles.primarySmallText}>Track</Text>}
          </TouchableOpacity>
        </View>
        {!!lookupResult && <Text style={[styles.body, { marginTop: tokens.spacing.xs }]}>{lookupResult}</Text>}
      </View>

      {/* Filed reports */}
      <View style={styles.rowBetween}>
        <Text style={styles.sectionTitle}>Your reports</Text>
        <Text style={styles.monoMuted}>{filed.length} sent</Text>
      </View>

      {signedIn && filed.length > 0 && (
        <View style={styles.filterRow}>
          {([
            ['ALL', 'All'],
            ['ACTIVE', `Active (${activeCount})`],
            ['RESOLVED', `Resolved (${filed.length - activeCount})`]
          ] as [Filter, string][]).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              onPress={() => setFilter(key)}
              style={[styles.filterPill, filter === key && styles.filterPillActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: filter === key }}
            >
              <Text style={[styles.filterText, filter === key && styles.filterTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {!signedIn ? (
        <View style={[styles.card, styles.empty]}>
          <FileText color={tokens.colors.text.secondary} size={28} />
          <Text style={styles.bodyMuted}>
            You are using CitizenAlert without an account, so reports are not listed here. Use your tracking code above to check on a report.
          </Text>
        </View>
      ) : filed.length === 0 ? (
        <View style={[styles.card, styles.empty]}>
          <FileText color={tokens.colors.text.secondary} size={28} />
          <Text style={styles.bodyMuted}>
            Reports you send with your name will appear here. Anonymous reports are never linked to your account.
          </Text>
        </View>
      ) : (
        visibleFiled.map((r) => {
          const stage = toStage(r.status);
          const sensitive = r.category === 'DOMESTIC_ABUSE';
          const isRevealed = !sensitive || revealed[r.tracking_code];
          return (
            <TouchableOpacity
              key={r.tracking_code}
              activeOpacity={sensitive ? 0.8 : 1}
              disabled={!sensitive}
              onPress={() => setRevealed((prev) => ({ ...prev, [r.tracking_code]: !prev[r.tracking_code] }))}
              style={styles.card}
              accessibilityRole={sensitive ? 'button' : undefined}
              accessibilityLabel={sensitive && !isRevealed ? `Sensitive report ${r.tracking_code}. Tap to show details.` : undefined}
            >
              <View style={styles.rowBetween}>
                <Text style={styles.monoMuted}>{r.tracking_code}</Text>
                <View style={[styles.stageChip, (stage === 'RESOLVED' || stage === 'CLOSED') && styles.stageChipDone]}>
                  <Text style={[styles.stageChipText, (stage === 'RESOLVED' || stage === 'CLOSED') && { color: tokens.colors.text.emerald }]}>
                    {STAGE_LABEL[stage]}
                  </Text>
                </View>
              </View>

              {isRevealed ? (
                <>
                  <Text style={styles.cardTitle}>{r.title}</Text>
                  <Text style={styles.bodyMuted}>
                    {CATEGORY_LABEL[r.category] || 'Report'} · {formatDate(r.created_at)}
                    {r.region && r.region !== 'UNKNOWN' ? ` · ${r.region}` : ''}
                  </Text>
                </>
              ) : (
                <View style={styles.row}>
                  <Lock color={tokens.colors.brand.gold} size={16} />
                  <Text style={styles.cardTitle}>Sensitive report</Text>
                  <Text style={styles.bodyMuted}>· Tap to show</Text>
                </View>
              )}

              <View style={styles.pipeline}>
                {pipelineFor(stage).map((s) => (
                  <View key={s.label} style={styles.pipelineStep}>
                    <View style={[styles.pipelineDot, s.state === 'done' && styles.pipelineDotDone, s.state === 'active' && styles.pipelineDotActive]}>
                      {s.state === 'done' && <Check color={tokens.colors.status.successDark} size={10} strokeWidth={3} />}
                    </View>
                    <Text style={[styles.pipelineLabel, s.state === 'active' && { color: tokens.colors.brand.gold }]}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
};

const f = tokens.typography.fontFamily;
const c = tokens.colors;

const styles = StyleSheet.create({
  content: { gap: tokens.spacing.lg, paddingBottom: tokens.spacing.xxxl },
  center: { padding: tokens.spacing.xl, alignItems: 'center', justifyContent: 'center', minHeight: 250, gap: tokens.spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacing.sm },
  sectionTitle: { color: c.text.primary, fontSize: tokens.typography.fontSize.lg, fontFamily: f.sansBold },
  card: { backgroundColor: c.surface.card, borderRadius: tokens.radius.lg, padding: tokens.spacing.lg, gap: tokens.spacing.sm },
  queueCard: { borderLeftWidth: 3, borderLeftColor: c.brand.gold },
  empty: { alignItems: 'center', gap: tokens.spacing.md },
  cardTitle: { color: c.text.primary, fontSize: tokens.typography.fontSize.lg, lineHeight: 24, fontFamily: f.sans },
  body: { color: c.text.primary, fontSize: tokens.typography.fontSize.md, lineHeight: 20, fontFamily: f.sansRegular },
  bodyMuted: { color: c.text.secondary, fontSize: tokens.typography.fontSize.md, lineHeight: 20, fontFamily: f.sansRegular },
  monoMuted: { color: c.text.secondary, fontSize: tokens.typography.fontSize.sm, fontFamily: f.mono },
  chipGold: { color: c.brand.gold, fontSize: tokens.typography.fontSize.sm, fontFamily: f.mono, textTransform: 'uppercase' },
  input: {
    backgroundColor: c.surface.input,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: c.border.medium,
    minHeight: tokens.touchTarget.minHeight,
    paddingHorizontal: tokens.spacing.md,
    color: c.text.primary,
    fontSize: tokens.typography.fontSize.lg,
    fontFamily: f.mono
  },
  trackButton: { minWidth: 84, justifyContent: 'center' },
  primarySmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: tokens.touchTarget.minHeight,
    paddingHorizontal: tokens.spacing.lg,
    borderRadius: tokens.radius.md,
    backgroundColor: c.brand.gold,
    justifyContent: 'center'
  },
  primarySmallText: { color: c.text.inverse, fontFamily: f.sansBold, fontSize: tokens.typography.fontSize.md },
  secondarySmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: tokens.touchTarget.minHeight,
    paddingHorizontal: tokens.spacing.lg,
    borderRadius: tokens.radius.md,
    backgroundColor: c.surface.cardHover
  },
  secondarySmallText: { color: c.text.primary, fontFamily: f.sans, fontSize: tokens.typography.fontSize.md },
  filterRow: { flexDirection: 'row', gap: tokens.spacing.sm, flexWrap: 'wrap' },
  filterPill: {
    minHeight: 40,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.full,
    backgroundColor: c.surface.card,
    justifyContent: 'center'
  },
  filterPillActive: { backgroundColor: c.brand.gold },
  filterText: { color: c.text.primary, fontFamily: f.sansMedium, fontSize: tokens.typography.fontSize.md },
  filterTextActive: { color: c.text.inverse },
  stageChip: { backgroundColor: c.brand.goldMuted, borderRadius: tokens.radius.full, paddingHorizontal: 10, paddingVertical: 4, flexShrink: 1 },
  stageChipDone: { backgroundColor: c.status.successDark },
  stageChipText: { color: c.brand.gold, fontFamily: f.sansMedium, fontSize: tokens.typography.fontSize.sm },
  pipeline: { flexDirection: 'row', justifyContent: 'space-between', marginTop: tokens.spacing.xs },
  pipelineStep: { flex: 1, alignItems: 'center', gap: 4 },
  pipelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: c.surface.highest,
    alignItems: 'center',
    justifyContent: 'center'
  },
  pipelineDotDone: { backgroundColor: c.text.emerald, borderColor: c.text.emerald },
  pipelineDotActive: { borderColor: c.brand.gold, backgroundColor: c.brand.goldMuted },
  pipelineLabel: { color: c.text.secondary, fontSize: tokens.typography.fontSize.sm, fontFamily: f.sansMedium, textAlign: 'center' }
});
