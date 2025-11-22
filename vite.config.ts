/// <reference types="node" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const apiKey = env.IO_API_KEY;
    const apiBase = env.IO_API_BASE || 'https://api.intelligence-dev.io.solutions';

    console.log('apiKey', apiKey);
    console.log('apiBase', apiBase);

    return {
        plugins: [react()],
        server: {
            port: 5173,
            proxy: {
                '/api/agents/summary': {
                    target: apiBase,
                    changeOrigin: true,
                    secure: true,
                    headers: {
                        Authorization: `Bearer ${apiKey || ''}`
                    },
                    rewrite: () => '/api/v1/workflows/run'
                },
                '/api/agents/linear': {
                    target: apiBase,
                    changeOrigin: true,
                    secure: true,
                    headers: {
                        Authorization: `Bearer ${apiKey || ''}`
                    },
                    rewrite: () => '/api/v1/workflows/run'
                },
                '/api/agents/sentiment': {
                    target: apiBase,
                    changeOrigin: true,
                    secure: true,
                    headers: {
                        Authorization: `Bearer ${apiKey || ''}`
                    },
                    rewrite: () => '/api/v1/workflows/run'
                }
            }
        }
    };
});



