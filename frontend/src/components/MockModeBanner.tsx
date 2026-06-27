import React from 'react';
import { isMockMode } from '../mocks/config';

export const MockModeBanner: React.FC = () => {
  if (!isMockMode()) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[10000] px-4 py-2 rounded-full text-sm font-medium shadow-lg
        bg-amber-100 text-amber-900 border border-amber-300
        dark:bg-amber-900/90 dark:text-amber-100 dark:border-amber-700"
      role="status"
    >
      Portfolio demo — all data is mocked for display purposes.
    </div>
  );
};
