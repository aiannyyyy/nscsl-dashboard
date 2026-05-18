import { useQuery } from '@tanstack/react-query';
import { getLabReagents } from '../../services/LaboratoryServices/labReagentsService';

export const useLabReagents = () => {
  return useQuery({
    queryKey: ['lab-reagents'],
    queryFn:  getLabReagents,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};