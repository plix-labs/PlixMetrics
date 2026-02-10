import { Router } from 'express';
import axios from 'axios';
import db from '../db/index.js';
import { PlexServer } from '../types.js';

const router = Router();

/**
 * GET /api/servers - List all servers
 */
router.get('/', (req, res) => {
    try {
        const stmt = db.prepare('SELECT id, name, tautulli_url, api_key_secret, created_at FROM servers ORDER BY created_at DESC');
        const servers = stmt.all();
        res.json(servers);
    } catch (error) {
        console.error('[Servers] Error listing servers:', error);
        res.status(500).json({ error: 'Failed to list servers' });
    }
});

/**
 * POST /api/servers - Add a new server
 */
router.post('/', async (req, res) => {
    const { name, tautulli_url, api_key } = req.body;

    if (!name || !tautulli_url || !api_key) {
        return res.status(400).json({ error: 'Missing required fields: name, tautulli_url, api_key' });
    }

    // Clean URL
    let cleanUrl = tautulli_url.replace(/\/$/, '');
    if (!cleanUrl.startsWith('http')) {
        cleanUrl = `http://${cleanUrl}`;
    }

    // Test connection
    try {
        const response = await axios.get(`${cleanUrl}/api/v2`, {
            params: { apikey: api_key, cmd: 'get_activity' },
            timeout: 5000
        });

        if (response.data.response.result !== 'success') {
            return res.status(400).json({ error: 'Invalid API Key or Tautulli unreachable' });
        }
    } catch (error) {
        console.error('[Servers] Connection test failed:', error);
        return res.status(400).json({ error: 'Could not connect to Tautulli instance' });
    }

    // Save to database
    try {
        const stmt = db.prepare('INSERT INTO servers (name, tautulli_url, api_key_secret) VALUES (?, ?, ?)');
        const result = stmt.run(name, cleanUrl, api_key);

        res.json({
            success: true,
            message: 'Server added successfully',
            id: result.lastInsertRowid
        });
    } catch (error) {
        console.error('[Servers] Error adding server:', error);
        res.status(500).json({ error: 'Failed to save server' });
    }
});

/**
 * PUT /api/servers/:id - Update a server
 */
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, tautulli_url, api_key } = req.body;

    if (!name || !tautulli_url || !api_key) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Clean URL
    let cleanUrl = tautulli_url.replace(/\/$/, '');
    if (!cleanUrl.startsWith('http')) {
        cleanUrl = `http://${cleanUrl}`;
    }

    // Test connection
    try {
        const response = await axios.get(`${cleanUrl}/api/v2`, {
            params: { apikey: api_key, cmd: 'get_activity' },
            timeout: 5000
        });

        if (response.data.response.result !== 'success') {
            return res.status(400).json({ error: 'Invalid API Key or Tautulli unreachable' });
        }
    } catch (error) {
        return res.status(400).json({ error: 'Could not connect to Tautulli instance' });
    }

    // Update database
    try {
        const stmt = db.prepare('UPDATE servers SET name = ?, tautulli_url = ?, api_key_secret = ? WHERE id = ?');
        stmt.run(name, cleanUrl, api_key, id);

        res.json({ success: true, message: 'Server updated successfully' });
    } catch (error) {
        console.error('[Servers] Error updating server:', error);
        res.status(500).json({ error: 'Failed to update server' });
    }
});

/**
 * DELETE /api/servers/:id - Delete a server
 */
router.delete('/:id', (req, res) => {
    const { id } = req.params;

    try {
        const stmt = db.prepare('DELETE FROM servers WHERE id = ?');
        stmt.run(id);

        res.json({ success: true, message: 'Server deleted successfully' });
    } catch (error) {
        console.error('[Servers] Error deleting server:', error);
        res.status(500).json({ error: 'Failed to delete server' });
    }
});

/**
 * Helper: Get all servers with API keys (internal use only)
 */
export function getAllServersWithKeys(): PlexServer[] {
    const stmt = db.prepare('SELECT * FROM servers');
    return stmt.all() as PlexServer[];
}

export default router;
