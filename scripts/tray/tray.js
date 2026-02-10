/**
 * PlixMetrics Console Launcher
 * 
 * Manages the PlixMetrics server process.
 * Features:
 * - Start server
 * - Auto-open browser
 * - Graceful shutdown with Ctrl+C
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Configuration ───────────────────────────────────────────────
const PORT = process.env.PORT || 8282;
const DATA_DIR = process.env.DATA_DIR || path.join(process.env.APPDATA || '.', 'PlixMetrics');
const SERVER_ENTRY = path.join(__dirname, '..', '..', 'server', 'dist', 'index.js');
const DASHBOARD_URL = `http://localhost:${PORT}`;

// Detect if running from installed location or dev
const NODE_EXE = process.env.PLIXMETRICS_NODE || process.execPath;

// ─── State ───────────────────────────────────────────────────────
let serverProcess = null;

// ─── Server Management ──────────────────────────────────────────

function startServer() {
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║             PlixMetrics Launcher              ║');
    console.log('╠═══════════════════════════════════════════════╣');
    console.log(`║  📁 Data Dir: ${DATA_DIR.slice(-30).padStart(30)}  ║`);
    console.log(`║  🌐 Port: ${String(PORT).padStart(34)}  ║`);
    console.log('╚═══════════════════════════════════════════════╝');
    console.log('');
    console.log(`[Launcher] Starting PlixMetrics server...`);
    console.log(`[Launcher] Node: ${NODE_EXE}`);
    console.log(`[Launcher] Entry: ${SERVER_ENTRY}`);
    console.log(`[Launcher] Data: ${DATA_DIR}`);
    console.log('');

    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    serverProcess = spawn(NODE_EXE, [SERVER_ENTRY], {
        env: {
            ...process.env,
            NODE_ENV: 'production',
            DATA_DIR: DATA_DIR,
            PORT: String(PORT),
        },
        stdio: 'inherit', // Show server output directly
    });

    serverProcess.on('close', (code) => {
        console.log(`\n[Launcher] Server process exited with code ${code}`);
        process.exit(code);
    });

    serverProcess.on('error', (err) => {
        console.error(`[Launcher] Failed to start server:`, err.message);
        process.exit(1);
    });

    // Auto-open browser after a short delay (give server time to start)
    setTimeout(() => {
        console.log(`[Launcher] Opening dashboard at ${DASHBOARD_URL}...`);
        exec(`start ${DASHBOARD_URL}`);
    }, 3000);
}

function stopServer() {
    if (!serverProcess) return;

    console.log('\n[Launcher] Stopping server...');

    // Graceful shutdown on Windows
    serverProcess.kill('SIGTERM');

    // Force kill after 5 seconds if still running
    setTimeout(() => {
        if (serverProcess && !serverProcess.killed) {
            console.log('[Launcher] Force killing server...');
            serverProcess.kill('SIGKILL');
        }
    }, 5000);
}

// ─── Graceful Shutdown ───────────────────────────────────────────

process.on('SIGINT', () => {
    console.log('\n[Launcher] Received SIGINT (Ctrl+C), shutting down...');
    stopServer();
    setTimeout(() => process.exit(0), 1000);
});

process.on('SIGTERM', () => {
    console.log('\n[Launcher] Received SIGTERM, shutting down...');
    stopServer();
    setTimeout(() => process.exit(0), 1000);
});

// ─── Main ────────────────────────────────────────────────────────

startServer();
