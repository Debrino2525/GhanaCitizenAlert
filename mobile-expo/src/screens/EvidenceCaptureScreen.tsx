import React, { memo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Keyboard,
  ActivityIndicator
} from 'react-native';
import { TranslationMap, LANDMARK_SUGGESTIONS } from '../constants/i18n';
import { GpsCoordinates, GpsLockStatus, IncidentCategory } from '../types';
import { GpsTelemetryCard } from '../components/GpsTelemetryCard';
import { ViewfinderOverlay } from '../components/ViewfinderOverlay';
import { UploadProgressHud } from '../components/UploadProgressHud';
import { CameraType } from 'expo-camera';

interface EvidenceCaptureScreenProps {
  t: TranslationMap;
  // GPS props
  coords: GpsCoordinates;
  gpsAccuracy: number | null;
  isLocating: boolean;
  gpsStatus: GpsLockStatus;
  locationName: string;
  ghanaPostCode: string;
  onRefreshGps: () => void;
  onLocationNameChange: (text: string) => void;
  onGhanaPostCodeChange: (text: string) => void;
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
  onSubmitReport: () => void;
}

const CATEGORIES: { id: IncidentCategory; label: string }[] = [
  { id: 'CRIMINAL_OFFENSE', label: '🚨 Armed Crime / Robbery' },
  { id: 'DOMESTIC_ABUSE', label: '🛡️ Domestic Abuse (DOVVSU)' },
  { id: 'GALAMSEY_ENVIRONMENTAL', label: '🌲 Galamsey / Pollution' },
  { id: 'TRAFFIC_RECKLESS', label: '🚗 Dangerous Driving (MTTD)' },
  { id: 'SANITATION_ZONING', label: '🗑️ Sanitation / Dumping' }
];

export const EvidenceCaptureScreen: React.FC<EvidenceCaptureScreenProps> = memo(({
  t,
  coords,
  gpsAccuracy,
  isLocating,
  gpsStatus,
  locationName,
  ghanaPostCode,
  onRefreshGps,
  onLocationNameChange,
  onGhanaPostCodeChange,
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
  onSubmitReport
}) => {
  return (
    <View style={styles.section}>
      {/* Safety Warning */}
      <View style={styles.warningBox}>
        <Text style={styles.warningText}>⚠️ {t.safetyNotice}</Text>
      </View>

      {/* Live GPS Coordinates HUD */}
      <GpsTelemetryCard
        coords={coords}
        gpsAccuracy={gpsAccuracy}
        isLocating={isLocating}
        gpsStatus={gpsStatus}
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
        coords={coords}
        ghanaPostCode={ghanaPostCode}
        gpsAccuracy={gpsAccuracy}
        onFlipCamera={onFlipCamera}
        onRetake={onRetake}
        onRequestPermissions={onRequestCameraPermissions}
      />

      {/* Direct In-App Capture Toolbar */}
      <View style={styles.captureOptionsRow}>
        <TouchableOpacity
          onPress={onSnapPhoto}
          disabled={isRecording}
          style={[styles.sideActionBtn, isRecording && { opacity: 0.5 }]}
        >
          <Text style={styles.sideActionText}>📸 Photo</Text>
        </TouchableOpacity>

        <View style={styles.recordBtnContainer}>
          <TouchableOpacity
            onPress={onToggleRecording}
            style={[styles.recordBtnPulse, isRecording && styles.recordBtnPulseActive]}
            activeOpacity={0.7}
            accessibilityLabel={isRecording ? 'Stop Recording' : 'Start 60s Recording'}
          >
            <View style={[styles.recordBtn, isRecording && styles.recordBtnActive]}>
              <View style={isRecording ? styles.stopSquare : styles.recordBtnInner} />
            </View>
          </TouchableOpacity>
          <Text style={[styles.recordBtnLabel, isRecording && { color: '#EF4444' }]}>
            {isRecording
              ? '⏹️ STOP RECORDING'
              : hasRecordedMedia
              ? 'RE-RECORD (60s)'
              : '🔴 TAP TO RECORD (60s)'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={onPickFromGallery}
          disabled={isRecording}
          style={[styles.sideActionBtn, isRecording && { opacity: 0.5 }]}
        >
          <Text style={styles.sideActionText}>📁 Gallery</Text>
        </TouchableOpacity>
      </View>

      {/* Real-time Upload Reading / Attachment Progress HUD */}
      <UploadProgressHud
        uploadProgress={uploadProgress}
        uploadStatusText={uploadStatusText}
        isUploadingMedia={isUploadingMedia}
        hasRecordedMedia={hasRecordedMedia}
        mediaType={mediaType}
        recordedDuration={recordedDuration}
      />

      {/* Closest Landmark / Famous Place */}
      <View style={styles.landmarkSection}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.fieldLabelGold}>📍 {t.landmarkLabel}</Text>
          <TouchableOpacity onPress={Keyboard.dismiss}>
            <Text style={{ color: '#FCD116', fontSize: 11, fontWeight: 'bold' }}>✕ Hide</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.input, styles.landmarkInput]}
          placeholder={t.landmarkPlaceholder}
          placeholderTextColor="#64748b"
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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <Text style={styles.fieldLabel}>{t.locationLabel}</Text>
        <TouchableOpacity onPress={Keyboard.dismiss}>
          <Text style={{ color: '#94a3b8', fontSize: 11 }}>✕ Hide Keyboard</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.input}
        placeholder="e.g. Boundary Road, East Legon, Accra"
        placeholderTextColor="#64748b"
        value={locationName}
        onChangeText={onLocationNameChange}
        returnKeyType="done"
        onSubmitEditing={Keyboard.dismiss}
        blurOnSubmit={true}
      />

      {/* GhanaPost GPS */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={styles.fieldLabel}>{t.ghanaPostLabel}</Text>
        <Text style={{ color: '#94a3b8', fontSize: 10 }}>Auto-Generated from GPS</Text>
      </View>
      <TextInput
        style={[styles.input, { color: '#FCD116', fontFamily: 'monospace', fontWeight: 'bold' }]}
        placeholder="e.g. GA-382-9104"
        placeholderTextColor="#64748b"
        value={ghanaPostCode}
        onChangeText={onGhanaPostCodeChange}
        autoCapitalize="characters"
        returnKeyType="done"
        onSubmitEditing={Keyboard.dismiss}
        blurOnSubmit={true}
      />

      {/* Incident Category */}
      <Text style={styles.fieldLabel}>{t.categories}</Text>
      <View style={styles.categoryGrid}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.id}
            onPress={() => {
              Keyboard.dismiss();
              onCategoryChange(c.id);
            }}
            style={[styles.categoryCard, category === c.id && styles.categoryCardActive]}
          >
            <Text style={[styles.categoryText, category === c.id && styles.categoryTextActive]}>
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Incident Title */}
      <Text style={styles.fieldLabel}>Incident Title</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Armed robbery attempt near junction"
        placeholderTextColor="#64748b"
        value={title}
        onChangeText={onTitleChange}
        returnKeyType="done"
        onSubmitEditing={Keyboard.dismiss}
        blurOnSubmit={true}
      />

      {/* Description */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={styles.fieldLabel}>Situation Details & Suspect Description</Text>
        <TouchableOpacity onPress={Keyboard.dismiss}>
          <Text style={{ color: '#FCD116', fontSize: 11, fontWeight: 'bold' }}>✕ Done</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={[styles.input, { height: 85, textAlignVertical: 'top' }]}
        placeholder="Describe suspects, weapons, vehicle license plates, direction of escape..."
        placeholderTextColor="#64748b"
        value={description}
        onChangeText={onDescriptionChange}
        multiline
        returnKeyType="default"
      />

      {/* Anonymous Toggle (Act 720) */}
      <TouchableOpacity
        onPress={() => {
          Keyboard.dismiss();
          onAnonymousChange(!isAnonymous);
        }}
        style={styles.anonToggleBox}
      >
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.anonTitle}>
            {isAnonymous ? '🛡️ Anonymous Whistleblower Active' : '👤 Citizen Safety Report'}
          </Text>
          <Text style={styles.anonSubtitle}>
            {isAnonymous
              ? 'All identifiers stripped under Whistleblower Act (Act 720)'
              : 'Coordinates and landmark attached for emergency dispatch'}
          </Text>
        </View>
        <View style={[styles.togglePill, isAnonymous && styles.togglePillActive]} />
      </TouchableOpacity>

      {!isAnonymous && (
        <View>
          <Text style={styles.fieldLabel}>Contact Phone Number (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 0244 123 456"
            placeholderTextColor="#64748b"
            value={reporterPhone}
            onChangeText={onReporterPhoneChange}
            keyboardType="phone-pad"
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
            blurOnSubmit={true}
          />
        </View>
      )}

      {/* Submit Button */}
      <TouchableOpacity
        onPress={onSubmitReport}
        disabled={isSubmitting}
        style={styles.submitBtn}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#070B13" size="small" />
        ) : (
          <Text style={styles.submitBtnText}>{t.submitReport}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    gap: 12
  },
  warningBox: {
    backgroundColor: '#1E293B',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155'
  },
  warningText: {
    color: '#FCD116',
    fontSize: 11,
    fontWeight: '600'
  },
  captureOptionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginVertical: 4
  },
  sideActionBtn: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sideActionText: {
    color: '#cbd5e1',
    fontSize: 11,
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
    backgroundColor: 'rgba(239,68,68,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#EF4444'
  },
  recordBtnPulseActive: {
    backgroundColor: 'rgba(239,68,68,0.4)',
    borderColor: '#ffffff',
    transform: [{ scale: 1.05 }]
  },
  recordBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8
  },
  recordBtnActive: {
    backgroundColor: '#991B1B'
  },
  recordBtnInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff'
  },
  stopSquare: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#ffffff'
  },
  recordBtnLabel: {
    color: '#FCD116',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  landmarkSection: {
    backgroundColor: '#0B1E38',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FCD116',
    gap: 8
  },
  landmarkInput: {
    backgroundColor: '#070B13',
    borderColor: '#FCD116'
  },
  chipsScroll: {
    flexDirection: 'row',
    marginTop: 4
  },
  chip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#334155'
  },
  chipText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600'
  },
  fieldLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4
  },
  fieldLabelGold: {
    color: '#FCD116',
    fontSize: 12,
    fontWeight: 'bold'
  },
  categoryGrid: {
    gap: 6
  },
  categoryCard: {
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B'
  },
  categoryCardActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#3B82F6'
  },
  categoryText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600'
  },
  categoryTextActive: {
    color: '#ffffff',
    fontWeight: 'bold'
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 13
  },
  anonToggleBox: {
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6
  },
  anonTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  anonSubtitle: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2
  },
  togglePill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#334155'
  },
  togglePillActive: {
    backgroundColor: '#10B981'
  },
  submitBtn: {
    backgroundColor: '#FCD116',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8
  },
  submitBtnText: {
    color: '#070B13',
    fontSize: 14,
    fontWeight: '900'
  }
});
