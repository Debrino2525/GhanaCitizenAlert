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
  StatusBar,
  Keyboard,
  TouchableWithoutFeedback,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  UserPlus,
  X,
  ArrowLeft,
  Check
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { GoogleSignin, statusCodes, isNativeGoogleAuthAvailable, ensureGoogleSigninConfigured } from '../lib/googleAuth';
import { tokens } from '../theme/tokens';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';

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
  emergencyTelecomConsent?: boolean;
  emergencyConsentAt?: string;
}

interface CitizenAccessWallProps {
  onAuthenticated: (citizen: CitizenUser) => void;
}

export const CitizenAccessWall: React.FC<CitizenAccessWallProps> = ({ onAuthenticated }) => {
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER' | 'WHISTLEBLOWER'>('LOGIN');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [ghanaCard, setGhanaCard] = useState('');
  const [emergencyTelecomConsent, setEmergencyTelecomConsent] = useState(true);

  // Forgot Password & In-App OTP Reset states
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  const [resetStep, setResetStep] = useState<'REQUEST' | 'VERIFY'>('REQUEST');
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtpCode, setResetOtpCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [resetErrorMessage, setResetErrorMessage] = useState<string | null>(null);

  const [isSetNewPasswordModalOpen, setIsSetNewPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [newPasswordError, setNewPasswordError] = useState<string | null>(null);

  // Listen for Supabase password recovery triggers & deep links
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsSetNewPasswordModalOpen(true);
      }
    });

    const handleUrl = (event: { url: string }) => {
      if (event.url.includes('type=recovery') || event.url.includes('reset-password')) {
        setIsSetNewPasswordModalOpen(true);
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url && (url.includes('type=recovery') || url.includes('reset-password'))) {
        setIsSetNewPasswordModalOpen(true);
      }
    });

    const sub = Linking.addEventListener('url', handleUrl);

    return () => {
      authListener?.subscription?.unsubscribe();
      sub.remove();
    };
  }, []);

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
      const normalizedEmail = (user.email || email).trim().toLowerCase();
      let effectivePhone = userMeta.phone || '';

      // Cross-provider phone persistence
      if (!effectivePhone && normalizedEmail) {
        const cachedPhone = await AsyncStorage.getItem(`@citizen_phone_${normalizedEmail}`).catch(() => null);
        if (cachedPhone) effectivePhone = cachedPhone;
      } else if (effectivePhone && normalizedEmail) {
        await AsyncStorage.setItem(`@citizen_phone_${normalizedEmail}`, effectivePhone).catch(() => {});
      }

      const savedAvatar = await AsyncStorage.getItem(`@citizen_avatar_${user.id}`).catch(() => null);
      const authenticatedCitizen: CitizenUser = {
        id: user.id,
        name: userMeta.full_name || userMeta.name || user.email?.split('@')[0] || 'Ghana Citizen',
        email: user.email || email.trim().toLowerCase(),
        phone: effectivePhone,
        ghanaCard: userMeta.ghana_card || '',
        avatarUrl: savedAvatar || userMeta.avatar_url || userMeta.avatarUrl || userMeta.picture || userMeta.photo || undefined,
        trustScore: typeof userMeta.trust_score === 'number' ? userMeta.trust_score : 70,
        isVerified: Boolean(userMeta.is_verified || false),
        loginMethod: 'EMAIL',
        accessToken: data.session?.access_token,
        emergencyTelecomConsent: userMeta.emergency_telecom_consent !== undefined ? Boolean(userMeta.emergency_telecom_consent) : Boolean(effectivePhone),
        emergencyConsentAt: userMeta.emergency_consent_at || undefined
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
            role: 'citizen',
            emergency_telecom_consent: emergencyTelecomConsent,
            emergency_consent_at: new Date().toISOString(),
            emergency_consent_act: 'DATA_PROTECTION_ACT_843_SEC_20'
          }
        }
      });

      if (error) {
        if (error.message?.includes('Signups not allowed') || (error as any).code === 'signup_disabled') {
          throw new Error('New citizen registrations are disabled on this Supabase project ("signup_disabled"). In your Supabase Dashboard, go to Authentication -> Providers -> Email and turn on "Allow new users to sign up".');
        }
        throw error;
      }

      if (!data.user) {
        throw new Error('Registration failed.');
      }

      // Cache phone locally by email for cross-provider Google/Apple sign-in restoration
      if (email.trim() && phone.trim()) {
        await AsyncStorage.setItem(`@citizen_phone_${email.trim().toLowerCase()}`, phone.trim()).catch(() => {});
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
        accessToken: data.session?.access_token,
        emergencyTelecomConsent: emergencyTelecomConsent,
        emergencyConsentAt: new Date().toISOString()
      };

      Alert.alert(
        '🇬🇭 Citizen Account Provisioned',
        `Account provisioned for ${fullName.trim()}. Your phone number is registered for life-saving emergency dispatch under Act 843.`
      );
      onAuthenticated(registeredCitizen);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration error occurred. Please check details.');
    } finally {
      setIsLoading(false);
    }
  };

  const buildAndSetCitizenUser = async (user: any, accessToken?: string, provider: 'GOOGLE' | 'APPLE' | 'EMAIL' = 'GOOGLE') => {
    const userMeta = user.user_metadata || {};
    const defaultName = provider === 'APPLE' ? 'Apple Citizen' : provider === 'EMAIL' ? 'Ghana Citizen' : 'Google Citizen';
    const normalizedEmail = (user.email || '').trim().toLowerCase();
    const savedAvatar = await AsyncStorage.getItem(`@citizen_avatar_${user.id}`).catch(() => null);

    // Cross-provider phone synchronization (e.g. registered with email, now logging in with Google)
    let effectivePhone = userMeta.phone || '';
    if (!effectivePhone && normalizedEmail) {
      const cachedPhone = await AsyncStorage.getItem(`@citizen_phone_${normalizedEmail}`).catch(() => null);
      if (cachedPhone) {
        effectivePhone = cachedPhone;
        // Sync to Supabase user metadata for this OAuth identity
        await supabase.auth.updateUser({
          data: {
            phone: cachedPhone,
            emergency_telecom_consent: true,
            emergency_consent_at: new Date().toISOString(),
            emergency_consent_act: 'DATA_PROTECTION_ACT_843_SEC_20'
          }
        }).catch(() => {});
      }
    } else if (effectivePhone && normalizedEmail) {
      await AsyncStorage.setItem(`@citizen_phone_${normalizedEmail}`, effectivePhone).catch(() => {});
    }

    const authenticatedCitizen: CitizenUser = {
      id: user.id,
      name: userMeta.full_name || userMeta.name || user.email?.split('@')[0] || defaultName,
      email: user.email || '',
      phone: effectivePhone,
      ghanaCard: userMeta.ghana_card || '',
      avatarUrl: savedAvatar || userMeta.avatar_url || userMeta.avatarUrl || userMeta.picture || userMeta.photo || undefined,
      trustScore: typeof userMeta.trust_score === 'number' ? userMeta.trust_score : 70,
      isVerified: Boolean(userMeta.is_verified || false),
      loginMethod: provider,
      accessToken: accessToken,
      emergencyTelecomConsent: userMeta.emergency_telecom_consent !== undefined ? Boolean(userMeta.emergency_telecom_consent) : Boolean(effectivePhone),
      emergencyConsentAt: userMeta.emergency_consent_at || undefined
    };
    onAuthenticated(authenticatedCitizen);
  };

  // Password Reset Dispatch Handler (Sends 6-digit recovery code)
  const handleRequestPasswordReset = async () => {
    if (!resetEmail.trim()) {
      setResetErrorMessage('Please enter your registered citizen email address.');
      return;
    }

    setIsSendingReset(true);
    setResetErrorMessage(null);
    setResetSuccessMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim().toLowerCase());

      if (error) throw error;

      setResetSuccessMessage('Recovery code dispatched! Please check your email inbox.');
      setResetStep('VERIFY');
    } catch (err: any) {
      setResetErrorMessage(err.message || 'Failed to dispatch recovery code. Please verify the email address.');
    } finally {
      setIsSendingReset(false);
    }
  };

  // In-App OTP Verification & Password Reset Handler
  const handleVerifyOtpAndSavePassword = async () => {
    setResetErrorMessage(null);

    const token = resetOtpCode.trim();
    if (!token) {
      setResetErrorMessage('Please enter the 6-digit recovery code from your email.');
      return;
    }

    if (!resetNewPassword || resetNewPassword.length < 6) {
      setResetErrorMessage('New password must be at least 6 characters long.');
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setResetErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setIsResettingPassword(true);
    try {
      let verifyData: any;
      let verifyError: any;

      // Handle token hash (if user pasted the long token from link) or standard 6-digit code
      if (token.length > 10) {
        const res = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'recovery'
        });
        verifyData = res.data;
        verifyError = res.error;
      } else {
        const res = await supabase.auth.verifyOtp({
          email: resetEmail.trim().toLowerCase(),
          token: token,
          type: 'recovery'
        });
        verifyData = res.data;
        verifyError = res.error;
      }

      if (verifyError) {
        throw verifyError;
      }

      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password: resetNewPassword
      });

      if (updateError) {
        throw updateError;
      }

      Alert.alert(
        '✅ Password Updated',
        'Your password has been successfully reset. You are now securely logged into Citizen Vault.'
      );

      setIsForgotPasswordModalOpen(false);
      setResetOtpCode('');
      setResetNewPassword('');
      setResetConfirmPassword('');
      setResetStep('REQUEST');

      const user = updateData.user || verifyData?.user;
      if (user) {
        await buildAndSetCitizenUser(user, verifyData?.session?.access_token, 'EMAIL');
      }
    } catch (err: any) {
      setResetErrorMessage(err.message || 'Verification failed. The code may be invalid or expired.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Set New Password Handler
  const handleSaveNewPassword = async () => {
    setNewPasswordError(null);
    if (!newPassword || newPassword.length < 6) {
      setNewPasswordError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setNewPasswordError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      Alert.alert(
        '✅ Password Updated',
        'Your password has been successfully reset. You are now securely logged into Citizen Vault.'
      );
      setIsSetNewPasswordModalOpen(false);
      setNewPassword('');
      setConfirmNewPassword('');

      if (data.user) {
        await buildAndSetCitizenUser(data.user, undefined, 'EMAIL');
      }
    } catch (err: any) {
      setNewPasswordError(err.message || 'Failed to update password. Please request a new link.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // 3. In-App Single Sign-On (Google & Apple) with Native Fallback & Supabase OAuth
  const handleOAuth = async (provider: 'google' | 'apple') => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Step A: Attempt Native Google Sign-In if available on this device binary
      if (provider === 'google' && isNativeGoogleAuthAvailable && GoogleSignin) {
        try {
          ensureGoogleSigninConfigured();
          await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
          const signInResult = await GoogleSignin.signIn();
          const idToken = signInResult.data?.idToken || signInResult.idToken;

          if (idToken) {
            const { data: sessionData, error: tokenErr } = await supabase.auth.signInWithIdToken({
              provider: 'google',
              token: idToken
            });

            if (tokenErr) {
              if (tokenErr.message?.includes('Signups not allowed') || (tokenErr as any).code === 'signup_disabled') {
                throw new Error('New citizen registrations are disabled on this Supabase project ("signup_disabled"). In your Supabase Dashboard, go to Authentication -> Providers -> Email and turn on "Allow new users to sign up".');
              }
              throw tokenErr;
            }

            if (sessionData?.user) {
              await buildAndSetCitizenUser(sessionData.user, sessionData.session?.access_token, 'GOOGLE');
              return;
            }
          }
        } catch (nativeErr: any) {
          if (nativeErr.code === statusCodes?.SIGN_IN_CANCELLED) {
            // Citizen intentionally dismissed the Google account picker
            setIsLoading(false);
            return;
          }
          console.warn('[Native Google Sign-In] Fallback to WebBrowser OAuth:', nativeErr.message);
        }
      }

      // Step B: WebBrowser OAuth (Supports Expo Go, Web, and universal deep links)
      const redirectUrl = AuthSession.makeRedirectUri({
        preferLocalhost: false
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true
        }
      });

      if (error) {
        if (error.message?.includes('Signups not allowed') || (error as any).code === 'signup_disabled') {
          throw new Error('New citizen registrations are disabled on this Supabase project ("signup_disabled"). In your Supabase Dashboard, go to Authentication -> Providers -> Email and turn on "Allow new users to sign up".');
        }
        throw error;
      }
      if (!data?.url) throw new Error(`No authentication URL was returned by ${provider === 'apple' ? 'Apple' : 'Google'}.`);

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      // Check if the redirect returned an error or tokens
      if (result.type === 'success' && result.url) {
        const parsedUrl = Linking.parse(result.url);

        // Check for OAuth error in query params or hash fragment
        let oauthError = (parsedUrl.queryParams?.error_description as string) || (parsedUrl.queryParams?.error as string) || '';
        let hashParams: URLSearchParams | null = null;
        if (result.url.includes('#')) {
          const hashPart = result.url.split('#')[1];
          hashParams = new URLSearchParams(hashPart);
          oauthError = oauthError || hashParams.get('error_description') || hashParams.get('error') || '';
        }

        if (oauthError) {
          const decoded = decodeURIComponent(oauthError.replace(/\+/g, ' '));
          if (decoded.includes('Signups not allowed') || decoded.includes('signup_disabled')) {
            throw new Error('New citizen registrations are disabled on this Supabase project ("signup_disabled"). In your Supabase Dashboard, go to Authentication -> Providers -> Email and turn on "Allow new users to sign up".');
          }
          throw new Error(decoded);
        }

        // Check for PKCE Authorization Code
        if (parsedUrl.queryParams?.code) {
          const { data: sessionData, error: sessionErr } = await supabase.auth.exchangeCodeForSession(
            parsedUrl.queryParams.code as string
          );
          if (sessionErr) {
            if (sessionErr.message?.includes('Signups not allowed') || (sessionErr as any).code === 'signup_disabled') {
              throw new Error('New citizen registrations are disabled on this Supabase project ("signup_disabled"). In your Supabase Dashboard, go to Authentication -> Providers -> Email and turn on "Allow new users to sign up".');
            }
            throw sessionErr;
          }
          if (sessionData?.user) {
            await buildAndSetCitizenUser(sessionData.user, sessionData.session?.access_token, provider === 'apple' ? 'APPLE' : 'GOOGLE');
            return;
          }
        }

        // Check for Implicit Token Flow (hash fragment or query params)
        let accessToken = (parsedUrl.queryParams?.access_token as string) || '';
        let refreshToken = (parsedUrl.queryParams?.refresh_token as string) || '';

        if (!accessToken && hashParams) {
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
            await buildAndSetCitizenUser(sessionData.user, accessToken, provider === 'apple' ? 'APPLE' : 'GOOGLE');
            return;
          }
        }
      }

      // Step C: Fallback check if active session was established in background
      const { data: activeSession } = await supabase.auth.getSession();
      if (activeSession?.session?.user) {
        await buildAndSetCitizenUser(activeSession.session.user, activeSession.session.access_token, provider === 'apple' ? 'APPLE' : 'GOOGLE');
        return;
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
          keyboardDismissMode="on-drag"
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View>
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
                Keyboard.dismiss();
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
                Keyboard.dismiss();
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
                Keyboard.dismiss();
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
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                      blurOnSubmit={true}
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
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                      blurOnSubmit={true}
                    />
                  </View>
                </View>

                {/* Forgot Password Link */}
                <View style={styles.forgotPasswordContainer}>
                  <TouchableOpacity
                    onPress={() => {
                      setResetEmail(email.trim());
                      setResetErrorMessage(null);
                      setResetSuccessMessage(null);
                      setIsForgotPasswordModalOpen(true);
                    }}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Forgot Password"
                  >
                    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                  </TouchableOpacity>
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
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                      blurOnSubmit={true}
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
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                      blurOnSubmit={true}
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
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                      blurOnSubmit={true}
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
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                      blurOnSubmit={true}
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
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                      blurOnSubmit={true}
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
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                      blurOnSubmit={true}
                    />
                  </View>
                </View>

                {/* Act 843 Emergency SOS & Carrier Triangulation Consent Card */}
                <TouchableOpacity
                  style={[styles.consentCard, emergencyTelecomConsent && styles.consentCardActive]}
                  activeOpacity={0.85}
                  onPress={() => setEmergencyTelecomConsent(!emergencyTelecomConsent)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: emergencyTelecomConsent }}
                  accessibilityLabel="Consent to emergency dispatch and carrier location sharing under Act 843"
                >
                  <View style={styles.consentHeaderRow}>
                    <View style={[styles.checkboxBox, emergencyTelecomConsent && styles.checkboxBoxChecked]}>
                      {emergencyTelecomConsent && (
                        <CheckCircle2 color={tokens.colors.brand.gold} size={18} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <ShieldCheck color={tokens.colors.brand.gold} size={15} />
                        <Text style={styles.consentTitle}>
                          Act 843 Emergency Dispatch Consent
                        </Text>
                      </View>
                      <Text style={styles.consentDescription}>
                        I agree that when I activate an SOS emergency beacon, my registered phone number can be transmitted to Police Command/112 and used to request network cell-tower location from my carrier (MTN/Telecel/AT).
                      </Text>
                      <View style={styles.legalBasisRow}>
                        <Scale color={tokens.colors.police.badge} size={12} />
                        <Text style={styles.legalBasisText}>
                          Data Protection Act, 2012 (Act 843 Sec 20) • Lawful Emergency Telemetry
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>

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
            onPress={() => setIsPrivacyModalOpen(true)}
            style={styles.privacyLinkWrapper}
            accessibilityRole="button"
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
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* In-App Statutory Privacy Policy Modal */}
      <PrivacyPolicyModal
        visible={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />

      {/* 1. In-App Password Recovery Modal (6-Digit OTP) */}
      <Modal
        visible={isForgotPasswordModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setIsForgotPasswordModalOpen(false);
          setResetStep('REQUEST');
          setResetErrorMessage(null);
          setResetSuccessMessage(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.xs }}>
                <KeyRound color={tokens.colors.brand.gold} size={20} />
                <Text style={styles.modalSheetTitle}>
                  {resetStep === 'REQUEST' ? 'Reset Citizen Password' : 'Enter Code & New Password'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setIsForgotPasswordModalOpen(false);
                  setResetStep('REQUEST');
                  setResetErrorMessage(null);
                  setResetSuccessMessage(null);
                }}
                style={styles.modalCloseIconBtn}
                accessibilityRole="button"
                accessibilityLabel="Close reset password dialog"
              >
                <X color={tokens.colors.text.secondary} size={18} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSheetSubtitle}>
              {resetStep === 'REQUEST'
                ? 'Enter your registered email address. We will dispatch a 6-digit recovery code to reset your account password.'
                : `Enter the verification code sent to ${resetEmail || 'your email'} and set your new secure password.`}
            </Text>

            {resetSuccessMessage && (
              <View style={styles.modalSuccessBox}>
                <CheckCircle2 color={tokens.colors.status.success} size={16} />
                <Text style={styles.modalSuccessText}>{resetSuccessMessage}</Text>
              </View>
            )}

            {resetErrorMessage && (
              <View style={styles.modalErrorBox}>
                <AlertCircle color={tokens.colors.status.danger} size={16} />
                <Text style={styles.modalErrorText}>{resetErrorMessage}</Text>
              </View>
            )}

            {resetStep === 'REQUEST' ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Registered Email Address</Text>
                  <View style={styles.inputWrapper}>
                    <Mail color={tokens.colors.text.muted} size={18} style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputWithIcon}
                      placeholder="e.g. kwame.mensah@gmail.com"
                      placeholderTextColor={tokens.colors.text.muted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={resetEmail}
                      onChangeText={setResetEmail}
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleRequestPasswordReset}
                  disabled={isSendingReset}
                  style={styles.primaryBtn}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Dispatch recovery email"
                >
                  {isSendingReset ? (
                    <ActivityIndicator color={tokens.colors.bg.base} size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Send Recovery Code</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setResetStep('VERIFY');
                    setResetErrorMessage(null);
                  }}
                  style={{ alignItems: 'center', marginTop: tokens.spacing.xs }}
                >
                  <Text style={{ color: tokens.colors.brand.gold, fontSize: tokens.typography.fontSize.xs, fontWeight: '600' }}>
                    Already have a recovery code? Enter Code & New Password →
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>6-Digit Verification Code *</Text>
                  <View style={styles.inputWrapper}>
                    <KeyRound color={tokens.colors.brand.gold} size={18} style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputWithIcon}
                      placeholder="e.g. 123456 (or paste code)"
                      placeholderTextColor={tokens.colors.text.muted}
                      keyboardType="default"
                      autoCapitalize="none"
                      value={resetOtpCode}
                      onChangeText={setResetOtpCode}
                      returnKeyType="next"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>New Password *</Text>
                  <View style={styles.inputWrapper}>
                    <Lock color={tokens.colors.text.muted} size={18} style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputWithIcon}
                      placeholder="Min 6 characters"
                      placeholderTextColor={tokens.colors.text.muted}
                      secureTextEntry
                      value={resetNewPassword}
                      onChangeText={setResetNewPassword}
                      returnKeyType="next"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm New Password *</Text>
                  <View style={styles.inputWrapper}>
                    <Lock color={tokens.colors.text.muted} size={18} style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputWithIcon}
                      placeholder="Re-type new password"
                      placeholderTextColor={tokens.colors.text.muted}
                      secureTextEntry
                      value={resetConfirmPassword}
                      onChangeText={setResetConfirmPassword}
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleVerifyOtpAndSavePassword}
                  disabled={isResettingPassword}
                  style={styles.primaryBtn}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Verify Code & Reset Password"
                >
                  {isResettingPassword ? (
                    <ActivityIndicator color={tokens.colors.bg.base} size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Verify Code & Update Password</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setResetStep('REQUEST');
                    setResetErrorMessage(null);
                  }}
                  style={{ alignItems: 'center', marginTop: tokens.spacing.xs }}
                >
                  <Text style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.xs, fontWeight: '600' }}>
                    ← Back / Request a new code
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 2. Set New Password Modal (Deep Link / Recovery Session) */}
      <Modal
        visible={isSetNewPasswordModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsSetNewPasswordModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.xs }}>
                <Lock color={tokens.colors.brand.gold} size={20} />
                <Text style={styles.modalSheetTitle}>Set New Password</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsSetNewPasswordModalOpen(false)}
                style={styles.modalCloseIconBtn}
                accessibilityRole="button"
                accessibilityLabel="Close set new password dialog"
              >
                <X color={tokens.colors.text.secondary} size={18} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSheetSubtitle}>
              Please choose a new secure password for your CitizenAlert account (minimum 6 characters).
            </Text>

            {newPasswordError && (
              <View style={styles.modalErrorBox}>
                <AlertCircle color={tokens.colors.status.danger} size={16} />
                <Text style={styles.modalErrorText}>{newPasswordError}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Password *</Text>
              <View style={styles.inputWrapper}>
                <KeyRound color={tokens.colors.text.muted} size={18} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder="Min 6 characters"
                  placeholderTextColor={tokens.colors.text.muted}
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm New Password *</Text>
              <View style={styles.inputWrapper}>
                <KeyRound color={tokens.colors.text.muted} size={18} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder="Re-type new password"
                  placeholderTextColor={tokens.colors.text.muted}
                  secureTextEntry
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSaveNewPassword}
              disabled={isUpdatingPassword}
              style={styles.primaryBtn}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Update Password & Sign In"
            >
              {isUpdatingPassword ? (
                <ActivityIndicator color={tokens.colors.bg.base} size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Update Password & Sign In</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  },
  consentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: tokens.colors.border.subtle,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    marginTop: tokens.spacing.sm,
    marginBottom: tokens.spacing.xs
  },
  consentCardActive: {
    borderColor: 'rgba(250, 204, 21, 0.4)',
    backgroundColor: 'rgba(250, 204, 21, 0.04)'
  },
  consentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.spacing.sm
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: tokens.colors.text.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2
  },
  checkboxBoxChecked: {
    borderColor: tokens.colors.brand.gold,
    backgroundColor: 'rgba(250, 204, 21, 0.15)'
  },
  consentTitle: {
    color: tokens.colors.brand.gold,
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: '700'
  },
  consentDescription: {
    color: tokens.colors.text.secondary,
    fontSize: tokens.typography.fontSize.xxs,
    lineHeight: tokens.typography.lineHeight.xs,
    marginTop: 4
  },
  legalBasisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6
  },
  legalBasisText: {
    color: tokens.colors.police.badge,
    fontSize: 9,
    fontWeight: '600'
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginTop: 6,
    marginBottom: tokens.spacing.sm
  },
  forgotPasswordText: {
    color: tokens.colors.brand.gold,
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: '600'
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end'
  },
  modalContentCard: {
    backgroundColor: tokens.colors.bg.surface,
    borderTopLeftRadius: tokens.radius.xl,
    borderTopRightRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : tokens.spacing.xl,
    borderWidth: 1,
    borderColor: tokens.colors.border.subtle,
    gap: tokens.spacing.md
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  modalSheetTitle: {
    color: tokens.colors.text.primary,
    fontSize: tokens.typography.fontSize.md,
    fontWeight: '800'
  },
  modalCloseIconBtn: {
    padding: 6,
    borderRadius: tokens.radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)'
  },
  modalSheetSubtitle: {
    color: tokens.colors.text.secondary,
    fontSize: tokens.typography.fontSize.xs,
    lineHeight: tokens.typography.lineHeight.xs
  },
  modalSuccessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: tokens.colors.status.success,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.sm
  },
  modalSuccessText: {
    color: tokens.colors.status.success,
    fontSize: tokens.typography.fontSize.xs,
    flex: 1,
    fontWeight: '600'
  },
  modalErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: tokens.colors.status.danger,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.sm
  },
  modalErrorText: {
    color: tokens.colors.status.danger,
    fontSize: tokens.typography.fontSize.xs,
    flex: 1,
    fontWeight: '600'
  }
});
