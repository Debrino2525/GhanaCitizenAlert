import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    try {
      return SecureStore.getItemAsync(key);
    } catch {
      return Promise.resolve(null);
    }
  },
  setItem: (key: string, value: string) => {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch {
      return Promise.resolve();
    }
  },
  removeItem: (key: string) => {
    try {
      return SecureStore.deleteItemAsync(key);
    } catch {
      return Promise.resolve();
    }
  },
};

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://fqgujgwdgqlxnpmpmiui.supabase.co';
export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxZ3VqZ3dkZ3FseG5wbXBtaXVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMjk0NTgsImV4cCI6MjEwNjgwNTQ1OH0._OvkzhPn_FTlhVZeZuZwmDI_TvgfHt__yTtijK4vgJc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
