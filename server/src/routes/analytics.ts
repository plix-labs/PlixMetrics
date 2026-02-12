import { Router } from 'express';
import axios from 'axios';
import { getAllServersWithKeys } from './servers.js';
import { AnalyticsResponse, HourlyActivityItem, DevicePreferenceItem, PlaybackHealthItem, LibraryQualityItem, GenrePopularityItem } from '../types.js';

const router = Router();

// Helper to categorize platforms removed - using raw names now

/**
 * GET /api/analytics?days=30&server_id=all
 */
router.get('/', async (req, res) => {
    const start = Date.now();
    console.log('[Analytics] Request received:', req.query);

    try {
        const days = parseInt(req.query.days as string) || 30;
        const server_id = req.query.server_id as string;

        let servers = getAllServersWithKeys();
        console.log(`[Analytics] Found ${servers.length} total servers configured.`);

        if (servers.length === 0) {
            console.warn('[Analytics] No servers found in DB.');
            return res.status(404).json({ error: 'No servers configured' });
        }

        // Filter by server_id if specified
        if (server_id && server_id !== 'all') {
            servers = servers.filter(s => s.id === parseInt(server_id, 10));
            console.log(`[Analytics] Filtered to server ID ${server_id}. Server count: ${servers.length}`);
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
        console.log('[Analytics] Starting parallel fetch for servers...');
        await Promise.allSettled(servers.map(async (server) => {
            console.log(`[Analytics] Fetching data for server: ${server.name} (${server.tautulli_url})`);
            try {
                const apiParams = { apikey: server.api_key_secret, time_range: days };

                // 1. Hourly Activity
                console.log(`[Analytics] [${server.name}] Requesting get_plays_by_hourofday...`);
                const hourlyRes = await axios.get(`${server.tautulli_url}/api/v2`, {
                    params: { ...apiParams, cmd: 'get_plays_by_hourofday', stats_type: 0 }, // 0 = plays
                    timeout: 5000
                });

                if (hourlyRes.data.response.result === 'success') {
                    const data = hourlyRes.data.response.data;
                    // Response: series=[{name: "TV", data: [...]}, {name: "Movie", ...}], categories=["00", "01"...]
                    if (data.series && data.series.length > 0) {
                        // Sum up all series (TV, Movie, Music) for each hour
                        data.series.forEach((serie: any) => {
                            serie.data.forEach((count: number, index: number) => {
                                hourlyActivityMap.set(index, (hourlyActivityMap.get(index) || 0) + count);
                            });
                        });
                    }
                    console.log(`[Analytics] [${server.name}] get_plays_by_hourofday success.`);
                } else {
                    console.warn(`[Analytics] [${server.name}] get_plays_by_hourofday returned non-success:`, hourlyRes.data);
                }

                // 2. Playback Health & Device Preference
                console.log(`[Analytics] [${server.name}] Requesting get_plays_by_top_10_platforms...`);
                const platformsRes = await axios.get(`${server.tautulli_url}/api/v2`, {
                    params: { ...apiParams, cmd: 'get_plays_by_top_10_platforms' },
                    timeout: 5000
                });

                if (platformsRes.data.response.result === 'success') {
                    const data = platformsRes.data.response.data;
                    // Response: categories=["Android", "Chrome"...], series=[{name:"TV", data:[...]}, ...]
                    if (data.categories && data.series) {
                        // We iterate through categories (platforms)
                        data.categories.forEach((platform: string, index: number) => {
                            // Sum up counts from all series for this platform index
                            let count = 0;
                            data.series.forEach((serie: any) => {
                                count += (serie.data[index] || 0);
                            });

                            // Use raw platform name
                            deviceMap.set(platform, (deviceMap.get(platform) || 0) + count);
                            totalDevicePlays += count;
                        });
                    }
                    console.log(`[Analytics] [${server.name}] get_plays_by_top_10_platforms success.`);
                }

                console.log(`[Analytics] [${server.name}] Requesting get_stream_type_by_top_10_platforms...`);
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
                    console.log(`[Analytics] [${server.name}] get_stream_type_by_top_10_platforms success.`);
                }

                // 4. Genre Popularity (via Home Stats & Metadata)
                console.log(`[Analytics] [${server.name}] Requesting get_home_stats for genres...`);
                const homeStatsRes = await axios.get(`${server.tautulli_url}/api/v2`, {
                    params: { apikey: server.api_key_secret, cmd: 'get_home_stats', time_range: days },
                    timeout: 5000
                });

                if (homeStatsRes.data.response.result === 'success') {
                    const homeData = homeStatsRes.data.response.data; // Array of stat objects
                    const topItems: any[] = [];

                    // Helper to push items from stat rows
                    const collectItems = (statId: string) => {
                        const stat = Array.isArray(homeData) ? homeData.find((s: any) => s.stat_id === statId) : null;
                        if (stat && stat.rows) {
                            stat.rows.forEach((r: any) => topItems.push(r));
                        }
                    };

                    collectItems('top_movies');
                    collectItems('top_tv');

                    console.log(`[Analytics] [${server.name}] Found ${topItems.length} top items for genre analysis.`);

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
                                    const plays = item.total_plays || 1; // Weighted by plays
                                    meta.genres.forEach((g: string) => {
                                        genreMap.set(g, (genreMap.get(g) || 0) + plays);
                                    });
                                }
                            }
                        } catch (err) {
                            // Ignore individual metadata failures
                        }
                    }));
                    console.log(`[Analytics] [${server.name}] Genre analysis complete.`);
                }

                // 5. Library Quality
                console.log(`[Analytics] [${server.name}] Requesting get_libraries...`);
                const libsRes = await axios.get(`${server.tautulli_url}/api/v2`, {
                    params: { apikey: server.api_key_secret, cmd: 'get_libraries' },
                    timeout: 5000
                });

                if (libsRes.data.response.result === 'success') {
                    const libraries = libsRes.data.response.data;
                    console.log(`[Analytics] [${server.name}] Found ${libraries.length} libraries. Fetching media info...`);

                    for (const lib of libraries) {
                        const sectionId = lib.section_id;
                        // const libName = lib.section_name;
                        const isShow = lib.section_type === 'show';
                        const isMovie = lib.section_type === 'movie';

                        if (!isShow && !isMovie) continue;

                        const category = isMovie ? 'Movies' : 'TV Shows';

                        // Get media info (resolutions)
                        const mediaRes = await axios.get(`${server.tautulli_url}/api/v2`, {
                            params: { apikey: server.api_key_secret, cmd: 'get_library_media_info', section_id: sectionId },
                            timeout: 5000
                        });

                        if (mediaRes.data.response.result === 'success') {
                            const mediaData = mediaRes.data.response.data;
                            if (!librariesQualityMap.has(category)) {
                                librariesQualityMap.set(category, { '4K': 0, '1080p': 0, '720p': 0, 'SD': 0 });
                            }
                            const current = librariesQualityMap.get(category)!;
                            for (const key in mediaData) {
                                const val = parseInt(mediaData[key] || 0, 10);
                                if (key.includes('4k') || key.includes('2160')) current['4K'] += val;
                                else if (key.includes('1080')) current['1080p'] += val;
                                else if (key.includes('720')) current['720p'] += val;
                                else if (key.includes('sd') || key.includes('480') || key.includes('576')) current['SD'] += val;
                            }
                        }
                    }
                    console.log(`[Analytics] [${server.name}] Library media info processing complete.`);
                }

            } catch (err) {
                console.error(`[Analytics] Error fetching data for server ${server.name}:`, err);
            }
        }));

        console.log('[Analytics] All server requests completed (or settled). preparing response...');

        // construct response
        const hourly_activity: HourlyActivityItem[] = Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            plays: hourlyActivityMap.get(i) || 0
        }));

        // Process Device Preferences: Top 4 + Others
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

        // Process Genre Popularity
        const allGenres = Array.from(genreMap.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        // Take top 8 for Radar Chart
        const topGenres = allGenres.slice(0, 8);
        const maxGenreCount = topGenres.length > 0 ? topGenres[0].count : 100;

        // Map to Radar Chart format expected by frontend (subject, A, fullMark)
        const genre_popularity: GenrePopularityItem[] = topGenres.map((g: { name: string, count: number }) => ({
            subject: g.name,
            A: g.count,
            fullMark: maxGenreCount
        }));

        // Ensure percentages sum to 100? Pie chart handles it, but let's be cleaner. Actually strict math might result in 99 or 101.
        // Recharts Pie handles absolute values too if we don't normalize, but the frontend expects 'value' to be the percentage string in tooltip 'value%'.
        // Wait, frontend component displays `{value}%` in text. So it expects 0-100 number.
        // It's fine if they don't exactly equal 100, but logic above is correct for approximation.

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

        const duration = Date.now() - start;
        console.log(`[Analytics] Sending response. Total processing time: ${duration}ms`);
        res.json(response);

    } catch (error) {
        console.error('[Analytics] Critical error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
