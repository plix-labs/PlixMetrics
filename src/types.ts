export interface PlexServer {
    id: number;
    name: string;
    tautulli_url: string;
    api_key_secret?: string;
    created_at?: any;
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
    bandwidth?: number;
    quality_profile?: string;
    stream_container_decision?: string;
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
    color?: string; // Optional
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
