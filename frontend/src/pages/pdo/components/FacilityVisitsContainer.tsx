import React, { useState } from 'react';
import { FacilityVisitsChart } from './FacilityVisitsChart';
import { FacilityVisits } from './FacilityVisits';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const FacilityVisitsContainer: React.FC = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedProvince, setSelectedProvince] = useState('All Provinces');
  const [selectedMonth, setSelectedMonth] = useState(
    MONTHS[new Date().getMonth()]
  );
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString()
  );

  const handleDataChange = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[300px]">
        {/* Table — left, 2 cols */}
        <div className="lg:col-span-2 h-full">
          <FacilityVisits
            onDataChange={handleDataChange}
            selectedProvince={selectedProvince}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
          />
        </div>

        {/* Chart — right, 1 col */}
        <div className="lg:col-span-1 h-full">
          <FacilityVisitsChart
            refreshTrigger={refreshTrigger}
            selectedProvince={selectedProvince}
            onProvinceChange={setSelectedProvince}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
          />
        </div>
      </div>
    </div>
  );
};