import express from 'express';
import os from 'os';
import axios from 'axios';

const router = express.Router();

interface NetworkInfo {
    localIp: string | null;
    publicIp: string | null;
    port: number;
}

// Cache the public IP to avoid spamming the external service
let cachedPublicIp: string | null = null;
let lastPublicIpCheck = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

const getLocalIp = (): string | null => {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]!) {
            // Skip internal (i.e. 127.0.0.1) and non-IPv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return null;
};

const getPublicIp = async (): Promise<string | null> => {
    const now = Date.now();
    if (cachedPublicIp && (now - lastPublicIpCheck < CACHE_DURATION)) {
        return cachedPublicIp;
    }

    try {
        const response = await axios.get('https://api.ipify.org?format=json', { timeout: 3000 });
        cachedPublicIp = response.data.ip;
        lastPublicIpCheck = now;
        return cachedPublicIp;
    } catch (error) {
        console.error('Failed to fetching public IP:', error instanceof Error ? error.message : String(error));
        return null;
    }
};

router.get('/info', async (req, res) => {
    const localIp = getLocalIp();
    const publicIp = await getPublicIp();
    const port = parseInt(process.env.PORT || '8282', 10);

    const info: NetworkInfo = {
        localIp,
        publicIp,
        port
    };

    res.json(info);
});

export default router;
