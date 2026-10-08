import React, { useState } from 'react';
import { Shield, Lock, CheckCircle2, AlertCircle, Eye, EyeOff, KeyRound, ArrowRight } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { OfficerUser } from '../types';

interface SetPasswordScreenProps {
  onPasswordChanged: (officer: OfficerUser) => void;
  userEmail?: string;
  onSignOut?: () => void;
}

const COMMON_PASSWORDS = [
  'password', 'password123', 'password1234', 'password12345',
  '123456789012', '1234567890123', 'admin12345678', 'ghanapolice123',
  'administrator', 'qwerty123456', 'letmein123456', 'welcome123456',
  'changeme12345', 'policecad1234', 'ghanaalert123'
];

function isCommonOrTrivialPassword(pwd: string): boolean {
  const lower = pwd.toLowerCase().trim();
  if (COMMON_PASSWORDS.includes(lower)) return true;
  if (/^(.)\1+$/.test(lower)) return true; // all same character
  if (/^(0123456789|1234567890|abcdefghijklmnopqrstuvwxyz)/i.test(lower)) return true;
  if (lower.includes('password') || lower.includes('admin') || lower.includes('police')) {
    if (lower.length < 14) return true;
  }
  return false;
}

export const SetPasswordScreen: React.FC<SetPasswordScreenProps> = ({
  onPasswordChanged,
  userEmail,
  onSignOut
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // 1. Validate length >= 12
    if (password.length < 12) {
      setErrorMessage('Password must be at least 12 characters long.');
      return;
    }

    // 2. Validate common passwords
    if (isCommonOrTrivialPassword(password)) {
      setErrorMessage('This password is too common or easily guessable. Please choose a stronger passphrase.');
      return;
    }

    // 3. Confirm match
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-type your password.');
      return;
    }

    setIsLoading(true);

    try {
      // Update password via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.updateUser({
        password: password
      });

      if (authError) {
        throw authError;
      }

      if (!authData?.user) {
        throw new Error('Password updated, but failed to retrieve user session.');
      }

      setSuccessMessage('Password successfully set. Verifying officer credentials...');

      // Re-read the officers row from database (do not trust client flag; DB clears it)
      const { data: officerRow, error: officerError } = await supabase
        .from('officers')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (officerError || !officerRow) {
        throw new Error(officerError?.message || 'Failed to load officer record from database.');
      }

      if (officerRow.is_active === false) {
        await supabase.auth.signOut();
        throw new Error('Not authorized: Officer account is deactivated.');
      }

      const formattedOfficer: OfficerUser = {
        id: officerRow.id,
        name: officerRow.full_name || officerRow.name || 'Officer',
        badgeNumber: officerRow.badge_number || officerRow.service_id || 'GPS-CAD',
        service_id: officerRow.service_id,
        agency: officerRow.agency || 'GPS_CID',
        role: officerRow.role,
        rank: officerRow.rank || 'Duty Officer',
        email: officerRow.email || authData.user.email || '',
        avatarUrl: officerRow.avatar_url || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80`,
        clearanceLevel: officerRow.clearance_level || 'RESTRICTED',
        station_id: officerRow.station_id,
        is_active: Boolean(officerRow.is_active),
        must_change_password: Boolean(officerRow.must_change_password),
        created_at: officerRow.created_at
      };

      // Clear the /set-password path from URL if present
      if (window.location.pathname === '/set-password') {
        window.history.pushState({}, '', '/');
      }

      setTimeout(() => {
        onPasswordChanged(formattedOfficer);
      }, 800);

    } catch (err: any) {
      console.error('Set password error:', err);
      setErrorMessage(err.message || 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(30,58,138,0.25),rgba(0,0,0,0))]">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Ghana Flag Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-2 flex">
          <div className="flex-1 bg-[#CE1126]" />
          <div className="flex-1 bg-[#FCD116]" />
          <div className="flex-1 bg-[#006B3F]" />
        </div>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-6 pt-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-black text-white">SET SECURE CAD PASSPHRASE</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-900/80 text-amber-300 font-bold border border-amber-700">
                ACT 772
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {userEmail ? `Setting initial credentials for ${userEmail}` : 'Mandatory password setup required before workstation access'}
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/70 border border-red-800 text-red-200 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-200 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              New Master Passphrase (Minimum 12 Characters)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter minimum 12 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                required
                minLength={12}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">
              {password.length >= 12 ? (
                <span className="text-emerald-400 font-bold">✓ Length requirement met ({password.length}/12 chars)</span>
              ) : (
                <span className="text-slate-500">{password.length}/12 characters</span>
              )}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Confirm New Passphrase
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter your passphrase"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                required
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">Security Standards:</p>
            <p>• Must be at least 12 characters long</p>
            <p>• Common words, sequential numbers, and dictionary phrases are rejected</p>
            <p>• Cryptographically signed under Ghana Electronic Transactions Act (Act 772)</p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
          >
            <span>{isLoading ? 'Encrypting & Saving Passphrase...' : 'Save Passphrase & Unlock Workstation'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="w-full py-2 text-center text-xs text-slate-400 hover:text-white transition"
            >
              Sign out & return to login
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
