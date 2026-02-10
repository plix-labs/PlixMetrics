import { Router } from 'express';
import axios from 'axios';
import { getAllServersWithKeys } from './servers.js';
import { WatchStatsResponse } from '../types.js';

const router = Router();

// Helper to format time (seconds to hh:mm:ss)
const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// Helper to format numbers with dot thousands separator
const formatNumber = (num: number): string => {
    if (num === undefined || num === null) return '0';
    const value = typeof num === 'string' ? parseInt(num, 10) : num;
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

/**
 * GET /api/stats?days=30&stat_type=plays&server_id=all
 */
router.get('/', async (req, res) => {
    try {
        const days = parseInt(req.query.days as string) || 30;
        const stat_type = (req.query.stat_type as string) || 'plays';
        const server_id = req.query.server_id as string;

        let servers = getAllServersWithKeys();

        if (servers.length === 0) {
            return res.status(404).json({ error: 'No servers configured' });
        }

        // Filter by server_id if specified
        if (server_id && server_id !== 'all') {
            servers = servers.filter(s => s.id === parseInt(server_id, 10));
        }

        const stats_type_num = stat_type === 'duration' ? '1' : '0';

        // Fetch home_stats from all servers
        const results = await Promise.allSettled(
            servers.map(async (server) => {
                try {
                    const res = await axios.get(`${server.tautulli_url}/api/v2`, {
                        params: {
                            apikey: server.api_key_secret,
                            cmd: 'get_home_stats',
                            time_range: days,
                            stats_type: stats_type_num
                        },
                        timeout: 10000
                    });

                    if (res.data.response.result !== 'success') return null;

                    return {
                        server_name: server.name,
                        server_id: server.id,
                        data: res.data.response.data
                    };
                } catch (error) {
                    console.error(`[Stats] Failed to fetch from ${server.name}:`, error);
                    return null;
                }
            })
        );

        // Aggregation maps
        const moviesWatchedMap = new Map<string, any>();
        const moviesPopularMap = new Map<string, any>();
        const showsWatchedMap = new Map<string, any>();
        const showsPopularMap = new Map<string, any>();
        const recentlyWatchedList: any[] = [];
        const librariesMap = new Map<string, any>();
        const usersMap = new Map<string, any>();
        const platformsMap = new Map<string, any>();
        const maxConcurrentList: any[] = [];

        for (const result of results) {
            if (result.status === 'fulfilled' && result.value) {
                const { server_name, server_id: serverId, data } = result.value;

                if (!Array.isArray(data)) continue;

                for (const statGroup of data) {
                    const statId = statGroup.stat_id;
                    const rows = statGroup.rows || [];

                    switch (statId) {
                        case 'popular_movies':
                            for (const row of rows) {
                                const key = `${row.title}-${row.year || ''}`;
                                if (!moviesPopularMap.has(key)) {
                                    moviesPopularMap.set(key, { ...row, users_watched: 0, server_id: serverId, server_name });
                                }
                                const existing = moviesPopularMap.get(key);
                                existing.users_watched += parseInt(row.users_watched || 0, 10);
                            }
                            break;

                        case 'popular_tv':
                            for (const row of rows) {
                                // Group by Title ONLY (ignore year diversity for same show)
                                const key = row.title;
                                if (!showsPopularMap.has(key)) {
                                    showsPopularMap.set(key, { ...row, users_watched: 0, server_id: serverId, server_name });
                                }
                                const existing = showsPopularMap.get(key);
                                existing.users_watched += parseInt(row.users_watched || 0, 10);
                            }
                            break;

                        case 'top_movies':
                            for (const row of rows) {
                                const key = `${row.title}-${row.year || ''}`;
                                const value = stat_type === 'duration' ? parseInt(row.total_duration || 0, 10) : parseInt(row.total_plays || 0, 10);
                                if (!moviesWatchedMap.has(key)) {
                                    moviesWatchedMap.set(key, { ...row, aggregated_value: 0, server_id: serverId, server_name });
                                }
                                moviesWatchedMap.get(key).aggregated_value += value;
                            }
                            break;

                        case 'top_tv':
                            for (const row of rows) {
                                // Group by Title ONLY (ignore year diversity for same show)
                                const key = row.title;
                                const value = stat_type === 'duration' ? parseInt(row.total_duration || 0, 10) : parseInt(row.total_plays || 0, 10);
                                if (!showsWatchedMap.has(key)) {
                                    showsWatchedMap.set(key, { ...row, aggregated_value: 0, server_id: serverId, server_name });
                                }
                                showsWatchedMap.get(key).aggregated_value += value;
                            }
                            break;

                        case 'last_watched':
                            for (const row of rows) {
                                recentlyWatchedList.push({ ...row, server_name, server_id: serverId });
                            }
                            break;

                        case 'top_libraries':
                            for (const row of rows) {
                                const key = `${row.section_name}-${serverId}`;
                                const value = stat_type === 'duration' ? parseInt(row.total_duration || 0, 10) : parseInt(row.total_plays || 0, 10);
                                librariesMap.set(key, {
                                    library_name: row.section_name,
                                    value,
                                    server_name,
                                    server_id: serverId
                                });
                            }
                            break;

                        case 'top_users':
                            for (const row of rows) {
                                const key = `${row.user}-${serverId}`;
                                const value = stat_type === 'duration' ? parseInt(row.total_duration || 0, 10) : parseInt(row.total_plays || 0, 10);
                                usersMap.set(key, {
                                    user: row.user,
                                    user_thumb: row.user_thumb,
                                    value,
                                    server_name,
                                    server_id: serverId
                                });
                            }
                            break;

                        case 'top_platforms':
                            for (const row of rows) {
                                const platform = row.platform || 'Unknown';
                                const value = stat_type === 'duration' ? parseInt(row.total_duration || 0, 10) : parseInt(row.total_plays || 0, 10);
                                if (!platformsMap.has(platform)) {
                                    platformsMap.set(platform, { platform, value: 0 });
                                }
                                platformsMap.get(platform).value += value;
                            }
                            break;

                        case 'most_concurrent':
                            let serverMaxStreams = 0;
                            let serverMaxTranscodes = 0;
                            let serverMaxDirectPlays = 0;
                            let serverMaxDirectStreams = 0;

                            for (const row of rows) {
                                const streams = parseInt(row.count || 0, 10);
                                const transcodes = parseInt(row.transcode_count || 0, 10);
                                const directPlays = parseInt(row.direct_play_count || 0, 10);
                                const directStreams = parseInt(row.direct_stream_count || 0, 10);

                                if (streams > serverMaxStreams) serverMaxStreams = streams;
                                if (transcodes > serverMaxTranscodes) serverMaxTranscodes = transcodes;
                                if (directPlays > serverMaxDirectPlays) serverMaxDirectPlays = directPlays;
                                if (directStreams > serverMaxDirectStreams) serverMaxDirectStreams = directStreams;
                            }

                            // Push PER SERVER stats
                            if (serverMaxStreams > 0) {
                                maxConcurrentList.push({
                                    server_name: server_name,
                                    concurrent_streams: serverMaxStreams,
                                    concurrent_transcodes: serverMaxTranscodes,
                                    concurrent_direct_streams: serverMaxDirectStreams,
                                    concurrent_direct_plays: serverMaxDirectPlays
                                });
                            }
                            break;
                    }
                }
            }
        }

        // Sort Concurrent List by Streams
        maxConcurrentList.sort((a, b) => b.concurrent_streams - a.concurrent_streams);

        // Sort and format helper
        const sortAndFormat = (map: Map<string, any>, valueKey = 'aggregated_value') => {
            return Array.from(map.values())
                .sort((a, b) => (b[valueKey] || b.value) - (a[valueKey] || a.value))
                .slice(0, 10)
                .map((item, index) => ({
                    rank: index + 1,
                    title: item.title,
                    thumb: item.thumb,
                    art: item.art,
                    year: item.year,
                    value: item[valueKey] || item.value,
                    formatted_value: stat_type === 'duration' ? formatTime(item[valueKey] || item.value) : formatNumber(item[valueKey] || item.value),
                    users_watched: item.users_watched,
                    server_id: item.server_id,
                    server_name: item.server_name
                }));
        };

        const response: WatchStatsResponse = {
            most_watched_movies: sortAndFormat(moviesWatchedMap),
            most_popular_movies: Array.from(moviesPopularMap.values())
                .sort((a, b) => b.users_watched - a.users_watched)
                .slice(0, 10)
                .map((item, index) => ({
                    rank: index + 1,
                    title: item.title,
                    thumb: item.thumb,
                    art: item.art,
                    year: item.year,
                    value: item.users_watched,
                    formatted_value: formatNumber(item.users_watched),
                    users_watched: item.users_watched,
                    server_id: item.server_id,
                    server_name: item.server_name
                })),
            most_watched_shows: sortAndFormat(showsWatchedMap),
            most_popular_shows: Array.from(showsPopularMap.values())
                .sort((a, b) => b.users_watched - a.users_watched)
                .slice(0, 10)
                .map((item, index) => ({
                    rank: index + 1,
                    title: item.title,
                    thumb: item.thumb,
                    art: item.art,
                    year: item.year,
                    value: item.users_watched,
                    formatted_value: formatNumber(item.users_watched),
                    users_watched: item.users_watched,
                    server_id: item.server_id,
                    server_name: item.server_name
                })),
            recently_watched: recentlyWatchedList
                .sort((a, b) => b.stopped - a.stopped)
                .slice(0, 10)
                .map((item, index) => ({
                    rank: index + 1,
                    title: item.full_title || item.title,
                    thumb: item.thumb,
                    art: item.art,
                    year: item.year,
                    value: item.stopped,
                    formatted_value: new Date(item.stopped * 1000).toLocaleString(),
                    server_id: item.server_id,
                    server_name: item.server_name
                })),
            most_active_libraries: Array.from(librariesMap.values())
                .sort((a, b) => b.value - a.value)
                .slice(0, 10)
                .map((item, index) => ({
                    rank: index + 1,
                    library_name: item.library_name,
                    value: item.value,
                    formatted_value: stat_type === 'duration' ? formatTime(item.value) : formatNumber(item.value),
                    server_name: item.server_name
                })),
            most_active_users: Array.from(usersMap.values())
                .sort((a, b) => b.value - a.value)
                .slice(0, 10)
                .map((item, index) => ({
                    rank: index + 1,
                    user: item.user,
                    user_thumb: item.user_thumb,
                    value: item.value,
                    formatted_value: stat_type === 'duration' ? formatTime(item.value) : formatNumber(item.value),
                    server_name: item.server_name,
                    server_id: item.server_id
                })),
            most_active_platforms: Array.from(platformsMap.values())
                .sort((a, b) => b.value - a.value)
                .slice(0, 10)
                .map((item, index) => ({
                    rank: index + 1,
                    platform: item.platform,
                    value: item.value,
                    formatted_value: stat_type === 'duration' ? formatTime(item.value) : formatNumber(item.value)
                })),
            most_concurrent_streams: maxConcurrentList
        };

        res.json(response);
    } catch (error) {
        console.error('[Stats] Critical error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * GET /api/stats/user/:username - Get detailed stats for a specific user
 */
router.get('/user/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const days = req.query.days ? parseInt(req.query.days as string) : 30;
        const decodeUser = decodeURIComponent(username);
        const servers = getAllServersWithKeys();

        if (servers.length === 0) {
            return res.status(404).json({ error: 'No servers configured' });
        }

        const userStats = {
            username: decodeUser,
            total_plays: 0,
            total_duration: 0,
            first_seen: null as number | null,
            last_seen: null as number | null,
            platforms: new Map<string, number>(),
            players: new Map<string, number>(),
            ips: new Set<string>(),
            last_watched: [] as any[],
            hourly_activity: new Array(24).fill(0),
            server_breakdown: [] as any[]
        };

        await Promise.allSettled(
            servers.map(async (server) => {
                try {
                    // Fetch generic history for user to calculate totals and timeline
                    const apiParams: any = {
                        apikey: server.api_key_secret,
                        cmd: 'get_history',
                        user: decodeUser,
                        length: 5000 // Catch broad history
                    };

                    let cutoffTimestamp = 0;
                    if (days > 0) {
                        const date = new Date();
                        date.setDate(date.getDate() - days);
                        cutoffTimestamp = Math.floor(date.getTime() / 1000);
                    }


                    const historyRes = await axios.get(`${server.tautulli_url}/api/v2`, {
                        params: apiParams,
                        timeout: 20000 // Increased timeout for larger payload
                    });

                    if (historyRes.data.response.result !== 'success') return;

                    const history = historyRes.data.response.data.data;
                    console.log(`[Stats] Server ${server.name} returned ${history.length} items`);

                    // Fetch user specific stats if available (often requires user_id, which we might not have easily, so relying on history is safer)

                    let serverPlays = 0;
                    let serverDuration = 0;

                    if (Array.isArray(history)) {
                        for (const play of history) {
                            const date = parseInt(play.date, 10);

                            // Timestamps (Global - always calculate regardless of time filter)
                            if (!userStats.first_seen || date < userStats.first_seen) userStats.first_seen = date;
                            if (!userStats.last_seen || date > userStats.last_seen) userStats.last_seen = date;

                            // Double-check filter (in case API returns more than requested)
                            if (days > 0 && date < cutoffTimestamp) {
                                // console.log(`[Stats] Skipped old play: ${date} < ${cutoffTimestamp}`);
                                continue;
                            }

                            // Aggregates
                            serverPlays++;
                            const duration = parseInt(play.duration || 0, 10);
                            serverDuration += duration;

                            // Platforms & Players
                            const platform = play.platform || 'Unknown';
                            const player = play.player || 'Unknown';
                            userStats.platforms.set(platform, (userStats.platforms.get(platform) || 0) + 1);
                            userStats.players.set(player, (userStats.players.get(player) || 0) + 1);

                            // IP tracking (geo-history)
                            if (play.ip_address) userStats.ips.add(play.ip_address);

                            // Hourly heatmap
                            const playDate = new Date(date * 1000);
                            const hour = playDate.getHours();
                            userStats.hourly_activity[hour]++;
                        }

                        // Add top 5 recent from this server to later sort
                        userStats.last_watched.push(...history.slice(0, 5).map(h => ({ ...h, server_name: server.name })));
                    }

                    userStats.server_breakdown.push({
                        server_name: server.name,
                        plays: serverPlays,
                        duration: serverDuration
                    });

                    userStats.total_plays += serverPlays;
                    userStats.total_duration += serverDuration;

                } catch (error) {
                    console.error(`[Stats] Failed to fetch user stats from ${server.name}:`, error);
                }
            })
        );

        // Final formatting
        const formattedResponse = {
            username: userStats.username,
            total_plays: userStats.total_plays,
            total_duration: userStats.total_duration,
            formatted_total_duration: formatTime(userStats.total_duration),
            first_seen: userStats.first_seen,
            last_seen: userStats.last_seen,
            platforms: Array.from(userStats.platforms.entries())
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count),
            players: Array.from(userStats.players.entries())
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5),
            known_ips: Array.from(userStats.ips).slice(0, 10), // Limit IP exposure
            last_watched: userStats.last_watched
                .sort((a, b) => b.date - a.date)
                .slice(0, 5)
                .map(item => ({
                    title: item.full_title || item.title,
                    type: item.media_type,
                    date: item.date,
                    thumb: item.thumb,
                    server_name: item.server_name,
                    server_id: item.server_id // Passthrough if needed for proxy
                })),
            activity_heatmap: userStats.hourly_activity,
            server_breakdown: userStats.server_breakdown
        };

        res.json(formattedResponse);

    } catch (error) {
        console.error('[Stats] Error fetching user details:', error);
        res.status(500).json({ error: 'Failed to fetch user details' });
    }
});

export default router;
