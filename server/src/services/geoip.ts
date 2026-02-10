import geoip from 'geoip-lite';
import db from '../db/index.js';

interface GeoLocation {
    lat: number;
    lon: number;
    city?: string;
    country?: string;
}

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
