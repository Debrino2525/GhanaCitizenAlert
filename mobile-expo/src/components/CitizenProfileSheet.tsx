import React, { memo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, Alert } from 'react-native';
import {
  ShieldCheck,
  Mail,
  Phone,
  CreditCard,
  Lock,
  LogOut,
  X,
  Award,
  ShieldAlert
} from 'lucide-react-native';
import { CitizenUser } from './CitizenAccessWall';
import { supabase } from '../lib/supabase';
import { GoogleSignin } from '../lib/googleAuth';
import { tokens } from '../theme/tokens';

interface CitizenProfileSheetProps {
  isOpen: boolean;
  citizen: CitizenUser;
  isAnonymous: boolean;
  onClose: () => void;
  onToggleAnonymous: (anonymous: boolean) => void;
  onSignOut: () => void;
}

export const CitizenProfileSheet: React.FC<CitizenProfileSheetProps> = memo(({
  isOpen,
  citizen,
  isAnonymous,
  onClose,
  onToggleAnonymous,
  onSignOut
}) => {
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
            <View style={styles.detailRow}>
              <Text style={styles.detailName}>{citizen.name}</Text>
              {citizen.isVerified && (
                <View style={styles.verifiedBadge}>
                  <ShieldCheck color={tokens.colors.status.success} size={12} />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>

            <View style={styles.infoRow}>
              <Mail color={tokens.colors.text.muted} size={14} />
              <Text style={styles.infoText}>{citizen.email}</Text>
            </View>

            {citizen.phone ? (
              <View style={styles.infoRow}>
                <Phone color={tokens.colors.text.muted} size={14} />
                <Text style={styles.infoText}>{citizen.phone}</Text>
              </View>
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
        </View>
      </View>
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
  }
});
