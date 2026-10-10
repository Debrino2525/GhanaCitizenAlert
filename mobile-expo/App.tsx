import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_800ExtraBold
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_700Bold
} from '@expo-google-fonts/jetbrains-mono';
import {
  Shield,
  ShieldCheck,
  Globe,
  Radio,
  UserCheck,
  Lock,
  ChevronDown
} from 'lucide-react-native';
import { CitizenAccessWall, CitizenUser } from './src/components/CitizenAccessWall';
import { supabase } from './src/lib/supabase';
import { GHANAIAN_LANGUAGES } from './src/constants/i18n';
import { LanguageCode, TabType } from './src/types';
import { useGpsLocation } from './src/hooks/useGpsLocation';
import { useCameraRecorder } from './src/hooks/useCameraRecorder';
import { useIncidentDraft } from './src/hooks/useIncidentDraft';
import { TabBar } from './src/components/TabBar';
import { CitizenProfileSheet } from './src/components/CitizenProfileSheet';
import { EvidenceCaptureScreen } from './src/screens/EvidenceCaptureScreen';
import { AmberAlertsScreen } from './src/screens/AmberAlertsScreen';
import { SosPanicScreen } from './src/screens/SosPanicScreen';
import { PendingReportsScreen } from './src/screens/PendingReportsScreen';
import { getPendingReports, initAutoSyncNetworkListener } from './src/services/pendingReportsQueue';
import { verifyKnownSha256Vector } from './src/utils/fileHashing';
import { tokens } from './src/theme/tokens';

function MainApp() {
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_800ExtraBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold
  });

  const [lang, setLang] = useState<LanguageCode>('en');
  const [activeTab, setActiveTab] = useState<TabType>('CAPTURE');

  // Citizen Access Control & Gatekeeper Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [citizen, setCitizen] = useState<CitizenUser>({
    id: 'cit-guest',
    name: 'Ghana Citizen',
    email: 'citizen@ghana.gov.gh',
    trustScore: 90,
    isVerified: false,
    loginMethod: 'EMAIL'
  });
  const [isCitizenProfileOpen, setIsCitizenProfileOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPendingCount = useCallback(async () => {
    try {
      const items = await getPendingReports();
      setPendingCount(items.length);
    } catch (e) {}
  }, []);

  useEffect(() => {
    refreshPendingCount();
    const unsubscribe = initAutoSyncNetworkListener(() => {
      refreshPendingCount();
    });
    return () => {
      unsubscribe();
    };
  }, [refreshPendingCount]);

  // GPS Location Hook
  const gps = useGpsLocation();

  // Incident Draft State & Upload Hook
  const draft = useIncidentDraft({
    citizen,
    coords: gps.coords,
    gpsAccuracy: gps.gpsAccuracy,
    locationSource: gps.locationSource,
    gpsFixAgeSeconds: gps.gpsFixAgeSeconds,
    locationName: gps.locationName,
    region: gps.region
  });

  // Camera & Video Recorder Hook
  const camera = useCameraRecorder({
    onMediaAttached: draft.processAndAttachEvidence
  });

  // Dev-only cryptographic test vector verification at startup
  useEffect(() => {
    if (__DEV__) {
      verifyKnownSha256Vector()
        .then((passed) => {
          if (passed) {
            console.log('✅ [FORENSIC CRYPTO] verifyKnownSha256Vector PASSED: NIST vector ba7816bf... matching');
          } else {
            console.error('❌ [FORENSIC CRYPTO] verifyKnownSha256Vector FAILED!');
          }
        })
        .catch((err) => {
          console.error('❌ [FORENSIC CRYPTO] verifyKnownSha256Vector error:', err);
        });
    }
  }, []);

  // Restore persisted Supabase session on app launch & listen to auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const user = session.user;
        const userMeta = user.user_metadata || {};
        setCitizen({
          id: user.id,
          name: userMeta.full_name || userMeta.name || user.email?.split('@')[0] || 'Ghana Citizen',
          email: user.email || '',
          phone: userMeta.phone || '',
          ghanaCard: userMeta.ghana_card || '',
          trustScore: typeof userMeta.trust_score === 'number' ? userMeta.trust_score : 70,
          isVerified: Boolean(userMeta.is_verified || false),
          loginMethod: (session.user.app_metadata?.provider === 'google' ? 'GOOGLE' : 'EMAIL') as any,
          accessToken: session.access_token
        });
        setIsAuthenticated(true);
        draft.setIsAnonymous(false);
        draft.setReporterPhone(userMeta.phone || '');
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const user = session.user;
        const userMeta = user.user_metadata || {};
        setCitizen({
          id: user.id,
          name: userMeta.full_name || userMeta.name || user.email?.split('@')[0] || 'Ghana Citizen',
          email: user.email || '',
          phone: userMeta.phone || '',
          ghanaCard: userMeta.ghana_card || '',
          trustScore: typeof userMeta.trust_score === 'number' ? userMeta.trust_score : 70,
          isVerified: Boolean(userMeta.is_verified || false),
          loginMethod: (session.user.app_metadata?.provider === 'google' ? 'GOOGLE' : 'EMAIL') as any,
          accessToken: session.access_token
        });
        setIsAuthenticated(true);
        draft.setIsAnonymous(false);
        draft.setReporterPhone(userMeta.phone || '');
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await gps.fetchCurrentLocation();
    setIsRefreshing(false);
  }, [gps.fetchCurrentLocation]);

  const handleAuthenticated = useCallback((newCitizen: CitizenUser) => {
    setCitizen(newCitizen);
    setIsAuthenticated(true);
    if (newCitizen.loginMethod === 'ANONYMOUS') {
      draft.setIsAnonymous(true);
    } else {
      draft.setIsAnonymous(false);
      draft.setReporterPhone(newCitizen.phone || '');
    }
  }, [draft.setIsAnonymous, draft.setReporterPhone]);

  const handleSignOut = useCallback(() => {
    setIsAuthenticated(false);
    draft.setIsAnonymous(false);
  }, [draft.setIsAnonymous]);

  const t = GHANAIAN_LANGUAGES[lang] || GHANAIAN_LANGUAGES.en;

  if (!fontsLoaded) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={tokens.colors.brand.gold} size="large" />
      </View>
    );
  }

  // ACCESS CONTROL GATEKEEPER: Render full-screen wall until citizen authenticates
  if (!isAuthenticated) {
    return <CitizenAccessWall onAuthenticated={handleAuthenticated} />;
  }

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight || 24)), paddingBottom: Math.max(insets.bottom, 12) }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Ghana Flag Header Accent */}
      <View style={styles.flagHeader}>
        <View style={{ flex: 1, backgroundColor: tokens.colors.brand.red }} />
        <View style={{ flex: 1, backgroundColor: tokens.colors.brand.gold }} />
        <View style={{ flex: 1, backgroundColor: tokens.colors.brand.green }} />
      </View>

      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.xs, flex: 1 }}>
          <ShieldCheck color={tokens.colors.brand.gold} size={22} />
          <View>
            <Text style={styles.appTitle}>
              CITIZEN<Text style={{ color: tokens.colors.brand.gold }}>ALERT</Text>
            </Text>
            <Text style={styles.appSubtitle}>National Evidence Vault 🇬🇭</Text>
          </View>
        </View>

        {/* Language Selector */}
        <View style={styles.langSelector}>
          {(['en', 'tw', 'ga', 'ee', 'ha'] as LanguageCode[]).map((l) => (
            <TouchableOpacity
              key={l}
              onPress={() => setLang(l)}
              style={[styles.langBtn, lang === l && styles.langBtnActive]}
              accessibilityRole="button"
              accessibilityLabel={`Select language ${l.toUpperCase()}`}
            >
              <Text style={[styles.langBtnText, lang === l && styles.langBtnTextActive]}>
                {l.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Citizen Identity Bar */}
      <View style={styles.citizenProfileBar}>
        <TouchableOpacity
          onPress={() => setIsCitizenProfileOpen(true)}
          style={styles.citizenBadgePill}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Open Citizen Profile"
        >
          <View style={styles.citizenAvatar}>
            {citizen.loginMethod === 'ANONYMOUS' ? (
              <Shield color={tokens.colors.brand.gold} size={16} />
            ) : (
              <UserCheck color={tokens.colors.police.badge} size={16} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.citizenNameText} numberOfLines={1}>
                {citizen.loginMethod === 'ANONYMOUS' ? 'Anonymous Whistleblower' : citizen.name}
              </Text>
              {citizen.isVerified && (
                <ShieldCheck color={tokens.colors.status.success} size={12} />
              )}
            </View>
            <Text style={styles.citizenMetaText}>
              {citizen.loginMethod === 'GOOGLE'
                ? `Google Verified • ${citizen.trustScore}% Trust`
                : citizen.loginMethod === 'PHONE'
                ? `Phone Verified • ${citizen.trustScore}% Trust`
                : 'Whistleblower Act 720 Immunity Active'}
            </Text>
          </View>
          <View style={styles.citizenAuthBtn}>
            <Text style={styles.citizenAuthBtnText}>
              {citizen.loginMethod === 'ANONYMOUS' ? 'Sign In' : 'Profile'}
            </Text>
            <ChevronDown color={tokens.colors.police.badge} size={12} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Navigation Tabs */}
      <TabBar activeTab={activeTab} onSelectTab={setActiveTab} pendingCount={pendingCount} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {activeTab === 'QUEUE' ? (
          <View style={styles.queueContainer}>
            <PendingReportsScreen onQueueCountChange={setPendingCount} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={tokens.colors.brand.gold}
              />
            }
          >
            {/* TAB 1: 60s Evidence Capture */}
            {activeTab === 'CAPTURE' && (
              <EvidenceCaptureScreen
                t={t}
                coords={gps.coords}
                gpsAccuracy={gps.gpsAccuracy}
                isLocating={gps.isLocating}
                gpsStatus={gps.gpsStatus}
                locationSource={gps.locationSource}
                gpsFixAgeSeconds={gps.gpsFixAgeSeconds}
                gpsFixTimestamp={gps.gpsFixTimestamp}
                locationName={gps.locationName}
                region={gps.region}
                onRefreshGps={gps.fetchCurrentLocation}
                onLocationNameChange={gps.setLocationName}
                cameraRef={camera.cameraRef}
                hasCameraPermission={camera.hasCameraPermission}
                facing={camera.facing}
                isRecording={camera.isRecording}
                recordingSeconds={camera.recordingSeconds}
                recordedDuration={camera.recordedDuration}
                hasRecordedMedia={camera.hasRecordedMedia}
                recordedUri={camera.recordedUri}
                mediaType={camera.mediaType}
                onFlipCamera={camera.toggleCameraFacing}
                onToggleRecording={camera.handleToggleRecording}
                onSnapPhoto={camera.handleSnapPhoto}
                onPickFromGallery={camera.handlePickFromGallery}
                onRetake={() => {
                  camera.handleClearMedia();
                  draft.clearAttachedMedia();
                }}
                onRequestCameraPermissions={camera.requestPermissions}
                category={draft.category}
                title={draft.title}
                description={draft.description}
                landmark={draft.landmark}
                isAnonymous={draft.isAnonymous}
                reporterPhone={draft.reporterPhone}
                isSubmitting={draft.isSubmitting}
                uploadProgress={draft.uploadProgress}
                uploadStatusText={draft.uploadStatusText}
                isUploadingMedia={draft.isUploadingMedia}
                onCategoryChange={draft.setCategory}
                onTitleChange={draft.setTitle}
                onDescriptionChange={draft.setDescription}
                onLandmarkChange={draft.setLandmark}
                onAnonymousChange={draft.setIsAnonymous}
                onReporterPhoneChange={draft.setReporterPhone}
                onSaveToGallery={draft.saveEvidenceToGallery}
                onSubmitReport={draft.handleSubmitReport}
              />
            )}

            {/* TAB 2: Amber Alerts */}
            {activeTab === 'ALERTS' && (
              <AmberAlertsScreen
                coords={gps.coords}
                region={gps.region}
                locationName={gps.locationName}
                landmark={draft.landmark}
                isAnonymous={draft.isAnonymous}
                reporterPhone={draft.reporterPhone}
              />
            )}

            {/* TAB 3: SOS Panic */}
            {activeTab === 'SOS' && (
              <SosPanicScreen
                coords={gps.coords}
                gpsAccuracy={gps.gpsAccuracy}
                locationSource={gps.locationSource}
                gpsFixAgeSeconds={gps.gpsFixAgeSeconds}
                locationName={gps.locationName}
                landmark={draft.landmark}
                region={gps.region}
                isAnonymous={draft.isAnonymous}
                reporterPhone={draft.reporterPhone}
              />
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      {/* Citizen Profile Sheet */}
      <CitizenProfileSheet
        isOpen={isCitizenProfileOpen}
        citizen={citizen}
        isAnonymous={draft.isAnonymous}
        onClose={() => setIsCitizenProfileOpen(false)}
        onToggleAnonymous={draft.setIsAnonymous}
        onSignOut={handleSignOut}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.bg.base
  },
  flagHeader: {
    height: 4,
    flexDirection: 'row'
  },
  topBar: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border.subtle,
    backgroundColor: tokens.colors.bg.subtle
  },
  appTitle: {
    fontSize: tokens.typography.fontSize.lg,
    fontWeight: '900',
    color: tokens.colors.text.white,
    letterSpacing: 0.5
  },
  appSubtitle: {
    fontSize: tokens.typography.fontSize.xxs,
    color: tokens.colors.text.secondary
  },
  langSelector: {
    flexDirection: 'row',
    gap: 3
  },
  langBtn: {
    paddingHorizontal: tokens.spacing.xs,
    paddingVertical: 4,
    borderRadius: tokens.radius.xs,
    backgroundColor: tokens.colors.surface.card,
    borderWidth: 1,
    borderColor: tokens.colors.border.medium,
    minHeight: 28,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center'
  },
  langBtnActive: {
    backgroundColor: tokens.colors.brand.gold,
    borderColor: tokens.colors.brand.gold
  },
  langBtnText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: tokens.colors.text.secondary
  },
  langBtnTextActive: {
    color: tokens.colors.bg.base
  },
  citizenProfileBar: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    backgroundColor: tokens.colors.bg.base,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border.subtle
  },
  citizenBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.surface.card,
    borderWidth: 1,
    borderColor: tokens.colors.border.subtle,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    gap: tokens.spacing.sm,
    minHeight: tokens.touchTarget.minHeight
  },
  citizenAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: tokens.colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.border.medium
  },
  citizenNameText: {
    color: tokens.colors.text.white,
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: '700'
  },
  citizenMetaText: {
    color: tokens.colors.text.secondary,
    fontSize: 10,
    fontWeight: '500'
  },
  citizenAuthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: tokens.colors.border.subtle,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 4,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    borderColor: tokens.colors.police.primary
  },
  citizenAuthBtnText: {
    color: tokens.colors.police.badge,
    fontSize: tokens.typography.fontSize.xxs,
    fontWeight: 'bold'
  },
  scrollContent: {
    padding: tokens.spacing.md,
    paddingBottom: tokens.spacing.xxxl
  },
  queueContainer: {
    flex: 1,
    padding: tokens.spacing.md
  }
});
