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
                // Single catch-all route for agent calls
                '/api/agents': {
                    target: apiBase,
                    changeOrigin: true,
                    secure: true,
                    headers: {
                        Authorization: `Bearer ${apiKey || ''}`
                    },
                    rewrite: () => '/api/v1/workflows/run'
                },
                // Secrets API proxy (handles both GET /api/secrets/ and POST/PATCH /api/secrets/ or /api/secrets/:id)
                '/api/secrets': {
                    target: apiBase,
                    changeOrigin: true,
                    secure: true,
                    headers: {
                        'x-api-key': apiKey || ''
                    },
                    rewrite: (path) => path.replace(/^\/api\/secrets/, '/v1/secrets')
                }
            }
        }
    };
});



