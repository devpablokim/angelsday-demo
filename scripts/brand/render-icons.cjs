// 브랜드 로고 경로(src/brand/<id>/logoPaths.ts)로 apple-touch-icon · og-image PNG 를 그립니다.
//   node scripts/brand/render-icons.cjs lunelle
const { chromium } = require('playwright');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const id = process.argv[2];
if (!id) throw new Error('브랜드 id 를 넣어 주세요. 예: node scripts/brand/render-icons.cjs lunelle');
const dir = join(__dirname, '..', '..', 'src', 'brand', id);
const ts = readFileSync(join(dir, 'logoPaths.ts'), 'utf8');
const get = (n) => JSON.parse(ts.match(new RegExp(`export const ${n} = (\\{.*?\\});`))[1]);
const M = get('MONOGRAM'), W = get('WORDMARK'), T = get('TAGLINE');
const CT = 27.6, CH = 70;
const tt = (x, top, cap) => { const s = cap / CH; return `translate(${x.toFixed(2)} ${(top - CT * s).toFixed(2)}) scale(${s.toFixed(5)})`; };
const gold = '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8C6B2E"/><stop offset=".48" stop-color="#E2C985"/><stop offset="1" stop-color="#A8823C"/></linearGradient></defs>';

// 세로형 로고 (Logo.tsx stacked 와 같은 계산)
const SW = 300, mh = 150, mw = (M.width * mh) / M.height, cap = 30, ww = (W.width * cap) / CH, wTop = mh + 26;
const tagCap = (CH * ww) / T.width, tagTop = wTop + cap + 12, SH = tagTop + tagCap + 2;
const stacked = (word, tag) => `<svg viewBox="0 0 ${SW} ${SH.toFixed(1)}" height="420">${gold}<path fill="url(#g)" transform="translate(${((SW - mw) / 2).toFixed(2)} 0) scale(${(mh / M.height).toFixed(5)})" d="${M.d}"/><path fill="${word}" transform="${tt((SW - ww) / 2, wTop, cap)}" d="${W.d}"/><path fill="${tag}" transform="${tt((SW - ww) / 2, tagTop, tagCap)}" d="${T.d}"/></svg>`;
const mono = (h) => `<svg viewBox="0 0 ${M.width} ${M.height}" height="${h}">${gold}<path fill="url(#g)" d="${M.d}"/></svg>`;

const pages = [
  { file: 'apple-touch-icon.png', w: 180, h: 180, html: `<body style="margin:0;width:180px;height:180px;display:grid;place-items:center;background:#FBF8F2">${mono(128)}</body>` },
  { file: 'og-image.png', w: 1200, h: 630, html: `<body style="margin:0;width:1200px;height:630px;display:grid;place-items:center;background:#141210">${stacked('#FFFFFF', '#D9BF85')}</body>` },
];

(async () => {
  const b = await chromium.launch();
  for (const pg of pages) {
    const p = await b.newPage({ viewport: { width: pg.w, height: pg.h } });
    await p.setContent(`<!doctype html><html>${pg.html}</html>`);
    await p.screenshot({ path: join(dir, 'public', pg.file) });
    await p.close();
    console.log('wrote', join('src/brand', id, 'public', pg.file));
  }
  await b.close();
})();
