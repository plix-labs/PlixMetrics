import { Router } from 'express';
import axios from 'axios';
import { getAllServersWithKeys } from './servers.js';
import { ActiveSession, NetworkStatus } from '../types.js';
import { batchGeoLookup, lookupIp, saveGeoCache } from '../services/geoip.js';
import { metadataCache, META_CACHE_DURATION_MS } from '../services/cache.js';

const router = Router();

/**
 * GET /api/network/status - Full network status (polled less frequently)
 */
router.get('/status', async (req, res) => {
    try {
        const servers = getAllServersWithKeys();

        if (servers.length === 0) {
            return res.json({
                total_bandwidth: 0,
                total_stream_count: 0,
                total_transcodes: 0,
                total_users: 0,
                total_libraries_size: 0,
                active_sessions: []
            });
        }

        const now = Date.now();

        // Fetch data from all servers
        const results = await Promise.allSettled(
            servers.map(async (server) => {
                try {
                    const metaCacheKey = `server-${server.id}`;
                    const cachedMeta = metadataCache.get(metaCacheKey);

                    let homeStats, usersData;

                    // Fetch Activity (Always fresh)
                    const activityRes = await axios.get(`${server.tautulli_url}/api/v2`, {
                        params: { apikey: server.api_key_secret, cmd: 'get_activity' },
                        timeout: 5000
                    });

                    if (activityRes.data.response.result !== 'success') return null;

                    // Fetch or Cache Stats/Users
                    if (cachedMeta && (now - cachedMeta.timestamp < META_CACHE_DURATION_MS)) {
                        ({ homeStats, usersData } = cachedMeta.stats);
                    } else {
                        const [hRes, uRes] = await Promise.all([
                            axios.get(`${server.tautulli_url}/api/v2`, {
                                params: { apikey: server.api_key_secret, cmd: 'get_home_stats' },
                                timeout: 5000
                            }),
                            axios.get(`${server.tautulli_url}/api/v2`, {
                                params: { apikey: server.api_key_secret, cmd: 'get_users' },
                                timeout: 5000
                            })
                        ]);
                        homeStats = hRes.data.response.data;
                        usersData = uRes.data.response.data;
                        metadataCache.set(metaCacheKey, {
                            timestamp: now,
                            stats: { homeStats, usersData }
                        });
                    }

                    // Extract plays in 24h
                    let plays24h = 0;
                    if (Array.isArray(homeStats)) {
                        const activityStat = homeStats.find((s: any) => s.stat_id === 'latest_statistics');
                        if (activityStat && activityStat.rows) {
                            const dayRow = activityStat.rows.find((r: any) => r.is_total && r.range === 'day');
                            if (dayRow) plays24h = parseInt(dayRow.count || '0', 10);
                        }
                    }

                    // Extract unique active users
                    const activeUserIds = new Set<string>();
                    if (Array.isArray(usersData)) {
                        usersData.forEach((u: any) => {
                            if (u.username && u.username !== 'Local' && u.username !== 'None') {
                                activeUserIds.add(u.username);
                            }
                        });
                    }

                    return {
                        server_name: server.name,
                        server_id: server.id,
                        data: activityRes.data.response.data,
                        plays_24h: plays24h,
                        users: Array.from(activeUserIds)
                    };
                } catch (error) {
                    console.error(`[Network] Failed to fetch ${server.name}:`, error);
                    return null;
                }
            })
        );

        // Process results
        let totalBandwidth = 0;
        let totalStreamCount = 0;
        let totalTranscodes = 0;
        let totalPlays24h = 0;
        const globalUniqueUsers = new Set<string>();
        const ipsToLookup: string[] = [];
        const sessionData: any[] = [];

        for (const result of results) {
            if (result.status === 'fulfilled' && result.value) {
                const serverData = result.value;
                totalStreamCount += parseInt(serverData.data.stream_count || '0', 10);
                totalPlays24h += serverData.plays_24h;
                serverData.users.forEach((u: string) => globalUniqueUsers.add(u));

                if (serverData.data.sessions && Array.isArray(serverData.data.sessions)) {
                    for (const session of serverData.data.sessions) {
                        let sessionBandwidth = parseInt(session.bandwidth || '0', 10);
                        if (session.stream_container_decision === 'transcode' || session.transcode_decision === 'transcode') {
                            totalTranscodes++;
                        }
                        if (sessionBandwidth >= 10000000) sessionBandwidth = 0;
                        totalBandwidth += sessionBandwidth;

                        const ipToLookup = session.ip_address_public || session.ip_address;
                        let lat: number | undefined = session.latitude ? parseFloat(session.latitude) : undefined;
                        let lon: number | undefined = session.longitude ? parseFloat(session.longitude) : undefined;

                        if ((!lat || !lon) && ipToLookup) {
                            ipsToLookup.push(ipToLookup);
                        }

                        sessionData.push({ session, serverData, sessionBandwidth, ipToLookup, lat, lon });
                    }
                }
            }
        }

        // Batch geo lookup
        const geoCache = await batchGeoLookup([...new Set(ipsToLookup)]);
        const allSessions: ActiveSession[] = [];
        const newGeoCache: Array<{ ip: string; lat: number; lon: number; city?: string; country?: string }> = [];

        for (const item of sessionData) {
            let { lat, lon } = item;
            const { session, serverData, sessionBandwidth, ipToLookup } = item;

            if ((!lat || !lon) && ipToLookup && geoCache.has(ipToLookup)) {
                const cached = geoCache.get(ipToLookup)!;
                lat = cached.lat;
                lon = cached.lon;
            }

            if ((!lat || !lon) && ipToLookup) {
                const geo = lookupIp(ipToLookup);
                if (geo) {
                    lat = geo.lat;
                    lon = geo.lon;
                    newGeoCache.push({ ip: ipToLookup, lat, lon, city: geo.city, country: geo.country });
                }
            }

            allSessions.push({
                session_id: `${serverData.server_id}-${session.session_id}`,
                title: session.full_title || session.title,
                user: session.user || session.username,
                player: session.player,
                status: session.state,
                ip_address: ipToLookup,
                latitude: lat,
                longitude: lon,
                bandwidth: sessionBandwidth,
                quality_profile: session.quality_profile,
                stream_container_decision: session.stream_container_decision,
                server_name: serverData.server_name,
                server_id: serverData.server_id,
                thumb: session.thumb,
                grandparent_thumb: session.grandparent_thumb,
                art: session.art,
                grandparent_title: session.grandparent_title,
                parent_media_index: session.parent_media_index,
                media_index: session.media_index,
                year: session.year,
                duration: parseInt(session.duration || '0', 10),
                view_offset: parseInt(session.view_offset || '0', 10),
                progress_percent: parseInt(session.progress_percent || '0', 10),
                media_type: session.media_type
            });
        }

        // Save new geo cache entries
        if (newGeoCache.length > 0) {
            saveGeoCache(newGeoCache);
        }

        const response: NetworkStatus = {
            total_bandwidth: totalBandwidth,
            total_stream_count: totalStreamCount,
            total_transcodes: totalTranscodes,
            total_users: globalUniqueUsers.size,
            total_libraries_size: totalPlays24h,
            active_sessions: allSessions
        };

        res.json(response);
    } catch (error) {
        console.error('[Network] Critical error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/network/sessions - Active sessions only (polled frequently)
 */
router.get('/sessions', async (req, res) => {
    try {
        const servers = getAllServersWithKeys();

        if (servers.length === 0) {
            return res.json({ active_sessions: [], total_stream_count: 0, total_bandwidth: 0 });
        }

        // Fetch ONLY activity (no stats/users)
        const results = await Promise.allSettled(
            servers.map(async (server) => {
                try {
                    const activityRes = await axios.get(`${server.tautulli_url}/api/v2`, {
                        params: { apikey: server.api_key_secret, cmd: 'get_activity' },
                        timeout: 5000
                    });

                    if (activityRes.data.response.result !== 'success') return null;

                    return {
                        server_name: server.name,
                        server_id: server.id,
                        data: activityRes.data.response.data
                    };
                } catch (error) {
                    console.error(`[Sessions] Failed to fetch ${server.name}:`, error);
                    return null;
                }
            })
        );

        // Process sessions
        const ipsToLookup: string[] = [];
        const sessionData: any[] = [];
        let totalBandwidth = 0;
        let totalStreamCount = 0;

        for (const result of results) {
            if (result.status === 'fulfilled' && result.value) {
                const serverData = result.value;
                totalStreamCount += parseInt(serverData.data.stream_count || '0', 10);

                if (serverData.data.sessions && Array.isArray(serverData.data.sessions)) {
                    for (const session of serverData.data.sessions) {
                        let sessionBandwidth = parseInt(session.bandwidth || '0', 10);
                        if (sessionBandwidth >= 10000000) sessionBandwidth = 0;
                        totalBandwidth += sessionBandwidth;

                        const ipToLookup = session.ip_address_public || session.ip_address;
                        let lat: number | undefined = session.latitude ? parseFloat(session.latitude) : undefined;
                        let lon: number | undefined = session.longitude ? parseFloat(session.longitude) : undefined;

                        if ((!lat || !lon) && ipToLookup) {
                            ipsToLookup.push(ipToLookup);
                        }

                        sessionData.push({ session, serverData, sessionBandwidth, ipToLookup, lat, lon });
                    }
                }
            }
        }

        // Batch geo lookup
        const geoCache = await batchGeoLookup([...new Set(ipsToLookup)]);
        const allSessions: ActiveSession[] = [];
        const newGeoCache: Array<{ ip: string; lat: number; lon: number; city?: string; country?: string }> = [];

        for (const item of sessionData) {
            let { lat, lon } = item;
            const { session, serverData, sessionBandwidth, ipToLookup } = item;

            if ((!lat || !lon) && ipToLookup && geoCache.has(ipToLookup)) {
                const cached = geoCache.get(ipToLookup)!;
                lat = cached.lat;
                lon = cached.lon;
            }

            if ((!lat || !lon) && ipToLookup) {
                const geo = lookupIp(ipToLookup);
                if (geo) {
                    lat = geo.lat;
                    lon = geo.lon;
                    newGeoCache.push({ ip: ipToLookup, lat, lon, city: geo.city, country: geo.country });
                }
            }

            allSessions.push({
                session_id: `${serverData.server_id}-${session.session_id}`,
                title: session.full_title || session.title,
                user: session.user || session.username,
                player: session.player,
                status: session.state,
                ip_address: ipToLookup,
                latitude: lat,
                longitude: lon,
                bandwidth: sessionBandwidth,
                quality_profile: session.quality_profile,
                stream_container_decision: session.stream_container_decision,
                server_name: serverData.server_name,
                server_id: serverData.server_id,
                thumb: session.thumb,
                grandparent_thumb: session.grandparent_thumb,
                art: session.art,
                grandparent_title: session.grandparent_title,
                parent_media_index: session.parent_media_index,
                media_index: session.media_index,
                year: session.year,
                duration: parseInt(session.duration || '0', 10),
                view_offset: parseInt(session.view_offset || '0', 10),
                progress_percent: parseInt(session.progress_percent || '0', 10),
                media_type: session.media_type
            });
        }

        if (newGeoCache.length > 0) {
            saveGeoCache(newGeoCache);
        }

        res.json({
            active_sessions: allSessions,
            total_stream_count: totalStreamCount,
            total_bandwidth: totalBandwidth
        });
    } catch (error) {
        console.error('[Sessions] Critical error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
