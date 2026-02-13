import geoip from 'geoip-lite';
import db from '../db/index.js';

const GEO_CACHE_MAX_AGE_DAYS = 90;
const GEO_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface GeoLocation {
    lat: number;
    lon: number;
    city?: string;
    country?: string;
}

/**
 * Remove geo_cache entries older than 90 days
 */
export function cleanupGeoCache(): number {
    const stmt = db.prepare(`DELETE FROM geo_cache WHERE updated_at < datetime('now', ?)`);
    const result = stmt.run(`-${GEO_CACHE_MAX_AGE_DAYS} days`);
    if (result.changes > 0) {
        console.log(`[GeoIP] Cleaned up ${result.changes} stale cache entries (>${GEO_CACHE_MAX_AGE_DAYS} days old)`);
    }
    return result.changes;
}

// Run cleanup on startup and every 24 hours
cleanupGeoCache();
setInterval(cleanupGeoCache, GEO_CLEANUP_INTERVAL_MS);

/**
 * Batch geolocation lookup - reduces DB reads from O(n) to O(1)
 */
export async function batchGeoLookup(ips: string[]): Promise<Map<string, GeoLocation>> {
    const result = new Map<string, GeoLocation>();
    if (ips.length === 0) return result;

    const uniqueIps = [...new Set(ips)];

    // SQLite batch lookup
    const placeholders = uniqueIps.map(() => '?').join(',');
    const sanitizedKeys = uniqueIps.map(ip => ip.replace(/\./g, '_'));

    const stmt = db.prepare(`SELECT * FROM geo_cache WHERE ip IN (${placeholders})`);
    const rows = stmt.all(...sanitizedKeys) as any[];

    rows.forEach(row => {
        const originalIp = row.ip.replace(/_/g, '.');
        if (row.lat && row.lon) {
            result.set(originalIp, { lat: row.lat, lon: row.lon, city: row.city, country: row.country });
        }
    });

    return result;
}

/**
 * Lookup single IP, fallback to geoip-lite if not cached
 */
export function lookupIp(ip: string): GeoLocation | null {
    // Check cache first
    const sanitizedIp = ip.replace(/\./g, '_');
    const stmt = db.prepare('SELECT * FROM geo_cache WHERE ip = ?');
    const cached = stmt.get(sanitizedIp) as any;

    if (cached && cached.lat && cached.lon) {
        return { lat: cached.lat, lon: cached.lon, city: cached.city, country: cached.country };
    }

    // Fallback to geoip-lite
    const geo = geoip.lookup(ip);
    if (geo && geo.ll) {
        const location: GeoLocation = {
            lat: geo.ll[0],
            lon: geo.ll[1],
            city: geo.city,
            country: geo.country
        };

        // Cache the result
        const insertStmt = db.prepare(`
            INSERT OR REPLACE INTO geo_cache (ip, lat, lon, city, country, updated_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
        `);
        insertStmt.run(sanitizedIp, location.lat, location.lon, location.city, location.country);

        return location;
    }

    return null;
}

/**
 * Batch save new geo cache entries
 */
export function saveGeoCache(entries: Array<{ ip: string; lat: number; lon: number; city?: string; country?: string }>) {
    const stmt = db.prepare(`
        INSERT OR REPLACE INTO geo_cache (ip, lat, lon, city, country, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);

    const insertMany = db.transaction((items: typeof entries) => {
        for (const item of items) {
            stmt.run(item.ip.replace(/\./g, '_'), item.lat, item.lon, item.city, item.country);
        }
    });

    insertMany(entries);
}
