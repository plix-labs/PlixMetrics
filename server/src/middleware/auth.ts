
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.js';

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: any;
            isLocal?: boolean;
        }
    }
}

export const checkAuth = (req: Request, res: Response, next: NextFunction) => {
    // 1. Check for Localhost (Direct Bypass)
    const ip = req.ip || req.connection.remoteAddress || '';

    // Normalize IP
    const isLocal = ip === '::1' || ip === '127.0.0.1' || ip.endsWith('127.0.0.1');

    req.isLocal = isLocal;

    if (isLocal) {
        return next();
    }

    // 2. Check for Token (Remote Access)
    // Support token from Authorization header OR query param (for img src tags)
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader) {
        token = authHeader.split(' ')[1];
    } else if (req.query.token && typeof req.query.token === 'string') {
        token = req.query.token;
    }

    if (token) {
        const user = AuthService.verifyToken(token);
        if (user) {
            req.user = user;
            return next();
        }
    }

    // 3. Unauthorized
    res.status(401).json({ error: 'Unauthorized. Login required for remote access.' });
};
