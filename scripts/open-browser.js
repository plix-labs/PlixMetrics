import { exec } from 'child_process';
import os from 'os';

const port = process.env.PORT || 8282;
const url = `http://localhost:${port}`;

console.log(`[Launcher] Waiting for server to settle...`);

setTimeout(() => {
    console.log(`[Launcher] Opening ${url}...`);

    const start = os.platform() === 'darwin' ? 'open' :
        os.platform() === 'win32' ? 'start' :
            'xdg-open';

    exec(`${start} ${url}`, (err) => {
        if (err) {
            console.error(`[Launcher] Failed to open browser: ${err.message}`);
            console.log(`[Launcher] Please open manually: ${url}`);
        }
    });
}, 2500);
