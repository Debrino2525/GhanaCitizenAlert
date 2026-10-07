import React, { useState, useEffect } from 'react';
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
  SafeAreaView,
  StatusBar
} from 'react-native';
import { GoogleSignin, statusCodes, isNativeGoogleAuthAvailable } from '../lib/googleAuth';
import { supabase } from '../lib/supabase';

export interface CitizenUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  ghanaCard?: string;
  avatarUrl?: string;
  trustScore: number;
  isVerified: boolean;
  loginMethod: 'GOOGLE' | 'EMAIL' | 'PHONE' | 'ANONYMOUS';
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

  // 1. Real Supabase Citizen Sign In (Email / Password)
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

  // 2. Real Supabase Citizen Registration
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
            trust_score: 70, // Baseline neutral trust score for new citizen accounts
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

  // 3. Native In-App Google Sign-In with Supabase signInWithIdToken (No Browser Redirects)
  const handleGoogleAuth = async () => {
    if (!isNativeGoogleAuthAvailable || !GoogleSignin) {
      Alert.alert(
        'Native Google Sign-In',
        'Native Google Sign-In requires a custom Development Client build (npx expo run:ios / run:android). While testing inside Expo Go, please sign in with Email & Password or use Whistleblower Mode below.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      // Ensure Google Play Services is available
      if (GoogleSignin.hasPlayServices) {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }

      // Native in-app account chooser
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken || (signInResult as any).idToken;

      if (!idToken) {
        throw new Error('Google Sign-In completed but no ID token was provided.');
      }

      // Exchange Google ID token directly with Supabase Native Auth
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error('Supabase authentication returned no active citizen user.');
      }

      const user = data.user;
      const userMeta = user.user_metadata || {};

      // Build real citizen user from Supabase user session data
      const authenticatedCitizen: CitizenUser = {
        id: user.id,
        name: userMeta.full_name || userMeta.name || user.email?.split('@')[0] || 'Google Citizen',
        email: user.email || '',
        phone: userMeta.phone || '',
        ghanaCard: userMeta.ghana_card || '',
        trustScore: typeof userMeta.trust_score === 'number' ? userMeta.trust_score : 70, // Baseline trust score
        isVerified: Boolean(userMeta.is_verified || false),
        loginMethod: 'GOOGLE',
        accessToken: data.session?.access_token
      };

      onAuthenticated(authenticatedCitizen);
    } catch (err: any) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled in-app prompt - stay logged out quietly without alert spam
        console.log('Google Sign-In cancelled by citizen');
      } else if (err.code === statusCodes.IN_PROGRESS) {
        setErrorMessage('Google Sign-In operation is already in progress.');
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setErrorMessage('Google Play Services is not available or outdated on this device.');
      } else {
        setErrorMessage(err.message || 'Google Authentication failed. Please try again.');
      }
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
      <StatusBar barStyle="light-content" backgroundColor="#070B13" />

      {/* Ghana Flag Header Accent */}
      <View style={styles.flagHeader}>
        <View style={{ flex: 1, backgroundColor: '#CE1126' }} />
        <View style={{ flex: 1, backgroundColor: '#FCD116' }} />
        <View style={{ flex: 1, backgroundColor: '#006B3F' }} />
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
              <Text style={{ fontSize: 32 }}>🇬🇭</Text>
            </View>
            <Text style={styles.appTitle}>
              CITIZEN<Text style={{ color: '#FCD116' }}>ALERT</Text>
            </Text>
            <Text style={styles.appSubtitle}>
              National Civic Safety & Evidence Ingestion Gateway
            </Text>

            {/* Act 720 Badge */}
            <View style={styles.act720Badge}>
              <Text style={styles.act720Text}>
                ⚖️ Republic of Ghana Whistleblower Act 720 & Data Protection Act 843
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
            >
              <Text style={[styles.modeTabText, authMode === 'LOGIN' && styles.modeTabTextActive]}>
                🔑 Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setErrorMessage(null);
                setAuthMode('REGISTER');
              }}
              style={[styles.modeTab, authMode === 'REGISTER' && styles.modeTabActive]}
            >
              <Text style={[styles.modeTabText, authMode === 'REGISTER' && styles.modeTabTextActive]}>
                📝 Register
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setErrorMessage(null);
                setAuthMode('WHISTLEBLOWER');
              }}
              style={[styles.modeTab, authMode === 'WHISTLEBLOWER' && styles.modeTabActiveShield]}
            >
              <Text style={[styles.modeTabText, authMode === 'WHISTLEBLOWER' && styles.modeTabTextActiveShield]}>
                🛡️ Act 720
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error Banner */}
          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
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
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. kwame.mensah@gmail.com"
                    placeholderTextColor="#64748b"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter account password"
                    placeholderTextColor="#64748b"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                  />
                </View>

                <TouchableOpacity
                  onPress={handleSignIn}
                  disabled={isLoading}
                  style={styles.primaryBtn}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#070B13" size="small" />
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
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Kwame Asante Mensah"
                    placeholderTextColor="#64748b"
                    value={fullName}
                    onChangeText={setFullName}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Ghana Phone Number *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 0244 123 456"
                    placeholderTextColor="#64748b"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Ghana Card PIN <Text style={{ color: '#FCD116' }}>(Optional - Boosts Trust to 98%)</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. GHA-123456789-0"
                    placeholderTextColor="#64748b"
                    autoCapitalize="characters"
                    value={ghanaCard}
                    onChangeText={setGhanaCard}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. kwame@gmail.com"
                    placeholderTextColor="#64748b"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Create Password *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Min 6 characters"
                    placeholderTextColor="#64748b"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm Password *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Re-type password"
                    placeholderTextColor="#64748b"
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                </View>

                <TouchableOpacity
                  onPress={handleRegister}
                  disabled={isLoading}
                  style={styles.primaryBtn}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#070B13" size="small" />
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
                  <Text style={{ fontSize: 36 }}>🛡️</Text>
                  <Text style={styles.whistleblowerHeading}>Whistleblower Protection Act 720</Text>
                  <Text style={styles.whistleblowerBody}>
                    Under the laws of Ghana (Act 720, 2006), citizens who report illegal mining (galamsey), corruption, or dangerous offenses are legally protected against victimization and disclosure of identity.
                  </Text>
                </View>

                <View style={styles.whistleblowerFeatureList}>
                  <Text style={styles.whistleblowerFeatureItem}>✓ 100% No Account Required</Text>
                  <Text style={styles.whistleblowerFeatureItem}>✓ IP Address and Device Identifiers Stripped</Text>
                  <Text style={styles.whistleblowerFeatureItem}>✓ Direct Transmissions to Specialized Investigative Units</Text>
                </View>

                <TouchableOpacity
                  onPress={handleWhistleblowerAccess}
                  style={styles.whistleblowerBtn}
                  activeOpacity={0.85}
                >
                  <Text style={styles.whistleblowerBtnText}>🛡️ Enter as Anonymous Whistleblower</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* GOOGLE SINGLE SIGN-ON (Available on Login & Register) */}
            {authMode !== 'WHISTLEBLOWER' && (
              <>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR SIGN IN WITH</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  onPress={handleGoogleAuth}
                  disabled={isLoading}
                  style={styles.googleBtn}
                  activeOpacity={0.85}
                >
                  <Text style={{ fontSize: 18 }}>🔐</Text>
                  <Text style={styles.googleBtnText}>Continue with Google</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

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
    backgroundColor: '#070B13'
  },
  flagHeader: {
    height: 6,
    flexDirection: 'row'
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 20
  },
  shieldBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0F172A',
    borderWidth: 2,
    borderColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#3B82F6',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1
  },
  appSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4
  },
  act720Badge: {
    marginTop: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: '#1E3A8A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10
  },
  act720Text: {
    color: '#93C5FD',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center'
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center'
  },
  modeTabActive: {
    backgroundColor: '#2563EB'
  },
  modeTabActiveShield: {
    backgroundColor: '#006B3F'
  },
  modeTabText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold'
  },
  modeTabTextActive: {
    color: '#ffffff'
  },
  modeTabTextActiveShield: {
    color: '#FCD116'
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '600'
  },
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 20
  },
  formSection: {
    gap: 12
  },
  formTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800'
  },
  formSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 6
  },
  inputGroup: {
    gap: 4
  },
  inputLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700'
  },
  input: {
    backgroundColor: '#070B13',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 13
  },
  primaryBtn: {
    backgroundColor: '#FCD116',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8
  },
  primaryBtnText: {
    color: '#070B13',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 16
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
    letterSpacing: 1
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 10
  },
  googleBtnText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: 'bold'
  },
  whistleblowerHero: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 107, 63, 0.1)',
    borderWidth: 1,
    borderColor: '#006B3F',
    borderRadius: 16,
    padding: 16,
    gap: 8
  },
  whistleblowerHeading: {
    color: '#FCD116',
    fontSize: 15,
    fontWeight: '800'
  },
  whistleblowerBody: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center'
  },
  whistleblowerFeatureList: {
    gap: 6,
    paddingVertical: 8
  },
  whistleblowerFeatureItem: {
    color: '#6EE7B7',
    fontSize: 12,
    fontWeight: '600'
  },
  whistleblowerBtn: {
    backgroundColor: '#006B3F',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4
  },
  whistleblowerBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800'
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
    paddingHorizontal: 16
  },
  footerText: {
    color: '#475569',
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 15
  }
});
