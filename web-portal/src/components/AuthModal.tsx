import React, { useState } from 'react';
import { Shield, Lock, Mail, AlertCircle, Eye, EyeOff, KeyRound, LogIn } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface AuthModalProps {
  isOpen: boolean;
  externalError?: string | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  externalError
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter your official email address and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      // Authenticate with Supabase Auth ONLY.
      // Officer record lookup is handled centrally and exclusively by App.tsx
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password
      });

      if (authError) {
        throw authError;
      }
      // If successful, onAuthStateChange in App.tsx takes over seamlessly
    } catch (err: any) {
      console.error('Officer sign-in error:', err);
      setErrorMsg(err.message || 'Invalid login credentials.');
      setIsLoading(false);
    }
  };

  const handlePasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter your email to receive a recovery link.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const redirectOrigin = window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${redirectOrigin}/set-password`
      });

      if (error) throw error;
      setResetSent(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send password recovery email.');
    } finally {
      setIsLoading(false);
    }
  };

  const displayedError = errorMsg || externalError;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Ghana Flag Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-2 flex">
          <div className="flex-1 bg-[#CE1126]" />
          <div className="flex-1 bg-[#FCD116]" />
          <div className="flex-1 bg-[#006B3F]" />
        </div>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-6 pt-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-ghana-gold via-amber-600 to-ghana-red flex items-center justify-center shadow-lg shadow-amber-900/40 border border-white/20">
            <Shield className="w-7 h-7 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-black text-white">LAW ENFORCEMENT CAD</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-900/80 text-blue-300 font-bold border border-blue-700">
                ACT 772
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Ghana Joint Security Operations Center & Emergency CAD
            </p>
          </div>
        </div>

        {displayedError && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/70 border border-red-800 text-red-200 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{displayedError}</span>
          </div>
        )}

        {resetSent ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-blue-950/50 border border-blue-800 text-blue-200 text-xs space-y-2">
              <p className="font-bold text-blue-300">Password Recovery Email Sent</p>
              <p>Check your official inbox for a secure password reset link. Click the link to set your new CAD passphrase.</p>
            </div>
            <button
              onClick={() => {
                setResetSent(false);
                setIsResetMode(false);
              }}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
            >
              Return to Login
            </button>
          </div>
        ) : isResetMode ? (
          <form onSubmit={handlePasswordRecovery} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Official Agency Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  placeholder="e.g. officer@police.gov.gh"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              <span>{isLoading ? 'Sending Recovery Link...' : 'Send Password Reset Link'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsResetMode(false);
                setErrorMsg('');
              }}
              className="w-full py-2 text-center text-xs text-slate-400 hover:text-white transition"
            >
              Back to Password Login
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Official Agency Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  placeholder="e.g. officer@police.gov.gh"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  Password / Passphrase
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsResetMode(true);
                    setErrorMsg('');
                  }}
                  className="text-[11px] text-blue-400 hover:text-blue-300"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your CAD passphrase"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>{isLoading ? 'Verifying Credentials...' : 'Authenticate & Unlock CAD Station'}</span>
            </button>
          </form>
        )}

        {/* Security Legal Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <a href="/privacy" className="hover:text-amber-400 transition underline">
            Privacy Policy (Act 843)
          </a>
          <span className="text-emerald-400 font-bold">256-BIT ENCRYPTION</span>
        </div>
      </div>
    </div>
  );
};
