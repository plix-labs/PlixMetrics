import { Router, Request, Response } from 'express';
import axios from 'axios';
import db from '../db/index.js';
import { PlexServer } from '../types.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const router = Router();

// Cache Directory (use DATA_DIR for Windows compatibility)
const DATA_DIR = process.env.DATA_DIR || './data';
const CACHE_DIR = path.join(DATA_DIR, 'cache', 'images');
if (!fs.existsSync(CACHE_DIR)) {
    console.log('[Proxy] Creating cache directory:', CACHE_DIR);
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Startup cleanup: remove leftover *.tmp files from interrupted writes
try {
    let removed = 0;
    for (const entry of fs.readdirSync(CACHE_DIR)) {
        if (entry.endsWith('.tmp')) {
            try { fs.unlinkSync(path.join(CACHE_DIR, entry)); removed++; } catch { /* ignore */ }
        }
    }
    if (removed > 0) console.log(`[Proxy] Cleaned ${removed} stale .tmp file(s) from cache`);
} catch { /* ignore */ }

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB safety cap per image

function safeUnlink(filePath: string): void {
    fs.unlink(filePath, () => { /* ignore */ });
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

    const cacheKey = crypto
        .createHash('md5')
        .update(`${serverId}-${img}-${width || '300'}-${height || '300'}`)
        .digest('hex');

    const cacheFilePath = path.join(CACHE_DIR, `${cacheKey}.jpg`);

    try {
        // 1. Check Cache — only serve if file exists AND is non-empty.
        let stat: fs.Stats | null = null;
        try { stat = fs.statSync(cacheFilePath); } catch { stat = null; }

        if (stat && stat.isFile()) {
            if (stat.size > 0) {
                res.set('Content-Type', 'image/jpeg');
                res.set('Cache-Control', 'public, max-age=604800, immutable');
                res.set('X-Cache-Status', 'HIT');

                const readStream = fs.createReadStream(cacheFilePath);
                readStream.on('error', () => { try { res.end(); } catch { /* ignore */ } });
                readStream.pipe(res);
                return;
            }
            safeUnlink(cacheFilePath);
        }

        // 2. Fetch from Upstream (Cache MISS)
        const stmt = db.prepare('SELECT * FROM servers WHERE id = ?');
        const server = stmt.get(serverId) as PlexServer | undefined;

        if (!server) {
            console.error(`[Proxy] Server not found: ${serverId}`);
            return res.status(404).send('Server not found');
        }

        const params = new URLSearchParams();
        params.append('img', String(img));
        params.append('width', String(width || 300));
        params.append('height', String(height || 300));
        params.append('apikey', server.api_key_secret);
        params.append('fallback', 'poster');

        const targetUrl = `${server.tautulli_url}/pms_image_proxy?${params.toString()}`;

        // Buffer the full image in memory. This decouples the cache write from
        // the client connection: the browser can abort lazy-loaded image requests
        // (which it does aggressively during scroll) without leaving partial files
        // on disk and without races between the response stream and the file writer.
        // Poster artwork from Plex is typically 50-200 KB; 10 MB is a safety cap.
        const response = await axios.get<ArrayBuffer>(targetUrl, {
            responseType: 'arraybuffer',
            timeout: 15000,
            headers: { 'User-Agent': 'PlixMetrics/1.0' },
            validateStatus: (status) => status < 400,
            maxContentLength: MAX_IMAGE_SIZE,
            maxBodyLength: MAX_IMAGE_SIZE
        });

        const buffer = Buffer.from(response.data);
        const upstreamType = String(response.headers['content-type'] || '');

        if (upstreamType) res.set('Content-Type', upstreamType);
        res.set('Cache-Control', 'public, max-age=604800, immutable');
        res.set('X-Cache-Status', 'MISS');

        // Respond to client (no-op if client already disconnected — Node swallows it).
        if (!res.writableEnded) res.end(buffer);

        // Persist to cache atomically (write to .tmp then rename), only if upstream
        // actually returned an image and we have bytes.
        if (upstreamType.startsWith('image/') && buffer.length > 0) {
            const tmpPath = `${cacheFilePath}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
            fs.writeFile(tmpPath, buffer, (err) => {
                if (err) {
                    console.error('[Proxy] Cache write error:', err.message);
                    safeUnlink(tmpPath);
                    return;
                }
                fs.rename(tmpPath, cacheFilePath, (renameErr) => {
                    if (renameErr) {
                        console.error('[Proxy] Cache rename error:', renameErr.message);
                        safeUnlink(tmpPath);
                    }
                });
            });
        }

    } catch (error: any) {
        console.error('[Proxy] Critical Error:', error.message);
        if (res.headersSent || res.writableEnded) return;
        if (error.response && error.response.status === 401) {
            return res.status(502).send('Upstream Authentication Failed');
        }
        res.status(502).send('Failed to fetch image');
    }
});

export default router;
