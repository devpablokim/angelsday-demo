import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * public/design-system/index.html 은 Artifact 배포 규칙에 맞춰 <html>/<head>/<body> 없이
 * 본문만 담고 있습니다. Firebase Hosting · vite dev 에서는 표준 HTML 골격으로 감싸서 내보냅니다.
 */
function wrapStandalone(html: string, base = '/'): string {
  if (/^\s*<!doctype/i.test(html)) return html;
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<link rel="icon" type="image/svg+xml" href="${base}favicon.svg">
<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
${html}
</body>
</html>
`;
}

function designSystemPage(brand: Brand | null): Plugin {
  const source = fileURLToPath(new URL('./public/design-system/index.html', import.meta.url));
  let outDir = 'dist';
  let base = '/';
  return {
    name: 'angelsday-design-system-page',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
      base = config.base;
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0];
        if (url === `${base}design-system`) {
          res.statusCode = 301;
          res.setHeader('Location', `${base}design-system/`);
          res.end();
          return;
        }
        if (url === `${base}design-system/` || url === `${base}design-system/index.html`) {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(wrapStandalone(rebrandDesignSystem(readFileSync(source, 'utf8'), brand), base));
          return;
        }
        next();
      });
    },
    closeBundle() {
      const out = join(outDir, 'design-system', 'index.html');
      if (existsSync(out)) writeFileSync(out, wrapStandalone(rebrandDesignSystem(readFileSync(out, 'utf8'), brand), base));
    },
  };
}

/**
 * 데모 브랜드 빌드 (`vite build --mode <브랜드 id>`, 예: lunelle)
 * 같은 코드에서 업체명·홀 이름·연락처·로고만 바꿔 하위 경로(예: /demo/)로 내보냅니다.
 * 치환표와 로고는 src/brand/<id>/ 에 있고, scripts/brand/<id>/make.py 로 다시 만들 수 있습니다.
 */
interface Brand {
  id: string;
  name: string;
  base: string;
  replacements: [string, string][];
  designSystem: { paths: Record<string, string>; symbols: Record<string, string>; viewBoxes: Record<string, string> };
}

function loadBrand(mode: string): Brand | null {
  if (!/^[a-z0-9-]+$/.test(mode)) return null;
  const file = fileURLToPath(new URL(`./src/brand/${mode}/brand.json`, import.meta.url));
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Brand) : null;
}

function rebrand(text: string, brand: Brand | null): string {
  if (!brand) return text;
  for (const [from, to] of brand.replacements) text = text.split(from).join(to);
  return text;
}

/** 디자인 시스템 페이지: 문구 치환 + 인라인 로고(경로·심볼·viewBox) 교체 */
function rebrandDesignSystem(html: string, brand: Brand | null): string {
  if (!brand) return html;
  const ds = brand.designSystem;
  let out = rebrand(html, brand);
  for (const [id, d] of Object.entries(ds.paths)) out = out.replace(new RegExp(`(<path id="${id}" d=")[^"]*(")`), (_m, a: string, b: string) => a + d + b);
  for (const [id, body] of Object.entries(ds.symbols)) out = out.replace(new RegExp(`(<symbol id="${id}"[^>]*>)[\\s\\S]*?(</symbol>)`), (_m, a: string, b: string) => a + body + b);
  for (const [from, to] of Object.entries(ds.viewBoxes)) out = out.split(`viewBox="${from}"`).join(`viewBox="${to}"`);
  return out;
}

function whiteLabel(brand: Brand | null): Plugin {
  const brandDir = brand && fileURLToPath(new URL(`./src/brand/${brand.id}/`, import.meta.url));
  let outDir = '';
  return {
    name: 'white-label',
    enforce: 'pre',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    resolveId(source, importer) {
      if (!brand || !importer) return null;
      if (source === './logoPaths' && importer.replace(/\\/g, '/').endsWith('/src/brand/Logo.tsx')) return join(brandDir!, 'logoPaths.ts');
      return null;
    },
    transform(code, id) {
      if (!brand) return null;
      const file = id.split('?')[0].replace(/\\/g, '/');
      if (file.includes('/node_modules/') || file.startsWith(brandDir!.replace(/\\/g, '/'))) return null;
      if (!/\/(src|shared)\/.*\.(tsx?|css)$/.test(file)) return null;
      const next = rebrand(code, brand);
      return next === code ? null : { code: next, map: null };
    },
    transformIndexHtml(html) {
      return rebrand(html, brand);
    },
    closeBundle() {
      if (!brand || !outDir) return;
      // 원본 브랜드 로고 파일은 내보내지 않고, 데모 브랜드 아이콘으로 덮어씁니다
      rmSync(join(outDir, 'brand'), { recursive: true, force: true });
      cpSync(join(brandDir!, 'public'), outDir, { recursive: true });
    },
  };
}

// `--mode preview` builds a static, hash-routed bundle with relative asset paths
// so it can be opened from any static host (artifact preview, file server).
export default defineConfig(({ mode }) => {
  const brand = loadBrand(mode);
  return {
  plugins: [whiteLabel(brand), react(), designSystemPage(brand)],
  base: brand ? brand.base : mode === 'preview' ? './' : '/',
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: brand ? `dist-${brand.id}${brand.base}` : mode === 'preview' ? 'dist-preview' : 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1200,
  },
  };
});
