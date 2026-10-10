import React, { memo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  StatusBar
} from 'react-native';
import {
  ShieldCheck,
  MapPin,
  Video,
  EyeOff,
  Trash2,
  X,
  CheckCircle2,
  Scale
} from 'lucide-react-native';
import { tokens } from '../theme/tokens';

interface PrivacyPolicyModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = memo(({
  visible,
  onClose
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={tokens.colors.bg.base} />

        {/* Top Header Bar */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.badgeIcon}>
              <ShieldCheck color={tokens.colors.brand.gold} size={20} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Statutory Privacy Policy</Text>
              <Text style={styles.headerSubtitle}>Act 843 & Act 720 Compliance</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close Privacy Policy"
          >
            <X color={tokens.colors.text.secondary} size={20} />
          </TouchableOpacity>
        </View>

        {/* Scrollable Policy Body */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          {/* Certificate Banner */}
          <View style={styles.certBanner}>
            <Scale color={tokens.colors.brand.gold} size={16} />
            <Text style={styles.certText}>
              Republic of Ghana Data Protection Act, 2012 (Act 843) Certified Policy
            </Text>
          </View>

          {/* Intro Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>1. Purpose & Scope of Service</Text>
            <Text style={styles.bodyText}>
              CitizenAlert Ghana is an official civic defense and public safety platform operating under the laws of the Republic of Ghana. This policy explains how GPS telemetry, camera/audio evidence, and citizen profile credentials are protected, encrypted, and governed.
            </Text>
          </View>

          {/* GPS Telemetry Section */}
          <View style={styles.cardSection}>
            <View style={styles.cardHeader}>
              <MapPin color={tokens.colors.brand.gold} size={18} />
              <Text style={styles.cardTitle}>2. GPS & Location Telemetry</Text>
            </View>
            <Text style={styles.bodyText}>
              • <Text style={styles.boldText}>Foreground Only:</Text> High-precision GPS coordinates (Latitude, Longitude, and accuracy radius) are captured only when you actively take a photo/video or hold the SOS distress button.
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.boldText}>No Continuous Background Tracking:</Text> When the app is closed, background GPS tracking is automatically deactivated.
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.boldText}>Forensic Tamper-Proof Seal:</Text> Location data is watermarked with SHA-256 integrity digests under the Electronic Transactions Act (Act 772).
            </Text>
          </View>

          {/* Camera & Media Section */}
          <View style={styles.cardSection}>
            <View style={styles.cardHeader}>
              <Video color={tokens.colors.brand.sky} size={18} />
              <Text style={styles.cardTitle}>3. Camera, Audio & Evidence</Text>
            </View>
            <Text style={styles.bodyText}>
              • <Text style={styles.boldText}>45-Second Limit:</Text> Video evidence recording is constrained to a 45-second statutory ceiling to protect citizen privacy and minimize cellular transmission bandwidth.
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.boldText}>Client-Side Encryption:</Text> Media files are hashed on your device using raw-byte SHA-256 before upload.
            </Text>
            <Text style={styles.bodyText}>
              • <Text style={styles.boldText}>Whistleblower Sandboxing:</Text> Evidence files remain in secure app-sandboxed storage until verified by law enforcement.
            </Text>
          </View>

          {/* Whistleblower Protection Section */}
          <View style={styles.cardSection}>
            <View style={styles.cardHeader}>
              <EyeOff color={tokens.colors.brand.greenLight} size={18} />
              <Text style={styles.cardTitle}>4. Whistleblower Immunity (Act 720)</Text>
            </View>
            <Text style={styles.bodyText}>
              Under the Whistleblower Act, 2006 (Act 720), citizens reporting corruption, illegal mining (galamsey), or violent crimes are entitled to complete statutory protection:
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <CheckCircle2 color={tokens.colors.brand.greenLight} size={14} />
                <Text style={styles.bulletText}>Reporter names and phone numbers are completely stripped in Anonymous Mode.</Text>
              </View>
              <View style={styles.bulletItem}>
                <CheckCircle2 color={tokens.colors.brand.greenLight} size={14} />
                <Text style={styles.bulletText}>Device hardware identifiers and IP addresses are never transmitted to public feeds.</Text>
              </View>
            </View>
          </View>

          {/* Account Deletion & Right to Erasure */}
          <View style={styles.cardSection}>
            <View style={styles.cardHeader}>
              <Trash2 color={tokens.colors.status.danger} size={18} />
              <Text style={styles.cardTitle}>5. Account Deletion & Data Purge (Act 843)</Text>
            </View>
            <Text style={styles.bodyText}>
              You have the statutory right under Section 33 of Act 843 to delete your citizen account at any time via the Citizen Profile screen. Upon deletion:
            </Text>
            <Text style={styles.bodyText}>
              • All stored local credentials, pending drafts, and session tokens are immediately wiped.
            </Text>
            <Text style={styles.bodyText}>
              • Any past incident evidence already submitted remains fully anonymized under Whistleblower Act 720.
            </Text>
          </View>

          {/* Contact & Governance */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>6. National Governance & Contact</Text>
            <Text style={styles.bodyText}>
              Data Protection Commission (DPC) Registration: Republic of Ghana.{'\n'}
              Emergency Law Enforcement Partners: Ghana Police Service CID, DOVVSU, MTTD, EPA, NADMO.
            </Text>
          </View>

          {/* Bottom Close Button */}
          <TouchableOpacity
            onPress={onClose}
            style={styles.doneBtn}
            accessibilityRole="button"
            accessibilityLabel="Done"
          >
            <Text style={styles.doneBtnText}>✓ Understood & Accepted</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.bg.base
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border.subtle,
    backgroundColor: tokens.colors.bg.surface
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm
  },
  badgeIcon: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.md,
    backgroundColor: 'rgba(252, 209, 22, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(252, 209, 22, 0.3)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTitle: {
    fontSize: tokens.typography.fontSize.md,
    fontFamily: tokens.typography.fontFamily.sansBold,
    color: tokens.colors.text.primary
  },
  headerSubtitle: {
    fontSize: tokens.typography.fontSize.xs,
    fontFamily: tokens.typography.fontFamily.sansMedium,
    color: tokens.colors.text.secondary
  },
  closeBtn: {
    padding: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.surface.cardHover
  },
  scrollContent: {
    padding: tokens.spacing.md,
    paddingBottom: tokens.spacing.xxl,
    gap: tokens.spacing.md
  },
  certBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    padding: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    backgroundColor: 'rgba(252, 209, 22, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(252, 209, 22, 0.25)'
  },
  certText: {
    fontSize: tokens.typography.fontSize.xs,
    fontFamily: tokens.typography.fontFamily.sansBold,
    color: tokens.colors.brand.gold,
    flex: 1
  },
  section: {
    gap: tokens.spacing.xs
  },
  sectionHeading: {
    fontSize: tokens.typography.fontSize.sm,
    fontFamily: tokens.typography.fontFamily.sansBold,
    color: tokens.colors.text.primary
  },
  cardSection: {
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.bg.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border.subtle,
    gap: tokens.spacing.xs
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    marginBottom: tokens.spacing.xs
  },
  cardTitle: {
    fontSize: tokens.typography.fontSize.sm,
    fontFamily: tokens.typography.fontFamily.sansBold,
    color: tokens.colors.text.primary
  },
  bodyText: {
    fontSize: tokens.typography.fontSize.xs,
    fontFamily: tokens.typography.fontFamily.sansRegular,
    color: tokens.colors.text.secondary,
    lineHeight: 18
  },
  boldText: {
    fontFamily: tokens.typography.fontFamily.sansBold,
    color: tokens.colors.text.primary
  },
  bulletList: {
    gap: tokens.spacing.xs,
    marginTop: tokens.spacing.xs
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.spacing.xs
  },
  bulletText: {
    fontSize: tokens.typography.fontSize.xs,
    fontFamily: tokens.typography.fontFamily.sansRegular,
    color: tokens.colors.text.secondary,
    flex: 1,
    lineHeight: 17
  },
  doneBtn: {
    backgroundColor: tokens.colors.brand.gold,
    borderRadius: tokens.radius.lg,
    paddingVertical: tokens.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: tokens.spacing.sm
  },
  doneBtnText: {
    fontSize: tokens.typography.fontSize.sm,
    fontFamily: tokens.typography.fontFamily.sansBold,
    color: tokens.colors.text.inverse
  }
});
