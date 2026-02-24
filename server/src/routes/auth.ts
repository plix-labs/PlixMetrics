
import express from 'express';
import { AuthService } from '../services/auth.js';

const router = express.Router();

// Get Auth Status
// Returns: { setupRequired: boolean, isLocal: boolean, authenticated: boolean }
router.get('/status', (req, res) => {
    const isSetup = AuthService.isSetupComplete();

    // Check if requester is local
    const ip = req.ip || req.connection.remoteAddress || '';
    const isProxied = Boolean(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.headers['forwarded']);
    const isLocalIp = ip === '::1' || ip === '127.0.0.1' || ip.endsWith('127.0.0.1');
    const isLocal = isLocalIp && !isProxied;

    // Check token validity if provided (just for informational purposes in this endpoint)
    let authenticated = isLocal; // Local is inherently authenticated for access, but UI might want to know if *token* is valid too.

    // However, for the UI "Show Login Page" logic:
    // If setupRequired -> Show Setup
    // If !isLocal -> Check if we have valid token.

    if (!authenticated) {
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            if (AuthService.verifyToken(token)) {
                authenticated = true;
            }
        }
    }

    res.json({
        setupRequired: !isSetup,
        isLocal,
        authenticated
    });
});

// Setup (First time only)
router.post('/setup', async (req, res) => {
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ error: 'Password is required' });
    }

    // Use a very simple lock/check
    if (AuthService.isSetupComplete()) {
        return res.status(403).json({ error: 'Setup already completed' });
    }

    await AuthService.setup(password);

    // Return token so they are logged in immediately
    const token = AuthService.generateToken();
    res.json({ token });
});

// Login
router.post('/login', async (req, res) => {
    const { password } = req.body;

    // If not setup, fail
    if (!AuthService.isSetupComplete()) {
        return res.status(400).json({ error: 'Setup required', code: 'SETUP_REQUIRED' });
    }

    const valid = await AuthService.verify(password);

    if (!valid) {
        return res.status(401).json({ error: 'Invalid password' });
    }

    const token = AuthService.generateToken();
    res.json({ token });
});

// Logout (just a placeholder, client discards token)
router.post('/logout', (req, res) => {
    res.json({ message: 'Logged out' });
});

export default router;
