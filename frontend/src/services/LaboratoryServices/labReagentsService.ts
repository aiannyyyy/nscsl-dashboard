import api from '../api';

export type ReagentStatus = 'normal' | 'warning' | 'critical' | 'out-of-stock';

export interface ReagentThresholds {
  critical: number;
  warning: number;
  unit: string;
}

export interface LabReagent {
  itemCode: string;
  description: string;
  stock: number;
  unit: string;
  status: ReagentStatus;
  thresholds?: ReagentThresholds;
}

/** @deprecated Use LabReagent */
export type LabReagents = LabReagent;

export interface LabReagentsResponse {
  success: boolean;
  count: number;
  data: LabReagent[];
  timestamp: string;
}

export const getLabReagents = async (): Promise<LabReagentsResponse> => {
  const { data } = await api.get<LabReagentsResponse>('/laboratory/lab-reagents');
  return data;
};
