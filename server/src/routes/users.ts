import { Router } from 'express';
import axios from 'axios';
import { getAllServersWithKeys } from './servers.js';
import { UserTableItem } from '../types.js';

const router = Router();

// Helper to calculate time ago or format dates
// We'll return raw timestamps mostly, frontend can format

/**
 * GET /api/users
 * Returns a list of users, optionally filtered by server_id
 */
router.get('/', async (req, res) => {
    try {
        const server_id = req.query.server_id as string;
        let servers = getAllServersWithKeys();

        if (servers.length === 0) {
            return res.json([]);
        }

        if (server_id && server_id !== 'all') {
            servers = servers.filter(s => s.id === parseInt(server_id, 10));
        }

        // Map to aggregate users across servers
        // Key: user_id (Plex User ID)
        const usersMap = new Map<number, UserTableItem>();

        await Promise.allSettled(
            servers.map(async (server) => {
                try {
                    // Fast health check before heavy query
                    try {
                        await axios.get(`${server.tautulli_url}/api/v2`, {
                            params: { apikey: server.api_key_secret, cmd: 'status' },
                            timeout: 2000
                        });
                    } catch (e) {
                        return; // Skip if offline or unresponsive
                    }

                    // --- Fetch users table and recent history IN PARALLEL for zero extra latency ---
                    const [usersResult, historyResult] = await Promise.allSettled([
                        axios.get(`${server.tautulli_url}/api/v2`, {
                            params: {
                                apikey: server.api_key_secret,
                                cmd: 'get_users_table',
                                length: 1000,
                                order_column: 'last_seen',
                                order_dir: 'desc'
                            },
                            timeout: 30000
                        }),
                        axios.get(`${server.tautulli_url}/api/v2`, {
                            params: {
                                apikey: server.api_key_secret,
                                cmd: 'get_history',
                                length: 1000,
                                order_column: 'date',
                                order_dir: 'desc'
                            },
                            timeout: 15000
                        })
                    ]);

                    if (usersResult.status !== 'fulfilled') return;
                    const usersResponse = usersResult.value;

                    if (usersResponse.data.response.result !== 'success') {
                        console.warn(`[Users] Failed to fetch users from server ${server.name}:`, usersResponse.data.response.message);
                        return;
                    }

                    const usersRows = usersResponse.data.response.data.data;
                    if (!Array.isArray(usersRows)) return;

                    // --- Build IP map from history (more reliable than get_users_table.ip_address) ---
                    const userIpMap = new Map<string, string>(); // username -> most recent real ip
                    if (historyResult.status === 'fulfilled' && historyResult.value.data.response.result === 'success') {
                        const historyRows = historyResult.value.data.response.data.data;
                        if (Array.isArray(historyRows)) {
                            for (const entry of historyRows) {
                                const username = entry.user;
                                const ip = entry.ip_address;
                                // Skip loopback, relay, or empty IPs
                                if (username && ip && ip !== '127.0.0.1' && ip !== '::1' && ip.trim() !== '') {
                                    if (!userIpMap.has(username)) {
                                        // History is sorted by date desc → first hit = most recent real IP
                                        userIpMap.set(username, ip);
                                    }
                                }
                            }
                        }
                    } else {
                        console.warn(`[Users] History fetch skipped or failed for ${server.name}, IPs may be less accurate.`);
                    }


                    for (const row of usersRows) {
                        const userId = parseInt(row.user_id, 10);
                        if (!userId) continue;

                        const lastSeen = parseInt(row.last_seen || 0, 10);
                        const plays = parseInt(row.plays || 0, 10);
                        const duration = parseInt(row.duration || 0, 10);

                        let ipAddress = row.ip_address;
                        // Enrich IP address using history map if current one is local or blank
                        if ((ipAddress === '127.0.0.1' || ipAddress === '') && userIpMap.has(row.user)) {
                            ipAddress = userIpMap.get(row.user)!;
                        }

                        if (!usersMap.has(userId)) {
                            // First time seeing this user
                            usersMap.set(userId, {
                                user_id: userId,
                                username: row.user, // Sometimes 'user' is username
                                friendly_name: row.friendly_name || row.user,
                                thumb: row.thumb,
                                email: row.email,
                                last_seen: lastSeen,
                                ip_address: ipAddress,
                                platform: row.platform,
                                player: row.player,
                                last_played: row.last_played || row.title || '', // API varies
                                total_plays: plays,
                                total_duration: duration,
                                server_name: server.name,
                                server_id: server.id
                            });
                        } else {
                            // Merge logic
                            const existing = usersMap.get(userId)!;

                            // Sum stats
                            existing.total_plays += plays;
                            existing.total_duration += duration;

                            // Update "Last Seen" info if this record is newer
                            if (lastSeen > existing.last_seen) {
                                existing.last_seen = lastSeen;
                                existing.ip_address = ipAddress; // Use the potentially enriched IP
                                existing.platform = row.platform;
                                existing.player = row.player;
                                existing.last_played = row.last_played || row.title || '';
                                existing.server_name = server.name; // User was seen here last
                                existing.server_id = server.id;
                                existing.friendly_name = row.friendly_name || existing.friendly_name;
                                existing.thumb = row.thumb || existing.thumb;
                            } else if ((existing.ip_address === '127.0.0.1' || existing.ip_address === '') && ipAddress !== '127.0.0.1' && ipAddress !== '') {
                                // If existing IP is local/blank, but current row's (potentially enriched) IP is real, update it
                                existing.ip_address = ipAddress;
                            }
                        }
                    }

                } catch (error) {
                    console.error(`[Users] Error fetching from ${server.name}:`, error);
                }
            })
        );

        const usersList = Array.from(usersMap.values());

        // Sort by last_seen desc
        usersList.sort((a, b) => b.last_seen - a.last_seen);

        res.json(usersList);

    } catch (error) {
        console.error('[Users] Critical error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
