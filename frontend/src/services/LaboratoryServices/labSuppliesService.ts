import api from '../api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SupplyStatus = 'normal' | 'warning' | 'critical' | 'out-of-stock';

export interface SupplyThresholds {
  critical: number;
  warning:  number;
  unit:     string;
}

export interface LabSupply {
  itemCode:    string;
  description: string;
  stock:       number;
  unit:        string;
  status:      SupplyStatus;
  thresholds:  SupplyThresholds;
}

export interface LabSuppliesResponse {
  success:   boolean;
  count:     number;
  data:      LabSupply[];
  timestamp: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const getLabSupplies = async (): Promise<LabSuppliesResponse> => {
  const { data } = await api.get<LabSuppliesResponse>('/laboratory/lab-supplies');
  return data;
};