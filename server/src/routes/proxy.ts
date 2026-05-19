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

    // Generate Cache Key (Hash of params)
    const cacheKey = crypto
        .createHash('md5')
        .update(`${serverId}-${img}-${width || '300'}-${height || '300'}`)
        .digest('hex');

    const cacheFilePath = path.join(CACHE_DIR, `${cacheKey}.jpg`);

    try {
        // 1. Check Cache — only serve if file exists AND is non-empty.
        // 0-byte (or otherwise broken) entries are removed so they fall through to a re-fetch.
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
            // Empty cache entry — treat as poisoned and remove before re-fetching.
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

        const response = await axios.get(targetUrl, {
            responseType: 'stream',
            timeout: 15000,
            headers: { 'User-Agent': 'PlixMetrics/1.0' },
            validateStatus: (status) => status < 400
        });

        const upstreamType = String(response.headers['content-type'] || '');
        const isImage = upstreamType.startsWith('image/');

        if (response.headers['content-type']) res.set('Content-Type', response.headers['content-type']);
        if (response.headers['content-length']) res.set('Content-Length', response.headers['content-length']);
        res.set('Cache-Control', 'public, max-age=604800, immutable');
        res.set('X-Cache-Status', 'MISS');

        // If upstream didn't return an image (e.g. HTML error page with 200), stream it
        // through to the client but DO NOT poison the cache.
        if (!isImage) {
            response.data.on('error', () => { try { res.end(); } catch { /* ignore */ } });
            response.data.pipe(res);
            return;
        }

        // Atomic write: stream to a unique temp file, then rename on success.
        // This prevents partial/corrupt files from ever appearing at the final cache path,
        // which is what would otherwise produce a permanently-broken poster.
        const tmpPath = `${cacheFilePath}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
        const writer = fs.createWriteStream(tmpPath);
        let finalized = false;

        const cleanup = () => {
            if (finalized) return;
            finalized = true;
            try { writer.destroy(); } catch { /* ignore */ }
            try { response.data.destroy(); } catch { /* ignore */ }
            safeUnlink(tmpPath);
        };

        response.data.pipe(writer);
        response.data.pipe(res);

        // Client aborted (navigated away, lazy-load cancelled, scroll, etc.)
        req.on('close', () => {
            if (!writer.writableFinished) cleanup();
        });

        response.data.on('error', (err: any) => {
            console.error('[Proxy] Upstream Stream Error:', err.message);
            cleanup();
            try { res.end(); } catch { /* ignore */ }
        });

        writer.on('error', (err: any) => {
            console.error('[Proxy] Cache Write Error:', err.message);
            cleanup();
        });

        writer.on('finish', () => {
            if (finalized) {
                // Already cleaned up due to an earlier error/abort.
                safeUnlink(tmpPath);
                return;
            }
            finalized = true;
            fs.rename(tmpPath, cacheFilePath, (err) => {
                if (err) {
                    console.error('[Proxy] Cache Rename Error:', err.message);
                    safeUnlink(tmpPath);
                }
            });
        });

    } catch (error: any) {
        console.error('[Proxy] Critical Error:', error.message);
        if (error.response && error.response.status === 401) {
            return res.status(502).send('Upstream Authentication Failed');
        }
        if (!res.headersSent) res.status(502).send('Failed to fetch image');
    }
});

export default router;
