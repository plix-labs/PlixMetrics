import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import serversRouter from './routes/servers.js';
import networkRouter from './routes/network.js';
import statsRouter from './routes/stats.js';
import proxyRouter from './routes/proxy.js';
import usersRouter from './routes/users.js';
import configRouter from './routes/config.js';
import authRouter from './routes/auth.js';
import systemRouter from './routes/system.js';

// Middleware imports
import { checkAuth } from './middleware/auth.js';

// Initialize database (will create tables if not exist)
import './db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8282;

// Middleware
app.use(cors());
app.use(express.json());

// Public Routes (Auth endpoints themselves)
app.use('/api/auth', authRouter);

// Protected API Routes (Bypass for localhost, Require Token for others)
app.use('/api/servers', checkAuth, serversRouter);
app.use('/api/network', checkAuth, networkRouter);
app.use('/api/stats', checkAuth, statsRouter);
app.use('/api/proxy', checkAuth, proxyRouter);
app.use('/api/users', checkAuth, usersRouter);
app.use('/api/config', checkAuth, configRouter);
app.use('/api/system', checkAuth, systemRouter);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files from the frontend build
const staticPath = path.join(__dirname, '../../dist');
app.use(express.static(staticPath));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(staticPath, 'index.html'));
    }
});

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════╗
║              PlixMetrics Server               ║
╠═══════════════════════════════════════════════╣
║  🚀 Server running on http://localhost:${PORT}   ║
║  📁 Static files from: ${staticPath.slice(-20).padStart(20)}  ║
║  💾 Data stored in: ${(process.env.DATA_DIR || './data').slice(-20).padStart(24)}  ║
╚═══════════════════════════════════════════════╝
    `);
});

export default app;
