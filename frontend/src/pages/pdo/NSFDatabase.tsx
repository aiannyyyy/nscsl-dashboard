// src/pages/pdo/NSFDatabase.tsx
import React from 'react';

import { NSFSummaryCards }    from './components/NSFSummaryCards';
import { NSFStatusChart }     from './components/NSFStatusChart';
import { NSFReactivateChart } from './components/NSFReactivateChart';
import { NSFTable }           from './components/NSFTable';

import { useNSFProvinces }   from '../../hooks/PDOHooks/useNSFFacilities';
import { useAuth }           from '../../context/AuthContext';

export const NSFDatabase: React.FC = () => {
  const { data: provinces = [] } = useNSFProvinces();
  const { user }                 = useAuth();

  return (
    <div className="space-y-6 p-6">

      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">NSF Database</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Non-Service Facility records and status overview
        </p>
      </div>

      {/* Summary Cards */}
      <NSFSummaryCards />

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <NSFStatusChart />
        <NSFReactivateChart />
      </div>

      {/* Table — Add Facility button lives here now */}
      <NSFTable
        provinces={provinces}
        deletedBy={user?.username ?? 'system'}
      />
    </div>
  );
};