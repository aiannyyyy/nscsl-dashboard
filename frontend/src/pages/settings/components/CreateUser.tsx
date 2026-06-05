import React, { useState } from 'react';
import { X, Loader2, ShieldCheck } from 'lucide-react';
import { useCreateUser } from '../../../hooks/AdminHooks/useUsers';
import type { CreateUserPayload } from '../../../services/AdminServices/userService';
import type { User } from '../User';

interface CreateUserProps {
  onClose: () => void;
  onCreated: (user: User) => void;
}

const DEPARTMENTS = ['Admin', 'Laboratory', 'Followup', 'Program'];
const ROLES: Array<'admin' | 'user'> = ['user', 'admin'];

type FormState = CreateUserPayload;

const INITIAL_FORM: FormState = {
  username: '',
  password: '',
  name:     '',
  dept:     '',
  position: '',
  role:     'user',
};

export const CreateUser: React.FC<CreateUserProps> = ({ onClose, onCreated }) => {
  const [form, setForm]     = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const { mutate: createUser, isPending, isError, error } = useCreateUser();

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim())     e.name     = 'Name is required.';
    if (!form.username.trim()) e.username = 'Username is required.';
    if (!form.password.trim()) e.password = 'Password is required.';
    if (!form.position.trim()) e.position = 'Position is required.';
    if (!form.dept)            e.dept     = 'Department is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    createUser(form, {
      onSuccess: (newUser: User) => onCreated(newUser),
    });
  };

  const setField =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Create New User</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">

          {isError && (
            <div className="px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
              {(error as Error)?.message ?? 'Something went wrong. Please try again.'}
            </div>
          )}

          <Field label="Full Name" error={errors.name}>
            <input
              type="text"
              placeholder="e.g. Juan Dela Cruz"
              value={form.name}
              onChange={setField('name')}
              className={inputCls(!!errors.name)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Username" error={errors.username}>
              <input
                type="text"
                placeholder="e.g. jdelacruz"
                value={form.username}
                onChange={setField('username')}
                className={inputCls(!!errors.username)}
              />
            </Field>
            <Field label="Password" error={errors.password}>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={setField('password')}
                className={inputCls(!!errors.password)}
              />
            </Field>
          </div>

          <Field label="Position" error={errors.position}>
            <input
              type="text"
              placeholder="e.g. Nurse, Lab Tech"
              value={form.position}
              onChange={setField('position')}
              className={inputCls(!!errors.position)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Department" error={errors.dept}>
              <select
                value={form.dept}
                onChange={setField('dept')}
                className={inputCls(!!errors.dept)}
              >
                <option value="" disabled>Select department…</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </Field>
            <Field label="Role">
              <select value={form.role} onChange={setField('role')} className={inputCls(false)}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-60"
          >
            {isPending
              ? <><Loader2 size={14} className="animate-spin" /> Creating…</>
              : <><ShieldCheck size={14} /> Create & Set Access</>
            }
          </button>
        </div>

      </div>
    </div>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls = (hasError: boolean) =>
  `w-full px-3 py-2 text-sm rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 ${
    hasError ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'
  }`;

const Field: React.FC<{
  label: string;
  error?: string;
  children: React.ReactNode;
}> = ({ label, error, children }) => (
  <div>
    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
      {label}
    </label>
    {children}
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);