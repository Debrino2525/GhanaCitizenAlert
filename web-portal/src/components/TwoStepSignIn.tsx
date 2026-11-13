import React, { useEffect, useState } from 'react';
import { ShieldCheck, Smartphone, X, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

/**
 * Two-step sign-in (TOTP authenticator app) for officers, using Supabase Auth MFA.
 *
 * - TwoStepSetupModal: lets a signed-in officer add an authenticator app.
 * - TwoStepChallenge:  shown after the password step when the officer has an
 *   authenticator set up, so the session reaches assurance level aal2.
 *
 * The database does not yet REQUIRE aal2 for officer access; that is a separate,
 * deliberate step once every officer has enrolled (see infra/supabase notes).
 */

type Factor = { id: string; status: string; friendly_name?: string; factor_type: string };

const codeInputClass =
  'w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-lg tracking-[0.4em] font-mono text-center focus:outline-none focus:border-amber-400';

function cleanCode(v: string) {
  return v.replace(/\D/g, '').slice(0, 6);
}

export const TwoStepSetupModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [verified, setVerified] = useState<Factor[]>([]);
  const [pending, setPending] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const refresh = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      setMessage({ type: 'error', text: error.message });
      return;
    }
    setVerified(((data?.totp || []) as Factor[]).filter(f => f.status === 'verified'));
  };

  useEffect(() => {
    if (isOpen) {
      setMessage(null);
      setPending(null);
      setCode('');
      refresh();
    }
  }, [isOpen]);

  const startEnrol = async () => {
    setBusy(true);
    setMessage(null);
    // Remove abandoned, never-verified setups first; Supabase rejects duplicates.
    const { data: list } = await supabase.auth.mfa.listFactors();
    for (const f of ((list?.all || []) as Factor[]).filter(f => f.factor_type === 'totp' && f.status !== 'verified')) {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}` });
    setBusy(false);
    if (error || !data) {
      setMessage({ type: 'error', text: error?.message || 'Could not start setup.' });
      return;
    }
    setPending({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const confirmEnrol = async () => {
    if (!pending || code.length !== 6) return;
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: pending.id, code });
    setBusy(false);
    if (error) {
      setMessage({ type: 'error', text: `That code did not work: ${error.message}` });
      return;
    }
    setPending(null);
    setCode('');
    setMessage({ type: 'success', text: 'Two-step sign-in is on. You will be asked for a code each time you sign in.' });
    refresh();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-modal bg-black/70 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="two-step-title">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
            <h2 id="two-step-title" className="text-lg font-bold text-white">Two-step sign-in</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-300">
          After your password, you enter a 6-digit code from an authenticator app (Google Authenticator, Microsoft
          Authenticator, Authy). Someone who learns your password still cannot sign in without your phone.
        </p>

        {verified.length > 0 && !pending && (
          <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-700 text-sm text-emerald-200">
            On: {verified.length} authenticator{verified.length === 1 ? '' : 's'} set up.
          </div>
        )}

        {!pending && (
          <button
            onClick={startEnrol}
            disabled={busy}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
            {verified.length > 0 ? 'Add another authenticator' : 'Set up an authenticator app'}
          </button>
        )}

        {pending && (
          <div className="space-y-3">
            <p className="text-sm text-slate-300">1. Scan this with your authenticator app.</p>
            <div className="bg-white rounded-xl p-3 flex justify-center">
              <img src={pending.qr} alt="QR code for your authenticator app" className="w-44 h-44" />
            </div>
            <p className="text-xs text-slate-400">
              Can't scan? Enter this key instead: <code className="font-mono text-slate-200 break-all">{pending.secret}</code>
            </p>
            <label className="block text-sm text-slate-300" htmlFor="two-step-enrol-code">2. Enter the 6-digit code it shows.</label>
            <input
              id="two-step-enrol-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={e => setCode(cleanCode(e.target.value))}
              className={codeInputClass}
            />
            <button
              onClick={confirmEnrol}
              disabled={busy || code.length !== 6}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm disabled:opacity-50"
            >
              {busy ? 'Checking...' : 'Turn on two-step sign-in'}
            </button>
          </div>
        )}

        {message && (
          <p role="status" className={`text-sm ${message.type === 'error' ? 'text-red-300' : 'text-emerald-300'}`}>{message.text}</p>
        )}
      </div>
    </div>
  );
};

export const TwoStepChallenge: React.FC<{ onVerified: () => void; onSignOut: () => void }> = ({ onVerified, onSignOut }) => {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setBusy(true);
    setError(null);
    const { data: list, error: listErr } = await supabase.auth.mfa.listFactors();
    const factor = ((list?.totp || []) as Factor[]).find(f => f.status === 'verified');
    if (listErr || !factor) {
      setBusy(false);
      setError(listErr?.message || 'No authenticator is set up for this account.');
      return;
    }
    const { error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    setBusy(false);
    if (verifyErr) {
      setError(`That code did not work: ${verifyErr.message}`);
      setCode('');
      return;
    }
    onVerified();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <form onSubmit={verify} className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-6 h-6 text-amber-400" />
          <h1 className="text-lg font-bold text-white">Enter your sign-in code</h1>
        </div>
        <label htmlFor="two-step-code" className="block text-sm text-slate-300">
          Open your authenticator app and enter the 6-digit code for CitizenAlert.
        </label>
        <input
          id="two-step-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          value={code}
          onChange={e => setCode(cleanCode(e.target.value))}
          className={codeInputClass}
        />
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <button
          type="submit"
          disabled={busy || code.length !== 6}
          className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm disabled:opacity-50"
        >
          {busy ? 'Checking...' : 'Continue'}
        </button>
        <button type="button" onClick={onSignOut} className="w-full text-sm text-slate-400 hover:text-white">
          Sign out
        </button>
      </form>
    </div>
  );
};
