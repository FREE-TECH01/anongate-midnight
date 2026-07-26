import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const artifactsDir = path.resolve(__dirname, 'contracts', 'managed', 'hello-world');

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'serve-contract-artifacts',
      configureServer(server) {
        server.middlewares.use('/contract-artifacts', (req, res, next) => {
          if (!req.url || req.url === '/') {
            if (next) return next();
            res.statusCode = 404;
            res.end();
            return;
          }
          const filePath = path.join(artifactsDir, req.url);
          if (!filePath.startsWith(artifactsDir)) {
            res.statusCode = 403;
            res.end();
            return;
          }
          if (!fs.existsSync(filePath)) {
            if (next) return next();
            res.statusCode = 404;
            res.end();
            return;
          }
          const content = fs.readFileSync(filePath);
          const ext = path.extname(filePath);
          const mimeTypes: Record<string, string> = {
            '.bzkir': 'application/octet-stream',
            '.zkir': 'application/octet-stream',
            '.prover': 'application/octet-stream',
            '.verifier': 'application/octet-stream',
            '.json': 'application/json',
          };
          res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
          res.end(content);
        });
      },
    },
    {
      name: 'copy-contract-artifacts',
      closeBundle() {
        const outDir = path.resolve(__dirname, 'dist', 'contract-artifacts');
        const copyDir = (src: string, dest: string) => {
          if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
          for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            if (entry.isDirectory()) {
              copyDir(srcPath, destPath);
            } else {
              fs.copyFileSync(srcPath, destPath);
            }
          }
        };
        if (fs.existsSync(artifactsDir)) {
          copyDir(artifactsDir, outDir);
        }
      },
    },
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    fs: {
      allow: ['..', '../..'],
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['tests/anongate.test.ts', 'node_modules/**'],
  },
});
