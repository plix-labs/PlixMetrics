import { useQuery } from '@tanstack/react-query';
import { networkApi } from '../api/client';
import { NetworkStatus } from '../types';

interface ActiveSessionsResponse {
    active_sessions: any[];
    total_stream_count: number;
    total_bandwidth: number;
}

export const usePlexNetwork = () => {
    // Query for full network status (polled less frequently)
    const fullStatusQuery = useQuery<NetworkStatus>({
        queryKey: ['networkStatus'],
        queryFn: async () => {
            const response = await networkApi.getStatus();
            return response.data;
        },
        staleTime: 60000, // Full stats fresh for 60s
        refetchInterval: 120000, // Refetch every 2 minutes
    });

    // Query for active sessions (polled frequently)
    const sessionsQuery = useQuery<ActiveSessionsResponse>({
        queryKey: ['activeSessions'],
        queryFn: async () => {
            const response = await networkApi.getSessions();
            return response.data;
        },
        staleTime: 5000, // Sessions fresh for 5s
        refetchInterval: (query) => {
            // Adaptive polling: 10s if active sessions, 60s if idle
            const hasActiveSessions = query.state.data && query.state.data.total_stream_count > 0;
            return hasActiveSessions ? 10000 : 60000;
        },
    });

    // Merge data from both queries
    const data: NetworkStatus | null = fullStatusQuery.data ? {
        ...fullStatusQuery.data,
        // Override sessions and counts with fresh data
        active_sessions: sessionsQuery.data?.active_sessions || fullStatusQuery.data.active_sessions,
        total_stream_count: sessionsQuery.data?.total_stream_count ?? fullStatusQuery.data.total_stream_count,
        total_bandwidth: sessionsQuery.data?.total_bandwidth ?? fullStatusQuery.data.total_bandwidth,
    } : null;

    const loading = fullStatusQuery.isLoading && sessionsQuery.isLoading;
    const error = fullStatusQuery.error || sessionsQuery.error;

    return {
        data,
        loading,
        error: error ? String(error) : null,
        refetch: () => {
            fullStatusQuery.refetch();
            sessionsQuery.refetch();
        }
    };
};
