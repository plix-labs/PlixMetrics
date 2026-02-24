import { useQuery } from '@tanstack/react-query';
import { statsApi } from '../api/client';

export interface UserDetails {
    username: string;
    total_plays: number;
    total_duration: number;
    formatted_total_duration: string;
    first_seen: number;
    last_seen: number;
    platforms: { name: string; count: number }[];
    players: { name: string; count: number }[];
    known_ips: string[];
    locations: { lat: number; lon: number; ip: string; date: number }[];
    last_watched: {
        title: string;
        type: string;
        date: number;
        thumb?: string;
        server_name: string;
        server_id: string;
    }[];
    activity_heatmap: number[]; // 24 hours
    server_breakdown: {
        server_name: string;
        plays: number;
        duration: number;
    }[];
}

export const useUserDetails = (username: string | null, days: number = 30, serverId?: number | string | null) => {
    return useQuery<UserDetails>({
        queryKey: ['userDetails', username, days, serverId],
        queryFn: async () => {
            if (!username) throw new Error('No username provided');
            const response = await statsApi.getUserDetails(username, days, serverId);
            return response.data;
        },
        enabled: !!username,
        staleTime: 60000 * 5, // 5 minutes cache
    });
};
