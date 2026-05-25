import api from '../api';

// ── INTERFACES ────────────────────────────────────────────────────────────────

export type NSFStatus = 'active' | 'inactive' | 'closed' | 'partner';
export type NSFLogAction = 'added' | 'reactivated' | 'deactivated' | 'deleted';
export type NSFReactivationFlag = 'needs_reactivation' | 'ok';

export interface NSFFacility {
    id?: number;
    facility_code: number;
    facility_name: string;
    category?: string | null;
    type1?: string | null;
    type2?: string | null;
    medical_director?: string | null;
    contact_person?: string | null;
    designation?: string | null;
    tel_cell?: string | null;
    fax?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    province?: string | null;
    region?: string | null;
    date_accredited?: string | null;
    year_accredited?: number | null;
    status: NSFStatus;
    last_po_date?: string | null;
    po_number?: string | null;
    created_by?: string | null;
    created_date?: string | null;
    modified_by?: string | null;
    modified_date?: string | null;
    remarks?: string | null;
}

export interface NSFSummaryCards {
    total: number;
    active: number;
    inactive: number;
    closed: number;
    partner: number;
}

export interface NSFStatusDistribution {
    status: NSFStatus;
    count: number;
}

export interface NSFReactivationRecord {
    id: number;
    facility_code: number;
    facility_name: string;
    status: NSFStatus;
    last_po_date: string;
    province: string;
    months_since_po: number;
    reactivation_flag: NSFReactivationFlag;
}

export interface NSFReactivationLog {
    id: number;
    facility_id: number;
    facility_name: string;
    facility_code: number;
    action: NSFLogAction;
    old_status: NSFStatus | null;
    new_status: NSFStatus | null;
    remarks: string | null;
    created_by: string | null;
    created_at: string;
}

// ── FILTER PARAMS ─────────────────────────────────────────────────────────────

export interface NSFFilterParams {
    month?: string;
    year?: string;
    status?: string;
    province?: string;
    search?: string;
    page?: number;
    limit?: number;
}

// ── REACTIVATION FILTER PARAMS (separate — only month/year by last_po_date) ──
export interface NSFReactivationParams {
    month?: string;
    year?:  string;
}

// ── REACTIVATION LOGS FILTER PARAMS ──────────────────────────────────────────
export interface NSFReactivationLogsParams {
    facility_id?: number;
    action?:      NSFLogAction;
    page?:        number;
    limit?:       number;
    month?:       string;   // filter by created_at month
    year?:        string;   // filter by created_at year
}

// ── PAGINATED RESPONSE ────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}

// ── SERVICE ───────────────────────────────────────────────────────────────────

class NSFFacilitiesService {

    // Get all facilities with filters + pagination
    async getAll(params?: NSFFilterParams): Promise<PaginatedResponse<NSFFacility>> {
        const response = await api.get('/nsf', { params });
        return response.data;
    }

    // Get single facility by ID
    async getById(id: number): Promise<NSFFacility> {
        const response = await api.get(`/nsf/${id}`);
        return response.data.data;
    }

    // Get summary cards (total, active, inactive, closed, partner)
    async getSummaryCards(params?: NSFFilterParams): Promise<NSFSummaryCards> {
        const response = await api.get('/nsf/summary', { params });
        return response.data;
    }

    // Get status distribution for chart
    async getStatusDistribution(): Promise<NSFStatusDistribution[]> {
        const response = await api.get('/nsf/distribution');
        return response.data.data;
    }

    // Get reactivation status — filters by last_po_date month/year only
    async getReactivationStatus(params?: NSFReactivationParams): Promise<{
        data:             NSFReactivationRecord[];
        auto_deactivated: number;
        auto_reactivated: number;
    }> {
        const response = await api.get('/nsf/reactivation', { params });
        return response.data;
    }

    // Get reactivation logs (paginated, filterable by facility_id, action, month, year)
    async getReactivationLogs(params?: NSFReactivationLogsParams): Promise<PaginatedResponse<NSFReactivationLog>> {
        const response = await api.get('/nsf/reactivation/logs', { params });
        return response.data;
    }

    // Get provinces for dropdown
    async getProvinces(): Promise<string[]> {
        const response = await api.get('/nsf/provinces');
        return response.data.data;
    }

    // Add new facility
    async create(data: Partial<NSFFacility>): Promise<{ message: string; id: number }> {
        const response = await api.post('/nsf', data);
        return response.data;
    }

    // Update facility
    async update(id: number, data: Partial<NSFFacility>): Promise<{
        message: string;
        status_changed: boolean;
        old_status: NSFStatus;
        new_status: NSFStatus;
    }> {
        const response = await api.put(`/nsf/${id}`, data);
        return response.data;
    }

    // Delete facility
    async delete(id: number, deleted_by: string): Promise<{ message: string }> {
        const response = await api.delete(`/nsf/${id}`, {
            data: { deleted_by },
        });
        return response.data;
    }

    async getSummaryTrend(params?: { month?: string; year?: string }): Promise<NSFSummaryCards> {
    const response = await api.get('/nsf/summary/trend', { params });
    return response.data;
}
}

export default new NSFFacilitiesService();