// Watch Statistics Types (matching backend)
export interface StatItem {
    rank: number;
    title: string;
    thumb?: string;
    art?: string;
    value: number;
    formatted_value: string;
    users_watched?: number;
    year?: string;
    server_id?: string;
    server_name?: string;
}

export interface UserStatItem {
    rank: number;
    user: string;
    user_thumb?: string;
    value: number;
    formatted_value: string;
    server_name: string;
    server_id: string;
}

export interface LibraryStatItem {
    rank: number;
    library_name: string;
    value: number;
    formatted_value: string;
    server_name?: string;
}

export interface PlatformStatItem {
    rank: number;
    platform: string;
    value: number;
    formatted_value: string;
}

export interface ConcurrentStreamsItem {
    concurrent_streams: number;
    concurrent_transcodes: number;
    concurrent_direct_streams: number;
    concurrent_direct_plays: number;
    server_name?: string;
}

export interface WatchStatsResponse {
    most_watched_movies: StatItem[];
    most_popular_movies: StatItem[];
    most_watched_shows: StatItem[];
    most_popular_shows: StatItem[];
    recently_watched: StatItem[];
    most_active_libraries: LibraryStatItem[];
    most_active_users: UserStatItem[];
    most_active_platforms: PlatformStatItem[];
    most_concurrent_streams: ConcurrentStreamsItem[];
}

export type StatType = 'plays' | 'duration';

export interface WatchStatsFilters {
    days: number;
    stat_type: StatType;
    server_id: string; // 'all' or server id
}
