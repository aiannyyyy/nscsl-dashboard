import { useQuery } from '@tanstack/react-query';
import { getLabSupplies } from '../../services/LaboratoryServices/labSuppliesService';

export const useLabSupplies = () => {
  return useQuery({
    queryKey: ['lab-supplies'],
    queryFn:  getLabSupplies,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};