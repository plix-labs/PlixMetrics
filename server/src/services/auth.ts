
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';

// Secret key for JWT - in production should be in env var
// Generating a random one on startup would invalidate tokens on restart, which is fine for now
// or use a fixed fallback one.
const JWT_SECRET = process.env.JWT_SECRET || 'plixmetrics-secret-key-change-me';

interface SystemConfig {
    key: string;
    value: string;
}

export class AuthService {
    // Check if the system has been set up (admin user exists)
    static isSetupComplete(): boolean {
        const stmt = db.prepare('SELECT value FROM system_config WHERE key = ?');
        const res = stmt.get('admin_pass_hash');
        return !!res;
    }

    // Setup the admin user
    static async setup(password: string): Promise<boolean> {
        if (this.isSetupComplete()) {
            return false;
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const insert = db.prepare('INSERT OR REPLACE INTO system_config (key, value) VALUES (?, ?)');
        const insertMany = db.transaction(() => {
            insert.run('admin_pass_hash', hash);
            insert.run('setup_completed_at', new Date().toISOString());
        });

        insertMany();
        return true;
    }

    // Verify credentials
    static async verify(password: string): Promise<boolean> {
        const stmt = db.prepare('SELECT value FROM system_config WHERE key = ?');
        const row = stmt.get('admin_pass_hash') as SystemConfig | undefined;

        if (!row) return false;

        return bcrypt.compare(password, row.value);
    }

    // Generate JWT token
    static generateToken(): string {
        return jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
    }

    // Verify JWT token
    static verifyToken(token: string): any {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (e) {
            return null;
        }
    }
}
