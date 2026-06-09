import React from 'react';
import { LopezPurchasedFilterCardsTable } from './components/LopezPurchasedFilterCardsTable';
import { QuezonNearbyLopezSamplesTable } from './components/QuezonNearbyLopezSamplesTable';

export const LopezQuezonOverview = () => {
  return (
    <div className="p-6">
      <div className="grid grid-cols-2 gap-4">
        <QuezonNearbyLopezSamplesTable />
        <LopezPurchasedFilterCardsTable />
      </div>
    </div>
  );
};