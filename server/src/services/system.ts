
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to package.json
const PACKAGE_JSON_PATH = path.join(__dirname, '../../package.json');
const ROOT_DIR = path.join(__dirname, '../../../'); // Root of the repo

interface VersionInfo {
    current: string;
    latest: string;
    updateAvailable: boolean;
    isDocker?: boolean;
    error?: string;
}

export class SystemService {
    static getCurrentVersion(): string {
        try {
            const content = fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8');
            const pkg = JSON.parse(content);
            return pkg.version;
        } catch (e) {
            console.error('Error reading package.json:', e);
            return '0.0.0';
        }
    }

    static async getLatestVersion(): Promise<string> {
        try {
            // Check GitHub API for latest release of the repo
            const repo = 'plix-labs/PlixMetrics';
            const url = `https://api.github.com/repos/${repo}/releases/latest`;

            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'PlixMetrics-Server',
                    'Accept': 'application/vnd.github.v3+json'
                },
                timeout: 5000
            });

            // Tag usually comes as 'v1.0.1', so strip 'v' if present
            const tag = response.data.tag_name;
            return tag.replace(/^v/, '');
        } catch (e: any) {
            // Log a clean message instead of the full AxiosError stack trace
            const status = e?.response?.status;
            if (status === 404) {
                console.log('[System] No GitHub releases found yet. Skipping update check.');
            } else {
                console.error(`[System] Error checking latest version: ${e?.message || e}`);
            }
            throw new Error('Failed to check for updates');
        }
    }

    static async checkUpdate(): Promise<VersionInfo> {
        const current = this.getCurrentVersion();
        try {
            const latest = await this.getLatestVersion();

            // Simple semantic version comparison
            const updateAvailable = this.compareVersions(current, latest) < 0;

            // Check for Docker environment (reliably set via docker-compose)
            const isDocker = process.env.IS_DOCKER === 'true';

            return {
                current,
                latest,
                updateAvailable,
                isDocker
            };
        } catch (e) {
            return {
                current,
                latest: 'Unknown',
                updateAvailable: false,
                error: (e as Error).message
            };
        }
    }

    // Returns -1 if v1 < v2, 0 if v1 == v2, 1 if v1 > v2
    static compareVersions(v1: string, v2: string): number {
        const p1 = v1.split('.').map(Number);
        const p2 = v2.split('.').map(Number);

        for (let i = 0; i < 3; i++) {
            const n1 = p1[i] || 0;
            const n2 = p2[i] || 0;
            if (n1 < n2) return -1;
            if (n1 > n2) return 1;
        }
        return 0;
    }

    static update(): Promise<void> {
        return new Promise((resolve, reject) => {
            // Construct command to pull and rebuild
            // We use 'npm install' to ensure deps are updated, and then trigger build
            // Note: This assumes the process running has permissions and git is available.

            console.log('[System] Starting update process...');

            const command = `git pull && npm install && npm run build:all`;

            exec(command, { cwd: ROOT_DIR }, (error, stdout, stderr) => {
                if (error) {
                    console.error(`[System] Update failed: ${error.message}`);
                    return reject(error);
                }
                if (stderr) {
                    console.log(`[System] Update stderr: ${stderr}`);
                }
                console.log(`[System] Update stdout: ${stdout}`);
                console.log('[System] Update completed successfully. Server should be restarted manually or by process manager.');
                resolve();
            });
        });
    }
}
