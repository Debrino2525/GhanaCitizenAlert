import React from 'react';
import { Shield, LogOut, KeyRound, CheckCircle2, ChevronDown, UserPlus, ShieldCheck } from 'lucide-react';
import { OfficerUser } from '../types';

interface OfficerBadgeProfileProps {
  officer: OfficerUser | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  onOpenOfficerProvisioning?: () => void;
  onOpenTwoStep?: () => void;
}

export const OfficerBadgeProfile: React.FC<OfficerBadgeProfileProps> = ({
  officer,
  onOpenAuthModal,
  onLogout,
  onOpenOfficerProvisioning,
  onOpenTwoStep
}) => {
  if (!officer) {
    return (
      <button
        onClick={onOpenAuthModal}
        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center space-x-2 shadow-lg shadow-blue-600/20 border border-blue-400/30 transition"
      >
        <KeyRound className="w-3.5 h-3.5" />
        <span>Officer Login (CAD)</span>
      </button>
    );
  }

  const isAdmin = officer.role === 'ADMIN';

  return (
    <div className="flex items-center space-x-1.5 sm:space-x-2">
      {isAdmin && onOpenOfficerProvisioning && (
        <button
          onClick={onOpenOfficerProvisioning}
          className="px-2.5 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center space-x-1.5 transition shadow-sm"
          title="Open Officer Directory & Provisioning Console"
        >
          <UserPlus className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">Admin Console</span>
        </button>
      )}

      {onOpenTwoStep && (
        <button
          onClick={onOpenTwoStep}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 transition shrink-0"
          title="Two-step sign-in"
          aria-label="Two-step sign-in settings"
        >
          <ShieldCheck className="w-4 h-4" />
        </button>
      )}

      <div
        className="flex items-center space-x-2 px-2 sm:px-2.5 py-1 rounded-xl bg-slate-950/80 border border-slate-700/80 shadow-md min-w-0 max-w-[240px]"
        title={`${officer.name} — ${officer.badgeNumber} • ${officer.clearanceLevel}`}
      >
        {officer.avatarUrl ? (
          <img
            src={officer.avatarUrl}
            alt={officer.name}
            className="w-7 h-7 rounded-full object-cover border border-amber-400 shrink-0"
          />
        ) : (
          <span
            aria-hidden="true"
            className="w-7 h-7 rounded-full border border-amber-400 bg-slate-800 text-amber-300 text-[11px] font-bold flex items-center justify-center shrink-0"
          >
            {(officer.name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'}
          </span>
        )}
        <div className="hidden lg:block text-left min-w-0 flex-1">
          <div className="flex items-center space-x-1.5 min-w-0">
            <span className="text-xs font-bold text-white truncate">
              {officer.name}
            </span>
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-blue-900 text-blue-200 font-bold shrink-0">
              {officer.agency}
            </span>
          </div>
          <p className="text-[10px] text-amber-400 font-mono font-semibold truncate">
            {officer.badgeNumber} • {officer.clearanceLevel}
          </p>
        </div>
      </div>

      <button
        onClick={onLogout}
        className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-900/60 text-slate-400 hover:text-red-300 transition shrink-0"
        title="Sign Out of Terminal"
        aria-label="Sign out of Terminal"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
};
