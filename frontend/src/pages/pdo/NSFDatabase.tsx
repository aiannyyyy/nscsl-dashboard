// src/pages/pdo/NSFDatabase.tsx
import React, { useState } from 'react';

import { NSFSummaryCards }    from './components/NSFSummaryCards';
import { NSFStatusChart }     from './components/NSFStatusChart';
import { NSFReactivateChart } from './components/NSFReactivateChart';
import { NSFTable }           from './components/NSFTable';

import { useNSFProvinces } from '../../hooks/PDOHooks/useNSFFacilities';
import { useAuth }         from '../../context/AuthContext';

// ── BEFORE ────────────────────────────────────────────────────────────────────
// export const NSFDatabase: React.FC = () => {
//   const { data: provinces = [] } = useNSFProvinces();
//   const { user }                 = useAuth();
//
//   return (
//     <div className="space-y-6 p-6">
//       <div>
//         <h1 className="text-xl font-bold text-gray-900 dark:text-white">NSF Database</h1>
//         <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
//           Non-Service Facility records and status overview
//         </p>
//       </div>
//       <NSFSummaryCards />
//       <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
//         <NSFStatusChart />
//         <NSFReactivateChart />
//       </div>
//       <NSFTable
//         provinces={provinces}
//         deletedBy={user?.username ?? 'system'}
//       />
//     </div>
//   );
// };
// ─────────────────────────────────────────────────────────────────────────────

// ── AFTER ─────────────────────────────────────────────────────────────────────
// 1. Added selectedProvince state (default empty = all provinces)
// 2. Added province dropdown in the page header
// 3. province passed to all 4 child components so everything filters together
// ─────────────────────────────────────────────────────────────────────────────

export const NSFDatabase: React.FC = () => {
  const { data: provinces = [] } = useNSFProvinces();
  const { user }                 = useAuth();

  // CHANGED: track selected province — empty string means "All Provinces"
  const [selectedProvince, setSelectedProvince] = useState('');

  return (
    <div className="space-y-6 p-6">

      {/* Page Header */}
      {/* CHANGED: flex row so province dropdown sits beside the title */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">NSF Database</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Non-Service Facility records and status overview
          </p>
        </div>

        {/* Province dropdown — fixed Region 4A provinces */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
            Province
          </label>
          <select
            value={selectedProvince}
            onChange={e => setSelectedProvince(e.target.value)}
            className="h-9 px-3 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Provinces</option>
            <option value="CAVITE">CAVITE</option>
            <option value="LAGUNA">LAGUNA</option>
            <option value="BATANGAS">BATANGAS</option>
            <option value="RIZAL">RIZAL</option>
            <option value="QUEZON">QUEZON</option>
          </select>
        </div>
      </div>

      {/* Summary Cards — CHANGED: pass province so cards filter */}
      <NSFSummaryCards province={selectedProvince || undefined} />

      {/* Charts — CHANGED: pass province so both charts filter */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <NSFStatusChart     province={selectedProvince || undefined} />
        <NSFReactivateChart province={selectedProvince || undefined} />
      </div>

      {/* Table — CHANGED: pass province via filterParams + filterLabel */}
      <NSFTable
        provinces={provinces}
        deletedBy={user?.username ?? 'system'}
        filterParams={selectedProvince ? { province: selectedProvince } : undefined}
        filterLabel={selectedProvince || undefined}
      />
    </div>
  );
};