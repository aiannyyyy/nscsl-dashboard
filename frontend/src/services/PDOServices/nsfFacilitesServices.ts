import api from '../api';

// ── INTERFACES ────────────────────────────────────────────────────────────────

export type NSFStatus            = 'active' | 'inactive' | 'closed' | 'partner';
export type NSFLogAction         = 'added' | 'reactivated' | 'deactivated' | 'deleted';
export type NSFReactivationFlag  = 'needs_reactivation' | 'ok';

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
    last_sample_sent?: string | null;
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
    last_sample_sent: string | null;
    last_po_date: string | null;
    province: string;
    months_since_last_sample: number;
    months_since_last_po: number;
    reactivation_flag: NSFReactivationFlag;
}

export interface NSFReactivationLog {
    id: number;
    facility_id: number;
    facility_name: string;
    facility_code: number;
    province: string | null;
    action: NSFLogAction;
    old_status: NSFStatus | null;
    new_status: NSFStatus | null;
    remarks: string | null;
    created_by: string | null;
    created_at: string;
}

// ── Reactivated by province (chart data) ─────────────────────────────────────
export interface NSFReactivatedByProvince {
    province: string;
    count: number;
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

export interface NSFReactivationParams {
    month?: string;
    year?: string;
}

export interface NSFReactivationLogsParams {
    facility_id?: number;
    action?: NSFLogAction;
    page?: number;
    limit?: number;
    month?: string;
    year?: string;
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

    async getAll(params?: NSFFilterParams): Promise<PaginatedResponse<NSFFacility>> {
        const response = await api.get('/nsf', { params });
        return response.data;
    }

    async getById(id: number): Promise<NSFFacility> {
        const response = await api.get(`/nsf/${id}`);
        return response.data.data;
    }

    async getSummaryCards(params?: NSFFilterParams): Promise<NSFSummaryCards> {
        const response = await api.get('/nsf/summary', { params });
        return response.data;
    }

    async getStatusDistribution(): Promise<NSFStatusDistribution[]> {
        const response = await api.get('/nsf/distribution');
        return response.data.data;
    }

    // Pure read — no mutations, safe to call freely
    async getReactivationStatus(params?: NSFReactivationParams): Promise<{
        data: NSFReactivationRecord[];
    }> {
        const response = await api.get('/nsf/reactivation', { params });
        return response.data;
    }

    // ✅ Chart data — only reactivated facilities grouped by province
    async getReactivatedByProvince(params?: NSFReactivationParams): Promise<{
        data: NSFReactivatedByProvince[];
        total: number;
    }> {
        const response = await api.get('/nsf/reactivation/by-province', { params });
        return response.data;
    }

    async getReactivationLogs(params?: NSFReactivationLogsParams): Promise<PaginatedResponse<NSFReactivationLog>> {
        const response = await api.get('/nsf/reactivation/logs', { params });
        return response.data;
    }

    async getProvinces(): Promise<string[]> {
        const response = await api.get('/nsf/provinces');
        return response.data.data;
    }

    async create(data: Partial<NSFFacility>): Promise<{ message: string; id: number }> {
        const response = await api.post('/nsf', data);
        return response.data;
    }

    async update(id: number, data: Partial<NSFFacility>): Promise<{
        message: string;
        status_changed: boolean;
        old_status: NSFStatus;
        new_status: NSFStatus;
    }> {
        const response = await api.put(`/nsf/${id}`, data);
        return response.data;
    }

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

    async syncLastSampleSent(): Promise<{
        message: string;
        total_facilities: number;
        updated: number;
        not_found_in_oracle: number;
    }> {
        const response = await api.post('/nsf/sync-last-sample-sent');
        return response.data;
    }

    async syncReactivationStatus(): Promise<{
        message: string;
        deactivated: number;
        reactivated: number;
    }> {
        const response = await api.post('/nsf/sync-reactivation');
        return response.data;
    }
}

export default new NSFFacilitiesService();