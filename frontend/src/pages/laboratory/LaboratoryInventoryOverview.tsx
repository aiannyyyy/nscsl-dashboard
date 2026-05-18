import React from 'react';
import { LaboratorySupplies } from './components/LaboratorySupplies';
import { ReagentSupplies } from './components/ReagentSupplies';
import { InventorySummaryCards } from './components/InventorySummaryCards';

export const LaboratoryInventoryOverview: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Summary Cards Row */}
      <InventorySummaryCards />

      {/* Supplies Row — 50/50 split */}
      <div className="grid grid-cols-2 gap-6">
        <ReagentSupplies />
        <LaboratorySupplies />
      </div>
    </div>
  );
};