import api from '../api';

export interface AccessState {
  [moduleKey: string]: {
    enabled: boolean;
    subItems: { [subKey: string]: boolean };
  };
}

// ─── GET /api/admin/access/:userId ───────────────────────────────────────────
export const fetchUserAccess = async (userId: number): Promise<AccessState> => {
  const { data } = await api.get(`/admin/access/${userId}`);
  return data;
};

// ─── PUT /api/admin/access/:userId ───────────────────────────────────────────
export const putUserAccess = async (userId: number, state: AccessState): Promise<void> => {
  await api.put(`/admin/access/${userId}`, state);
};