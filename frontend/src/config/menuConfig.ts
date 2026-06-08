export const MENU_CONFIG = [
  {
    key: 'admin',
    label: 'ADMIN',
    path: '/dashboard/admin',
    subItems: [
      { key: 'overview',   label: 'Overview',           path: '/dashboard/admin' },
      { key: 'accounting', label: 'Accounting',         path: '/dashboard/admin/accounting' },
      { key: 'supply',     label: 'Supply & Purchasing', path: '/dashboard/admin/supply' },
    ],
  },
  {
    key: 'pdo',
    label: 'PDO',
    path: '/dashboard/pdo',
    subItems: [
      { key: 'overview',        label: 'Overview',        path: '/dashboard/pdo' },
      { key: 'nsf-database',    label: 'NBS Facilities',  path: '/dashboard/pdo/nsf-database' },
      { key: 'sample-received', label: 'Sample Received', path: '/dashboard/pdo/sample-received' },
      { key: 'sample-screened', label: 'Sample Screened', path: '/dashboard/pdo/sample-screened' },
      { key: 'unsatisfactory',  label: 'Unsatisfactory',  path: '/dashboard/pdo/unsatisfactory' },
      { key: 'nsf-performance', label: 'NSF Performance', path: '/dashboard/pdo/nsf-performance' },
      { key: 'list-of-car',     label: 'List of Car',     path: '/dashboard/pdo/list-of-car' },
      { key: 'lopez-quezon',    label: 'Lopez Quezon',    path: '/dashboard/pdo/lopez-quezon' },
      { key: 'calendar',        label: 'Calendar',        path: '/dashboard/pdo/calendar' },
    ],
  },
  {
    key: 'laboratory',
    label: 'LABORATORY',
    path: '/dashboard/laboratory',
    subItems: [
      { key: 'overview',                   label: 'Overview',                    path: '/dashboard/laboratory' },
      { key: 'demo-unsat',                 label: 'Demo & Unsat',                path: '/dashboard/laboratory/demo-unsat' },
      { key: 'inventory',                  label: 'Inventory',                   path: '/dashboard/laboratory/inventory' },
      { key: 'patient-information-system', label: 'Patient Information System',  path: '/dashboard/laboratory/patient-information-system' },
      { key: 'endorsement-to-followup',    label: 'Endorsement to Follow Up',    path: '/dashboard/laboratory/endorsement-to-followup' },
    ],
  },
  {
    key: 'followup',
    label: 'FOLLOWUP',
    path: '/dashboard/followup',
    subItems: [
      { key: 'overview',                   label: 'Overview',                   path: '/dashboard/followup' },
      { key: 'logbook-endorsement',        label: 'Logbook Endorsement',        path: '/dashboard/followup/logbook-endorsement' },
      { key: 'cms-urgent',                 label: 'CMS Urgent',                 path: '/dashboard/followup/cms-urgent' },
      { key: 'patient-information-system', label: 'Patient Information System', path: '/dashboard/followup/patient-information-system' },
      { key: 'g6pd-report', label: 'G6PD Reports', path: '/dashboard/followup/g6pd-report' },
    ],
  },
  {
    key: 'it-job-order',
    label: 'IT JOB ORDER',
    path: '/dashboard/it-job-order',
    subItems: [
      { key: 'overview', label: 'Overview', path: '/dashboard/it-job-order' },
      { key: 'summary',  label: 'Summary',  path: '/dashboard/it-job-order/summary' },
    ],
  },
  {
    key: 'settings',
    label: 'SETTINGS',
    path: '/dashboard/settings',
    subItems: [
      { key: 'general', label: 'General', path: '/dashboard/settings/general' },
      { key: 'users',   label: 'Users',   path: '/dashboard/settings/users' },
      { key: 'change-password',   label: 'Change Password',   path: '/dashboard/settings/change-password' },
    ],
  },
] as const;

// ─── Derived types ────────────────────────────────────────────────────────────

export type MenuConfig   = typeof MENU_CONFIG;
export type MenuModule   = MenuConfig[number];
export type MenuKey      = MenuModule['key'];