/**
 * PlixMetrics Windows Auto-Updater
 * 
 * This script is spawned by the main application to handle the update process.
 * It waits for the main process to exit, runs the installer, and then restarts the app.
 * 
 * Usage:
 * node updater.js <installer_path> <app_launcher_path> <parent_pid>
 */

import { spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const [, , installerPath, appLauncherPath, parentPid] = process.argv;

const LOG_FILE = path.join(process.env.APPDATA || '.', 'PlixMetrics', 'updater.log');

function log(message) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, line);
    console.log(message);
}

async function main() {
    log('--- Updater Started ---');
    log(`Installer: ${installerPath}`);
    log(`Launcher: ${appLauncherPath}`);
    log(`Parent PID: ${parentPid}`);

    // 1. Wait for parent process to exit
    if (parentPid) {
        log(`Waiting for parent process ${parentPid} to exit...`);
        let retries = 20; // 10 seconds timeout
        while (retries > 0) {
            try {
                process.kill(Number(parentPid), 0); // Check if process exists
                log('Parent still running, waiting...');
                await new Promise(r => setTimeout(r, 500));
                retries--;
            } catch (e) {
                log('Parent process exited.');
                break;
            }
        }

        if (retries === 0) {
            log('Timeout waiting for parent process. Force killing...');
            try {
                process.kill(Number(parentPid), 'SIGKILL');
            } catch (e) {
                log('Could not kill parent process: ' + e.message);
            }
        }
    }

    // 2. Run the installer
    log('Running installer...');

    // /VERYSILENT = no progress window
    // /SUPPRESSMSGBOXES = no error/info popups
    // /NORESTART = do not restart Windows
    // /CLOSEAPPLICATIONS = let Inno Setup try to close stuff if we missed it
    const installerArgs = ['/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', '/CLOSEAPPLICATIONS'];

    const child = spawn(installerPath, installerArgs, {
        detached: true,
        stdio: 'ignore'
    });

    child.on('error', (err) => {
        log(`Installer failed to start: ${err.message}`);
        process.exit(1);
    });

    child.on('exit', (code) => {
        log(`Installer exited with code ${code}`);

        if (code === 0) {
            // 3. Restart the application
            log('Restarting application...');
            // We use 'start' command to detach completely
            exec(`start "" "${appLauncherPath}"`, (error) => {
                if (error) {
                    log(`Failed to restart app: ${error.message}`);
                } else {
                    log('App restart triggered.');
                }
                process.exit(0);
            });
        } else {
            log('Update failed.');
            process.exit(code || 1);
        }
    });
}

main().catch(err => {
    log(`Unhandled error: ${err.message}`);
    process.exit(1);
});
