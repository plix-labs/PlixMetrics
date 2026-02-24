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
                            params: { apikey: server.api_key_secret, cmd: 'get_activity' },
                            timeout: 1500
                        });
                    } catch (e) {
                        return; // Skip if offline or unresponsive
                    }

                    const response = await axios.get(`${server.tautulli_url}/api/v2`, {
                        params: {
                            apikey: server.api_key_secret,
                            cmd: 'get_users_table',
                            length: 1000,
                            order_column: 'last_seen',
                            order_dir: 'desc'
                        },
                        timeout: 30000
                    });

                    if (response.data.response.result !== 'success') {
                        console.warn(`[Users] Failed to fetch from server ${server.name}:`, response.data.response.message);
                        return;
                    }

                    const rows = response.data.response.data.data;

                    if (!Array.isArray(rows)) return;

                    for (const row of rows) {
                        const userId = parseInt(row.user_id, 10);
                        if (!userId) continue;

                        const lastSeen = parseInt(row.last_seen || 0, 10);
                        const plays = parseInt(row.plays || 0, 10);
                        const duration = parseInt(row.duration || 0, 10);

                        if (!usersMap.has(userId)) {
                            // First time seeing this user
                            usersMap.set(userId, {
                                user_id: userId,
                                username: row.user, // Sometimes 'user' is username
                                friendly_name: row.friendly_name || row.user,
                                thumb: row.thumb,
                                email: row.email,
                                last_seen: lastSeen,
                                ip_address: row.ip_address,
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
                                existing.ip_address = row.ip_address;
                                existing.platform = row.platform;
                                existing.player = row.player;
                                existing.last_played = row.last_played || row.title || '';
                                existing.server_name = server.name; // User was seen here last
                                existing.server_id = server.id;
                                existing.friendly_name = row.friendly_name || existing.friendly_name;
                                existing.thumb = row.thumb || existing.thumb;
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
