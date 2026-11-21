import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { lookupAddress } from './netlify/functions/address-autocomplete.mjs';

function localAddressApi(key: string): Plugin {
    return {
        name: 'vicmar-local-address-api',
        configureServer(server) {
            server.middlewares.use('/api/address-autocomplete', async (req, res) => {
                const controller = new AbortController();
                res.once('close', () => controller.abort());
                try {
                    let body = '';
                    if (req.method === 'POST') {
                        req.setEncoding('utf8');
                        for await (const chunk of req) {
                            body += chunk;
                            if (body.length > 4096) {
                                res.writeHead(413).end();
                                return;
                            }
                        }
                    }
                    const request = new Request('http://localhost/api/address-autocomplete', {
                        method: req.method,
                        body: req.method === 'POST' ? body : undefined,
                        signal: controller.signal,
                    });
                    const response = await lookupAddress(request, key);
                    if (!controller.signal.aborted) {
                        res.writeHead(response.status, Object.fromEntries(response.headers));
                        res.end(await response.text());
                    }
                } catch {
                    if (!controller.signal.aborted) res.writeHead(502).end();
                }
            });
        },
    };
}

export default defineConfig(({ command, mode, isPreview }) => {
    const env = loadEnv(mode, '.', ['GEOAPIFY_API_KEY', 'VITE_ADDRESS_PROVIDER']);
    const key = command === 'serve' && !isPreview && env.VITE_ADDRESS_PROVIDER !== 'photon' ? env.GEOAPIFY_API_KEY : undefined;
    return {
        plugins: [react(), tailwindcss(), ...(key ? [localAddressApi(key)] : [])],
        define: key ? { 'import.meta.env.VITE_ADDRESS_PROVIDER': JSON.stringify('geoapify') } : undefined,
        optimizeDeps: { include: ['maplibre-gl'] },
    };
});
