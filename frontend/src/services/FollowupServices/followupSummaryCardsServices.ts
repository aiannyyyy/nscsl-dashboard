import api from '../api';

export interface SummaryCardResponse<T> {
    success: boolean;
    data: T[];
}

export interface TotalRecallMonth {
    current_month: number;
    last_month: number;
}

export interface TotalRecallDay {
    today_count: number;
    yesterday_count: number;
    month_count: number;
}

export interface TotalPending {
    current_pending: number;
    yesterday_pending: number;
}

export interface AverageRecallTime {
    current_avg_minutes: number;
    last_avg_minutes: number;
}

export interface NurseRecallStat {
    nurse_name: string;
    total_recalled_month: number;
    total_recalled_today: number;
}

export const getTotalRecallPerMonth = async (): Promise<SummaryCardResponse<TotalRecallMonth>> => {
    const response = await api.get('/followup/summary-cards/total-count-per-month');
    return response.data;
};

export const getTotalRecallPerDay = async (): Promise<SummaryCardResponse<TotalRecallDay>> => {
    const response = await api.get('/followup/summary-cards/total-count-per-day');
    return response.data;
};

export const getTotalPending = async (): Promise<SummaryCardResponse<TotalPending>> => {
    const response = await api.get('/followup/summary-cards/total-pending');
    return response.data;
};

export const getAverageRecallTime = async (): Promise<SummaryCardResponse<AverageRecallTime>> => {
    const response = await api.get('/followup/summary-cards/average-recall-time');
    return response.data;
};

export const getNurseRecallStats = async (): Promise<SummaryCardResponse<NurseRecallStat>> => {
    const response = await api.get('/followup/summary-cards/nurse-recall-stats');
    return response.data;
};