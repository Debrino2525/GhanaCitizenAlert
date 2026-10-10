import React, { memo, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Keyboard,
  ActivityIndicator,
  Image,
  TouchableWithoutFeedback
} from 'react-native';
import {
  Camera,
  Video,
  Image as ImageIcon,
  MapPin,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  TreePine,
  Car,
  Trash2,
  FileCheck,
  Send,
  Lock,
  Sparkles,
  Check,
  Download
} from 'lucide-react-native';
import { TranslationMap, LANDMARK_SUGGESTIONS } from '../constants/i18n';
import { GpsCoordinates, GpsLockStatus, IncidentCategory, LocationSource } from '../types';
import { GpsTelemetryCard } from '../components/GpsTelemetryCard';
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
  onSaveToGallery?: () => void;
  onSubmitReport: () => void;
}

const CATEGORIES: { id: IncidentCategory; label: string; icon: any }[] = [
  { id: 'CRIMINAL_OFFENSE', label: 'Armed Crime / Robbery', icon: AlertTriangle },
  { id: 'DOMESTIC_ABUSE', label: 'Domestic Abuse (DOVVSU)', icon: ShieldAlert },
  { id: 'GALAMSEY_ENVIRONMENTAL', label: 'Galamsey / Mining', icon: TreePine },
  { id: 'TRAFFIC_RECKLESS', label: 'Dangerous Driving (MTTD)', icon: Car },
  { id: 'SANITATION_ZONING', label: 'Sanitation / Dumping', icon: Trash2 }
];

export const EvidenceCaptureScreen: React.FC<EvidenceCaptureScreenProps> = memo(({
  t,
  coords,
  gpsAccuracy,
  isLocating,
  gpsStatus,
  locationSource,
  gpsFixAgeSeconds,
  gpsFixTimestamp,
  locationName,
  region,
  onRefreshGps,
  onLocationNameChange,
  cameraRef,
  hasCameraPermission,
  facing,
  isRecording,
  recordingSeconds,
  recordedDuration,
  hasRecordedMedia,
  recordedUri,
  mediaType,
  onFlipCamera,
  onToggleRecording,
  onSnapPhoto,
  onPickFromGallery,
  onRetake,
  onRequestCameraPermissions,
  category,
  title,
  description,
  landmark,
  isAnonymous,
  reporterPhone,
  isSubmitting,
  uploadProgress,
  uploadStatusText,
  isUploadingMedia,
  onCategoryChange,
  onTitleChange,
  onDescriptionChange,
  onLandmarkChange,
  onAnonymousChange,
  onReporterPhoneChange,
  onSaveToGallery,
  onSubmitReport
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Shutter-press GPS snapshot to guarantee immutable forensic watermark during/after recording
  const [gpsSnapshot, setGpsSnapshot] = useState<{
    coords: GpsCoordinates | null;
    gpsAccuracy: number | null;
    locationSource: LocationSource;
    gpsFixAgeSeconds: number | null;
    gpsFixTimestamp: number | null;
  } | null>(null);

  const handleSnapPhoto = useCallback(() => {
    setGpsSnapshot({
      coords,
      gpsAccuracy,
      locationSource,
      gpsFixAgeSeconds,
      gpsFixTimestamp: gpsFixTimestamp ?? null,
    });
    onSnapPhoto();
  }, [coords, gpsAccuracy, locationSource, gpsFixAgeSeconds, gpsFixTimestamp, onSnapPhoto]);

  const handleToggleRecording = useCallback(() => {
    if (!isRecording) {
      setGpsSnapshot({
        coords,
        gpsAccuracy,
        locationSource,
        gpsFixAgeSeconds,
        gpsFixTimestamp: gpsFixTimestamp ?? null,
      });
    }
    onToggleRecording();
  }, [isRecording, coords, gpsAccuracy, locationSource, gpsFixAgeSeconds, gpsFixTimestamp, onToggleRecording]);

  const handlePickFromGallery = useCallback(() => {
    setGpsSnapshot({
      coords,
      gpsAccuracy,
      locationSource,
      gpsFixAgeSeconds,
      gpsFixTimestamp: gpsFixTimestamp ?? null,
    });
    onPickFromGallery();
  }, [coords, gpsAccuracy, locationSource, gpsFixAgeSeconds, gpsFixTimestamp, onPickFromGallery]);

  const handleRetake = useCallback(() => {
    setGpsSnapshot(null);
    onRetake();
  }, [onRetake]);

  const activeViewfinderCoords = (isRecording || hasRecordedMedia) && gpsSnapshot ? gpsSnapshot.coords : coords;
  const activeViewfinderAccuracy = (isRecording || hasRecordedMedia) && gpsSnapshot ? gpsSnapshot.gpsAccuracy : gpsAccuracy;
  const activeViewfinderSource = (isRecording || hasRecordedMedia) && gpsSnapshot ? gpsSnapshot.locationSource : locationSource;
  const activeViewfinderAge = (isRecording || hasRecordedMedia) && gpsSnapshot ? gpsSnapshot.gpsFixAgeSeconds : gpsFixAgeSeconds;
  const activeViewfinderTimestamp = (isRecording || hasRecordedMedia) && gpsSnapshot ? gpsSnapshot.gpsFixTimestamp : gpsFixTimestamp;
  const activeViewfinderIsLocating = (isRecording || hasRecordedMedia) ? false : isLocating;

  return (
    <View style={styles.section}>
      {/* 3-Step Flow Progress Indicator */}
      <View style={styles.stepIndicatorContainer}>
        {[
          { stepNum: 1, label: 'Capture' },
          { stepNum: 2, label: 'Details' },
          { stepNum: 3, label: 'Review & Send' }
        ].map((s) => (
          <TouchableOpacity
            key={s.stepNum}
            onPress={() => setStep(s.stepNum as any)}
            style={styles.stepItem}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.stepBadge,
                step === s.stepNum && styles.stepBadgeActive,
                step > s.stepNum && styles.stepBadgeCompleted
              ]}
            >
              {step > s.stepNum ? (
                <Check color={tokens.colors.bg.base} size={12} />
              ) : (
                <Text
                  style={[
                    styles.stepBadgeText,
                    step === s.stepNum && styles.stepBadgeTextActive
                  ]}
                >
                  {s.stepNum}
                </Text>
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                step === s.stepNum && styles.stepLabelActive
              ]}
            >
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Safety Notice Banner */}
      <View style={styles.warningBox}>
        <AlertTriangle color={tokens.colors.brand.gold} size={16} />
        <Text style={styles.warningText}>{t.safetyNotice}</Text>
      </View>

      {/* STEP 1: CAPTURE MEDIA & GPS TELEMETRY */}
      {step === 1 && (
        <View style={styles.stepContent}>
          {/* Live GPS Coordinates HUD */}
          <GpsTelemetryCard
            coords={coords}
            gpsAccuracy={gpsAccuracy}
            isLocating={isLocating}
            gpsStatus={gpsStatus}
            locationSource={locationSource}
            gpsFixAgeSeconds={gpsFixAgeSeconds}
            t={t}
            onRefreshGps={onRefreshGps}
          />

          {/* Live Hardware Viewfinder & Evidence Box */}
          <ViewfinderOverlay
            cameraRef={cameraRef}
            hasCameraPermission={hasCameraPermission}
            facing={facing}
            isRecording={isRecording}
            recordingSeconds={recordingSeconds}
            recordedDuration={recordedDuration}
            hasRecordedMedia={hasRecordedMedia}
            recordedUri={recordedUri}
            mediaType={mediaType}
            coords={activeViewfinderCoords}
            gpsAccuracy={activeViewfinderAccuracy}
            locationSource={activeViewfinderSource}
            isLocating={activeViewfinderIsLocating}
            gpsFixAgeSeconds={activeViewfinderAge}
            gpsFixTimestamp={activeViewfinderTimestamp}
            onFlipCamera={onFlipCamera}
            onRetake={handleRetake}
            onRequestPermissions={onRequestCameraPermissions}
          />

          {/* Direct In-App Capture Toolbar */}
          <View style={styles.captureOptionsRow}>
            <TouchableOpacity
              onPress={handleSnapPhoto}
              disabled={isRecording}
              style={[styles.sideActionBtn, isRecording && { opacity: 0.5 }]}
              accessibilityRole="button"
              accessibilityLabel="Snap Photo"
            >
              <Camera color={tokens.colors.text.primary} size={18} />
              <Text style={styles.sideActionText}>Photo</Text>
            </TouchableOpacity>

            <View style={styles.recordBtnContainer}>
              <TouchableOpacity
                onPress={handleToggleRecording}
                style={[styles.recordBtnPulse, isRecording && styles.recordBtnPulseActive]}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={isRecording ? 'Stop Recording' : 'Start 45s Recording'}
              >
                <View style={[styles.recordBtn, isRecording && styles.recordBtnActive]}>
                  {isRecording ? (
                    <View style={styles.stopSquare} />
                  ) : (
                    <View style={styles.recordBtnInner} />
                  )}
                </View>
              </TouchableOpacity>
              <Text style={[styles.recordBtnLabel, isRecording && { color: tokens.colors.status.danger }]}>
                {isRecording
                  ? 'STOP RECORDING'
                  : hasRecordedMedia
                  ? 'RE-RECORD (45s)'
                  : 'TAP TO RECORD (45s)'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handlePickFromGallery}
              disabled={isRecording}
              style={[styles.sideActionBtn, isRecording && { opacity: 0.5 }]}
              accessibilityRole="button"
              accessibilityLabel="Choose from Gallery"
            >
              <ImageIcon color={tokens.colors.text.primary} size={18} />
              <Text style={styles.sideActionText}>Gallery</Text>
            </TouchableOpacity>
          </View>

          {/* Capture Tip Banner */}
          <View style={styles.captureTipBox}>
            <Sparkles color={tokens.colors.brand.gold} size={14} />
            <Text style={styles.captureTipText}>
              Use Photo for faces and number plates. Photos are sharper than video.
            </Text>
          </View>

          {/* Upload / Encrypt HUD */}
          <UploadProgressHud
            uploadProgress={uploadProgress}
            uploadStatusText={uploadStatusText}
            isUploadingMedia={isUploadingMedia}
            hasRecordedMedia={hasRecordedMedia}
            mediaType={mediaType}
            recordedDuration={recordedDuration}
          />

          {/* Step 1 Next Button */}
          <TouchableOpacity
            onPress={() => setStep(2)}
            style={styles.stepNextBtn}
            accessibilityRole="button"
            accessibilityLabel="Proceed to Incident Details"
          >
            <Text style={styles.stepNextBtnText}>
              {hasRecordedMedia ? 'Continue to Incident Details' : 'Continue (With/Without Media)'}
            </Text>
            <ChevronRight color={tokens.colors.bg.base} size={18} />
          </TouchableOpacity>
        </View>
      )}

      {/* STEP 2: INCIDENT DETAILS & LOCATION */}
      {step === 2 && (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.stepContent}>
            {/* Closest Landmark Section */}
            <View style={styles.landmarkSection}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <MapPin color={tokens.colors.brand.gold} size={16} />
                  <Text style={styles.fieldLabelGold}>{t.landmarkLabel}</Text>
                </View>
                <TouchableOpacity onPress={Keyboard.dismiss}>
                  <Text style={{ color: tokens.colors.brand.gold, fontSize: tokens.typography.fontSize.xs, fontWeight: 'bold' }}>
                    ✕ Done
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.input, styles.landmarkInput]}
                placeholder={t.landmarkPlaceholder}
                placeholderTextColor={tokens.colors.text.muted}
                value={landmark}
                onChangeText={onLandmarkChange}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                blurOnSubmit={true}
              />

              {/* Quick Landmark Suggestion Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                style={styles.chipsScroll}
              >
                {LANDMARK_SUGGESTIONS.map((chip, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => {
                      Keyboard.dismiss();
                      const cleanChip = chip.replace(/^[^\w\s]+/, '').trim();
                      onLandmarkChange(landmark ? `${landmark}, ${cleanChip}` : cleanChip);
                    }}
                    style={styles.chip}
                  >
                    <Text style={styles.chipText}>{chip}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Detected Area / Street Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>{t.locationLabel}</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Boundary Road, East Legon, Accra"
                placeholderTextColor={tokens.colors.text.muted}
                value={locationName}
                onChangeText={onLocationNameChange}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                blurOnSubmit={true}
              />
            </View>

            {/* Location Telemetry / Verification Status */}
            <View style={styles.inputGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.fieldLabel}>LOCATION SOURCE & REGION</Text>
                <Text
                  style={{
                    color:
                      locationSource === 'LIVE'
                        ? tokens.colors.status.success
                        : locationSource === 'LAST_KNOWN'
                        ? tokens.colors.status.warning
                        : tokens.colors.text.muted,
                    fontSize: tokens.typography.fontSize.xxs,
                    fontFamily: tokens.typography.fontFamily.monoBold,
                  }}
                >
                  {locationSource === 'LIVE'
                    ? '● LIVE GPS LOCK'
                    : locationSource === 'LAST_KNOWN'
                    ? '▲ LAST KNOWN (CACHED)'
                    : locationSource === 'MANUAL'
                    ? '■ MANUAL ENTRY'
                    : '✕ LOCATION PENDING'}
                </Text>
              </View>
              <View
                style={[
                  styles.input,
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: tokens.colors.surface.cardSubtle,
                  },
                ]}
              >
                <Text style={{ color: tokens.colors.text.primary, fontFamily: tokens.typography.fontFamily.sansMedium }}>
                  Region: {region || 'UNKNOWN'}
                </Text>
                <Text style={{ color: tokens.colors.text.muted, fontSize: 11, fontFamily: tokens.typography.fontFamily.mono }}>
                  {coords ? `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}` : 'No Coordinates'}
                </Text>
              </View>
            </View>

            {/* Incident Category Selection */}
            <Text style={styles.fieldLabel}>{t.categories}</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((c) => {
                const IconComp = c.icon;
                const isSelected = category === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => {
                      Keyboard.dismiss();
                      onCategoryChange(c.id);
                    }}
                    style={[styles.categoryCard, isSelected && styles.categoryCardActive]}
                    accessibilityRole="button"
                    accessibilityLabel={c.label}
                  >
                    <IconComp
                      color={isSelected ? tokens.colors.text.white : tokens.colors.police.badge}
                      size={16}
                    />
                    <Text style={[styles.categoryText, isSelected && styles.categoryTextActive]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Incident Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Incident Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Armed robbery attempt near junction"
                placeholderTextColor={tokens.colors.text.muted}
                value={title}
                onChangeText={onTitleChange}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                blurOnSubmit={true}
              />
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.fieldLabel}>Situation Details & Suspects *</Text>
                <TouchableOpacity
                  onPress={Keyboard.dismiss}
                  style={{ paddingVertical: 2, paddingHorizontal: 6, backgroundColor: 'rgba(252, 209, 22, 0.1)', borderRadius: tokens.radius.sm }}
                  accessibilityRole="button"
                  accessibilityLabel="Done typing details"
                >
                  <Text style={{ color: tokens.colors.brand.gold, fontSize: tokens.typography.fontSize.xs, fontWeight: 'bold' }}>
                    ✓ Hide Keyboard
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
                placeholder="Describe suspects, weapons, vehicle license plates, direction of escape..."
                placeholderTextColor={tokens.colors.text.muted}
                value={description}
                onChangeText={onDescriptionChange}
                multiline
              />
            </View>

            {/* Anonymous Toggle (Act 720) */}
            <TouchableOpacity
              onPress={() => {
                Keyboard.dismiss();
                onAnonymousChange(!isAnonymous);
              }}
              style={styles.anonToggleBox}
              accessibilityRole="switch"
              accessibilityLabel="Toggle Anonymous Whistleblower Report"
            >
              <View style={{ flex: 1, paddingRight: tokens.spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {isAnonymous ? (
                    <ShieldAlert color={tokens.colors.status.success} size={16} />
                  ) : (
                    <ShieldCheck color={tokens.colors.text.secondary} size={16} />
                  )}
                  <Text style={styles.anonTitle}>
                    {isAnonymous ? 'Anonymous Whistleblower Active' : 'Citizen Safety Report'}
                  </Text>
                </View>
                <Text style={styles.anonSubtitle}>
                  {isAnonymous
                    ? 'All identifiers stripped under Whistleblower Act (Act 720)'
                    : 'Coordinates and landmark attached for emergency dispatch'}
                </Text>
              </View>
              <View style={[styles.togglePill, isAnonymous && styles.togglePillActive]} />
            </TouchableOpacity>

            {!isAnonymous && (
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Contact Phone Number (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 0244 123 456"
                  placeholderTextColor={tokens.colors.text.muted}
                  value={reporterPhone}
                  onChangeText={onReporterPhoneChange}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                  blurOnSubmit={true}
                />
              </View>
            )}

            {/* Step 2 Buttons */}
            <View style={styles.stepBtnRow}>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setStep(1);
                }}
                style={styles.stepBackBtn}
              >
                <ChevronLeft color={tokens.colors.text.primary} size={18} />
                <Text style={styles.stepBackBtnText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setStep(3);
                }}
                style={[styles.stepNextBtn, { flex: 2 }]}
              >
                <Text style={styles.stepNextBtnText}>Review & Transmit</Text>
                <ChevronRight color={tokens.colors.bg.base} size={18} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      )}

      {/* STEP 3: REVIEW & TRANSMIT */}
      {step === 3 && (
        <View style={styles.stepContent}>
          {/* Dossier Summary Card */}
          <View style={styles.dossierCard}>
            <View style={styles.dossierHeader}>
              <FileCheck color={tokens.colors.brand.gold} size={20} />
              <Text style={styles.dossierTitle}>OFFICIAL INCIDENT DOSSIER</Text>
            </View>

            {/* Media Summary */}
            <View style={styles.dossierRow}>
              <Text style={styles.dossierLabel}>EVIDENCE MEDIA</Text>
              <Text style={styles.dossierValue}>
                {hasRecordedMedia
                  ? `${mediaType} (${recordedDuration}s) • Act 772 Watermarked`
                  : 'No Video/Photo Attached'}
              </Text>
            </View>

            {/* Title & Category */}
            <View style={styles.dossierRow}>
              <Text style={styles.dossierLabel}>TITLE & CATEGORY</Text>
              <Text style={styles.dossierValue}>
                {title || 'Untitled Report'} • {category}
              </Text>
            </View>

            {/* Location & GPS Telemetry */}
            <View style={styles.dossierRow}>
              <Text style={styles.dossierLabel}>LOCATION & GPS TELEMETRY</Text>
              <Text style={styles.dossierValue}>
                {landmark ? `${landmark}, ` : ''}{locationName || 'Location pending'} [{locationSource}]
                {coords ? ` (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})` : ''}
              </Text>
            </View>

            {/* Legal Status */}
            <View style={styles.dossierRow}>
              <Text style={styles.dossierLabel}>DISPATCH DESTINATION</Text>
              <Text style={[styles.dossierValue, { color: tokens.colors.police.badge }]}>
                {category === 'DOMESTIC_ABUSE'
                  ? 'DOVVSU Special Unit'
                  : category === 'GALAMSEY_ENVIRONMENTAL'
                  ? 'EPA / Minerals Commission'
                  : category === 'TRAFFIC_RECKLESS'
                  ? 'Police MTTD Division'
                  : 'Ghana Police CID Dispatch'}
              </Text>
            </View>

            {/* Whistleblower Seal */}
            <View style={styles.sealBox}>
              <ShieldCheck color={tokens.colors.status.success} size={16} />
              <Text style={styles.sealText}>
                {isAnonymous
                  ? 'Protected under Whistleblower Act 720 (Zero Identity Leak)'
                  : 'Authenticated Citizen Submission (Verified Trust Chain)'}
              </Text>
            </View>
          </View>

          {/* Upload Progress Card if Submitting */}
          <UploadProgressHud
            uploadProgress={uploadProgress}
            uploadStatusText={uploadStatusText}
            isUploadingMedia={isUploadingMedia}
            isSubmitting={isSubmitting}
            hasRecordedMedia={hasRecordedMedia}
            mediaType={mediaType}
            recordedDuration={recordedDuration}
          />

          {/* Submit Button */}
          <TouchableOpacity
            onPress={onSubmitReport}
            disabled={isSubmitting}
            style={styles.submitBtn}
            accessibilityRole="button"
            accessibilityLabel="Transmit Official Report"
          >
            {isSubmitting ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: tokens.spacing.sm, paddingHorizontal: 8 }}>
                <ActivityIndicator color={tokens.colors.bg.base} size="small" />
                <Text style={[styles.submitBtnText, { fontSize: tokens.typography.fontSize.xs }]} numberOfLines={1}>
                  {uploadStatusText || 'Transmitting Report & Evidence...'}
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm }}>
                <Send color={tokens.colors.bg.base} size={18} />
                <Text style={styles.submitBtnText}>{t.submitReport}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Save a copy to device button */}
          {hasRecordedMedia && onSaveToGallery && (
            <TouchableOpacity
              onPress={onSaveToGallery}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: tokens.spacing.xs,
                backgroundColor: tokens.colors.surface.card,
                borderWidth: 1,
                borderColor: tokens.colors.border.subtle,
                paddingVertical: 12,
                borderRadius: tokens.radius.md,
                marginTop: tokens.spacing.xs
              }}
              accessibilityRole="button"
              accessibilityLabel="Save a copy to my device"
            >
              <Download color={tokens.colors.brand.gold} size={16} />
              <Text style={{ color: tokens.colors.text.white, fontSize: tokens.typography.fontSize.xs, fontWeight: '700' }}>
                Save a Copy to My Device Gallery
              </Text>
            </TouchableOpacity>
          )}

          {/* Step 3 Back Button */}
          <TouchableOpacity
            onPress={() => setStep(2)}
            style={styles.stepBackBtn}
          >
            <ChevronLeft color={tokens.colors.text.primary} size={18} />
            <Text style={styles.stepBackBtnText}>Edit Details</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    gap: tokens.spacing.md
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: tokens.colors.surface.card,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.sm,
    borderWidth: 1,
    borderColor: tokens.colors.border.subtle
  },
  stepItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.xs
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: tokens.colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepBadgeActive: {
    backgroundColor: tokens.colors.brand.gold
  },
  stepBadgeCompleted: {
    backgroundColor: tokens.colors.status.success
  },
  stepBadgeText: {
    color: tokens.colors.text.muted,
    fontSize: tokens.typography.fontSize.xxs,
    fontWeight: 'bold'
  },
  stepBadgeTextActive: {
    color: tokens.colors.bg.base
  },
  stepLabel: {
    color: tokens.colors.text.muted,
    fontSize: tokens.typography.fontSize.xxs,
    fontWeight: '600'
  },
  stepLabelActive: {
    color: tokens.colors.text.white,
    fontWeight: 'bold'
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    backgroundColor: tokens.colors.border.subtle,
    padding: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.border.medium
  },
  warningText: {
    color: tokens.colors.brand.gold,
    fontSize: tokens.typography.fontSize.xxs,
    fontWeight: '600',
    flex: 1
  },
  stepContent: {
    gap: tokens.spacing.md
  },
  captureOptionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: tokens.colors.surface.card,
    borderRadius: tokens.radius.xl,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    borderWidth: 1,
    borderColor: tokens.colors.border.subtle
  },
  sideActionBtn: {
    backgroundColor: tokens.colors.border.subtle,
    borderWidth: 1,
    borderColor: tokens.colors.border.medium,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: tokens.touchTarget.minHeight
  },
  sideActionText: {
    color: tokens.colors.text.primary,
    fontSize: tokens.typography.fontSize.xxs,
    fontWeight: 'bold'
  },
  recordBtnContainer: {
    alignItems: 'center',
    gap: 4
  },
  recordBtnPulse: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: tokens.colors.status.danger
  },
  recordBtnPulseActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.4)',
    borderColor: tokens.colors.text.white,
    transform: [{ scale: 1.05 }]
  },
  recordBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: tokens.colors.status.danger,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.elevation.high
  },
  recordBtnActive: {
    backgroundColor: tokens.colors.status.emergencyDark
  },
  recordBtnInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: tokens.colors.text.white
  },
  stopSquare: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: tokens.colors.text.white
  },
  recordBtnLabel: {
    color: tokens.colors.brand.gold,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  stepNextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.xs,
    backgroundColor: tokens.colors.brand.gold,
    minHeight: tokens.touchTarget.minHeight,
    borderRadius: tokens.radius.lg
  },
  stepNextBtnText: {
    color: tokens.colors.bg.base,
    fontSize: tokens.typography.fontSize.md,
    fontWeight: '900'
  },
  stepBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.xs,
    backgroundColor: tokens.colors.surface.card,
    borderWidth: 1,
    borderColor: tokens.colors.border.subtle,
    minHeight: tokens.touchTarget.minHeight,
    borderRadius: tokens.radius.lg,
    flex: 1
  },
  stepBackBtnText: {
    color: tokens.colors.text.primary,
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: '700'
  },
  stepBtnRow: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
    marginTop: tokens.spacing.xs
  },
  landmarkSection: {
    backgroundColor: tokens.colors.surface.cardSubtle,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.brand.gold,
    gap: tokens.spacing.xs
  },
  landmarkInput: {
    backgroundColor: tokens.colors.bg.base,
    borderColor: tokens.colors.brand.gold
  },
  chipsScroll: {
    flexDirection: 'row',
    marginTop: tokens.spacing.xs
  },
  chip: {
    backgroundColor: tokens.colors.border.subtle,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.full,
    marginRight: tokens.spacing.xs,
    borderWidth: 1,
    borderColor: tokens.colors.border.medium
  },
  chipText: {
    color: tokens.colors.text.primary,
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: '600'
  },
  inputGroup: {
    gap: tokens.spacing.xs
  },
  fieldLabel: {
    color: tokens.colors.text.secondary,
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: 'bold'
  },
  fieldLabelGold: {
    color: tokens.colors.brand.gold,
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: 'bold'
  },
  categoryGrid: {
    gap: tokens.spacing.xs
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    backgroundColor: tokens.colors.surface.card,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.border.subtle
  },
  categoryCardActive: {
    backgroundColor: tokens.colors.police.dark,
    borderColor: tokens.colors.police.accent
  },
  categoryText: {
    color: tokens.colors.text.primary,
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: '600'
  },
  categoryTextActive: {
    color: tokens.colors.text.white,
    fontWeight: 'bold'
  },
  input: {
    backgroundColor: tokens.colors.surface.card,
    borderWidth: 1,
    borderColor: tokens.colors.border.subtle,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    color: tokens.colors.text.white,
    fontSize: tokens.typography.fontSize.md
  },
  anonToggleBox: {
    backgroundColor: tokens.colors.surface.card,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border.subtle,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  anonTitle: {
    color: tokens.colors.text.white,
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: 'bold'
  },
  anonSubtitle: {
    color: tokens.colors.text.muted,
    fontSize: tokens.typography.fontSize.xxs,
    marginTop: 2
  },
  togglePill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: tokens.colors.border.medium
  },
  togglePillActive: {
    backgroundColor: tokens.colors.status.success
  },
  dossierCard: {
    backgroundColor: tokens.colors.surface.card,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.border.subtle,
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md
  },
  dossierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border.subtle,
    paddingBottom: tokens.spacing.sm
  },
  dossierTitle: {
    color: tokens.colors.brand.gold,
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  dossierRow: {
    gap: 2
  },
  dossierLabel: {
    color: tokens.colors.text.muted,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5
  },
  dossierValue: {
    color: tokens.colors.text.white,
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: '600'
  },
  sealBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    padding: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.status.success
  },
  sealText: {
    color: tokens.colors.brand.greenLight,
    fontSize: tokens.typography.fontSize.xxs,
    fontWeight: '600',
    flex: 1
  },
  submitBtn: {
    backgroundColor: tokens.colors.brand.gold,
    minHeight: tokens.touchTarget.minHeight,
    borderRadius: tokens.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: tokens.spacing.xs
  },
  submitBtnText: {
    color: tokens.colors.bg.base,
    fontSize: tokens.typography.fontSize.md,
    fontWeight: '900'
  },
  captureTipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    backgroundColor: 'rgba(252, 209, 22, 0.08)',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.brand.goldMuted
  },
  captureTipText: {
    color: tokens.colors.brand.gold,
    fontSize: tokens.typography.fontSize.xxs,
    fontWeight: '600',
    flex: 1
  }
});
