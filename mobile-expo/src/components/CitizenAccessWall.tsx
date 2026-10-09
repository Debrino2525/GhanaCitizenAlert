import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import {
  Shield,
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  User,
  Phone,
  CreditCard,
  Scale,
  CheckCircle2,
  AlertCircle,
  LogIn,
  UserPlus
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { tokens } from '../theme/tokens';

WebBrowser.maybeCompleteAuthSession();

export interface CitizenUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  ghanaCard?: string;
  avatarUrl?: string;
  trustScore: number;
  isVerified: boolean;
  loginMethod: 'GOOGLE' | 'APPLE' | 'EMAIL' | 'PHONE' | 'ANONYMOUS';
  accessToken?: string;
}

interface CitizenAccessWallProps {
  onAuthenticated: (citizen: CitizenUser) => void;
}

export const CitizenAccessWall: React.FC<CitizenAccessWallProps> = ({ onAuthenticated }) => {
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER' | 'WHISTLEBLOWER'>('LOGIN');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [ghanaCard, setGhanaCard] = useState('');

  // 1. Supabase Citizen Sign In (Email / Password)
  const handleSignIn = async () => {
    setErrorMessage(null);
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error('Authentication succeeded but no citizen user was returned.');
      }

      const user = data.user;
      const userMeta = user.user_metadata || {};
      const authenticatedCitizen: CitizenUser = {
        id: user.id,
        name: userMeta.full_name || userMeta.name || user.email?.split('@')[0] || 'Ghana Citizen',
        email: user.email || email.trim().toLowerCase(),
        phone: userMeta.phone || '',
        ghanaCard: userMeta.ghana_card || '',
        trustScore: typeof userMeta.trust_score === 'number' ? userMeta.trust_score : 70,
        isVerified: Boolean(userMeta.is_verified || false),
        loginMethod: 'EMAIL',
        accessToken: data.session?.access_token
      };

      onAuthenticated(authenticatedCitizen);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Supabase Citizen Registration
  const handleRegister = async () => {
    setErrorMessage(null);
    if (!fullName.trim() || !phone.trim() || !email.trim() || !password) {
      setErrorMessage('Please fill in your Full Name, Phone Number, Email, and Password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            ghana_card: ghanaCard.trim().toUpperCase(),
            trust_score: 70,
            is_verified: false,
            role: 'citizen'
          }
        }
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error('Registration failed.');
      }

      const user = data.user;
      const userMeta = user.user_metadata || {};
      const registeredCitizen: CitizenUser = {
        id: user.id,
        name: fullName.trim(),
        email: user.email || email.trim().toLowerCase(),
        phone: phone.trim(),
        ghanaCard: ghanaCard.trim().toUpperCase(),
        trustScore: 70,
        isVerified: false,
        loginMethod: 'EMAIL',
        accessToken: data.session?.access_token
      };

      Alert.alert(
        '🇬🇭 Citizen Account Provisioned',
        `Account provisioned for ${fullName.trim()}. Please verify your email if required.`
      );
      onAuthenticated(registeredCitizen);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration error occurred. Please check details.');
    } finally {
      setIsLoading(false);
    }
  };

  const buildAndSetCitizenUser = (user: any, accessToken?: string, provider: 'GOOGLE' | 'APPLE' = 'GOOGLE') => {
    const userMeta = user.user_metadata || {};
    const defaultName = provider === 'APPLE' ? 'Apple Citizen' : 'Google Citizen';
    const authenticatedCitizen: CitizenUser = {
      id: user.id,
      name: userMeta.full_name || userMeta.name || user.email?.split('@')[0] || defaultName,
      email: user.email || '',
      phone: userMeta.phone || '',
      ghanaCard: userMeta.ghana_card || '',
      trustScore: typeof userMeta.trust_score === 'number' ? userMeta.trust_score : 70,
      isVerified: Boolean(userMeta.is_verified || false),
      loginMethod: provider,
      accessToken: accessToken
    };
    onAuthenticated(authenticatedCitizen);
  };

  // 3. In-App Single Sign-On (Google & Apple) with Supabase OAuth & WebBrowser
  const handleOAuth = async (provider: 'google' | 'apple') => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'citizenalert',
        path: 'auth/callback'
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true
        }
      });

      if (error) throw error;
      if (!data?.url) throw new Error(`No authentication URL was returned by ${provider === 'apple' ? 'Apple' : 'Google'}.`);

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (result.type === 'success' && result.url) {
        const parsedUrl = Linking.parse(result.url);

        if (parsedUrl.queryParams?.code) {
          const { data: sessionData, error: sessionErr } = await supabase.auth.exchangeCodeForSession(
            parsedUrl.queryParams.code as string
          );
          if (sessionErr) throw sessionErr;
          if (sessionData?.user) {
            buildAndSetCitizenUser(sessionData.user, sessionData.session?.access_token, provider === 'apple' ? 'APPLE' : 'GOOGLE');
            return;
          }
        }

        let accessToken = (parsedUrl.queryParams?.access_token as string) || '';
        let refreshToken = (parsedUrl.queryParams?.refresh_token as string) || '';

        if (!accessToken && result.url.includes('#')) {
          const hashPart = result.url.split('#')[1];
          const hashParams = new URLSearchParams(hashPart);
          accessToken = hashParams.get('access_token') || '';
          refreshToken = hashParams.get('refresh_token') || '';
        }

        if (accessToken && refreshToken) {
          const { data: sessionData, error: setSessionErr } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          if (setSessionErr) throw setSessionErr;
          if (sessionData?.user) {
            buildAndSetCitizenUser(sessionData.user, accessToken, provider === 'apple' ? 'APPLE' : 'GOOGLE');
            return;
          }
        }

        const { data: activeSession } = await supabase.auth.getSession();
        if (activeSession?.session?.user) {
          buildAndSetCitizenUser(activeSession.session.user, activeSession.session.access_token, provider === 'apple' ? 'APPLE' : 'GOOGLE');
          return;
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || `${provider === 'apple' ? 'Apple' : 'Google'} Sign-In encountered an error. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Whistleblower Mode (Act 720)
  const handleWhistleblowerAccess = () => {
    const anonCitizen: CitizenUser = {
      id: `anon-whistleblower-${Date.now()}`,
      name: 'Anonymous Whistleblower',
      email: 'whistleblower@act720.gh',
      trustScore: 85,
      isVerified: false,
      loginMethod: 'ANONYMOUS'
    };

    Alert.alert(
      '🛡️ Whistleblower Immunity Activated',
      'You are entering under the Whistleblower Act, 2006 (Act 720). Your device identity and personal data will not be linked to any incident transmissions.',
      [
        {
          text: 'Proceed to Vault',
          onPress: () => onAuthenticated(anonCitizen)
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={tokens.colors.bg.base} />

      {/* Ghana Flag Header Accent */}
      <View style={styles.flagHeader}>
        <View style={{ flex: 1, backgroundColor: tokens.colors.brand.red }} />
        <View style={{ flex: 1, backgroundColor: tokens.colors.brand.gold }} />
        <View style={{ flex: 1, backgroundColor: tokens.colors.brand.green }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header & National Security Badge */}
          <View style={styles.headerSection}>
            <View style={styles.shieldBadge}>
              <ShieldCheck color={tokens.colors.brand.gold} size={32} />
            </View>
            <Text style={styles.appTitle}>
              CITIZEN<Text style={{ color: tokens.colors.brand.gold }}>ALERT</Text>
            </Text>
            <Text style={styles.appSubtitle}>
              National Civic Safety & Evidence Ingestion Gateway
            </Text>

            {/* Act 720 Badge */}
            <View style={styles.act720Badge}>
              <Scale color={tokens.colors.police.badge} size={14} />
              <Text style={styles.act720Text}>
                Republic of Ghana Whistleblower Act 720 & Data Protection Act 843
              </Text>
            </View>
          </View>

          {/* Mode Switcher Tabs */}
          <View style={styles.modeTabs}>
            <TouchableOpacity
              onPress={() => {
                setErrorMessage(null);
                setAuthMode('LOGIN');
              }}
              style={[styles.modeTab, authMode === 'LOGIN' && styles.modeTabActive]}
              accessibilityRole="tab"
              accessibilityLabel="Sign in mode"
            >
              <LogIn color={authMode === 'LOGIN' ? tokens.colors.text.white : tokens.colors.text.secondary} size={16} />
              <Text style={[styles.modeTabText, authMode === 'LOGIN' && styles.modeTabTextActive]}>
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setErrorMessage(null);
                setAuthMode('REGISTER');
              }}
              style={[styles.modeTab, authMode === 'REGISTER' && styles.modeTabActive]}
              accessibilityRole="tab"
              accessibilityLabel="Register citizen profile mode"
            >
              <UserPlus color={authMode === 'REGISTER' ? tokens.colors.text.white : tokens.colors.text.secondary} size={16} />
              <Text style={[styles.modeTabText, authMode === 'REGISTER' && styles.modeTabTextActive]}>
                Register
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setErrorMessage(null);
                setAuthMode('WHISTLEBLOWER');
              }}
              style={[styles.modeTab, authMode === 'WHISTLEBLOWER' && styles.modeTabActiveShield]}
              accessibilityRole="tab"
              accessibilityLabel="Whistleblower Act 720 mode"
            >
              <Shield color={authMode === 'WHISTLEBLOWER' ? tokens.colors.brand.gold : tokens.colors.text.secondary} size={16} />
              <Text style={[styles.modeTabText, authMode === 'WHISTLEBLOWER' && styles.modeTabTextActiveShield]}>
                Act 720
              </Text>
            </TouchableOpacity>
          </View>

          {/* Inline Error Banner */}
          {errorMessage && (
            <View style={styles.errorBox}>
              <AlertCircle color={tokens.colors.status.danger} size={18} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* CARD CONTAINER */}
          <View style={styles.card}>
            {/* TAB 1: SIGN IN */}
            {authMode === 'LOGIN' && (
              <View style={styles.formSection}>
                <Text style={styles.formTitle}>Citizen Vault Sign In</Text>
                <Text style={styles.formSubtitle}>
                  Enter your registered citizen credentials to access live incident dispatch & panic systems.
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={styles.inputWrapper}>
                    <Mail color={tokens.colors.text.muted} size={18} style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputWithIcon}
                      placeholder="e.g. kwame.mensah@gmail.com"
                      placeholderTextColor={tokens.colors.text.muted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.inputWrapper}>
                    <KeyRound color={tokens.colors.text.muted} size={18} style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputWithIcon}
                      placeholder="Enter account password"
                      placeholderTextColor={tokens.colors.text.muted}
                      secureTextEntry
                      value={password}
                      onChangeText={setPassword}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleSignIn}
                  disabled={isLoading}
                  style={styles.primaryBtn}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Sign In to Citizen Vault"
                >
                  {isLoading ? (
                    <ActivityIndicator color={tokens.colors.bg.base} size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Sign In to Citizen Vault</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* TAB 2: REGISTER */}
            {authMode === 'REGISTER' && (
              <View style={styles.formSection}>
                <Text style={styles.formTitle}>Register Verified Citizen Identity</Text>
                <Text style={styles.formSubtitle}>
                  Create your civic profile to gain high-priority investigation trust scores with law enforcement agencies.
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Legal Name *</Text>
                  <View style={styles.inputWrapper}>
                    <User color={tokens.colors.text.muted} size={18} style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputWithIcon}
                      placeholder="e.g. Kwame Asante Mensah"
                      placeholderTextColor={tokens.colors.text.muted}
                      value={fullName}
                      onChangeText={setFullName}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Ghana Phone Number *</Text>
                  <View style={styles.inputWrapper}>
                    <Phone color={tokens.colors.text.muted} size={18} style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputWithIcon}
                      placeholder="e.g. 0244 123 456"
                      placeholderTextColor={tokens.colors.text.muted}
                      keyboardType="phone-pad"
                      value={phone}
                      onChangeText={setPhone}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Ghana Card PIN <Text style={{ color: tokens.colors.brand.gold }}>(Optional - Boosts Trust to 98%)</Text>
                  </Text>
                  <View style={styles.inputWrapper}>
                    <CreditCard color={tokens.colors.text.muted} size={18} style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputWithIcon}
                      placeholder="e.g. GHA-123456789-0"
                      placeholderTextColor={tokens.colors.text.muted}
                      autoCapitalize="characters"
                      value={ghanaCard}
                      onChangeText={setGhanaCard}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address *</Text>
                  <View style={styles.inputWrapper}>
                    <Mail color={tokens.colors.text.muted} size={18} style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputWithIcon}
                      placeholder="e.g. kwame@gmail.com"
                      placeholderTextColor={tokens.colors.text.muted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Create Password *</Text>
                  <View style={styles.inputWrapper}>
                    <Lock color={tokens.colors.text.muted} size={18} style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputWithIcon}
                      placeholder="Min 6 characters"
                      placeholderTextColor={tokens.colors.text.muted}
                      secureTextEntry
                      value={password}
                      onChangeText={setPassword}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm Password *</Text>
                  <View style={styles.inputWrapper}>
                    <Lock color={tokens.colors.text.muted} size={18} style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputWithIcon}
                      placeholder="Re-type password"
                      placeholderTextColor={tokens.colors.text.muted}
                      secureTextEntry
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleRegister}
                  disabled={isLoading}
                  style={styles.primaryBtn}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Create Verified Citizen Account"
                >
                  {isLoading ? (
                    <ActivityIndicator color={tokens.colors.bg.base} size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Create Verified Citizen Account</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* TAB 3: WHISTLEBLOWER */}
            {authMode === 'WHISTLEBLOWER' && (
              <View style={styles.formSection}>
                <View style={styles.whistleblowerHero}>
                  <Shield color={tokens.colors.brand.gold} size={40} />
                  <Text style={styles.whistleblowerHeading}>Whistleblower Protection Act 720</Text>
                  <Text style={styles.whistleblowerBody}>
                    Under the laws of Ghana (Act 720, 2006), citizens who report illegal mining (galamsey), corruption, or dangerous offenses are legally protected against victimization and disclosure of identity.
                  </Text>
                </View>

                <View style={styles.whistleblowerFeatureList}>
                  <View style={styles.whistleblowerFeatureItem}>
                    <CheckCircle2 color={tokens.colors.brand.greenLight} size={16} />
                    <Text style={styles.whistleblowerFeatureText}>100% No Account or Registration Required</Text>
                  </View>
                  <View style={styles.whistleblowerFeatureItem}>
                    <CheckCircle2 color={tokens.colors.brand.greenLight} size={16} />
                    <Text style={styles.whistleblowerFeatureText}>IP Address and Device Identifiers Stripped</Text>
                  </View>
                  <View style={styles.whistleblowerFeatureItem}>
                    <CheckCircle2 color={tokens.colors.brand.greenLight} size={16} />
                    <Text style={styles.whistleblowerFeatureText}>Direct Transmissions to Specialized Investigative Units</Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleWhistleblowerAccess}
                  style={styles.whistleblowerBtn}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Enter as Anonymous Whistleblower under Act 720"
                >
                  <ShieldCheck color={tokens.colors.brand.gold} size={18} />
                  <Text style={styles.whistleblowerBtnText}>Enter as Anonymous Whistleblower</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* SSO SIGN-ON: APPLE & GOOGLE */}
            {authMode !== 'WHISTLEBLOWER' && (
              <>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.ssoBtnGroup}>
                  {/* Apple Sign-In (Required by Apple Review Guideline 4.8) */}
                  <TouchableOpacity
                    onPress={() => handleOAuth('apple')}
                    disabled={isLoading}
                    style={styles.appleBtn}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Continue with Apple"
                  >
                    <ShieldCheck color={tokens.colors.text.white} size={18} />
                    <Text style={styles.appleBtnText}>Continue with Apple</Text>
                  </TouchableOpacity>

                  {/* Google Sign-In */}
                  <TouchableOpacity
                    onPress={() => handleOAuth('google')}
                    disabled={isLoading}
                    style={styles.googleBtn}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Continue with Google"
                  >
                    <ShieldCheck color={tokens.colors.police.accent} size={18} />
                    <Text style={styles.googleBtnText}>Continue with Google</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* Privacy Policy & Statutory Compliance Link */}
          <TouchableOpacity
            onPress={() => {
              Linking.openURL('https://ghanacitizenalert.globitechcybersolutions.com/privacy').catch(() => {
                Alert.alert(
                  'Privacy Policy',
                  'Please visit https://ghanacitizenalert.globitechcybersolutions.com/privacy to read the Ghana Data Protection Act (Act 843) policy.'
                );
              });
            }}
            style={styles.privacyLinkWrapper}
            accessibilityRole="link"
            accessibilityLabel="Statutory Privacy Policy"
          >
            <Text style={styles.privacyLinkText}>
              Statutory Privacy & Telemetry Policy (Act 843 & Act 720)
            </Text>
          </TouchableOpacity>

          {/* Footer Security Note */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              🇬🇭 Ghana CitizenAlert • Official Civic Defense Network • 24/7 Police CID & Emergency Dispatch
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.bg.base
  },
  flagHeader: {
    height: 4,
    flexDirection: 'row'
  },
  scrollContainer: {
    padding: tokens.spacing.lg,
    paddingBottom: tokens.spacing.xxxl
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: tokens.spacing.lg
  },
  shieldBadge: {
    width: 64,
    height: 64,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.colors.bg.surface,
    borderWidth: 2,
    borderColor: tokens.colors.border.police,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.sm,
    ...tokens.elevation.medium
  },
  appTitle: {
    fontSize: tokens.typography.fontSize.xxl,
    fontWeight: '900',
    color: tokens.colors.text.white,
    letterSpacing: 1
  },
  appSubtitle: {
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.text.secondary,
    textAlign: 'center',
    marginTop: tokens.spacing.xxs
  },
  act720Badge: {
    marginTop: tokens.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: tokens.colors.police.dark,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.md
  },
  act720Text: {
    color: tokens.colors.police.badge,
    fontSize: tokens.typography.fontSize.xxs,
    fontWeight: '700',
    textAlign: 'center'
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: tokens.colors.surface.card,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.xxs,
    borderWidth: 1,
    borderColor: tokens.colors.border.subtle,
    marginBottom: tokens.spacing.md
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.xs,
    minHeight: tokens.touchTarget.minHeight,
    borderRadius: tokens.radius.md
  },
  modeTabActive: {
    backgroundColor: tokens.colors.police.primary
  },
  modeTabActiveShield: {
    backgroundColor: tokens.colors.brand.green
  },
  modeTabText: {
    color: tokens.colors.text.secondary,
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: '700'
  },
  modeTabTextActive: {
    color: tokens.colors.text.white
  },
  modeTabTextActiveShield: {
    color: tokens.colors.brand.gold
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: tokens.colors.status.danger,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    marginBottom: tokens.spacing.md
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: '600',
    flex: 1
  },
  card: {
    backgroundColor: tokens.colors.surface.card,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.border.subtle,
    padding: tokens.spacing.lg
  },
  formSection: {
    gap: tokens.spacing.md
  },
  formTitle: {
    color: tokens.colors.text.white,
    fontSize: tokens.typography.fontSize.lg,
    fontWeight: '800'
  },
  formSubtitle: {
    color: tokens.colors.text.secondary,
    fontSize: tokens.typography.fontSize.xs,
    lineHeight: tokens.typography.lineHeight.xs,
    marginBottom: tokens.spacing.xxs
  },
  inputGroup: {
    gap: tokens.spacing.xs
  },
  inputLabel: {
    color: tokens.colors.text.primary,
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: '700'
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.surface.input,
    borderWidth: 1,
    borderColor: tokens.colors.border.medium,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.md
  },
  inputIcon: {
    marginRight: tokens.spacing.sm
  },
  inputWithIcon: {
    flex: 1,
    minHeight: tokens.touchTarget.minHeight,
    color: tokens.colors.text.white,
    fontSize: tokens.typography.fontSize.md
  },
  primaryBtn: {
    backgroundColor: tokens.colors.brand.gold,
    minHeight: tokens.touchTarget.minHeight,
    borderRadius: tokens.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: tokens.spacing.xs
  },
  primaryBtnText: {
    color: tokens.colors.bg.base,
    fontSize: tokens.typography.fontSize.md,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
    marginVertical: tokens.spacing.lg
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
    letterSpacing: 1
  },
  ssoBtnGroup: {
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.xs
  },
  appleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: tokens.colors.border.subtle,
    minHeight: tokens.touchTarget.minHeight,
    borderRadius: tokens.radius.lg,
    gap: tokens.spacing.sm
  },
  appleBtnText: {
    color: tokens.colors.text.white,
    fontSize: tokens.typography.fontSize.md,
    fontWeight: '700'
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colors.text.white,
    minHeight: tokens.touchTarget.minHeight,
    borderRadius: tokens.radius.lg,
    gap: tokens.spacing.sm
  },
  googleBtnText: {
    color: tokens.colors.bg.surface,
    fontSize: tokens.typography.fontSize.md,
    fontWeight: '700'
  },
  whistleblowerHero: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 107, 63, 0.12)',
    borderWidth: 1,
    borderColor: tokens.colors.brand.green,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    gap: tokens.spacing.sm
  },
  whistleblowerHeading: {
    color: tokens.colors.brand.gold,
    fontSize: tokens.typography.fontSize.lg,
    fontWeight: '800'
  },
  whistleblowerBody: {
    color: tokens.colors.text.primary,
    fontSize: tokens.typography.fontSize.xs,
    lineHeight: tokens.typography.lineHeight.sm,
    textAlign: 'center'
  },
  whistleblowerFeatureList: {
    gap: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs
  },
  whistleblowerFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm
  },
  whistleblowerFeatureText: {
    color: tokens.colors.brand.greenLight,
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: '600'
  },
  whistleblowerBtn: {
    flexDirection: 'row',
    backgroundColor: tokens.colors.brand.green,
    minHeight: tokens.touchTarget.minHeight,
    borderRadius: tokens.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.xs
  },
  whistleblowerBtnText: {
    color: tokens.colors.text.white,
    fontSize: tokens.typography.fontSize.md,
    fontWeight: '800'
  },
  privacyLinkWrapper: {
    marginTop: tokens.spacing.lg,
    alignItems: 'center',
    paddingVertical: tokens.spacing.xs
  },
  privacyLinkText: {
    color: tokens.colors.brand.gold,
    fontSize: tokens.typography.fontSize.xxs,
    fontWeight: '600',
    textDecorationLine: 'underline',
    textAlign: 'center'
  },
  footer: {
    marginTop: tokens.spacing.xl,
    alignItems: 'center'
  },
  footerText: {
    color: tokens.colors.text.muted,
    fontSize: tokens.typography.fontSize.xxs,
    textAlign: 'center',
    lineHeight: tokens.typography.lineHeight.xxs
  }
});
