import React from 'react';
import { Package, Truck, FileText, AlertTriangle } from 'lucide-react';

const SUMMARY = [
  { label: 'Open Purchase Orders', value: 12, icon: FileText, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
  { label: 'Pending Deliveries', value: 5, icon: Truck, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30' },
  { label: 'Active Vendors', value: 18, icon: Package, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
  { label: 'Items Below Reorder', value: 7, icon: AlertTriangle, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/30' },
];

const RECENT_ORDERS = [
  { po: 'PO-2026-0142', vendor: 'MedSupply Co.', item: 'Filter Paper (500 pcs)', amount: '₱18,400', status: 'Approved' },
  { po: 'PO-2026-0141', vendor: 'LabReagents PH', item: 'G6PD Reagent Kit x12', amount: '₱42,800', status: 'In Transit' },
  { po: 'PO-2026-0140', vendor: 'SafeCare Trading', item: 'Collection Tubes x40 boxes', amount: '₱9,650', status: 'Pending' },
  { po: 'PO-2026-0139', vendor: 'BioPack Solutions', item: 'Specimen Bags x80 packs', amount: '₱6,200', status: 'Delivered' },
];

const STATUS_STYLE: Record<string, string> = {
  Approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'In Transit': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  Pending: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  Delivered: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
};

const SupplyPurchasingOverview: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Supply & Purchasing</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Portfolio demo — sample procurement metrics and recent purchase orders.
        </p>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {SUMMARY.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
                <div className={`${card.bg} ${card.color} p-2 rounded-lg`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            </div>
          );
        })}
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Purchase Orders</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-6 py-3 text-left">PO Number</th>
                <th className="px-6 py-3 text-left">Vendor</th>
                <th className="px-6 py-3 text-left">Item</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {RECENT_ORDERS.map((order) => (
                <tr key={order.po} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                  <td className="px-6 py-3 font-mono text-gray-900 dark:text-gray-100">{order.po}</td>
                  <td className="px-6 py-3 text-gray-700 dark:text-gray-300">{order.vendor}</td>
                  <td className="px-6 py-3 text-gray-700 dark:text-gray-300">{order.item}</td>
                  <td className="px-6 py-3 text-right font-medium text-gray-900 dark:text-gray-100">{order.amount}</td>
                  <td className="px-6 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[order.status]}`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default SupplyPurchasingOverview;
