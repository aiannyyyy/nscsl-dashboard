import React, { useState } from 'react';
import { EndorsementMnemonicChart } from '../laboratory/components/EndorsementMnemonicChart';
import { EndorsementCategoryChart } from '../laboratory/components/EndorsementCategoryChart';
import { EndorsementToFollowUpTable } from '../laboratory/components/EndorsementToFollowUpTable';

export const EndorsementToFollowUp: React.FC = () => {
  const [chartsExpanded, setChartsExpanded] = useState<'mnemonic' | 'category' | null>(null);

  return (
    <div className="space-y-6">
      {/* Row 1: Mnemonic Chart + Category Chart — 50/50 with expand */}
      <div className="grid grid-cols-12 gap-6">
        <div
          className={`transition-all duration-300
            ${
              chartsExpanded === 'mnemonic'
                ? 'col-span-8'
                : chartsExpanded === 'category'
                ? 'col-span-4'
                : 'col-span-6'
            }`}
        >
          <EndorsementMnemonicChart
            expanded={chartsExpanded === 'mnemonic'}
            onExpand={() =>
              setChartsExpanded(chartsExpanded === 'mnemonic' ? null : 'mnemonic')
            }
          />
        </div>

        <div
          className={`transition-all duration-300
            ${
              chartsExpanded === 'category'
                ? 'col-span-8'
                : chartsExpanded === 'mnemonic'
                ? 'col-span-4'
                : 'col-span-6'
            }`}
        >
          <EndorsementCategoryChart
            expanded={chartsExpanded === 'category'}
            onExpand={() =>
              setChartsExpanded(chartsExpanded === 'category' ? null : 'category')
            }
          />
        </div>
      </div>

      {/* Row 2: Full-width table */}
      <div className="grid grid-cols-1 gap-6">
        <EndorsementToFollowUpTable />
      </div>
    </div>
  );
};