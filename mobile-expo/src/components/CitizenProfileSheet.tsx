import React, { memo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, Alert } from 'react-native';
import { CitizenUser } from './CitizenAccessWall';
import { supabase } from '../lib/supabase';
import { GoogleSignin } from '../lib/googleAuth';

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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 24 }}>🇬🇭</Text>
              <View>
                <Text style={styles.modalTitle}>Citizen Profile & Trust Vault</Text>
                <Text style={styles.modalSubtitle}>Active Verified Citizen Session</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Text style={{ color: '#94a3b8', fontSize: 14, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Profile Overview Card */}
          <View style={styles.profileOverview}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '800' }}>
                {citizen.name}
              </Text>
              <View style={{ backgroundColor: '#10B981', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                <Text style={{ color: '#070B13', fontSize: 10, fontWeight: '900' }}>
                  {citizen.trustScore}/100 TRUST
                </Text>
              </View>
            </View>

            <Text style={{ color: '#94a3b8', fontSize: 12 }}>
              📧 {citizen.email}
            </Text>

            {citizen.phone ? (
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                📞 {citizen.phone}
              </Text>
            ) : null}

            {citizen.ghanaCard ? (
              <Text style={{ color: '#FCD116', fontSize: 11, fontWeight: 'bold' }}>
                🇬🇭 Ghana Card: {citizen.ghanaCard} (Verified)
              </Text>
            ) : null}

            <Text style={{ color: '#64748b', fontSize: 10, marginTop: 4 }}>
              Auth Provider: {citizen.loginMethod} • Act 720 Whistleblower Protected
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
            style={{
              backgroundColor: isAnonymous ? '#006B3F' : '#1E293B',
              borderWidth: 1,
              borderColor: isAnonymous ? '#10B981' : '#334155',
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: 'center',
              marginTop: 4
            }}
          >
            <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: 'bold' }}>
              {isAnonymous ? '🛡️ Anonymous Whistleblower: ACTIVE' : '🛡️ Enable Anonymous Whistleblower Mode'}
            </Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>SESSION ACTIONS</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Sign Out & Lock App */}
          <TouchableOpacity
            onPress={handleSignOutPress}
            style={{
              backgroundColor: '#DC2626',
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: 'center'
            }}
          >
            <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: 'bold' }}>
              🔒 Sign Out & Lock App
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0F172A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 20,
    gap: 12
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800'
  },
  modalSubtitle: {
    color: '#94a3b8',
    fontSize: 11
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B'
  },
  profileOverview: {
    backgroundColor: '#070B13',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 6
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#334155'
  },
  dividerText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5
  }
});
