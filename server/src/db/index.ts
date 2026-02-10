import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = process.env.DATA_DIR || './data';

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const dbPath = path.join(DATA_DIR, 'plixmetrics.db');
export const db: DatabaseType = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
    -- Servidores Tautulli
    CREATE TABLE IF NOT EXISTS servers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        tautulli_url TEXT NOT NULL,
        api_key_secret TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Caché de Geolocalización
    CREATE TABLE IF NOT EXISTS geo_cache (
        ip TEXT PRIMARY KEY,
        lat REAL,
        lon REAL,
        city TEXT,
        country TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Configuración del Sistema (Auth)
    CREATE TABLE IF NOT EXISTS system_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );
`);

console.log('[DB] SQLite database initialized at:', dbPath);

export default db;
