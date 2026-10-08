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
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

export default function App() {
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

  // GPS Location Hook
  const gps = useGpsLocation();

  // Incident Draft State & Upload Hook
  const draft = useIncidentDraft({
    citizen,
    coords: gps.coords,
    gpsAccuracy: gps.gpsAccuracy,
    locationName: gps.locationName,
    landmark: '',
    ghanaPostCode: gps.ghanaPostCode,
    region: gps.region
  });

  // Camera & Video Recorder Hook
  const camera = useCameraRecorder({
    onMediaAttached: draft.processAndAttachEvidence
  });

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

  // ACCESS CONTROL GATEKEEPER: Render full-screen wall until citizen authenticates
  if (!isAuthenticated) {
    return <CitizenAccessWall onAuthenticated={handleAuthenticated} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#070B13" />

      {/* Ghana Flag Header Accent */}
      <View style={styles.flagHeader}>
        <View style={{ flex: 1, backgroundColor: '#CE1126' }} />
        <View style={{ flex: 1, backgroundColor: '#FCD116' }} />
        <View style={{ flex: 1, backgroundColor: '#006B3F' }} />
      </View>

      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.appTitle}>
            CITIZEN<Text style={{ color: '#FCD116' }}>ALERT</Text> 🇬🇭
          </Text>
          <Text style={styles.appSubtitle}>National Civic Safety & Evidence Vault</Text>
        </View>

        {/* Language Selector */}
        <View style={styles.langSelector}>
          {(['en', 'tw', 'ga', 'ee', 'ha'] as LanguageCode[]).map((l) => (
            <TouchableOpacity
              key={l}
              onPress={() => setLang(l)}
              style={[styles.langBtn, lang === l && styles.langBtnActive]}
            >
              <Text style={[styles.langBtnText, lang === l && styles.langBtnTextActive]}>
                {l.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Citizen Identity & Access Control Bar */}
      <View style={styles.citizenProfileBar}>
        <TouchableOpacity
          onPress={() => setIsCitizenProfileOpen(true)}
          style={styles.citizenBadgePill}
          activeOpacity={0.8}
        >
          <View style={styles.citizenAvatar}>
            <Text style={{ fontSize: 13 }}>
              {citizen.loginMethod === 'ANONYMOUS' ? '🛡️' : '🇬🇭'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.citizenNameText} numberOfLines={1}>
                {citizen.loginMethod === 'ANONYMOUS' ? 'Anonymous Whistleblower' : citizen.name}
              </Text>
              {citizen.isVerified && (
                <Text style={{ color: '#10B981', fontSize: 11, fontWeight: 'bold' }}>✓</Text>
              )}
            </View>
            <Text style={styles.citizenMetaText}>
              {citizen.loginMethod === 'GOOGLE'
                ? `Google Verified • ${citizen.trustScore}% Trust`
                : citizen.loginMethod === 'PHONE'
                ? `Phone Verified • ${citizen.trustScore}% Trust`
                : 'Whistleblower Act 720 Active'}
            </Text>
          </View>
          <View style={styles.citizenAuthBtn}>
            <Text style={styles.citizenAuthBtnText}>
              {citizen.loginMethod === 'ANONYMOUS' ? 'Sign In' : 'Account'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Navigation Tabs */}
      <TabBar activeTab={activeTab} onSelectTab={setActiveTab} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#FCD116"
            />
          }
        >
          {/* TAB 1: 60s In-App Camera Capture & Ingestion */}
          {activeTab === 'CAPTURE' && (
            <EvidenceCaptureScreen
              t={t}
              coords={gps.coords}
              gpsAccuracy={gps.gpsAccuracy}
              isLocating={gps.isLocating}
              gpsStatus={gps.gpsStatus}
              locationName={gps.locationName}
              ghanaPostCode={gps.ghanaPostCode}
              onRefreshGps={gps.fetchCurrentLocation}
              onLocationNameChange={gps.setLocationName}
              onGhanaPostCodeChange={gps.setGhanaPostCode}
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
              onSubmitReport={draft.handleSubmitReport}
            />
          )}

          {/* TAB 2: Amber & Red Alerts */}
          {activeTab === 'ALERTS' && (
            <AmberAlertsScreen
              coords={gps.coords}
              ghanaPostCode={gps.ghanaPostCode}
              region={gps.region}
              locationName={gps.locationName}
              landmark={draft.landmark}
              isAnonymous={draft.isAnonymous}
              reporterPhone={draft.reporterPhone}
            />
          )}

          {/* TAB 3: SOS Emergency Panic */}
          {activeTab === 'SOS' && (
            <SosPanicScreen
              coords={gps.coords}
              gpsAccuracy={gps.gpsAccuracy}
              locationName={gps.locationName}
              landmark={draft.landmark}
              ghanaPostCode={gps.ghanaPostCode}
              region={gps.region}
              isAnonymous={draft.isAnonymous}
              reporterPhone={draft.reporterPhone}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Citizen Profile & Active Session Management Sheet */}
      <CitizenProfileSheet
        isOpen={isCitizenProfileOpen}
        citizen={citizen}
        isAnonymous={draft.isAnonymous}
        onClose={() => setIsCitizenProfileOpen(false)}
        onToggleAnonymous={draft.setIsAnonymous}
        onSignOut={handleSignOut}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070B13'
  },
  flagHeader: {
    height: 6,
    flexDirection: 'row'
  },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B'
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff'
  },
  appSubtitle: {
    fontSize: 11,
    color: '#94a3b8'
  },
  langSelector: {
    flexDirection: 'row',
    gap: 4
  },
  langBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155'
  },
  langBtnActive: {
    backgroundColor: '#FCD116',
    borderColor: '#FCD116'
  },
  langBtnText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94a3b8'
  },
  langBtnTextActive: {
    color: '#070B13'
  },
  citizenProfileBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0B1120',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B'
  },
  citizenBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10
  },
  citizenAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#475569'
  },
  citizenNameText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  },
  citizenMetaText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '500'
  },
  citizenAuthBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6'
  },
  citizenAuthBtnText: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: 'bold'
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  }
});
