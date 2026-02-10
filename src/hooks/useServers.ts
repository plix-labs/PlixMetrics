import { useState, useEffect } from 'react';
import { serversApi } from '../api/client';
import { PlexServer } from '../types';

export const useServers = () => {
    const [servers, setServers] = useState<PlexServer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchServers = async () => {
        try {
            setLoading(true);
            const response = await serversApi.list();
            setServers(response.data);
            setError(null);
        } catch (err: any) {
            console.error("Error fetching servers:", err);
            setError("Failed to load servers.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchServers();
    }, []);

    const removeServer = async (serverId: number) => {
        try {
            await serversApi.delete(serverId);
            // Refresh list after deletion
            await fetchServers();
        } catch (err: any) {
            console.error("Error removing server:", err);
            throw err;
        }
    };

    return { servers, loading, error, removeServer, refetch: fetchServers };
};
