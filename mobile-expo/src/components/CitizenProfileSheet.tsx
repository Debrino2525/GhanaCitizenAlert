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
  Image
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

interface CitizenProfileSheetProps {
  isOpen: boolean;
  citizen: CitizenUser;
  isAnonymous: boolean;
  onClose: () => void;
  onToggleAnonymous: (anonymous: boolean) => void;
  onSignOut: () => void;
  onUpdateAvatar?: (avatarUrl: string) => void;
  onUpdatePhone?: (phone: string) => void;
}

export const CitizenProfileSheet: React.FC<CitizenProfileSheetProps> = memo(({
  isOpen,
  citizen,
  isAnonymous,
  onClose,
  onToggleAnonymous,
  onSignOut,
  onUpdateAvatar,
  onUpdatePhone
}) => {
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [inputPhone, setInputPhone] = useState(citizen.phone || '');
  const [isSavingPhone, setIsSavingPhone] = useState(false);

  const handlePickAvatar = async () => {
    Alert.alert(
      '📸 Citizen Profile Photo',
      'Upload a verified facial photo for identification during emergency SOS alerts and civic verification.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Take Selfie (Camera)',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Denied', 'Camera permission is required to capture a verification selfie.');
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
      '🔒 Sign Out & Lock App',
      'Are you sure you want to lock the app and return to the Citizen Access Control Gateway?',
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
      '⚠️ Delete Account & Purge Data?',
      'Under the Data Protection Act, 2012 (Act 843), requesting account deletion will permanently erase your profile credentials, device tokens, and local queued reports. Any evidence already submitted will be completely anonymized under Whistleblower Act 720.\n\nAre you sure you want to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue to Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              '🚨 Final Confirmation',
              'This action is irreversible. Your account and all stored local session data will be permanently deleted now.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Permanently Delete',
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
                      '✅ Account Deleted',
                      'Your citizen session, credentials, and local data have been permanently purged from this device.'
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
                <Text style={styles.modalTitle}>Citizen Profile & Trust Vault</Text>
                <Text style={styles.modalSubtitle}>Active Verified Citizen Session</Text>
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

          {/* Trust Score Meter Card */}
          <View style={styles.trustScoreCard}>
            <View style={styles.trustScoreHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.xs }}>
                <Award color={tokens.colors.brand.gold} size={18} />
                <Text style={styles.trustScoreLabel}>CIVIC TRUST RATING</Text>
              </View>
              <View style={styles.trustPill}>
                <Text style={styles.trustPillText}>{citizen.trustScore}/100 TRUST</Text>
              </View>
            </View>

            <View style={styles.trustBarTrack}>
              <View style={[styles.trustBarFill, { width: `${citizen.trustScore}%` }]} />
            </View>
            <Text style={styles.trustExplainer}>
              Higher trust ratings provide expedited investigation priority with Ghana Police CID.
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
                  {citizen.isVerified && (
                    <View style={styles.verifiedBadge}>
                      <ShieldCheck color={tokens.colors.status.success} size={12} />
                      <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.avatarTipText}>
                  {citizen.avatarUrl ? 'Profile face linked • Transmitted on SOS' : 'Tap to add face for SOS facial identification'}
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
                  <Text style={styles.act843MiniBadgeText}>Act 843 SOS Linked</Text>
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
                    + Link Phone for SOS & Carrier Triangulation (Act 843)
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
              Auth: {citizen.loginMethod} • Whistleblower Act 720 Immunity Active
            </Text>
          </View>

          {/* Whistleblower Mode Toggle */}
          <TouchableOpacity
            onPress={() => {
              const nextAnonymous = !isAnonymous;
              onToggleAnonymous(nextAnonymous);
              Alert.alert(
                nextAnonymous ? '🛡️ Whistleblower Mode Activated' : '🇬🇭 Verified Citizen Mode Activated',
                nextAnonymous
                  ? 'All personal details and phone numbers will be stripped from your incident transmissions under Act 720.'
                  : 'Transmissions will include your verified contact details for expedited police follow-up.'
              );
            }}
            style={[
              styles.whistleblowerToggleBtn,
              isAnonymous ? styles.whistleblowerActive : styles.whistleblowerInactive
            ]}
            accessibilityRole="switch"
            accessibilityLabel="Toggle Whistleblower Mode"
          >
            {isAnonymous ? (
              <ShieldAlert color={tokens.colors.text.white} size={16} />
            ) : (
              <ShieldCheck color={tokens.colors.text.secondary} size={16} />
            )}
            <Text style={styles.whistleblowerBtnText}>
              {isAnonymous ? 'Anonymous Whistleblower: ACTIVE' : 'Enable Anonymous Whistleblower Mode'}
            </Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>SESSION ACTIONS</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Privacy Policy Link */}
          <TouchableOpacity
            onPress={handleOpenPrivacyPolicy}
            style={styles.privacyLinkBtn}
            accessibilityRole="button"
            accessibilityLabel="View Data Protection & Privacy Policy"
          >
            <ExternalLink color={tokens.colors.brand.gold} size={14} />
            <Text style={styles.privacyLinkText}>Statutory Privacy Policy (Act 843)</Text>
          </TouchableOpacity>

          {/* Sign Out Button */}
          <TouchableOpacity
            onPress={handleSignOutPress}
            style={styles.signOutBtn}
            accessibilityRole="button"
            accessibilityLabel="Sign Out and Lock App"
          >
            <LogOut color={tokens.colors.text.white} size={16} />
            <Text style={styles.signOutBtnText}>Sign Out & Lock App</Text>
          </TouchableOpacity>

          {/* Delete Account & Purge Data Button (Apple 5.1.1(v) & Google Play Compliance) */}
          <TouchableOpacity
            onPress={handleDeleteAccountPress}
            style={styles.deleteAccountBtn}
            accessibilityRole="button"
            accessibilityLabel="Permanently Delete Citizen Account and Purge Data"
          >
            <Trash2 color={tokens.colors.status.danger} size={15} />
            <Text style={styles.deleteAccountBtnText}>Delete Account & Purge Data</Text>
          </TouchableOpacity>
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: tokens.colors.bg.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacing.lg
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: tokens.colors.surface.card,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.border.medium,
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  shieldIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.bg.base,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.brand.gold
  },
  modalTitle: {
    color: tokens.colors.text.white,
    fontSize: tokens.typography.fontSize.lg,
    fontWeight: '800'
  },
  modalSubtitle: {
    color: tokens.colors.text.secondary,
    fontSize: tokens.typography.fontSize.xs
  },
  modalCloseBtn: {
    padding: tokens.spacing.xs,
    borderRadius: tokens.radius.sm,
    backgroundColor: tokens.colors.border.subtle,
    minHeight: 36,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center'
  },
  trustScoreCard: {
    backgroundColor: tokens.colors.bg.base,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.border.subtle,
    gap: tokens.spacing.xs
  },
  trustScoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  trustScoreLabel: {
    color: tokens.colors.text.secondary,
    fontSize: tokens.typography.fontSize.xxs,
    fontWeight: 'bold',
    letterSpacing: 0.5
  },
  trustPill: {
    backgroundColor: tokens.colors.status.success,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: tokens.radius.xs
  },
  trustPillText: {
    color: tokens.colors.bg.base,
    fontSize: tokens.typography.fontSize.xxs,
    fontWeight: '900'
  },
  trustBarTrack: {
    height: 6,
    backgroundColor: tokens.colors.border.subtle,
    borderRadius: tokens.radius.xs,
    overflow: 'hidden',
    marginTop: tokens.spacing.xs
  },
  trustBarFill: {
    height: '100%',
    backgroundColor: tokens.colors.status.success,
    borderRadius: tokens.radius.xs
  },
  trustExplainer: {
    color: tokens.colors.text.muted,
    fontSize: tokens.typography.fontSize.xxs,
    lineHeight: tokens.typography.lineHeight.xxs,
    marginTop: 2
  },
  profileOverview: {
    backgroundColor: tokens.colors.bg.base,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.border.subtle,
    gap: tokens.spacing.xs
  },
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
  avatarTipText: {
    color: tokens.colors.text.muted,
    fontSize: tokens.typography.fontSize.xxs,
    marginTop: 2
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.xxs
  },
  detailName: {
    color: tokens.colors.text.white,
    fontSize: tokens.typography.fontSize.lg,
    fontWeight: '800'
  },
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs
  },
  infoText: {
    color: tokens.colors.text.secondary,
    fontSize: tokens.typography.fontSize.xs
  },
  authProviderText: {
    color: tokens.colors.text.muted,
    fontSize: tokens.typography.fontSize.xxs,
    marginTop: tokens.spacing.xs
  },
  whistleblowerToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sm,
    minHeight: tokens.touchTarget.minHeight,
    borderRadius: tokens.radius.lg,
    borderWidth: 1
  },
  whistleblowerActive: {
    backgroundColor: tokens.colors.brand.green,
    borderColor: tokens.colors.status.success
  },
  whistleblowerInactive: {
    backgroundColor: tokens.colors.border.subtle,
    borderColor: tokens.colors.border.medium
  },
  whistleblowerBtnText: {
    color: tokens.colors.text.white,
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: 'bold'
  },
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
  dividerText: {
    color: tokens.colors.text.muted,
    fontSize: tokens.typography.fontSize.xxs,
    fontWeight: 'bold',
    letterSpacing: 0.5
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sm,
    backgroundColor: tokens.colors.status.emergency,
    minHeight: tokens.touchTarget.minHeight,
    borderRadius: tokens.radius.lg
  },
  signOutBtnText: {
    color: tokens.colors.text.white,
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: 'bold'
  },
  privacyLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.xs,
    paddingVertical: tokens.spacing.xs
  },
  privacyLinkText: {
    color: tokens.colors.brand.gold,
    fontSize: tokens.typography.fontSize.xxs,
    fontWeight: '600',
    textDecorationLine: 'underline'
  },
  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    minHeight: 40,
    borderRadius: tokens.radius.lg,
    marginTop: tokens.spacing.xs
  },
  deleteAccountBtnText: {
    color: tokens.colors.status.danger,
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: 'bold'
  },
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
  addPhoneAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.sm,
    marginVertical: 4
  },
  addPhoneAlertBannerText: {
    color: tokens.colors.status.warning,
    fontSize: tokens.typography.fontSize.xxs,
    fontWeight: '700'
  }
});
