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
  ActivityIndicator,
  Image
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
import { Shield, User as UserIcon } from 'lucide-react-native';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SosPanicScreen } from './src/screens/SosPanicScreen';
import { PendingReportsScreen } from './src/screens/PendingReportsScreen';
import { getPendingReports, initAutoSyncNetworkListener } from './src/services/pendingReportsQueue';
import { verifyKnownSha256Vector } from './src/utils/fileHashing';
import { resolveEffectiveAvatar } from './src/services/avatarService';
import { readTrustScore } from './src/services/trustScoreService';
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
    trustScore: 0,
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

  // Handle live civic trust score update
  const handleTrustScoreUpdated = useCallback((newScore: number) => {
    setCitizen(prev => ({ ...prev, trustScore: newScore }));
  }, []);

  // SOS Persistent Beacon State (Never disconnects on tab or menu navigation)
  const [isSosActive, setIsSosActive] = useState(false);
  const [activeSosTrackingCode, setActiveSosTrackingCode] = useState<string | null>(null);
  const [sosPingsCount, setSosPingsCount] = useState(0);

  const handleSosStateChange = useCallback((isActive: boolean, trackingCode: string | null, pingCount: number) => {
    setIsSosActive(isActive);
    setActiveSosTrackingCode(trackingCode);
    setSosPingsCount(pingCount);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const savedCode = await AsyncStorage.getItem('@active_sos_tracking_code');
        if (savedCode) {
          setIsSosActive(true);
          setActiveSosTrackingCode(savedCode);
          setSosPingsCount(1);
        }
      } catch {}
    })();
  }, []);

  // GPS Location Hook
  const gps = useGpsLocation();

  // Incident Draft State & Upload Hook
  const draft = useIncidentDraft({
    citizen,
    coords: gps.coords,
    gpsAccuracy: gps.gpsAccuracy,
    locationSource: gps.locationSource,
    gpsFixAgeSeconds: gps.gpsFixAgeSeconds,
    gpsFixTimestamp: gps.gpsFixTimestamp,
    locationName: gps.locationName,
    region: gps.region,
    onTrustScoreUpdated: handleTrustScoreUpdated
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
    const restoreSession = async () => {
      try {
        // Clean up legacy unscoped avatar key
        await AsyncStorage.removeItem('@citizen_avatar_data').catch(() => {});

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const user = session.user;
          const userMeta = user.user_metadata || {};
          const normalizedEmail = (user.email || '').trim().toLowerCase();
          let effectivePhone = userMeta.phone || '';

          // Cross-provider phone persistence (restore phone if missing on Google login)
          if (!effectivePhone && normalizedEmail) {
            const cachedPhone = await AsyncStorage.getItem(`@citizen_phone_${normalizedEmail}`).catch(() => null);
            if (cachedPhone) {
              effectivePhone = cachedPhone;
              supabase.auth.updateUser({
                data: {
                  phone: cachedPhone,
                  emergency_telecom_consent: true,
                  emergency_consent_at: new Date().toISOString(),
                  emergency_consent_act: 'DATA_PROTECTION_ACT_843_SEC_20'
                }
              }).catch(() => {});
            }
          } else if (effectivePhone && normalizedEmail) {
            await AsyncStorage.setItem(`@citizen_phone_${normalizedEmail}`, effectivePhone).catch(() => {});
          }

          const savedAvatar = await AsyncStorage.getItem(`@citizen_avatar_${user.id}`).catch(() => null);
          const effectiveAvatar = resolveEffectiveAvatar(userMeta, savedAvatar);
          if (userMeta.custom_avatar_url && userMeta.custom_avatar_url !== savedAvatar) {
            AsyncStorage.setItem(`@citizen_avatar_${user.id}`, userMeta.custom_avatar_url).catch(() => {});
          }
          setCitizen({
            id: user.id,
            name: userMeta.full_name || userMeta.name || user.email?.split('@')[0] || 'Ghana Citizen',
            email: user.email || '',
            phone: effectivePhone,
            ghanaCard: userMeta.ghana_card || '',
            avatarUrl: effectiveAvatar,
            trustScore: readTrustScore(user),
            isVerified: Boolean(userMeta.is_verified || false),
            loginMethod: (session.user.app_metadata?.provider === 'google' ? 'GOOGLE' : 'EMAIL') as any,
            accessToken: session.access_token,
            emergencyTelecomConsent: userMeta.emergency_telecom_consent !== undefined ? Boolean(userMeta.emergency_telecom_consent) : Boolean(effectivePhone),
            emergencyConsentAt: userMeta.emergency_consent_at || undefined
          });
          setIsAuthenticated(true);
          draft.setIsAnonymous(false);
          draft.setReporterPhone(effectivePhone);
        }
      } catch (err) {
        console.warn('[Session Restore] Error:', err);
      }
    };

    restoreSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user = session.user;
        const userMeta = user.user_metadata || {};
        const normalizedEmail = (user.email || '').trim().toLowerCase();
        let effectivePhone = userMeta.phone || '';

        // Cross-provider phone persistence
        if (!effectivePhone && normalizedEmail) {
          const cachedPhone = await AsyncStorage.getItem(`@citizen_phone_${normalizedEmail}`).catch(() => null);
          if (cachedPhone) {
            effectivePhone = cachedPhone;
            supabase.auth.updateUser({
              data: {
                phone: cachedPhone,
                emergency_telecom_consent: true,
                emergency_consent_at: new Date().toISOString(),
                emergency_consent_act: 'DATA_PROTECTION_ACT_843_SEC_20'
              }
            }).catch(() => {});
          }
        } else if (effectivePhone && normalizedEmail) {
          await AsyncStorage.setItem(`@citizen_phone_${normalizedEmail}`, effectivePhone).catch(() => {});
        }

        const savedAvatar = await AsyncStorage.getItem(`@citizen_avatar_${user.id}`).catch(() => null);
        const effectiveAvatar = resolveEffectiveAvatar(userMeta, savedAvatar);
        if (userMeta.custom_avatar_url && userMeta.custom_avatar_url !== savedAvatar) {
          AsyncStorage.setItem(`@citizen_avatar_${user.id}`, userMeta.custom_avatar_url).catch(() => {});
        }
        setCitizen({
          id: user.id,
          name: userMeta.full_name || userMeta.name || user.email?.split('@')[0] || 'Ghana Citizen',
          email: user.email || '',
          phone: effectivePhone,
          ghanaCard: userMeta.ghana_card || '',
          avatarUrl: effectiveAvatar,
          trustScore: readTrustScore(user),
          isVerified: Boolean(userMeta.is_verified || false),
          loginMethod: (session.user.app_metadata?.provider === 'google' ? 'GOOGLE' : 'EMAIL') as any,
          accessToken: session.access_token,
          emergencyTelecomConsent: userMeta.emergency_telecom_consent !== undefined ? Boolean(userMeta.emergency_telecom_consent) : Boolean(effectivePhone),
          emergencyConsentAt: userMeta.emergency_consent_at || undefined
        });
        setIsAuthenticated(true);
        draft.setIsAnonymous(false);
        draft.setReporterPhone(effectivePhone);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        draft.setIsAnonymous(false);
        setCitizen({
          id: '',
          name: '',
          email: '',
          phone: '',
          ghanaCard: '',
          avatarUrl: undefined,
          trustScore: 0,
          isVerified: false,
          loginMethod: 'EMAIL',
        });
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
    setCitizen({
      id: '',
      name: '',
      email: '',
      phone: '',
      ghanaCard: '',
      avatarUrl: undefined,
      trustScore: 0,
      isVerified: false,
      loginMethod: 'EMAIL',
    });
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
    <View style={[styles.container, { paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight || 24)) }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Ghana tricolour hairline */}
      <View style={styles.flagHeader}>
        <View style={{ flex: 1, backgroundColor: tokens.colors.brand.red }} />
        <View style={{ flex: 1, backgroundColor: tokens.colors.brand.gold }} />
        <View style={{ flex: 1, backgroundColor: tokens.colors.brand.green }} />
      </View>

      {/* Header: GH mark · CitizenAlert / current section · profile avatar */}
      <View style={styles.topBar}>
        <View style={styles.ghChip}>
          <View style={styles.ghDot} />
          <Text style={styles.ghChipText}>GH</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.appTitle} numberOfLines={1}>CitizenAlert</Text>
          <Text style={styles.appSubtitle} numberOfLines={1}>{TAB_TITLES[activeTab]}</Text>
        </View>
        <TouchableOpacity
          onPress={() => setIsCitizenProfileOpen(true)}
          style={styles.avatarButton}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={citizen.loginMethod === 'ANONYMOUS' ? 'Open profile and sign in' : 'Open profile'}
        >
          {citizen.avatarUrl && citizen.loginMethod !== 'ANONYMOUS' ? (
            <Image source={{ uri: citizen.avatarUrl }} style={styles.avatarImage} resizeMode="cover" />
          ) : citizen.loginMethod === 'ANONYMOUS' ? (
            <Shield color={tokens.colors.text.inverse} size={20} />
          ) : (
            <UserIcon color={tokens.colors.text.inverse} size={20} />
          )}
        </TouchableOpacity>
      </View>

      {/* Persistent SOS bar while a beacon is live (shown on every tab except SOS itself) */}
      {isSosActive && activeTab !== 'SOS' && (
        <TouchableOpacity
          onPress={() => setActiveTab('SOS')}
          activeOpacity={0.85}
          style={styles.sosGlobalBanner}
          accessibilityRole="button"
          accessibilityLabel="SOS is active. Tap to return to the SOS screen."
        >
          <View style={styles.sosBeaconDot} />
          <Text style={styles.sosGlobalBannerTitle}>SOS active · tap to return</Text>
          <Text style={styles.sosGlobalBannerPings}>
            {sosPingsCount > 0 ? `${sosPingsCount} updates sent` : 'Sending…'}
          </Text>
        </TouchableOpacity>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.queueContainer, { display: activeTab === 'QUEUE' ? 'flex' : 'none' }]}>
          <PendingReportsScreen onQueueCountChange={setPendingCount} />
        </View>

        <ScrollView
          style={{ display: activeTab !== 'QUEUE' ? 'flex' : 'none' }}
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
              reporterName={citizen.loginMethod === 'ANONYMOUS' ? null : citizen.name}
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
              onSubmitReport={draft.handleSubmitReport}
              lastSubmission={draft.lastSubmission}
              onDismissSubmission={draft.clearLastSubmission}
              onViewMyReports={() => setActiveTab('QUEUE')}
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

          {/* TAB 3: SOS Panic (Always mounted in React memory so CAD GPS pings and movement tracking never drop) */}
          <View style={{ display: activeTab === 'SOS' ? 'flex' : 'none', width: '100%' }}>
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
              citizen={citizen}
              onSosStateChange={handleSosStateChange}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom navigation */}
      <TabBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        pendingCount={pendingCount}
        isSosActive={isSosActive}
        bottomInset={insets.bottom}
      />

      {/* Citizen Profile Sheet */}
      <CitizenProfileSheet
        isOpen={isCitizenProfileOpen}
        citizen={citizen}
        isAnonymous={draft.isAnonymous}
        language={lang}
        onChangeLanguage={setLang}
        onClose={() => setIsCitizenProfileOpen(false)}
        onToggleAnonymous={draft.setIsAnonymous}
        onSignOut={handleSignOut}
        onUpdateAvatar={async (newAvatarUrl) => {
          setCitizen((prev) => ({ ...prev, avatarUrl: newAvatarUrl }));
          try {
            if (citizen.id) {
              await AsyncStorage.setItem(`@citizen_avatar_${citizen.id}`, newAvatarUrl);
            }
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              await supabase.auth.updateUser({
                data: {
                  custom_avatar_url: newAvatarUrl,
                  avatar_url: newAvatarUrl
                }
              }).catch(() => {});
            }
          } catch (e) {
            console.warn('[Avatar Save Error]', e);
          }
        }}
        onUpdatePhone={async (newPhone) => {
          setCitizen((prev) => ({ ...prev, phone: newPhone }));
          draft.setReporterPhone(newPhone);
          if (citizen.email) {
            await AsyncStorage.setItem(`@citizen_phone_${citizen.email.toLowerCase()}`, newPhone).catch(() => {});
          }
        }}
      />
    </View>
  );
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[CRITICAL APP RUNTIME ERROR]', error, errorInfo);
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#070B13', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Shield color="#F59E0B" size={48} style={{ marginBottom: 16 }} />
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>
            CitizenAlert Ghana
          </Text>
          <Text style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 18 }}>
            A temporary startup interruption occurred. Tap below to reload the secure session.
          </Text>
          <TouchableOpacity
            onPress={this.handleRestart}
            style={{
              backgroundColor: '#0D6A38',
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
              minWidth: 160,
              alignItems: 'center'
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 }}>Reload Application</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppErrorBoundary>
        <MainApp />
      </AppErrorBoundary>
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
    minHeight: 64,
    paddingHorizontal: tokens.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border.subtle,
    backgroundColor: tokens.colors.bg.subtle
  },
  ghChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.colors.surface.cardHover
  },
  ghDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tokens.colors.brand.gold
  },
  ghChipText: {
    color: tokens.colors.text.primary,
    fontSize: tokens.typography.fontSize.sm,
    fontFamily: tokens.typography.fontFamily.mono
  },
  appTitle: {
    fontSize: tokens.typography.fontSize.lg,
    fontFamily: tokens.typography.fontFamily.sansBold,
    color: tokens.colors.text.primary
  },
  appSubtitle: {
    fontSize: tokens.typography.fontSize.sm,
    fontFamily: tokens.typography.fontFamily.sansMedium,
    color: tokens.colors.text.secondary
  },
  avatarButton: {
    width: tokens.touchTarget.minWidth,
    height: tokens.touchTarget.minHeight,
    borderRadius: tokens.touchTarget.minHeight / 2,
    backgroundColor: '#FFF0C9',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  avatarImage: {
    width: '100%',
    height: '100%'
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
    borderColor: tokens.colors.border.medium,
    overflow: 'hidden'
  },
  citizenAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16
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
  },
  sosGlobalBanner: {
    backgroundColor: tokens.colors.sos.container,
    minHeight: tokens.touchTarget.minHeight,
    paddingHorizontal: tokens.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm
  },
  sosBeaconDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: tokens.colors.text.white
  },
  sosGlobalBannerTitle: {
    flex: 1,
    color: tokens.colors.text.white,
    fontSize: tokens.typography.fontSize.md,
    fontFamily: tokens.typography.fontFamily.sans
  },
  sosGlobalBannerPings: {
    color: tokens.colors.sos.onContainer,
    fontSize: tokens.typography.fontSize.sm,
    fontFamily: tokens.typography.fontFamily.mono
  }
});

const TAB_TITLES: Record<TabType, string> = {
  CAPTURE: 'Report an incident',
  ALERTS: 'Safety alerts',
  SOS: 'Emergency SOS',
  QUEUE: 'My reports'
};
