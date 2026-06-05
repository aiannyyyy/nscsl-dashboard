import React, { useState, useCallback } from 'react';
import { X, Eye, EyeOff, Lock, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────────────────── */
export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordModalProps {
  onClose: () => void;
  /** Receives the payload; should return a promise that resolves on success or rejects with an error message */
  onSubmit: (payload: ChangePasswordPayload) => Promise<void>;
}

/* ─── Password-strength helpers ─────────────────────────────────────────── */
interface Rule {
  label: string;
  test: (v: string) => boolean;
}

const RULES: Rule[] = [
  { label: 'At least 8 characters',          test: v => v.length >= 8 },
  { label: 'Uppercase letter (A-Z)',          test: v => /[A-Z]/.test(v) },
  { label: 'Lowercase letter (a-z)',          test: v => /[a-z]/.test(v) },
  { label: 'Number (0-9)',                    test: v => /\d/.test(v) },
  { label: 'Special character (!@#$…)',       test: v => /[^A-Za-z0-9]/.test(v) },
];

type Strength = 'none' | 'weak' | 'fair' | 'strong' | 'very-strong';

function getStrength(password: string): { level: Strength; score: number } {
  const score = RULES.filter(r => r.test(password)).length;
  if (score === 0) return { level: 'none',        score: 0 };
  if (score <= 2)  return { level: 'weak',        score };
  if (score === 3) return { level: 'fair',        score };
  if (score === 4) return { level: 'strong',      score };
  return            { level: 'very-strong', score };
}

const STRENGTH_META: Record<Strength, { label: string; color: string; bars: number }> = {
  'none':        { label: '',            color: 'bg-gray-200 dark:bg-gray-700', bars: 0 },
  'weak':        { label: 'Weak',        color: 'bg-red-500',                   bars: 1 },
  'fair':        { label: 'Fair',        color: 'bg-yellow-400',                bars: 2 },
  'strong':      { label: 'Strong',      color: 'bg-blue-500',                  bars: 3 },
  'very-strong': { label: 'Very strong', color: 'bg-emerald-500',               bars: 4 },
};

/* ─── Sub-components ─────────────────────────────────────────────────────── */
interface PasswordInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
}

const PasswordInput: React.FC<PasswordInputProps> = ({
  id, label, value, onChange, placeholder, autoComplete, error,
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Lock size={15} className="text-gray-400 dark:text-gray-500" />
        </div>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`
            block w-full rounded-lg border py-2.5 pl-9 pr-10 text-sm
            bg-white dark:bg-gray-900
            text-gray-900 dark:text-white
            placeholder:text-gray-400 dark:placeholder:text-gray-600
            transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            ${error
              ? 'border-red-400 dark:border-red-500'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}
          `}
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  );
};

/* ─── Strength meter ─────────────────────────────────────────────────────── */
const StrengthMeter: React.FC<{ password: string }> = ({ password }) => {
  const { level, score } = getStrength(password);
  const meta = STRENGTH_META[level];

  if (!password) return null;

  return (
    <div className="space-y-2">
      {/* Bar track */}
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`
              h-1 flex-1 rounded-full transition-all duration-300
              ${i < meta.bars ? meta.color : 'bg-gray-200 dark:bg-gray-700'}
            `}
          />
        ))}
      </div>

      {/* Label + rules */}
      {meta.label && (
        <p className="text-xs font-medium" style={{
          color: level === 'weak' ? '#ef4444'
               : level === 'fair' ? '#ca8a04'
               : level === 'strong' ? '#3b82f6'
               : '#10b981'
        }}>
          {meta.label}
        </p>
      )}

      {/* Rule checklist */}
      <ul className="grid grid-cols-1 gap-1">
        {RULES.map(rule => {
          const passed = rule.test(password);
          return (
            <li key={rule.label} className="flex items-center gap-1.5 text-xs">
              <CheckCircle2
                size={12}
                className={passed
                  ? 'text-emerald-500'
                  : 'text-gray-300 dark:text-gray-600'}
              />
              <span className={passed
                ? 'text-gray-700 dark:text-gray-300'
                : 'text-gray-400 dark:text-gray-500'}
              >
                {rule.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

/* ─── Main modal component ───────────────────────────────────────────────── */
export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  onClose,
  onSubmit,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [loading,   setLoading]   = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [apiError,  setApiError]  = useState('');

  const { level: strengthLevel, score } = getStrength(newPassword);

  /* Validate */
  const validate = useCallback((): boolean => {
    const e: Record<string, string> = {};

    if (!currentPassword.trim())
      e.currentPassword = 'Current password is required.';

    if (!newPassword)
      e.newPassword = 'New password is required.';
    else if (score < 3)
      e.newPassword = 'Password is too weak. Meet at least 3 requirements.';
    else if (newPassword === currentPassword)
      e.newPassword = 'New password must differ from current password.';

    if (!confirmPassword)
      e.confirmPassword = 'Please confirm your new password.';
    else if (newPassword !== confirmPassword)
      e.confirmPassword = 'Passwords do not match.';

    setErrors(e);
    return Object.keys(e).length === 0;
  }, [currentPassword, newPassword, confirmPassword, score]);

  /* Submit */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;

    setLoading(true);
    try {
      await onSubmit({ currentPassword, newPassword });
      setSuccess(true);
      setTimeout(onClose, 1800);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Render ── */
  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel */}
      <div className="relative w-full max-w-md rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-2xl">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="px-6 pt-6 pb-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950">
              <ShieldCheck size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white leading-tight">
                Change Password
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Keep your account secure with a strong password.
              </p>
            </div>
          </div>
        </div>

        {/* Success state */}
        {success ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950">
              <CheckCircle2 size={24} className="text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Password updated!</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Closing automatically…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="px-6 py-5 space-y-5">

              {/* API error */}
              {apiError && (
                <div className="flex items-start gap-2.5 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3.5 py-3">
                  <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-500" />
                  <p className="text-xs text-red-600 dark:text-red-400">{apiError}</p>
                </div>
              )}

              {/* Current password */}
              <PasswordInput
                id="current-password"
                label="Current password"
                value={currentPassword}
                onChange={v => { setCurrentPassword(v); setErrors(e => ({ ...e, currentPassword: '' })); }}
                placeholder="Enter current password"
                autoComplete="current-password"
                error={errors.currentPassword}
              />

              {/* Divider */}
              <div className="border-t border-gray-100 dark:border-gray-800" />

              {/* New password */}
              <div className="space-y-3">
                <PasswordInput
                  id="new-password"
                  label="New password"
                  value={newPassword}
                  onChange={v => { setNewPassword(v); setErrors(e => ({ ...e, newPassword: '' })); }}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  error={errors.newPassword}
                />
                <StrengthMeter password={newPassword} />
              </div>

              {/* Confirm password */}
              <PasswordInput
                id="confirm-password"
                label="Confirm new password"
                value={confirmPassword}
                onChange={v => { setConfirmPassword(v); setErrors(e => ({ ...e, confirmPassword: '' })); }}
                placeholder="Re-enter new password"
                autoComplete="new-password"
                error={errors.confirmPassword}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 dark:border-gray-800 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white transition-all duration-200"
              >
                {loading ? (
                  <>
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Updating…
                  </>
                ) : (
                  <>
                    <ShieldCheck size={14} />
                    Update Password
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};