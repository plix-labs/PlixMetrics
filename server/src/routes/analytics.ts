import { Router } from 'express';
import axios from 'axios';
import { getAllServersWithKeys } from './servers.js';
import { AnalyticsResponse, HourlyActivityItem, DevicePreferenceItem, PlaybackHealthItem, LibraryQualityItem, GenrePopularityItem } from '../types.js';

const router = Router();

/**
 * GET /api/analytics?days=30&server_id=all
 */
router.get('/', async (req, res) => {
    try {
        const days = parseInt(req.query.days as string) || 30;
        const server_id = req.query.server_id as string;

        let servers = getAllServersWithKeys();

        if (servers.length === 0) {
            console.warn('[Analytics] No servers found in DB.');
            return res.status(404).json({ error: 'No servers configured' });
        }

        // Filter by server_id if specified
        if (server_id && server_id !== 'all') {
            servers = servers.filter(s => s.id === parseInt(server_id, 10));
        }

        const hourlyActivityMap = new Map<number, number>();
        const deviceMap = new Map<string, number>();
        let totalDevicePlays = 0;
        let directPlayCount = 0;
        let directStreamCount = 0;
        let transcodeCount = 0;

        // For Library Quality
        const librariesQualityMap = new Map<string, { '4K': number, '1080p': number, '720p': number, 'SD': number }>();
        const genreMap = new Map<string, number>();

        // Fetch data from servers in parallel
        await Promise.allSettled(servers.map(async (server) => {
            try {
                // Fast health check before heavy query
                try {
                    await axios.get(`${server.tautulli_url}/api/v2`, {
                        params: { apikey: server.api_key_secret, cmd: 'get_activity' },
                        timeout: 1500
                    });
                } catch (e) {
                    return; // Skip if offline or unresponsive
                }

                const apiParams = { apikey: server.api_key_secret, time_range: days };

                // 1. Hourly Activity
                const hourlyRes = await axios.get(`${server.tautulli_url}/api/v2`, {
                    params: { ...apiParams, cmd: 'get_plays_by_hourofday', stats_type: 0 }, // 0 = plays
                    timeout: 5000
                });

                if (hourlyRes.data.response.result === 'success') {
                    const data = hourlyRes.data.response.data;
                    const categories = data.categories || [];
                    if (data.series && data.series.length > 0) {
                        data.series.forEach((serie: any) => {
                            serie.data.forEach((count: number, index: number) => {
                                // Use category label to determine the hour, fallback to index
                                const hourLabel = categories[index];
                                const hour = hourLabel !== undefined ? parseInt(hourLabel, 10) : index;
                                hourlyActivityMap.set(hour, (hourlyActivityMap.get(hour) || 0) + count);
                            });
                        });
                    }
                } else {
                    console.warn(`[Analytics] [${server.name}] get_plays_by_hourofday returned non-success:`, hourlyRes.data);
                }

                // 2. Playback Health & Device Preference
                const platformsRes = await axios.get(`${server.tautulli_url}/api/v2`, {
                    params: { ...apiParams, cmd: 'get_plays_by_top_10_platforms' },
                    timeout: 5000
                });

                if (platformsRes.data.response.result === 'success') {
                    const data = platformsRes.data.response.data;
                    if (data.categories && data.series) {
                        data.categories.forEach((platform: string, index: number) => {
                            let count = 0;
                            data.series.forEach((serie: any) => {
                                count += (serie.data[index] || 0);
                            });

                            deviceMap.set(platform, (deviceMap.get(platform) || 0) + count);
                            totalDevicePlays += count;
                        });
                    }
                }

                const healthRes = await axios.get(`${server.tautulli_url}/api/v2`, {
                    params: { ...apiParams, cmd: 'get_stream_type_by_top_10_platforms' },
                    timeout: 5000
                });

                if (healthRes.data.response.result === 'success') {
                    const data = healthRes.data.response.data;
                    if (data.series) {
                        data.series.forEach((s: any) => {
                            const sum = s.data.reduce((a: number, b: number) => a + b, 0);
                            if (s.name === 'Direct Play') directPlayCount += sum;
                            else if (s.name === 'Direct Stream') directStreamCount += sum;
                            else if (s.name === 'Transcode') transcodeCount += sum;
                        });
                    }
                }

                // 4. Genre Popularity (via Home Stats & Metadata)
                const homeStatsRes = await axios.get(`${server.tautulli_url}/api/v2`, {
                    params: { apikey: server.api_key_secret, cmd: 'get_home_stats', time_range: days },
                    timeout: 5000
                });

                if (homeStatsRes.data.response.result === 'success') {
                    const homeData = homeStatsRes.data.response.data;
                    const topItems: any[] = [];

                    const collectItems = (statId: string) => {
                        const stat = Array.isArray(homeData) ? homeData.find((s: any) => s.stat_id === statId) : null;
                        if (stat && stat.rows) {
                            stat.rows.forEach((r: any) => topItems.push(r));
                        }
                    };

                    collectItems('top_movies');
                    collectItems('top_tv');

                    // Fetch metadata for each item to get genres
                    // We limit to top 20 total items to avoid too many requests
                    const itemsToFetch = topItems.slice(0, 20);

                    await Promise.allSettled(itemsToFetch.map(async (item) => {
                        try {
                            const metaRes = await axios.get(`${server.tautulli_url}/api/v2`, {
                                params: { apikey: server.api_key_secret, cmd: 'get_metadata', rating_key: item.rating_key },
                                timeout: 5000
                            });

                            if (metaRes.data.response.result === 'success') {
                                const meta = metaRes.data.response.data;
                                if (meta.genres && Array.isArray(meta.genres)) {
                                    const plays = item.total_plays || 1;
                                    meta.genres.forEach((g: string) => {
                                        genreMap.set(g, (genreMap.get(g) || 0) + plays);
                                    });
                                }
                            }
                        } catch (err) {
                            // Ignore individual metadata failures
                        }
                    }));
                }

                // 5. Library Quality
                const libsRes = await axios.get(`${server.tautulli_url}/api/v2`, {
                    params: { apikey: server.api_key_secret, cmd: 'get_libraries' },
                    timeout: 5000
                });

                if (libsRes.data.response.result === 'success') {
                    const libraries = libsRes.data.response.data;

                    for (const lib of libraries) {
                        const sectionId = lib.section_id;
                        const isMovie = lib.section_type === 'movie';

                        // Only process Movies for now as TV Shows are WIP
                        if (!isMovie) continue;

                        const category = 'Movies';

                        const mediaRes = await axios.get(`${server.tautulli_url}/api/v2`, {
                            params: {
                                apikey: server.api_key_secret,
                                cmd: 'get_library_media_info',
                                section_id: sectionId,
                                length: 5000
                            },
                            timeout: 10000
                        });

                        if (mediaRes.data.response.result === 'success') {
                            const mediaRows = mediaRes.data.response.data.data;

                            if (Array.isArray(mediaRows)) {
                                if (!librariesQualityMap.has(category)) {
                                    librariesQualityMap.set(category, { '4K': 0, '1080p': 0, '720p': 0, 'SD': 0 });
                                }
                                const current = librariesQualityMap.get(category)!;

                                for (const row of mediaRows) {
                                    const res = String(row.video_resolution || '').toLowerCase();
                                    const isShow = row.media_type === 'show';

                                    if (res === '4k' || res === '2160' || res === 'uhd') {
                                        current['4K']++;
                                    } else if (res === '1080' || res === 'fhd') {
                                        current['1080p']++;
                                    } else if (res === '720' || res === 'hd') {
                                        current['720p']++;
                                    } else {
                                        if (isShow && res === '') {
                                            current['1080p']++;
                                        } else {
                                            current['SD']++;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

            } catch (err) {
                console.error(`[Analytics] Error fetching data for server ${server.name}:`, err);
            }
        }));

        // Construct response
        const hourly_activity: HourlyActivityItem[] = Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            plays: hourlyActivityMap.get(i) || 0
        }));

        const allDevices = Array.from(deviceMap.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        const topDevices = allDevices.slice(0, 4);
        const otherDevicesCount = allDevices.slice(4).reduce((sum, item) => sum + item.count, 0);

        const device_preferences: DevicePreferenceItem[] = topDevices.map(d => ({
            name: d.name,
            value: totalDevicePlays > 0 ? Math.round((d.count / totalDevicePlays) * 100) : 0
        }));

        if (otherDevicesCount > 0) {
            device_preferences.push({
                name: 'Others',
                value: totalDevicePlays > 0 ? Math.round((otherDevicesCount / totalDevicePlays) * 100) : 0
            });
        }

        const allGenres = Array.from(genreMap.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        const topGenres = allGenres.slice(0, 8);
        const maxGenreCount = topGenres.length > 0 ? topGenres[0].count : 100;

        const genre_popularity: GenrePopularityItem[] = topGenres.map((g: { name: string, count: number }) => ({
            subject: g.name,
            A: g.count,
            fullMark: maxGenreCount
        }));

        const playback_health: PlaybackHealthItem[] = [
            { name: 'Direct Play', value: directPlayCount, color: '#10b981' },
            { name: 'Direct Stream', value: directStreamCount, color: '#f59e0b' },
            { name: 'Transcode', value: transcodeCount, color: '#ef4444' }
        ];

        const library_quality: LibraryQualityItem[] = Array.from(librariesQualityMap.entries()).map(([name, counts]) => ({
            name,
            ...counts
        }));

        const response: AnalyticsResponse = {
            hourly_activity,
            device_preferences,
            playback_health,
            library_quality,
            genre_popularity
        };

        res.json(response);

    } catch (error) {
        console.error('[Analytics] Critical error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
