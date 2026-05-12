import React, { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PatientInformationSystem } from './components/PatientInformationSystem';
import type { SearchParams, SampleRecord } from './components/PatientInformationSystem';
import { searchPatients } from '../../services/FollowupServices/pisServices';

export const FollowUpPatientInformationSystem: React.FC = () => {
  const [searchParams] = useSearchParams();
  const labFromUrl = searchParams.get('labNumber')?.trim() || null;

  const [results, setResults]       = useState<SampleRecord[]>([]);
  const [isLoading, setIsLoading]   = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const handleSearch = useCallback(async (params: SearchParams) => {
    setIsLoading(true);
    try {
      const response = await searchPatients(params as unknown as Record<string, string>);

      if (response.success) {
        setResults(response.data as unknown as SampleRecord[]);
        setTotalCount(response.count);
      } else {
        setResults([]);
        setTotalCount(0);
      }
    } catch (error: any) {
      console.error('[PIS Container] Search error:', error);
      setResults([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <PatientInformationSystem
      onSearch={handleSearch}
      results={results}
      isLoading={isLoading}
      totalCount={totalCount}
      deeplinkLabNumber={labFromUrl}
    />
  );
};

export default FollowUpPatientInformationSystem;