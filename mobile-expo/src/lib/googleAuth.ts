import { NativeModules, TurboModuleRegistry } from 'react-native';

let GoogleSigninInstance: any = null;
let statusCodesInstance: any = {};
let isGoogleSigninSupported = false;

try {
  // Check if native RNGoogleSignin turbo module is registered in the native binary
  const hasNativeModule = Boolean(
    NativeModules.RNGoogleSignin ||
    (TurboModuleRegistry.get && TurboModuleRegistry.get('RNGoogleSignin'))
  );

  if (hasNativeModule) {
    const googlePkg = require('@react-native-google-signin/google-signin');
    GoogleSigninInstance = googlePkg.GoogleSignin;
    statusCodesInstance = googlePkg.statusCodes;
    isGoogleSigninSupported = true;

    // Configure Native Google Sign-In
    GoogleSigninInstance.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '360721223201-tdr0166i26q1d5tupnlp4mluebjncq9b.apps.googleusercontent.com',
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
      scopes: ['profile', 'email']
    });
  }
} catch (err) {
  console.warn('[GoogleAuth] Native Google Sign-In is not registered in this binary (e.g. Expo Go):', err);
  isGoogleSigninSupported = false;
}

export const GoogleSignin = GoogleSigninInstance;
export const statusCodes = statusCodesInstance;
export const isNativeGoogleAuthAvailable = isGoogleSigninSupported;
