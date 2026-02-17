import { useState, useEffect } from 'react';
import { AnalyticsResponse } from '../types';
import { useAuth } from '../context/AuthContext';

interface UseAnalyticsResult {
    data: AnalyticsResponse | null;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
}

export const useAnalytics = (days: number, serverId: string, enabled: boolean = true): UseAnalyticsResult => {
    const [data, setData] = useState<AnalyticsResponse | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
    const { status } = useAuth(); // Need status to trigger re-fetch on login if needed
    const token = localStorage.getItem('plix_auth_token');

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const query = new URLSearchParams({
                days: days.toString(),
                server_id: serverId
            });

            const res = await fetch(`/api/analytics?${query.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                throw new Error(`Failed to fetch analytics: ${res.statusText}`);
            }

            const json = await res.json();
            setData(json);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Unknown error'));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!enabled) {
            setIsLoading(false);
            return;
        }

        if (status?.authenticated) {
            fetchData();
        } else if (status && !status.authenticated) {
            setIsLoading(false);
            setError(new Error('User not authenticated'));
        }
    }, [days, serverId, token, status, enabled]);

    return { data, isLoading, error, refetch: fetchData };
};
