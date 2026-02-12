export interface PlexServer {
    id: number;
    name: string;
    tautulli_url: string;
    api_key_secret: string;
    created_at?: string;
}

export interface ActiveSession {
    session_id: string;
    title: string;
    user: string;
    player: string;
    status: 'playing' | 'paused' | 'buffering';
    ip_address: string;
    latitude?: number;
    longitude?: number;
    stream_container_decision?: string;
    quality_profile?: string;
    bandwidth?: number;
    server_name?: string;
    server_id?: number;
    thumb?: string;
    grandparent_thumb?: string;
    art?: string;
    grandparent_title?: string;
    parent_media_index?: string;
    media_index?: string;
    year?: string;
    duration?: number;
    view_offset?: number;
    progress_percent?: number;
    media_type?: 'movie' | 'episode' | 'track';
}

export interface NetworkStatus {
    total_bandwidth: number;
    total_stream_count: number;
    total_users?: number;
    total_libraries_size?: number;
    total_transcodes?: number;
    active_sessions: ActiveSession[];
}

export interface StatItem {
    rank: number;
    title: string;
    thumb?: string;
    art?: string;
    value: number;
    formatted_value: string;
    users_watched?: number;
    year?: string;
    server_id?: number;
    server_name?: string;
}

export interface UserStatItem {
    rank: number;
    user: string;
    user_thumb?: string;
    value: number;
    formatted_value: string;
    server_name: string;
    server_id: number;
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

export interface UserTableItem {
    user_id: number;
    username: string;
    friendly_name: string;
    thumb?: string;
    email: string;
    last_seen: number;
    ip_address: string;
    platform: string;
    player: string;
    last_played: string;
    total_plays: number;
    total_duration: number;
    server_id?: number;
    server_name?: string;
}

export interface HourlyActivityItem {
    hour: number;
    plays: number;
}

export interface DevicePreferenceItem {
    name: string;
    value: number; // percentage or count
}

export interface PlaybackHealthItem {
    name: string; // Direct Play, Transcode, etc.
    value: number;
    color?: string; // Optional, frontend can assign
}

export interface LibraryQualityItem {
    name: string; // Movie, TV Show
    '4K': number;
    '1080p': number;
    '720p': number;
    'SD': number;
}

export interface GenrePopularityItem {
    subject: string;
    A: number;
    fullMark: number;
}

export interface AnalyticsResponse {
    hourly_activity: HourlyActivityItem[];
    device_preferences: DevicePreferenceItem[];
    playback_health: PlaybackHealthItem[];
    library_quality: LibraryQualityItem[];
    genre_popularity: GenrePopularityItem[];
}
