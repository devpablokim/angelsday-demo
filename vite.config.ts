import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * public/design-system/index.html 은 Artifact 배포 규칙에 맞춰 <html>/<head>/<body> 없이
 * 본문만 담고 있습니다. Firebase Hosting · vite dev 에서는 표준 HTML 골격으로 감싸서 내보냅니다.
 */
function wrapStandalone(html: string): string {
  if (/^\s*<!doctype/i.test(html)) return html;
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
${html}
</body>
</html>
`;
}

function designSystemPage(): Plugin {
  const source = fileURLToPath(new URL('./public/design-system/index.html', import.meta.url));
  let outDir = 'dist';
  return {
    name: 'angelsday-design-system-page',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0];
        if (url === '/design-system') {
          res.statusCode = 301;
          res.setHeader('Location', '/design-system/');
          res.end();
          return;
        }
        if (url === '/design-system/' || url === '/design-system/index.html') {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(wrapStandalone(readFileSync(source, 'utf8')));
          return;
        }
        next();
      });
    },
    closeBundle() {
      const out = join(outDir, 'design-system', 'index.html');
      if (existsSync(out)) writeFileSync(out, wrapStandalone(readFileSync(out, 'utf8')));
    },
  };
}

// `--mode preview` builds a static, hash-routed bundle with relative asset paths
// so it can be opened from any static host (artifact preview, file server).
export default defineConfig(({ mode }) => ({
  plugins: [react(), designSystemPage()],
  base: mode === 'preview' ? './' : '/',
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: mode === 'preview' ? 'dist-preview' : 'dist',
    chunkSizeWarningLimit: 1200,
  },
}));
