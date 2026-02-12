import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
            manifest: {
                name: 'PlixMetrics - Global Network Monitor',
                short_name: 'PlixMetrics',
                description: 'Real-time Plex network monitoring and statistics',
                theme_color: '#0f172a',
                background_color: '#0f172a',
                display: 'standalone',
                scope: '/',
                start_url: '/',
                orientation: 'portrait',
                icons: [
                    {
                        src: 'icon.svg',
                        sizes: '512x512',
                        type: 'image/svg+xml',
                        purpose: 'any maskable'
                    }
                ]
            }
        })
    ],
    server: {
        proxy: {
            // Proxy API requests to the backend server during development
            '/api': {
                target: 'http://127.0.0.1:8282',
                changeOrigin: true,
            }
        }
    }
})
