import React from 'react';
import { NurseCards } from './component/NurseCards';
import { FollowupStats } from './component/FollowupStats';

//import { FollowupQueue } from './component/FollowupQueue';
//import { ActivityFeed } from './component/ActivityFeed';
import { PatientDetails } from './component/PatientDetails';

export const FollowupOverview: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      {/* Page Header */}
      <header className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Follow-Up Dashboard
            </h1>
          </div>
        </div>
      </header>

      {/* Stats Strip */}
      <div className="mb-6">
        <FollowupStats />
      </div>

      {/* Nurse Cards */}
      <div className="mb-6">
        <NurseCards />
      </div>

      <PatientDetails />
    </div>
  );
};