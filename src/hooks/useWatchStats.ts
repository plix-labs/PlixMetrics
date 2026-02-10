import { useQuery } from '@tanstack/react-query';
import { statsApi } from '../api/client';
import { WatchStatsResponse, WatchStatsFilters } from '../types/statistics';

export const useWatchStats = (filters: WatchStatsFilters, enabled: boolean = true) => {
    return useQuery<WatchStatsResponse>({
        queryKey: ['watchStats', filters.days, filters.stat_type, filters.server_id],
        queryFn: async () => {
            const response = await statsApi.getWatchStats({
                days: filters.days,
                stat_type: filters.stat_type,
                server_id: filters.server_id
            });
            return response.data;
        },
        enabled, // Solo se ejecuta cuando enabled es true
        staleTime: 5 * 60 * 1000, // 5 min (datos históricos)
        gcTime: 10 * 60 * 1000,   // 10 min en caché
    });
};
