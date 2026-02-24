import axios from 'axios';

// API base URL - empty string means same origin (works for both dev and prod)
const API_BASE = '';

export const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Server API
export const serversApi = {
    list: () => api.get('/api/servers'),
    add: (data: { name: string; tautulli_url: string; api_key: string }) =>
        api.post('/api/servers', data),
    update: (id: number, data: { name: string; tautulli_url: string; api_key: string }) =>
        api.put(`/api/servers/${id}`, data),
    delete: (id: number) => api.delete(`/api/servers/${id}`),
    checkStatus: (id: number) => api.get(`/api/servers/${id}/status`)
};

// Network API
export const networkApi = {
    getStatus: () => api.get('/api/network/status'),
    getSessions: () => api.get('/api/network/sessions')
};

// Stats API
export const statsApi = {
    getWatchStats: (params: { days: number; stat_type: string; server_id: string }) =>
        api.get('/api/stats', { params }),
    getUserDetails: (username: string, days: number = 30) =>
        api.get(`/api/stats/user/${encodeURIComponent(username)}`, { params: { days } })
};

// Users API
export const usersApi = {
    list: (serverId: string) => api.get('/api/users', { params: { server_id: serverId } })
};

// Auth API
export const authApi = {
    getStatus: () => api.get('/api/auth/status'),
    setup: (password: string) => api.post('/api/auth/setup', { password }),
    login: (password: string) => api.post('/api/auth/login', { password }),
    logout: () => api.post('/api/auth/logout')
};

// System API
export const systemApi = {
    getVersion: () => api.get('/api/system/version'),
    update: () => api.post('/api/system/update')
};

// Image proxy helper
export const getImageProxyUrl = (serverId: number | string, img: string, width = 200) => {
    const params = new URLSearchParams({
        serverId: String(serverId),
        img,
        width: String(width)
    });

    const token = localStorage.getItem('plix_auth_token');
    if (token) {
        params.append('token', token);
    }

    return `/api/proxy/image?${params.toString()}`;
};

// Request interceptor for adding token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('plix_auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
