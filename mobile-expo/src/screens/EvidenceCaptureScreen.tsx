import React, { memo, useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Keyboard,
  ActivityIndicator,
  Linking,
  Share
} from 'react-native';
import {
  Camera,
  Image as ImageIcon,
  MapPin,
  ChevronRight,
  ChevronLeft,
  ShieldAlert,
  TriangleAlert,
  TreePine,
  Car,
  Trash2,
  Send,
  Check,
  X,
  EyeOff,
  Lock,
  LocateFixed,
  Video,
  Shield,
  CircleCheck,
  PhoneCall,
  Share2,
  CloudOff,
  Siren
} from 'lucide-react-native';
import { TranslationMap, LANDMARK_SUGGESTIONS } from '../constants/i18n';
import { GpsCoordinates, GpsLockStatus, IncidentCategory, LocationSource } from '../types';
import { effectiveLocationSource } from '../hooks/useGpsLocation';
import { SubmissionReceipt } from '../hooks/useIncidentDraft';
import { ViewfinderOverlay } from '../components/ViewfinderOverlay';
import { UploadProgressHud } from '../components/UploadProgressHud';
import { CameraType } from 'expo-camera';
import { tokens } from '../theme/tokens';

interface EvidenceCaptureScreenProps {
  t: TranslationMap;
  // GPS props
  coords: GpsCoordinates | null;
  gpsAccuracy: number | null;
  isLocating: boolean;
  gpsStatus: GpsLockStatus;
  locationSource: LocationSource;
  gpsFixAgeSeconds: number | null;
  gpsFixTimestamp?: number | null;
  locationName: string;
  region: string;
  onRefreshGps: () => void;
  onLocationNameChange: (text: string) => void;
  // Camera props
  cameraRef: React.RefObject<any>;
  hasCameraPermission: boolean | null;
  facing: CameraType;
  isRecording: boolean;
  recordingSeconds: number;
  recordedDuration: number;
  hasRecordedMedia: boolean;
  recordedUri: string | null;
  mediaType: 'VIDEO' | 'IMAGE';
  onFlipCamera: () => void;
  onToggleRecording: () => void;
  onSnapPhoto: () => void;
  onPickFromGallery: () => void;
  onRetake: () => void;
  onRequestCameraPermissions: () => void;
  // Draft Form props
  category: IncidentCategory;
  title: string;
  description: string;
  landmark: string;
  isAnonymous: boolean;
  reporterPhone: string;
  /** Display name for the "Report as …" option; null when the person is signed in anonymously. */
  reporterName: string | null;
  isSubmitting: boolean;
  uploadProgress: number;
  uploadStatusText: string;
  isUploadingMedia: boolean;
  onCategoryChange: (cat: IncidentCategory) => void;
  onTitleChange: (text: string) => void;
  onDescriptionChange: (text: string) => void;
  onLandmarkChange: (text: string) => void;
  onAnonymousChange: (anon: boolean) => void;
  onReporterPhoneChange: (phone: string) => void;
  onSubmitReport: () => void;
  // Result of the last submission ("Report sent" screen)
  lastSubmission: SubmissionReceipt | null;
  onDismissSubmission: () => void;
  onViewMyReports: () => void;
}

const CATEGORIES: { id: IncidentCategory; label: string; hint: string; icon: any }[] = [
  { id: 'CRIMINAL_OFFENSE', label: 'Violent crime', hint: 'Assault, robbery', icon: TriangleAlert },
  { id: 'DOMESTIC_ABUSE', label: 'Domestic abuse', hint: 'DOVVSU desk', icon: ShieldAlert },
  { id: 'TRAFFIC_RECKLESS', label: 'Road traffic', hint: 'Collision, hazard', icon: Car },
  { id: 'GALAMSEY_ENVIRONMENTAL', label: 'Galamsey & water', hint: 'Illegal mining', icon: TreePine },
  { id: 'SANITATION_ZONING', label: 'Sanitation', hint: 'Illegal dumping', icon: Trash2 }
];

const CATEGORY_LABEL: Record<IncidentCategory, string> = {
  CRIMINAL_OFFENSE: 'Violent crime',
  DOMESTIC_ABUSE: 'Domestic abuse (DOVVSU)',
  TRAFFIC_RECKLESS: 'Road traffic',
  GALAMSEY_ENVIRONMENTAL: 'Galamsey & water',
  SANITATION_ZONING: 'Sanitation'
};

const HEADLINE_MAX = 60;
const DESCRIPTION_MAX = 500;

/** "Takoradi, Western Region · 4.934, -1.768 · ±4 m" — plain region + coordinates, no GhanaPost codes. */
function formatLocationLine(region: string, coords: GpsCoordinates | null, accuracy: number | null, source: LocationSource) {
  const parts: string[] = [];
  if (region && region !== 'UNKNOWN') parts.push(region);
  if (coords) parts.push(`${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)}`);
  if (typeof accuracy === 'number' && (source === 'LIVE' || source === 'LAST_KNOWN')) parts.push(`±${Math.round(accuracy)} m`);
  return parts.join(' · ');
}

export const EvidenceCaptureScreen: React.FC<EvidenceCaptureScreenProps> = memo((props) => {
  const {
    t, coords, gpsAccuracy, isLocating, locationSource, gpsFixAgeSeconds, gpsFixTimestamp,
    isRecording, hasRecordedMedia, onSnapPhoto, onToggleRecording, onPickFromGallery, onRetake,
    lastSubmission, onDismissSubmission, onViewMyReports
  } = props;

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // After a successful submission, go back to step 1 for the next report.
  useEffect(() => {
    if (lastSubmission) setStep(1);
  }, [lastSubmission]);

  // GPS snapshot at the moment of capture, so the stamp on the evidence never drifts.
  const [gpsSnapshot, setGpsSnapshot] = useState<{
    coords: GpsCoordinates | null;
    gpsAccuracy: number | null;
    locationSource: LocationSource;
    gpsFixAgeSeconds: number | null;
    gpsFixTimestamp: number | null;
    capturedAtTimestamp: number;
  } | null>(null);

  const takeSnapshot = useCallback(() => {
    const now = Date.now();
    setGpsSnapshot({
      coords,
      gpsAccuracy,
      locationSource: effectiveLocationSource(gpsFixTimestamp, gpsAccuracy, now, locationSource),
      gpsFixAgeSeconds: gpsFixTimestamp ? Math.max(0, Math.floor((now - gpsFixTimestamp) / 1000)) : gpsFixAgeSeconds,
      gpsFixTimestamp: gpsFixTimestamp ?? null,
      capturedAtTimestamp: now
    });
  }, [coords, gpsAccuracy, locationSource, gpsFixAgeSeconds, gpsFixTimestamp]);

  const handleSnapPhoto = useCallback(() => {
    takeSnapshot();
    onSnapPhoto();
  }, [takeSnapshot, onSnapPhoto]);

  const handleToggleRecording = useCallback(() => {
    if (!isRecording) takeSnapshot();
    onToggleRecording();
  }, [isRecording, takeSnapshot, onToggleRecording]);

  const handlePickFromGallery = useCallback(() => {
    takeSnapshot();
    onPickFromGallery();
  }, [takeSnapshot, onPickFromGallery]);

  const handleRetake = useCallback(() => {
    setGpsSnapshot(null);
    onRetake();
  }, [onRetake]);

  if (lastSubmission) {
    return (
      <ReportSentView
        receipt={lastSubmission}
        onViewMyReports={() => {
          onDismissSubmission();
          onViewMyReports();
        }}
        onDone={onDismissSubmission}
      />
    );
  }

  const frozen = (isRecording || hasRecordedMedia) && gpsSnapshot;
  const liveSource = effectiveLocationSource(gpsFixTimestamp, gpsAccuracy, Date.now(), locationSource);

  return (
    <View style={styles.section}>
      <StepTracker step={step} onSelect={setStep} />

      {step === 1 && (
        <CaptureStep
          {...props}
          safetyText={t.safetyNotice}
          viewfinderCoords={frozen ? gpsSnapshot!.coords : coords}
          viewfinderAccuracy={frozen ? gpsSnapshot!.gpsAccuracy : gpsAccuracy}
          viewfinderSource={frozen ? gpsSnapshot!.locationSource : liveSource}
          viewfinderAge={frozen ? gpsSnapshot!.gpsFixAgeSeconds : gpsFixAgeSeconds}
          viewfinderTimestamp={frozen ? gpsSnapshot!.gpsFixTimestamp : gpsFixTimestamp ?? null}
          viewfinderCapturedAt={frozen ? gpsSnapshot!.capturedAtTimestamp : null}
          viewfinderLocating={isRecording || hasRecordedMedia ? false : isLocating}
          onSnap={handleSnapPhoto}
          onRecord={handleToggleRecording}
          onGallery={handlePickFromGallery}
          onRetakeClip={handleRetake}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <DetailsStep
          {...props}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <ReviewStep
          {...props}
          onEdit={() => setStep(2)}
        />
      )}
    </View>
  );
});

/* -------------------------------------------------------------------------- */
/* Step tracker                                                               */
/* -------------------------------------------------------------------------- */

const StepTracker: React.FC<{ step: 1 | 2 | 3; onSelect: (s: 1 | 2 | 3) => void }> = ({ step, onSelect }) => {
  const steps: { n: 1 | 2 | 3; label: string }[] = [
    { n: 1, label: 'Capture' },
    { n: 2, label: 'Details' },
    { n: 3, label: 'Review' }
  ];
  return (
    <View style={styles.tracker} accessibilityRole="progressbar" accessibilityLabel={`Report, step ${step} of 3`}>
      {steps.map((s, i) => {
        const done = step > s.n;
        const active = step === s.n;
        return (
          <React.Fragment key={s.n}>
            {i > 0 && <View style={[styles.trackerLine, step >= s.n && styles.trackerLineDone]} />}
            <TouchableOpacity
              onPress={() => (done ? onSelect(s.n) : undefined)}
              disabled={!done}
              style={[styles.trackerItem, active && styles.trackerItemActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled: !done && !active }}
              accessibilityLabel={`Step ${s.n}, ${s.label}${done ? ', done' : ''}`}
            >
              {done ? (
                <View style={styles.trackerDoneDot}>
                  <Check color={tokens.colors.status.successDark} size={12} strokeWidth={3} />
                </View>
              ) : (
                <Text style={[styles.trackerNum, active && styles.trackerTextActive]}>{s.n}.</Text>
              )}
              <Text style={[styles.trackerLabel, active && styles.trackerTextActive, done && styles.trackerLabelDone]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          </React.Fragment>
        );
      })}
    </View>
  );
};

/* -------------------------------------------------------------------------- */
/* Step 1 — Capture                                                           */
/* -------------------------------------------------------------------------- */

interface CaptureStepProps extends EvidenceCaptureScreenProps {
  safetyText: string;
  viewfinderCoords: GpsCoordinates | null;
  viewfinderAccuracy: number | null;
  viewfinderSource: LocationSource;
  viewfinderAge: number | null;
  viewfinderTimestamp: number | null;
  viewfinderCapturedAt: number | null;
  viewfinderLocating: boolean;
  onSnap: () => void;
  onRecord: () => void;
  onGallery: () => void;
  onRetakeClip: () => void;
  onNext: () => void;
}

const CaptureStep: React.FC<CaptureStepProps> = (p) => {
  const [showSafety, setShowSafety] = useState(true);
  const hasFix = !!p.coords && (p.locationSource === 'LIVE' || p.locationSource === 'LAST_KNOWN');

  return (
    <View style={styles.stepContent}>
      {showSafety && (
        <View style={styles.safetyBanner} accessibilityRole="alert">
          <TriangleAlert color={tokens.colors.brand.gold} size={18} />
          <Text style={styles.safetyText}>
            <Text style={styles.safetyStrong}>Keep distance: </Text>
            {p.safetyText}
          </Text>
          <TouchableOpacity
            onPress={() => setShowSafety(false)}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel="Dismiss safety reminder"
          >
            <X color={tokens.colors.text.secondary} size={18} />
          </TouchableOpacity>
        </View>
      )}

      <ViewfinderOverlay
        cameraRef={p.cameraRef}
        hasCameraPermission={p.hasCameraPermission}
        facing={p.facing}
        isRecording={p.isRecording}
        recordingSeconds={p.recordingSeconds}
        recordedDuration={p.recordedDuration}
        hasRecordedMedia={p.hasRecordedMedia}
        recordedUri={p.recordedUri}
        mediaType={p.mediaType}
        coords={p.viewfinderCoords}
        gpsAccuracy={p.viewfinderAccuracy}
        gpsStatus={p.gpsStatus}
        locationSource={p.viewfinderSource}
        isLocating={p.viewfinderLocating}
        gpsFixAgeSeconds={p.viewfinderAge}
        gpsFixTimestamp={p.viewfinderTimestamp}
        capturedAtTimestamp={p.viewfinderCapturedAt}
        onFlipCamera={p.onFlipCamera}
        onRetake={p.onRetakeClip}
        onRequestPermissions={p.onRequestCameraPermissions}
      />

      {/* Shutter controls */}
      <View style={styles.controlsCard}>
        <TouchableOpacity
          onPress={p.onSnap}
          disabled={p.isRecording}
          style={[styles.sideControl, p.isRecording && styles.disabled]}
          accessibilityRole="button"
          accessibilityLabel="Take a photo"
        >
          <View style={styles.sideControlIcon}>
            <Camera color={tokens.colors.text.primary} size={22} />
          </View>
          <Text style={styles.sideControlText}>Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={p.onRecord}
          style={styles.recordControl}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={p.isRecording ? 'Stop recording' : 'Start recording video, up to 45 seconds'}
        >
          <View style={[styles.recordRing, p.isRecording && styles.recordRingActive]}>
            <View style={p.isRecording ? styles.recordStop : styles.recordDot} />
          </View>
          <Text style={[styles.sideControlText, p.isRecording && { color: tokens.colors.text.crimson }]}>
            {p.isRecording ? 'Stop video' : p.hasRecordedMedia ? 'Record again' : 'Record'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={p.onGallery}
          disabled={p.isRecording}
          style={[styles.sideControl, p.isRecording && styles.disabled]}
          accessibilityRole="button"
          accessibilityLabel="Choose from gallery"
        >
          <View style={styles.sideControlIcon}>
            <ImageIcon color={tokens.colors.text.primary} size={22} />
          </View>
          <Text style={styles.sideControlText}>Gallery</Text>
        </TouchableOpacity>
      </View>

      {/* Recorded clip card */}
      {p.hasRecordedMedia && !p.isRecording && (
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.clipThumb}>
              {p.mediaType === 'VIDEO' ? (
                <Video color={tokens.colors.brand.gold} size={22} />
              ) : (
                <ImageIcon color={tokens.colors.brand.gold} size={22} />
              )}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{p.mediaType === 'VIDEO' ? 'Video clip' : 'Photo'}</Text>
                <View style={styles.readyChip}>
                  <Text style={styles.readyChipText}>READY</Text>
                </View>
              </View>
              <Text style={styles.monoMuted}>
                {p.mediaType === 'VIDEO' ? `${p.recordedDuration}s · ` : ''}
                {p.mediaType === 'VIDEO' ? 'MP4' : 'JPG'}
              </Text>
            </View>
          </View>
          <View style={[styles.row, { marginTop: tokens.spacing.md }]}>
            <TouchableOpacity
              onPress={p.onRetakeClip}
              style={styles.secondaryChip}
              accessibilityRole="button"
              accessibilityLabel="Retake"
            >
              <Text style={styles.secondaryChipText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={p.onNext}
              style={styles.keepChip}
              accessibilityRole="button"
              accessibilityLabel="Keep clip and continue"
            >
              <Check color={tokens.colors.text.inverse} size={16} />
              <Text style={styles.keepChipText}>Keep clip</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <UploadProgressHud
        uploadProgress={p.uploadProgress}
        uploadStatusText={p.uploadStatusText}
        isUploadingMedia={p.isUploadingMedia}
        hasRecordedMedia={p.hasRecordedMedia}
        mediaType={p.mediaType}
        recordedDuration={p.recordedDuration}
      />

      {/* GPS status */}
      <View style={[styles.card, styles.row]}>
        <LocateFixed color={hasFix ? tokens.colors.text.emerald : tokens.colors.text.secondary} size={20} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>
            {hasFix ? 'Location found' : p.isLocating ? 'Finding your location…' : 'Location not found yet'}
          </Text>
          <Text style={styles.bodyMuted}>
            {hasFix
              ? formatLocationLine(p.region, p.coords, p.gpsAccuracy, p.locationSource)
              : 'You can add a landmark or street name in step 2.'}
          </Text>
        </View>
        {!hasFix && !p.isLocating && (
          <TouchableOpacity onPress={p.onRefreshGps} style={styles.textButton} accessibilityRole="button">
            <Text style={styles.textButtonText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>

      <PrimaryButton
        label="Continue to details"
        onPress={p.onNext}
        icon={<ChevronRight color={tokens.colors.text.inverse} size={20} />}
      />
      {!p.hasRecordedMedia && (
        <TouchableOpacity onPress={p.onNext} style={styles.linkButton} accessibilityRole="button">
          <Text style={styles.linkText}>Report without media</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/* -------------------------------------------------------------------------- */
/* Step 2 — Details                                                           */
/* -------------------------------------------------------------------------- */

interface DetailsStepProps extends EvidenceCaptureScreenProps {
  onBack: () => void;
  onNext: () => void;
}

const DetailsStep: React.FC<DetailsStepProps> = (p) => {
  const [editingLocation, setEditingLocation] = useState(false);
  const locationLine = formatLocationLine(p.region, p.coords, p.gpsAccuracy, p.locationSource);

  return (
    <View style={styles.stepContent}>
      {/* Location */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.row}>
            <MapPin color={tokens.colors.brand.gold} size={18} />
            <Text style={styles.overline}>Detected location</Text>
          </View>
          <TouchableOpacity
            onPress={() => setEditingLocation((v) => !v)}
            style={styles.textButton}
            accessibilityRole="button"
            accessibilityLabel={editingLocation ? 'Done editing location' : 'Change location'}
          >
            <Text style={styles.textButtonText}>{editingLocation ? 'Done' : 'Change'}</Text>
          </TouchableOpacity>
        </View>
        {editingLocation ? (
          <TextInput
            style={[styles.input, { marginTop: tokens.spacing.sm }]}
            placeholder="Street, area or town"
            placeholderTextColor={tokens.colors.text.muted}
            value={p.locationName}
            onChangeText={p.onLocationNameChange}
            returnKeyType="done"
            onSubmitEditing={() => setEditingLocation(false)}
            autoFocus
          />
        ) : (
          <Text style={styles.locationName}>{p.locationName || 'Location pending'}</Text>
        )}
        {!!locationLine && <Text style={[styles.monoMuted, { marginTop: 4 }]}>{locationLine}</Text>}

        <Text style={[styles.label, { marginTop: tokens.spacing.lg }]}>
          {p.t.landmarkLabel} <Text style={styles.labelHint}>(optional)</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder={p.t.landmarkPlaceholder}
          placeholderTextColor={tokens.colors.text.muted}
          value={p.landmark}
          onChangeText={p.onLandmarkChange}
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginTop: tokens.spacing.sm }}>
          {LANDMARK_SUGGESTIONS.map((chip) => (
            <TouchableOpacity
              key={chip}
              onPress={() => {
                const clean = chip.replace(/^[^\w\s]+/, '').trim();
                p.onLandmarkChange(p.landmark ? `${p.landmark}, ${clean}` : clean);
              }}
              style={styles.chip}
              accessibilityRole="button"
              accessibilityLabel={`Add landmark ${chip}`}
            >
              <Text style={styles.chipText}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Category */}
      <Text style={styles.sectionTitle}>{p.t.categories} *</Text>
      <View style={styles.categoryGrid}>
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const selected = p.category === c.id;
          return (
            <TouchableOpacity
              key={c.id}
              onPress={() => {
                Keyboard.dismiss();
                p.onCategoryChange(c.id);
              }}
              style={[styles.categoryTile, selected && styles.categoryTileSelected]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${c.label}, ${c.hint}`}
            >
              <Icon color={selected ? tokens.colors.text.inverse : tokens.colors.text.secondary} size={20} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.categoryLabel, selected && styles.categoryLabelSelected]}>{c.label}</Text>
                <Text style={[styles.categoryHint, selected && styles.categoryHintSelected]}>{c.hint}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {p.category === 'DOMESTIC_ABUSE' && (
        <View style={[styles.card, styles.row, { alignItems: 'flex-start' }]}>
          <Lock color={tokens.colors.brand.gold} size={20} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.cardTitle}>Only specialist DOVVSU officers can see this report.</Text>
            <Text style={styles.bodyMuted}>
              If anyone involved could see your phone, we recommend reporting anonymously.
            </Text>
            {!p.isAnonymous && (
              <TouchableOpacity
                onPress={() => p.onAnonymousChange(true)}
                style={[styles.secondaryChip, { alignSelf: 'flex-start' }]}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryChipText}>Report anonymously</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Headline */}
      <View style={{ gap: tokens.spacing.xs }}>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Incident headline *</Text>
          <Text style={styles.counter}>{p.title.length} / {HEADLINE_MAX}</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="e.g. Robbery attempt near the junction"
          placeholderTextColor={tokens.colors.text.muted}
          value={p.title}
          onChangeText={(v) => p.onTitleChange(v.slice(0, HEADLINE_MAX))}
          maxLength={HEADLINE_MAX}
          returnKeyType="next"
        />
      </View>

      {/* Description */}
      <View style={{ gap: tokens.spacing.xs }}>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>What happened? *</Text>
          <Text style={styles.counter}>{p.description.length} / {DESCRIPTION_MAX}</Text>
        </View>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe what you saw: people, vehicles, number plates, which way they went."
          placeholderTextColor={tokens.colors.text.muted}
          value={p.description}
          onChangeText={(v) => p.onDescriptionChange(v.slice(0, DESCRIPTION_MAX))}
          maxLength={DESCRIPTION_MAX}
          multiline
        />
      </View>

      {/* Anonymous reporting */}
      <AnonymousToggle
        isAnonymous={p.isAnonymous}
        onChange={p.onAnonymousChange}
        reporterPhone={p.reporterPhone}
        onReporterPhoneChange={p.onReporterPhoneChange}
        canReportNamed={!!p.reporterName}
      />

      <View style={styles.footerRow}>
        <TouchableOpacity
          onPress={() => {
            Keyboard.dismiss();
            p.onBack();
          }}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back to capture"
        >
          <ChevronLeft color={tokens.colors.text.primary} size={20} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 2 }}>
          <PrimaryButton
            label="Continue to review"
            onPress={() => {
              Keyboard.dismiss();
              p.onNext();
            }}
            icon={<ChevronRight color={tokens.colors.text.inverse} size={20} />}
          />
        </View>
      </View>
    </View>
  );
};

const AnonymousToggle: React.FC<{
  isAnonymous: boolean;
  onChange: (v: boolean) => void;
  reporterPhone: string;
  onReporterPhoneChange: (v: string) => void;
  canReportNamed: boolean;
}> = ({ isAnonymous, onChange, reporterPhone, onReporterPhoneChange, canReportNamed }) => (
  <View style={styles.card}>
    <TouchableOpacity
      onPress={() => canReportNamed && onChange(!isAnonymous)}
      style={styles.rowBetween}
      accessibilityRole="switch"
      accessibilityState={{ checked: isAnonymous, disabled: !canReportNamed }}
      accessibilityLabel="Report anonymously"
      activeOpacity={0.8}
    >
      <View style={[styles.row, { flex: 1 }]}>
        <EyeOff color={tokens.colors.text.emerald} size={22} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Report anonymously</Text>
          <Text style={styles.overlineGreen}>Recommended for personal safety</Text>
        </View>
      </View>
      <View style={[styles.switchTrack, isAnonymous && styles.switchTrackOn]}>
        <View style={[styles.switchThumb, isAnonymous && styles.switchThumbOn]} />
      </View>
    </TouchableOpacity>
    {isAnonymous ? (
      <Text style={[styles.bodyMuted, { marginTop: tokens.spacing.sm }]}>
        Your name and phone number are not sent with this report.
      </Text>
    ) : (
      <View style={{ marginTop: tokens.spacing.md, gap: tokens.spacing.xs }}>
        <Text style={styles.label}>
          Contact number <Text style={styles.labelHint}>(optional)</Text>
        </Text>
        <Text style={styles.bodyMuted}>So an officer can call you back.</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 024 000 0000"
          placeholderTextColor={tokens.colors.text.muted}
          value={reporterPhone}
          onChangeText={onReporterPhoneChange}
          keyboardType="phone-pad"
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
        />
      </View>
    )}
  </View>
);

/* -------------------------------------------------------------------------- */
/* Step 3 — Review                                                            */
/* -------------------------------------------------------------------------- */

interface ReviewStepProps extends EvidenceCaptureScreenProps {
  onEdit: () => void;
}

const ReviewStep: React.FC<ReviewStepProps> = (p) => {
  const locationLine = formatLocationLine(p.region, p.coords, p.gpsAccuracy, p.locationSource);
  const where = [p.landmark, p.locationName].filter(Boolean).join(', ');
  const isDovvsu = p.category === 'DOMESTIC_ABUSE';

  return (
    <View style={styles.stepContent}>
      {/* Summary */}
      <View style={[styles.card, styles.ribbonCard]}>
        <View style={styles.ribbon}>
          <View style={{ flex: 1, backgroundColor: tokens.colors.brand.red }} />
          <View style={{ flex: 1, backgroundColor: tokens.colors.brand.gold }} />
          <View style={{ flex: 1, backgroundColor: tokens.colors.brand.green }} />
        </View>
        <View style={styles.rowBetween}>
          <View style={[styles.categoryBadge, isDovvsu && styles.categoryBadgeSensitive]}>
            <Text style={[styles.categoryBadgeText, isDovvsu && { color: tokens.colors.text.crimson }]}>
              {CATEGORY_LABEL[p.category]}
            </Text>
          </View>
          {isDovvsu && <Text style={styles.overline}>Confidential</Text>}
        </View>
        <Text style={styles.reviewTitle}>{p.title || 'No headline yet'}</Text>
        <Text style={styles.body}>{p.description || 'No description yet.'}</Text>

        <View style={styles.divider} />
        <Text style={styles.overline}>Location</Text>
        <Text style={styles.body}>{where || 'Location pending'}</Text>
        {!!locationLine && <Text style={styles.monoMuted}>{locationLine}</Text>}
      </View>

      {/* Media */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.row}>
            <Video color={tokens.colors.brand.gold} size={18} />
            <Text style={styles.cardTitle}>Attached media</Text>
          </View>
          <Text style={styles.monoMuted}>{p.hasRecordedMedia ? '1 file' : 'None'}</Text>
        </View>
        {p.hasRecordedMedia ? (
          <>
            <Text style={[styles.body, { marginTop: tokens.spacing.sm }]}>
              {p.mediaType === 'VIDEO' ? `Video · ${p.recordedDuration}s` : 'Photo'}
            </Text>
            <View style={[styles.row, { marginTop: tokens.spacing.sm, alignItems: 'flex-start' }]}>
              <Shield color={tokens.colors.text.emerald} size={16} />
              <Text style={[styles.bodyMuted, { flex: 1 }]}>
                A digital fingerprint of your {p.mediaType === 'VIDEO' ? 'video' : 'photo'} is recorded so it can't be altered unnoticed.
              </Text>
            </View>
          </>
        ) : (
          <Text style={[styles.bodyMuted, { marginTop: tokens.spacing.sm }]}>
            You're sending a written report without a photo or video.
          </Text>
        )}
      </View>

      {/* Identity */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Reporting identity</Text>
          {!!p.reporterName && (
            <TouchableOpacity
              onPress={() => p.onAnonymousChange(!p.isAnonymous)}
              style={styles.textButton}
              accessibilityRole="button"
              accessibilityLabel={p.isAnonymous ? 'Report with my name instead' : 'Report anonymously instead'}
            >
              <Text style={styles.textButtonText}>Change</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={[styles.row, { marginTop: tokens.spacing.sm }]}>
          {p.isAnonymous ? (
            <EyeOff color={tokens.colors.text.emerald} size={18} />
          ) : (
            <PhoneCall color={tokens.colors.text.secondary} size={18} />
          )}
          <Text style={[styles.body, { flex: 1 }]}>
            {p.isAnonymous
              ? 'Anonymous report — your name and phone number are not shared.'
              : `Reporting as ${p.reporterName || 'yourself'}${p.reporterPhone ? ` (${p.reporterPhone})` : ''}`}
          </Text>
        </View>
      </View>

      {/* Progress while sending */}
      {p.isSubmitting && (
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{p.uploadStatusText || 'Sending report…'}</Text>
            <Text style={styles.monoMuted}>{Math.round(p.uploadProgress)}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.max(4, Math.min(100, p.uploadProgress))}%` }]} />
          </View>
        </View>
      )}

      <View style={[styles.row, { alignItems: 'flex-start', paddingHorizontal: tokens.spacing.xs }]}>
        <CloudOff color={tokens.colors.text.secondary} size={16} />
        <Text style={[styles.bodyMuted, { flex: 1 }]}>
          No signal? Your report is saved on your phone and sends automatically when you're back online.
        </Text>
      </View>

      <PrimaryButton
        label={p.t.submitReport}
        onPress={p.onSubmitReport}
        loading={p.isSubmitting}
        icon={<Send color={tokens.colors.text.inverse} size={18} />}
      />
      <TouchableOpacity
        onPress={p.onEdit}
        disabled={p.isSubmitting}
        style={styles.linkButton}
        accessibilityRole="button"
      >
        <Text style={styles.linkText}>Edit details</Text>
      </TouchableOpacity>
    </View>
  );
};

/* -------------------------------------------------------------------------- */
/* Report sent                                                                */
/* -------------------------------------------------------------------------- */

const ReportSentView: React.FC<{
  receipt: SubmissionReceipt;
  onViewMyReports: () => void;
  onDone: () => void;
}> = ({ receipt, onViewMyReports, onDone }) => {
  const offline = receipt.status === 'SAVED_OFFLINE';
  const sentTime = new Date(receipt.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const pipeline = [
    { label: offline ? 'Saved' : 'Sent', state: 'done' as const },
    { label: 'Received', state: offline ? ('todo' as const) : ('done' as const) },
    { label: 'Under review', state: offline ? ('todo' as const) : ('active' as const) },
    { label: 'Resolved', state: 'todo' as const }
  ];

  return (
    <View style={styles.section}>
      <View style={[styles.card, { alignItems: 'center', paddingVertical: tokens.spacing.xxl }]}>
        <View style={[styles.successRing, offline && styles.offlineRing]}>
          {offline ? (
            <CloudOff color={tokens.colors.brand.gold} size={30} />
          ) : (
            <CircleCheck color={tokens.colors.text.emerald} size={32} />
          )}
        </View>
        <Text style={styles.sentTitle}>{offline ? 'Saved on your phone' : 'Report sent'}</Text>
        <Text style={[styles.bodyMuted, { textAlign: 'center' }]}>
          {offline
            ? "There's no connection right now. Your report will send automatically when you're back online."
            : 'Thank you for helping keep your community safe.'}
        </Text>

        <View style={styles.codeBox}>
          <View style={{ flex: 1 }}>
            <Text style={styles.overline}>Tracking code</Text>
            <Text style={styles.codeText} selectable>{receipt.trackingCode}</Text>
          </View>
          <TouchableOpacity
            onPress={() => Share.share({ message: `CitizenAlert tracking code: ${receipt.trackingCode}` }).catch(() => {})}
            style={styles.iconButtonFilled}
            accessibilityRole="button"
            accessibilityLabel="Save or share tracking code"
          >
            <Share2 color={tokens.colors.text.primary} size={18} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.bodyMuted, { textAlign: 'center' }]}>
          Keep this code. You'll need it to follow up{receipt.isAnonymous ? ' on an anonymous report' : ''}.
        </Text>

        {receipt.isAnonymous && (
          <View style={[styles.row, { marginTop: tokens.spacing.md }]}>
            <EyeOff color={tokens.colors.text.emerald} size={16} />
            <Text style={styles.bodyMuted}>Sent anonymously — no name or phone attached.</Text>
          </View>
        )}
      </View>

      {/* Honest status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {offline ? 'Waiting for connection' : 'Received — awaiting review'}
        </Text>
        <Text style={[styles.bodyMuted, { marginTop: 4 }]}>
          {offline
            ? 'Check My Reports to see when it has been sent.'
            : receipt.status === 'SENT_MEDIA_PENDING'
            ? 'Your report was received. The evidence file will finish uploading automatically.'
            : 'An officer will review your report as soon as possible.'}
        </Text>
        <View style={styles.pipeline}>
          {pipeline.map((s, i) => (
            <View key={s.label} style={styles.pipelineStep}>
              <View
                style={[
                  styles.pipelineDot,
                  s.state === 'done' && styles.pipelineDotDone,
                  s.state === 'active' && styles.pipelineDotActive
                ]}
              >
                {s.state === 'done' && <Check color={tokens.colors.status.successDark} size={12} strokeWidth={3} />}
              </View>
              <Text
                style={[
                  styles.pipelineLabel,
                  s.state === 'active' && { color: tokens.colors.brand.gold },
                  s.state === 'done' && { color: tokens.colors.text.emerald }
                ]}
              >
                {s.label}
              </Text>
              {i === 0 && <Text style={styles.monoMuted}>{sentTime}</Text>}
            </View>
          ))}
        </View>
        {!!receipt.locationLabel && (
          <View style={[styles.row, { marginTop: tokens.spacing.md }]}>
            <MapPin color={tokens.colors.text.secondary} size={14} />
            <Text style={styles.monoMuted}>{receipt.locationLabel}</Text>
          </View>
        )}
        {!!receipt.trustMessage && (
          <Text style={[styles.body, { marginTop: tokens.spacing.md, color: tokens.colors.brand.gold }]}>
            {receipt.trustMessage}
          </Text>
        )}
      </View>

      {/* Real help */}
      <View style={[styles.card, styles.dangerCard]}>
        <View style={styles.row}>
          <Siren color={tokens.colors.text.crimson} size={20} />
          <Text style={styles.cardTitle}>Need help right now?</Text>
        </View>
        <Text style={[styles.bodyMuted, { marginTop: 4 }]}>
          If anyone is in danger, don't wait for a review — call the emergency lines directly.
        </Text>
        <View style={[styles.row, { marginTop: tokens.spacing.md }]}>
          <CallButton number="191" label="Police" />
          <CallButton number="112" label="Emergency" />
        </View>
      </View>

      <PrimaryButton label="View in My Reports" onPress={onViewMyReports} />
      <TouchableOpacity onPress={onDone} style={styles.secondaryButton} accessibilityRole="button">
        <Text style={styles.secondaryButtonText}>Start a new report</Text>
      </TouchableOpacity>
    </View>
  );
};

/* -------------------------------------------------------------------------- */
/* Shared bits                                                                */
/* -------------------------------------------------------------------------- */

const PrimaryButton: React.FC<{ label: string; onPress: () => void; icon?: React.ReactNode; loading?: boolean }> = ({
  label,
  onPress,
  icon,
  loading
}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={loading}
    style={[styles.primaryButton, loading && { opacity: 0.8 }]}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ busy: !!loading }}
  >
    {loading ? <ActivityIndicator color={tokens.colors.text.inverse} /> : icon}
    <Text style={styles.primaryButtonText}>{label}</Text>
  </TouchableOpacity>
);

const CallButton: React.FC<{ number: string; label: string }> = ({ number, label }) => (
  <TouchableOpacity
    onPress={() => Linking.openURL(`tel:${number}`).catch(() => {})}
    style={styles.callButton}
    accessibilityRole="button"
    accessibilityLabel={`Call ${number}, ${label}`}
  >
    <PhoneCall color={tokens.colors.text.white} size={18} />
    <View>
      <Text style={styles.callButtonNumber}>Call {number}</Text>
      <Text style={styles.callButtonLabel}>{label}</Text>
    </View>
  </TouchableOpacity>
);

const f = tokens.typography.fontFamily;
const c = tokens.colors;

const styles = StyleSheet.create({
  section: { gap: tokens.spacing.lg },
  stepContent: { gap: tokens.spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacing.sm },
  disabled: { opacity: 0.45 },

  // Text
  cardTitle: { color: c.text.primary, fontSize: tokens.typography.fontSize.lg, fontFamily: f.sans },
  body: { color: c.text.primary, fontSize: tokens.typography.fontSize.md, lineHeight: 20, fontFamily: f.sansRegular },
  bodyMuted: { color: c.text.secondary, fontSize: tokens.typography.fontSize.md, lineHeight: 20, fontFamily: f.sansRegular },
  monoMuted: { color: c.text.secondary, fontSize: tokens.typography.fontSize.sm, fontFamily: f.mono },
  overline: { color: c.text.secondary, fontSize: tokens.typography.fontSize.sm, fontFamily: f.mono, letterSpacing: 0.5, textTransform: 'uppercase' },
  overlineGreen: { color: c.text.emerald, fontSize: tokens.typography.fontSize.sm, fontFamily: f.mono, letterSpacing: 0.4, textTransform: 'uppercase' },
  label: { color: c.text.primary, fontSize: tokens.typography.fontSize.lg, fontFamily: f.sans },
  labelHint: { color: c.text.secondary, fontFamily: f.sansRegular, fontSize: tokens.typography.fontSize.md },
  sectionTitle: { color: c.text.primary, fontSize: tokens.typography.fontSize.lg, fontFamily: f.sans },
  counter: { color: c.text.secondary, fontSize: tokens.typography.fontSize.sm, fontFamily: f.mono },

  // Cards
  card: { backgroundColor: c.surface.card, borderRadius: tokens.radius.lg, padding: tokens.spacing.lg },
  dangerCard: { borderWidth: 1, borderColor: c.sos.soft },
  ribbonCard: { paddingTop: tokens.spacing.lg + 3, overflow: 'hidden', gap: tokens.spacing.sm },
  ribbon: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, flexDirection: 'row' },
  divider: { height: 1, backgroundColor: c.border.subtle, marginVertical: tokens.spacing.sm },

  // Tracker
  tracker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface.card,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.sm
  },
  trackerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.full
  },
  trackerItemActive: { backgroundColor: c.brand.gold },
  trackerNum: { color: c.text.secondary, fontFamily: f.mono, fontSize: tokens.typography.fontSize.sm },
  trackerLabel: { color: c.text.secondary, fontFamily: f.sans, fontSize: tokens.typography.fontSize.md },
  trackerLabelDone: { color: c.text.emerald },
  trackerTextActive: { color: c.text.inverse },
  trackerDoneDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: c.text.emerald,
    alignItems: 'center',
    justifyContent: 'center'
  },
  trackerLine: { flex: 1, height: 2, backgroundColor: c.surface.highest, borderRadius: 1 },
  trackerLineDone: { backgroundColor: c.text.emerald },

  // Step 1
  safetyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    backgroundColor: c.surface.card,
    borderRadius: tokens.radius.lg,
    paddingLeft: tokens.spacing.lg,
    paddingVertical: tokens.spacing.xs,
    borderLeftWidth: 3,
    borderLeftColor: c.brand.gold
  },
  safetyText: { flex: 1, color: c.text.primary, fontSize: tokens.typography.fontSize.md, lineHeight: 20, fontFamily: f.sansRegular },
  safetyStrong: { color: c.brand.gold, fontFamily: f.sans },
  iconButton: {
    width: tokens.touchTarget.minWidth,
    height: tokens.touchTarget.minHeight,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconButtonFilled: {
    width: tokens.touchTarget.minWidth,
    height: tokens.touchTarget.minHeight,
    borderRadius: tokens.radius.md,
    backgroundColor: c.surface.cardHover,
    alignItems: 'center',
    justifyContent: 'center'
  },
  controlsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: c.surface.card,
    borderRadius: tokens.radius.lg,
    paddingVertical: tokens.spacing.md
  },
  sideControl: { alignItems: 'center', gap: 6, minWidth: 72 },
  sideControlIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: c.surface.cardHover,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sideControlText: { color: c.text.primary, fontSize: tokens.typography.fontSize.sm, fontFamily: f.sansMedium },
  recordControl: { alignItems: 'center', gap: 6 },
  recordRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: c.surface.highest,
    alignItems: 'center',
    justifyContent: 'center'
  },
  recordRingActive: { borderColor: c.sos.text },
  recordDot: { width: 52, height: 52, borderRadius: 26, backgroundColor: c.sos.container },
  recordStop: { width: 26, height: 26, borderRadius: 6, backgroundColor: c.sos.container },
  clipThumb: {
    width: 56,
    height: 56,
    borderRadius: tokens.radius.md,
    backgroundColor: c.surface.cardHover,
    alignItems: 'center',
    justifyContent: 'center'
  },
  readyChip: { backgroundColor: c.status.successDark, borderRadius: tokens.radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  readyChipText: { color: c.text.emerald, fontFamily: f.mono, fontSize: tokens.typography.fontSize.sm },
  secondaryChip: {
    minHeight: 40,
    paddingHorizontal: tokens.spacing.lg,
    borderRadius: tokens.radius.full,
    backgroundColor: c.surface.cardHover,
    alignItems: 'center',
    justifyContent: 'center'
  },
  secondaryChipText: { color: c.text.primary, fontFamily: f.sans, fontSize: tokens.typography.fontSize.md },
  keepChip: {
    flexDirection: 'row',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: tokens.spacing.lg,
    borderRadius: tokens.radius.full,
    backgroundColor: c.text.emerald,
    alignItems: 'center',
    justifyContent: 'center'
  },
  keepChipText: { color: c.text.inverse, fontFamily: f.sans, fontSize: tokens.typography.fontSize.md },
  textButton: { minHeight: tokens.touchTarget.minHeight, paddingHorizontal: tokens.spacing.sm, justifyContent: 'center' },
  textButtonText: { color: c.brand.gold, fontFamily: f.sans, fontSize: tokens.typography.fontSize.md },
  linkButton: { minHeight: tokens.touchTarget.minHeight, alignItems: 'center', justifyContent: 'center' },
  linkText: { color: c.brand.gold, fontFamily: f.sans, fontSize: tokens.typography.fontSize.md, textDecorationLine: 'underline' },

  // Inputs
  input: {
    backgroundColor: c.surface.input,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: c.border.medium,
    minHeight: tokens.touchTarget.minHeight,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    color: c.text.primary,
    fontSize: tokens.typography.fontSize.lg,
    fontFamily: f.sansRegular
  },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  locationName: { color: c.text.primary, fontSize: tokens.typography.fontSize.lg, lineHeight: 24, fontFamily: f.sans, marginTop: tokens.spacing.sm },
  chip: {
    minHeight: 40,
    paddingHorizontal: tokens.spacing.md,
    marginRight: tokens.spacing.sm,
    borderRadius: tokens.radius.full,
    backgroundColor: c.surface.cardHover,
    justifyContent: 'center'
  },
  chipText: { color: c.text.primary, fontSize: tokens.typography.fontSize.md, fontFamily: f.sansMedium },

  // Categories
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm },
  categoryTile: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    minHeight: 64,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    backgroundColor: c.surface.card
  },
  categoryTileSelected: { backgroundColor: c.brand.gold },
  categoryLabel: { color: c.text.primary, fontSize: tokens.typography.fontSize.md, fontFamily: f.sans },
  categoryLabelSelected: { color: c.text.inverse },
  categoryHint: { color: c.text.secondary, fontSize: tokens.typography.fontSize.sm, fontFamily: f.sansRegular },
  categoryHintSelected: { color: c.text.inverse },

  // Switch
  switchTrack: {
    width: 52,
    height: 30,
    borderRadius: 15,
    backgroundColor: c.surface.highest,
    padding: 3,
    justifyContent: 'center'
  },
  switchTrackOn: { backgroundColor: c.brand.gold },
  switchThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: c.text.secondary },
  switchThumbOn: { alignSelf: 'flex-end', backgroundColor: c.text.inverse },

  // Footer buttons
  footerRow: { flexDirection: 'row', gap: tokens.spacing.md, alignItems: 'center' },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    minHeight: tokens.touchTarget.primaryButton,
    borderRadius: tokens.radius.lg,
    backgroundColor: c.surface.cardHover,
    alignItems: 'center',
    justifyContent: 'center'
  },
  backButtonText: { color: c.text.primary, fontFamily: f.sans, fontSize: tokens.typography.fontSize.lg },
  primaryButton: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    minHeight: tokens.touchTarget.primaryButton,
    borderRadius: tokens.radius.lg,
    backgroundColor: c.brand.gold,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.spacing.lg
  },
  primaryButtonText: { color: c.text.inverse, fontFamily: f.sansBold, fontSize: tokens.typography.fontSize.lg },
  secondaryButton: {
    minHeight: tokens.touchTarget.primaryButton,
    borderRadius: tokens.radius.lg,
    backgroundColor: c.surface.cardHover,
    alignItems: 'center',
    justifyContent: 'center'
  },
  secondaryButtonText: { color: c.text.primary, fontFamily: f.sans, fontSize: tokens.typography.fontSize.lg },

  // Review
  categoryBadge: { backgroundColor: c.surface.cardHover, borderRadius: tokens.radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  categoryBadgeSensitive: { backgroundColor: c.sos.soft },
  categoryBadgeText: { color: c.text.primary, fontFamily: f.mono, fontSize: tokens.typography.fontSize.sm },
  reviewTitle: { color: c.text.primary, fontSize: tokens.typography.fontSize.xl, lineHeight: 28, fontFamily: f.sansBold },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: c.surface.highest, marginTop: tokens.spacing.sm, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: c.brand.gold },

  // Report sent
  successRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: c.status.successDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.md
  },
  offlineRing: { backgroundColor: c.brand.goldMuted },
  sentTitle: { color: c.text.primary, fontSize: tokens.typography.fontSize.xxl, lineHeight: 36, fontFamily: f.sansBold, marginBottom: 4 },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    alignSelf: 'stretch',
    backgroundColor: c.surface.input,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.md,
    marginTop: tokens.spacing.lg,
    marginBottom: tokens.spacing.sm
  },
  codeText: { color: c.brand.gold, fontFamily: f.monoBold, fontSize: tokens.typography.fontSize.xl, marginTop: 2 },
  pipeline: { flexDirection: 'row', justifyContent: 'space-between', marginTop: tokens.spacing.lg },
  pipelineStep: { alignItems: 'center', gap: 4, flex: 1 },
  pipelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: c.surface.highest,
    alignItems: 'center',
    justifyContent: 'center'
  },
  pipelineDotDone: { backgroundColor: c.text.emerald, borderColor: c.text.emerald },
  pipelineDotActive: { borderColor: c.brand.gold, backgroundColor: c.brand.goldMuted },
  pipelineLabel: { color: c.text.secondary, fontSize: tokens.typography.fontSize.sm, fontFamily: f.sansMedium, textAlign: 'center' },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    minHeight: 56,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    backgroundColor: c.sos.container
  },
  callButtonNumber: { color: c.text.white, fontFamily: f.sansBold, fontSize: tokens.typography.fontSize.lg },
  callButtonLabel: { color: c.sos.onContainer, fontFamily: f.sansRegular, fontSize: tokens.typography.fontSize.sm }
});
