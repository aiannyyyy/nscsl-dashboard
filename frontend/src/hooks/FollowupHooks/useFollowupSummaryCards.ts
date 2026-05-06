import { useQuery } from '@tanstack/react-query';
import {
    getTotalRecallPerMonth,
    getTotalRecallPerDay,
    getTotalPending,
    getAverageRecallTime,
    getNurseRecallStats,
} from '../../services/FollowupServices/followupSummaryCardsServices';

const formatDiff = (diff: number, unit: string) => {
    if (diff > 0) return `↑ ${diff} ${unit}`;
    if (diff < 0) return `↓ ${Math.abs(diff)} ${unit}`;
    return `No change from ${unit === 'vs last month' ? 'last month' : 'yesterday'}`;
};

export const useFollowupSummaryCards = () => {
    const monthQuery = useQuery({
        queryKey: ['followup', 'summary-cards', 'total-recall-per-month'],
        queryFn: getTotalRecallPerMonth,
        refetchInterval: 30000,
    });

    const dayQuery = useQuery({
        queryKey: ['followup', 'summary-cards', 'total-recall-per-day'],
        queryFn: getTotalRecallPerDay,
        refetchInterval: 30000,
    });

    const pendingQuery = useQuery({
        queryKey: ['followup', 'summary-cards', 'total-pending'],
        queryFn: getTotalPending,
        refetchInterval: 30000,
    });

    const avgQuery = useQuery({
        queryKey: ['followup', 'summary-cards', 'average-recall-time'],
        queryFn: getAverageRecallTime,
        refetchInterval: 30000,
    });

    const nurseQuery = useQuery({
        queryKey: ['followup', 'summary-cards', 'nurse-recall-stats'],
        queryFn: getNurseRecallStats,
        refetchInterval: 30000,
    });

    // Month data
    const currentMonth = monthQuery.data?.data[0]?.current_month ?? 0;
    const lastMonth    = monthQuery.data?.data[0]?.last_month ?? 0;
    const monthDiff    = currentMonth - lastMonth;

    // Day data
    const todayCount     = dayQuery.data?.data[0]?.today_count ?? 0;
    const yesterdayCount = dayQuery.data?.data[0]?.yesterday_count ?? 0;
    const monthCount     = dayQuery.data?.data[0]?.month_count ?? 0;
    const dayDiff        = todayCount - yesterdayCount;
    const dayPct         = monthCount > 0 ? ((todayCount / monthCount) * 100).toFixed(1) : '0.0';

    // Pending data
    const currentPending   = pendingQuery.data?.data[0]?.current_pending ?? 0;
    const yesterdayPending = pendingQuery.data?.data[0]?.yesterday_pending ?? 0;
    const pendingDiff      = currentPending - yesterdayPending;

    // Avg data
    const currentAvgMin = avgQuery.data?.data[0]?.current_avg_minutes ?? 0;
    const lastAvgMin    = avgQuery.data?.data[0]?.last_avg_minutes ?? 0;
    const avgDiffMin    = Math.round(currentAvgMin - lastAvgMin);
    const currentAvgHrs = (currentAvgMin / 60).toFixed(2);

    return {
        totalRecallPerMonth: {
            value: currentMonth,
            sub: monthQuery.isLoading ? '...' : formatDiff(monthDiff, 'vs last month'),
            isLoading: monthQuery.isLoading,
            isError: monthQuery.isError,
        },
        totalRecallPerDay: {
            value: todayCount,
            sub: dayQuery.isLoading ? '...' : `${dayDiff >= 0 ? '+' : ''}${dayDiff} since yesterday · ${dayPct}% of month`,
            isLoading: dayQuery.isLoading,
            isError: dayQuery.isError,
        },
        totalPending: {
            value: currentPending,
            sub: pendingQuery.isLoading ? '...' : formatDiff(pendingDiff, 'vs yesterday'),
            isLoading: pendingQuery.isLoading,
            isError: pendingQuery.isError,
        },
        averageRecallTime: {
            value: avgQuery.isLoading ? '...' : `${currentAvgHrs}h`,
            sub: avgQuery.isLoading ? '...' : `${avgDiffMin >= 0 ? '+' : ''}${avgDiffMin} min vs last month`,
            isLoading: avgQuery.isLoading,
            isError: avgQuery.isError,
        },
        nurseRecallStats: {
        data: nurseQuery.data?.data ?? [],
        isLoading: nurseQuery.isLoading,
        isError: nurseQuery.isError,
        },
    };
};