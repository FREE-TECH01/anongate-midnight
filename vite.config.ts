import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { submitJoin } from './src/submit-join';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'submit-join-api',
      configureServer(server) {
        server.middlewares.use('/api/submit-join', async (req, res, next) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
            return;
          }

          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });

          req.on('end', async () => {
            try {
              const parsed = body ? JSON.parse(body) : {};
              const secretCode = typeof parsed?.secretCode === 'string' ? parsed.secretCode : '';
              const result = await submitJoin(secretCode);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
            } catch (error) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
            }
          });
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use('/api/submit-join', async (req, res, next) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
            return;
          }

          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });

          req.on('end', async () => {
            try {
              const parsed = body ? JSON.parse(body) : {};
              const secretCode = typeof parsed?.secretCode === 'string' ? parsed.secretCode : '';
              const result = await submitJoin(secretCode);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
            } catch (error) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
            }
          });
        });
      },
    },
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['tests/anongate.test.ts', 'node_modules/**'],
  },
});


