// 계약서 양식(public/contracts/*.xlsx) 안의 로고 그림을 데모 브랜드 로고로 바꿀 그림을 만듭니다.
//   node scripts/brand/render-contract-media.cjs lunelle
// 원래 그림과 같은 크기·형식(png/jpeg)으로 src/brand/<id>/contracts/<양식>/<그림 이름> 에 저장하며,
// 데모 빌드(vite --mode <id>)가 엑셀을 복사할 때 이 그림으로 바꿔 넣습니다.
const { chromium } = require('playwright');
const { readFileSync, readdirSync, mkdirSync } = require('node:fs');
const { join, basename } = require('node:path');
const { unzipSync } = require('fflate');

const id = process.argv[2];
if (!id) throw new Error('브랜드 id 를 넣어 주세요. 예: node scripts/brand/render-contract-media.cjs lunelle');
const root = join(__dirname, '..', '..');
const brandDir = join(root, 'src', 'brand', id);
const ts = readFileSync(join(brandDir, 'logoPaths.ts'), 'utf8');
const get = (n) => JSON.parse(ts.match(new RegExp(`export const ${n} = (\\{.*?\\});`))[1]);
const M = get('MONOGRAM'), W = get('WORDMARK'), T = get('TAGLINE');
const CT = 27.6, CH = 70;
const tt = (x, top, cap) => { const s = cap / CH; return `translate(${x.toFixed(2)} ${(top - CT * s).toFixed(2)}) scale(${s.toFixed(5)})`; };
// 가로형 로고 (Logo.tsx horizontal 과 같은 계산)
const H = 60, mw = (M.width * H) / M.height, x = mw + 12, cap = 23, top = 13, ww = (W.width * cap) / CH, tagCap = (CH * ww) / T.width, HW = x + ww + 2;
const logo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${HW.toFixed(1)} 60" width="100%" height="100%" preserveAspectRatio="xMidYMid meet"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8C6B2E"/><stop offset=".48" stop-color="#C9A55C"/><stop offset="1" stop-color="#A8823C"/></linearGradient></defs><path fill="url(#g)" transform="scale(${(H / M.height).toFixed(5)})" d="${M.d}"/><path fill="#141210" transform="${tt(x, top, cap)}" d="${W.d}"/><path fill="#7d766b" transform="${tt(x + 0.5, top + cap + 8, tagCap)}" d="${T.d}"/></svg>`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const dir = join(root, 'public', 'contracts');
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.xlsx'))) {
    const files = unzipSync(readFileSync(join(dir, f)));
    for (const [name, data] of Object.entries(files)) {
      if (!name.startsWith('xl/media/')) continue;
      const ext = name.split('.').pop().toLowerCase();
      const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
      const size = await p.evaluate(async ([b64, mime]) => {
        const img = new Image();
        img.src = `data:${mime};base64,${b64}`;
        await img.decode();
        return { w: img.naturalWidth, h: img.naturalHeight };
      }, [Buffer.from(data).toString('base64'), mime]);
      await p.setViewportSize({ width: size.w, height: size.h });
      const pad = Math.round(Math.min(size.w, size.h) * 0.12);
      await p.setContent(`<!doctype html><html><body style="margin:0;width:${size.w}px;height:${size.h}px;background:#fff;display:flex;align-items:center;justify-content:center"><div style="width:${size.w - pad * 2}px;height:${size.h - pad * 2}px">${logo}</div></body></html>`);
      const outDir = join(brandDir, 'contracts', basename(f, '.xlsx'));
      mkdirSync(outDir, { recursive: true });
      const out = join(outDir, basename(name));
      await p.screenshot({ path: out, type: ext === 'png' ? 'png' : 'jpeg', quality: ext === 'png' ? undefined : 92, omitBackground: false });
      console.log(`${f} ${name} ${size.w}×${size.h} → ${out.replace(root + '/', '')}`);
    }
  }
  await b.close();
})();
