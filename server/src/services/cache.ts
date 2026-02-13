import { PlexServer } from '../types.js';

// In-memory caches to reduce external API pressure
export const serverCache: { timestamp: number; servers: PlexServer[] } | null = null;
export const metadataCache: Map<string, { timestamp: number; stats: any }> = new Map();

export const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes for servers
export const META_CACHE_DURATION_MS = 2 * 60 * 1000; // 2 minutes for home stats/users

/**
 * Clear all in-memory caches when server config changes
 */
export function clearServerCaches(): void {
    metadataCache.clear();
    console.log('[Cache] All server caches cleared');
}
