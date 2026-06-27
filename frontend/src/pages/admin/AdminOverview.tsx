import React from 'react';
import { Link } from 'react-router-dom';
import { Calculator, Package, Users, TrendingUp, ClipboardList, ArrowRight } from 'lucide-react';

const SUMMARY_CARDS = [
  {
    label: 'Active Users',
    value: '48',
    sub: '3 departments onboarded',
    icon: Users,
    accent: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/30',
  },
  {
    label: 'Open POs',
    value: '12',
    sub: '4 awaiting approval',
    icon: ClipboardList,
    accent: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/30',
  },
  {
    label: 'Monthly Spend',
    value: '₱284K',
    sub: '+6.2% vs last month',
    icon: TrendingUp,
    accent: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
  },
  {
    label: 'Low Stock Items',
    value: '7',
    sub: 'Across lab & admin supply',
    icon: Package,
    accent: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-900/30',
  },
];

const MODULE_LINKS = [
  {
    title: 'Accounting',
    description: 'Revenue, expenses, cash flow, and receivables overview.',
    to: '/dashboard/admin/accounting',
    icon: Calculator,
  },
  {
    title: 'Supply & Purchasing',
    description: 'Purchase orders, vendor tracking, and inventory requests.',
    to: '/dashboard/admin/supply',
    icon: Package,
  },
];

export const AdminOverview: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Overview</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Portfolio demo — summary metrics and quick links to admin modules.
        </p>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {SUMMARY_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
                <div className={`${card.bg} ${card.accent} p-2 rounded-lg`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className={`text-2xl font-bold ${card.accent}`}>{card.value}</p>
              <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {MODULE_LINKS.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link
              key={mod.to}
              to={mod.to}
              className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{mod.title}</h2>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{mod.description}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-500 transition-colors shrink-0 mt-1" />
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
};
