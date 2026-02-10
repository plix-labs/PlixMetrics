import { Router, Request, Response } from 'express';
import axios from 'axios';
import db from '../db/index.js';
import { PlexServer } from '../types.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const router = Router();

// Cache Directory
const CACHE_DIR = path.join(process.cwd(), 'cache', 'images');
if (!fs.existsSync(CACHE_DIR)) {
    console.log('[Proxy] Creating cache directory:', CACHE_DIR);
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * GET /api/proxy/image?serverId=1&img=/library/metadata/...&width=300
 * Proxies images from Tautulli/Plex to the frontend with Filesystem Caching
 */
router.get('/image', async (req: Request, res: Response) => {
    const { serverId, img, width, height } = req.query;

    if (!serverId || !img) {
        return res.status(400).send('Missing required parameters: serverId, img');
    }

    // Generate Cache Key (Hash of params)
    // We use a simple hash to keep filenames short and filesystem friendly
    const cacheKey = crypto
        .createHash('md5')
        .update(`${serverId}-${img}-${width || '500'}-${height || '500'}`)
        .digest('hex');

    // We assume JPEG by default for cached files, could improve by checking mime types but this covers 99% of Plex artwork
    const cacheFilePath = path.join(CACHE_DIR, `${cacheKey}.jpg`);

    try {
        // 1. Check Cache
        if (fs.existsSync(cacheFilePath)) {
            // Serve from cache
            // console.log(`[Proxy] Cache HIT: ${cacheKey}`);
            res.set('Content-Type', 'image/jpeg');
            res.set('Cache-Control', 'public, max-age=604800, immutable'); // 7 days browser cache
            res.set('X-Cache-Status', 'HIT');

            const readStream = fs.createReadStream(cacheFilePath);
            readStream.pipe(res);
            return;
        }

        // 2. Fetch from Upstream (Cache MISS)
        // console.log(`[Proxy] Cache MISS: ${cacheKey}`);

        // Get server details from database
        const stmt = db.prepare('SELECT * FROM servers WHERE id = ?');
        const server = stmt.get(serverId) as PlexServer | undefined;

        if (!server) {
            console.error(`[Proxy] Server not found: ${serverId}`);
            return res.status(404).send('Server not found');
        }

        // Construct Tautulli Proxy URL
        const params = new URLSearchParams();
        params.append('img', String(img));
        params.append('width', String(width || 500));
        params.append('height', String(height || 500));
        params.append('apikey', server.api_key_secret);
        params.append('fallback', 'poster');

        const targetUrl = `${server.tautulli_url}/pms_image_proxy?${params.toString()}`;

        // Stream the image
        const response = await axios.get(targetUrl, {
            responseType: 'stream',
            timeout: 15000,
            headers: { 'User-Agent': 'PlixMetrics/1.0' },
            validateStatus: (status) => status < 400
        });

        // Set Headers for Client
        if (response.headers['content-type']) res.set('Content-Type', response.headers['content-type']);
        if (response.headers['content-length']) res.set('Content-Length', response.headers['content-length']);
        res.set('Cache-Control', 'public, max-age=604800, immutable'); // 7 days browser cache
        res.set('X-Cache-Status', 'MISS');

        // Pipe to Client AND Cache File
        const writer = fs.createWriteStream(cacheFilePath);

        response.data.pipe(writer);
        response.data.pipe(res);

        writer.on('finish', () => {
            // File written successfully
        });

        writer.on('error', (err: any) => {
            console.error('[Proxy] Cache Write Error:', err);
            // Don't crash request, just log error
        });

    } catch (error: any) {
        console.error('[Proxy] Critical Error:', error.message);
        if (error.response) {
            // console.error('[Proxy] Upstream Response:', error.response.status);
            if (error.response.status === 401) {
                return res.status(502).send('Upstream Authentication Failed');
            }
        }
        res.status(502).send('Failed to fetch image');
    }
});

export default router;
