import React, { memo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Alert,
  TextInput,
  ActivityIndicator,
  Image,
  ScrollView
} from 'react-native';
import {
  ShieldCheck,
  Mail,
  Phone,
  CreditCard,
  Lock,
  LogOut,
  X,
  Award,
  ShieldAlert,
  Trash2,
  ExternalLink,
  Camera,
  User as UserIcon,
  Edit3,
  Plus
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadAndSyncCitizenAvatar } from '../services/avatarService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CitizenUser } from './CitizenAccessWall';
import { supabase } from '../lib/supabase';
import { GoogleSignin } from '../lib/googleAuth';
import { tokens } from '../theme/tokens';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';
import { LanguageCode } from '../types';

interface CitizenProfileSheetProps {
  isOpen: boolean;
  citizen: CitizenUser;
  isAnonymous: boolean;
  onClose: () => void;
  onToggleAnonymous: (anonymous: boolean) => void;
  onSignOut: () => void;
  onUpdateAvatar?: (avatarUrl: string) => void;
  onUpdatePhone?: (phone: string) => void;
  language?: LanguageCode;
  onChangeLanguage?: (code: LanguageCode) => void;
}

const LANGUAGE_OPTIONS: { code: LanguageCode; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'tw', label: 'Twi' },
  { code: 'ga', label: 'Ga' },
  { code: 'ee', label: 'Ewe' },
  { code: 'ha', label: 'Hausa' }
];

export const CitizenProfileSheet: React.FC<CitizenProfileSheetProps> = memo(({
  isOpen,
  citizen,
  isAnonymous,
  onClose,
  onToggleAnonymous,
  onSignOut,
  onUpdateAvatar,
  onUpdatePhone,
  language,
  onChangeLanguage
}) => {
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [inputPhone, setInputPhone] = useState(citizen.phone || '');
  const [isSavingPhone, setIsSavingPhone] = useState(false);

  const handlePickAvatar = async () => {
    Alert.alert(
      '📸 Citizen Profile Photo',
      'Add a profile photo. It is shared with responders when you send an SOS so they can recognise you.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Take Selfie (Camera)',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Denied', 'Allow camera access to take a profile photo.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.5,
              base64: true
            });
            if (!result.canceled && result.assets[0]) {
              const asset = result.assets[0];
              const syncedUrl = await uploadAndSyncCitizenAvatar(citizen.id, asset.base64, asset.uri);
              onUpdateAvatar?.(syncedUrl);
            }
          }
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Denied', 'Media library permission is required to select a photo.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.5,
              base64: true
            });
            if (!result.canceled && result.assets[0]) {
              const asset = result.assets[0];
              const syncedUrl = await uploadAndSyncCitizenAvatar(citizen.id, asset.base64, asset.uri);
              onUpdateAvatar?.(syncedUrl);
            }
          }
        }
      ]
    );
  };

  const handleSignOutPress = () => {
    Alert.alert(
      'Sign out?',
      'You will return to the sign-in screen. Reports waiting to send stay on this phone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Lock App',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              if (GoogleSignin && GoogleSignin.signOut) {
                await GoogleSignin.signOut().catch(() => {});
              }
            } catch (err) {
              console.warn('Sign out error:', err);
            }
            onClose();
            onSignOut();
          }
        }
      ]
    );
  };

  const handleOpenPrivacyPolicy = () => {
    setIsPrivacyModalOpen(true);
  };

  const handleSavePhone = async () => {
    if (!inputPhone.trim()) {
      Alert.alert('Phone Required', 'Please enter a valid Ghana phone number (e.g. 0244 123 456).');
      return;
    }
    setIsSavingPhone(true);
    try {
      const cleanPhone = inputPhone.trim();
      if (citizen.email) {
        await AsyncStorage.setItem(`@citizen_phone_${citizen.email.toLowerCase()}`, cleanPhone).catch(() => {});
      }
      await supabase.auth.updateUser({
        data: {
          phone: cleanPhone,
          emergency_telecom_consent: true,
          emergency_consent_at: new Date().toISOString(),
          emergency_consent_act: 'DATA_PROTECTION_ACT_843_SEC_20'
        }
      });
      onUpdatePhone?.(cleanPhone);
      setIsEditingPhone(false);
      Alert.alert(
        '✅ Phone Linked',
        `Phone number ${cleanPhone} is now registered for emergency SOS dispatch and carrier triangulation under Act 843.`
      );
    } catch (err: any) {
      Alert.alert('Save Error', err.message || 'Failed to save phone number.');
    } finally {
      setIsSavingPhone(false);
    }
  };

  const handleDeleteAccountPress = () => {
    Alert.alert(
      'Sign out and clear this phone?',
      'This signs you out and deletes reports that are still waiting to send on this phone.\n\nIt does not yet delete your account or reports already sent. To have those deleted, contact the CitizenAlert data protection officer through the privacy policy.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you sure?',
              'Unsent reports on this phone will be deleted and cannot be recovered.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Sign out and clear',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      // 1. Purge local pending reports queue
                      await AsyncStorage.removeItem('@citizen_alert_pending_reports_v1');

                      // 2. Sign out of Supabase & Google
                      await supabase.auth.signOut().catch(() => {});
                      if (GoogleSignin && GoogleSignin.signOut) {
                        await GoogleSignin.signOut().catch(() => {});
                      }
                    } catch (err) {
                      console.warn('Account deletion purge warning:', err);
                    }
                    onClose();
                    onSignOut();
                    Alert.alert(
                      'Signed out',
                      'You are signed out and unsent reports were removed from this phone.'
                    );
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm }}>
              <View style={styles.shieldIconWrapper}>
                <ShieldCheck color={tokens.colors.brand.gold} size={20} />
              </View>
              <View>
                <Text style={styles.modalTitle}>Profile</Text>
                <Text style={styles.modalSubtitle}>{citizen.loginMethod === 'ANONYMOUS' ? 'Using CitizenAlert without an account' : 'Signed in'}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.modalCloseBtn}
              accessibilityRole="button"
              accessibilityLabel="Close Citizen Profile"
            >
              <X color={tokens.colors.text.secondary} size={18} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{ gap: tokens.spacing.md, paddingBottom: tokens.spacing.xl }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          {/* Trust Score Meter Card */}
          <View style={styles.trustScoreCard}>
            <View style={styles.trustScoreHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.xs }}>
                <Award color={tokens.colors.brand.gold} size={18} />
                <Text style={styles.trustScoreLabel}>Civic trust</Text>
              </View>
              <View style={styles.trustPill}>
                <Text style={styles.trustPillText}>{citizen.trustScore}%</Text>
              </View>
            </View>

            <View style={styles.trustBarTrack}>
              <View style={[styles.trustBarFill, { width: `${citizen.trustScore}%` }]} />
            </View>
            <Text style={styles.trustExplainer}>
              Trust starts at 0%. You earn +5% once a day when you send a report with your name, and more when officers confirm a report. Reports found to be false lose 5%.
            </Text>
          </View>

          {/* Profile Details List */}
          <View style={styles.profileOverview}>
            <View style={styles.avatarRow}>
              <TouchableOpacity
                onPress={handlePickAvatar}
                style={styles.avatarContainer}
                accessibilityRole="button"
                accessibilityLabel="Change citizen profile picture"
              >
                {citizen.avatarUrl ? (
                  <Image source={{ uri: citizen.avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <UserIcon color={tokens.colors.brand.gold} size={28} />
                  </View>
                )}
                <View style={styles.avatarEditBadge}>
                  <Camera color={tokens.colors.text.white} size={11} />
                </View>
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailName}>{citizen.name}</Text>
                </View>
                <Text style={styles.avatarTipText}>
                  {citizen.avatarUrl ? 'Shared with responders when you send an SOS' : 'Tap to add a photo responders can recognise you by'}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Mail color={tokens.colors.text.muted} size={14} />
              <Text style={styles.infoText}>{citizen.email}</Text>
            </View>

            {isEditingPhone ? (
              <View style={styles.phoneEditContainer}>
                <View style={styles.phoneInputWrapper}>
                  <Phone color={tokens.colors.brand.gold} size={14} style={{ marginRight: 6 }} />
                  <TextInput
                    style={styles.phoneTextInput}
                    placeholder="e.g. 0244 123 456"
                    placeholderTextColor={tokens.colors.text.muted}
                    keyboardType="phone-pad"
                    value={inputPhone}
                    onChangeText={setInputPhone}
                    autoFocus
                  />
                </View>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, justifyContent: 'flex-end' }}>
                  <TouchableOpacity
                    onPress={() => setIsEditingPhone(false)}
                    style={styles.phoneCancelBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel phone edit"
                  >
                    <Text style={styles.phoneCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSavePhone}
                    disabled={isSavingPhone}
                    style={styles.phoneSaveBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Save phone number"
                  >
                    {isSavingPhone ? (
                      <ActivityIndicator color={tokens.colors.bg.base} size="small" />
                    ) : (
                      <Text style={styles.phoneSaveBtnText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : citizen.phone ? (
              <View style={styles.infoRow}>
                <Phone color={tokens.colors.brand.gold} size={14} />
                <Text style={styles.infoText}>{citizen.phone}</Text>
                <View style={styles.act843MiniBadge}>
                  <Text style={styles.act843MiniBadgeText}>SOS callback</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setInputPhone(citizen.phone || '');
                    setIsEditingPhone(true);
                  }}
                  style={styles.phoneEditTouchBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Edit phone number"
                >
                  <Edit3 color={tokens.colors.text.muted} size={13} />
                </TouchableOpacity>
              </View>
            ) : !citizen.phone && citizen.loginMethod !== 'ANONYMOUS' ? (
              <TouchableOpacity
                onPress={() => {
                  setInputPhone('');
                  setIsEditingPhone(true);
                }}
                style={styles.addPhoneAlertBanner}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Add phone number for SOS"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Phone color={tokens.colors.status.warning} size={14} />
                  <Text style={styles.addPhoneAlertBannerText}>
                    + Add a phone number for SOS callbacks
                  </Text>
                </View>
                <Plus color={tokens.colors.status.warning} size={14} />
              </TouchableOpacity>
            ) : null}

            {citizen.ghanaCard ? (
              <View style={styles.infoRow}>
                <CreditCard color={tokens.colors.brand.gold} size={14} />
                <Text style={[styles.infoText, { color: tokens.colors.brand.gold, fontWeight: 'bold' }]}>
                  Ghana Card: {citizen.ghanaCard}
                </Text>
              </View>
            ) : null}

            <Text style={styles.authProviderText}>
              Signed in with {citizen.loginMethod === 'GOOGLE' ? 'Google' : citizen.loginMethod === 'EMAIL' ? 'email' : citizen.loginMethod === 'PHONE' ? 'phone' : 'no account'}
            </Text>
          </View>

          {/* Whistleblower Mode Toggle */}
          <TouchableOpacity
            onPress={() => {
              const nextAnonymous = !isAnonymous;
              onToggleAnonymous(nextAnonymous);
              Alert.alert(
                nextAnonymous ? 'Anonymous reporting on' : 'Anonymous reporting off',
                nextAnonymous
                  ? 'Your name and phone number will not be sent with your reports.'
                  : 'Your reports will include your name and phone number so an officer can follow up.'
              );
            }}
            style={[
              styles.whistleblowerToggleBtn,
              isAnonymous ? styles.whistleblowerActive : styles.whistleblowerInactive
            ]}
            accessibilityRole="switch"
            accessibilityLabel="Report anonymously"
            accessibilityState={{ checked: isAnonymous }}
          >
            {isAnonymous ? (
              <ShieldAlert color={tokens.colors.text.white} size={16} />
            ) : (
              <ShieldCheck color={tokens.colors.text.secondary} size={16} />
            )}
            <Text style={styles.whistleblowerBtnText}>
              {isAnonymous ? 'Report anonymously: on' : 'Report anonymously: off'}
            </Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>SETTINGS</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Language / Kasa (moved here from the header in the redesign) */}
          {onChangeLanguage && (
            <View style={styles.languageBox}>
              <Text style={styles.languageTitle}>Language / Kasa</Text>
              <View style={styles.languageRow}>
                {LANGUAGE_OPTIONS.map((opt) => {
                  const active = language === opt.code;
                  return (
                    <TouchableOpacity
                      key={opt.code}
                      onPress={() => onChangeLanguage(opt.code)}
                      style={[styles.languageChip, active && styles.languageChipActive]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={opt.label}
                    >
                      <Text style={[styles.languageChipText, active && styles.languageChipTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Privacy Policy Link */}
          <TouchableOpacity
            onPress={handleOpenPrivacyPolicy}
            style={styles.privacyLinkBtn}
            accessibilityRole="button"
            accessibilityLabel="Privacy policy and your data rights"
          >
            <ExternalLink color={tokens.colors.brand.gold} size={14} />
            <Text style={styles.privacyLinkText}>Privacy policy & your data rights</Text>
          </TouchableOpacity>

          {/* Sign Out Button */}
          <TouchableOpacity
            onPress={handleSignOutPress}
            style={styles.signOutBtn}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <LogOut color={tokens.colors.text.white} size={16} />
            <Text style={styles.signOutBtnText}>Sign out</Text>
          </TouchableOpacity>

          {/* Delete Account & Purge Data Button (Apple 5.1.1(v) & Google Play Compliance) */}
          <TouchableOpacity
            onPress={handleDeleteAccountPress}
            style={styles.deleteAccountBtn}
            accessibilityRole="button"
            accessibilityLabel="Sign out and clear this phone"
          >
            <Trash2 color={tokens.colors.text.crimson} size={16} />
            <Text style={styles.deleteAccountBtnText}>Sign out and clear this phone</Text>
          </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {/* In-App Statutory Privacy Policy Modal */}
      <PrivacyPolicyModal
        visible={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: tokens.colors.bg.overlay, justifyContent: 'flex-end' },
  modalCard: { maxHeight: '92%', backgroundColor: tokens.colors.bg.base, borderTopLeftRadius: tokens.radius.xl, borderTopRightRadius: tokens.radius.xl, padding: tokens.spacing.lg, gap: tokens.spacing.md },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shieldIconWrapper: { width: 40, height: 40, borderRadius: 20, backgroundColor: tokens.colors.surface.cardHover, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { color: tokens.colors.text.primary, fontSize: tokens.typography.fontSize.xl, fontFamily: tokens.typography.fontFamily.sansBold },
  modalSubtitle: { color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.md, fontFamily: tokens.typography.fontFamily.sansRegular },
  modalCloseBtn: { width: tokens.touchTarget.minWidth, height: tokens.touchTarget.minHeight, borderRadius: tokens.touchTarget.minHeight / 2, backgroundColor: tokens.colors.surface.cardHover, alignItems: 'center', justifyContent: 'center' },
  trustScoreCard: { backgroundColor: tokens.colors.surface.card, borderRadius: tokens.radius.lg, padding: tokens.spacing.lg, gap: tokens.spacing.sm },
  trustScoreHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trustScoreLabel: { color: tokens.colors.text.primary, fontSize: tokens.typography.fontSize.lg, fontFamily: tokens.typography.fontFamily.sans },
  trustPill: { backgroundColor: tokens.colors.brand.goldMuted, borderRadius: tokens.radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  trustPillText: { color: tokens.colors.brand.gold, fontSize: tokens.typography.fontSize.md, fontFamily: tokens.typography.fontFamily.monoBold },
  trustBarTrack: { height: 8, borderRadius: 4, backgroundColor: tokens.colors.surface.highest, overflow: 'hidden' },
  trustBarFill: { height: 8, borderRadius: 4, backgroundColor: tokens.colors.brand.gold },
  trustExplainer: { color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.md, lineHeight: 20, fontFamily: tokens.typography.fontFamily.sansRegular },
  profileOverview: { backgroundColor: tokens.colors.surface.card, borderRadius: tokens.radius.lg, padding: tokens.spacing.lg, gap: tokens.spacing.md },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
    marginBottom: tokens.spacing.xs
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    position: 'relative',
    borderWidth: 2,
    borderColor: tokens.colors.brand.gold,
    backgroundColor: tokens.colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible'
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colors.bg.surface
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: tokens.colors.police.primary,
    borderWidth: 2,
    borderColor: tokens.colors.bg.base,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarTipText: { color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.sm, lineHeight: 18, fontFamily: tokens.typography.fontFamily.sansRegular },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.xxs
  },
  detailName: { color: tokens.colors.text.primary, fontSize: tokens.typography.fontSize.lg, fontFamily: tokens.typography.fontFamily.sansBold },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: tokens.radius.xs
  },
  verifiedText: {
    color: tokens.colors.status.success,
    fontSize: tokens.typography.fontSize.xxs,
    fontWeight: 'bold'
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm, minHeight: 32 },
  infoText: { flex: 1, color: tokens.colors.text.primary, fontSize: tokens.typography.fontSize.md, fontFamily: tokens.typography.fontFamily.sansRegular },
  authProviderText: { color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.sm, fontFamily: tokens.typography.fontFamily.mono },
  whistleblowerToggleBtn: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm, minHeight: tokens.touchTarget.primaryButton, paddingHorizontal: tokens.spacing.lg, borderRadius: tokens.radius.lg },
  whistleblowerActive: { backgroundColor: tokens.colors.status.successDark },
  whistleblowerInactive: { backgroundColor: tokens.colors.surface.card },
  whistleblowerBtnText: { color: tokens.colors.text.primary, fontSize: tokens.typography.fontSize.lg, fontFamily: tokens.typography.fontFamily.sans },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: tokens.colors.border.medium
  },
  dividerText: { color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.sm, fontFamily: tokens.typography.fontFamily.mono, letterSpacing: 0.5 },
  languageBox: {
    backgroundColor: tokens.colors.surface.card,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.md
  },
  languageTitle: {
    color: tokens.colors.text.primary,
    fontSize: tokens.typography.fontSize.md,
    fontFamily: tokens.typography.fontFamily.sans
  },
  languageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.sm
  },
  languageChip: {
    minHeight: 40,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.colors.surface.cardHover,
    alignItems: 'center',
    justifyContent: 'center'
  },
  languageChipActive: {
    backgroundColor: tokens.colors.brand.gold
  },
  languageChipText: {
    color: tokens.colors.text.primary,
    fontSize: tokens.typography.fontSize.md,
    fontFamily: tokens.typography.fontFamily.sansMedium
  },
  languageChipTextActive: {
    color: tokens.colors.text.inverse
  },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: tokens.spacing.sm, minHeight: tokens.touchTarget.primaryButton, borderRadius: tokens.radius.lg, backgroundColor: tokens.colors.surface.cardHover },
  signOutBtnText: { color: tokens.colors.text.primary, fontSize: tokens.typography.fontSize.lg, fontFamily: tokens.typography.fontFamily.sans },
  privacyLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm, minHeight: tokens.touchTarget.minHeight },
  privacyLinkText: { color: tokens.colors.brand.gold, fontSize: tokens.typography.fontSize.md, fontFamily: tokens.typography.fontFamily.sans, textDecorationLine: 'underline' },
  deleteAccountBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: tokens.spacing.sm, minHeight: tokens.touchTarget.minHeight, borderRadius: tokens.radius.lg },
  deleteAccountBtnText: { color: tokens.colors.text.crimson, fontSize: tokens.typography.fontSize.md, fontFamily: tokens.typography.fontFamily.sansMedium },
  act843MiniBadge: {
    backgroundColor: 'rgba(250, 204, 21, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 'auto'
  },
  act843MiniBadgeText: {
    color: tokens.colors.brand.gold,
    fontSize: 9,
    fontWeight: '700'
  },
  phoneEditTouchBtn: {
    padding: 4,
    borderRadius: 4,
    marginLeft: 6
  },
  phoneEditContainer: {
    backgroundColor: tokens.colors.bg.surface,
    borderWidth: 1,
    borderColor: tokens.colors.brand.gold,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.sm,
    marginVertical: 4
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.bg.base,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.spacing.sm,
    height: 40
  },
  phoneTextInput: {
    flex: 1,
    color: tokens.colors.text.primary,
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: '600'
  },
  phoneCancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.08)'
  },
  phoneCancelBtnText: {
    color: tokens.colors.text.muted,
    fontSize: tokens.typography.fontSize.xxs,
    fontWeight: '600'
  },
  phoneSaveBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: tokens.radius.sm,
    backgroundColor: tokens.colors.brand.gold,
    alignItems: 'center',
    justifyContent: 'center'
  },
  phoneSaveBtnText: {
    color: tokens.colors.bg.base,
    fontSize: tokens.typography.fontSize.xxs,
    fontWeight: '700'
  },
  addPhoneAlertBanner: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm, minHeight: tokens.touchTarget.minHeight, paddingHorizontal: tokens.spacing.md, borderRadius: tokens.radius.md, backgroundColor: tokens.colors.brand.goldMuted },
  addPhoneAlertBannerText: { color: tokens.colors.brand.gold, fontSize: tokens.typography.fontSize.md, fontFamily: tokens.typography.fontFamily.sans }
});
