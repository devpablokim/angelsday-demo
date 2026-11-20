// 엑셀 시트를 인쇄 모양 그대로 HTML 로 그립니다 (계약서 미리보기·A4 PDF 용).
// 열 너비·행 높이·병합·테두리·바탕색·글꼴·글자별 서식·숫자 서식·그림을 엑셀 좌표 그대로 옮기고,
// 인쇄 영역만 그립니다. 외부 라이브러리 없이 xlsx 의 XML 을 직접 읽습니다.
import { colLetters, NS, parseRef, type SheetInfo, type XlsxPackage } from './pkg';

const A_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

// ───────── 색 ─────────
const INDEXED = [
  '000000',
  'FFFFFF',
  'FF0000',
  '00FF00',
  '0000FF',
  'FFFF00',
  'FF00FF',
  '00FFFF',
  '000000',
  'FFFFFF',
  'FF0000',
  '00FF00',
  '0000FF',
  'FFFF00',
  'FF00FF',
  '00FFFF',
  '800000',
  '008000',
  '000080',
  '808000',
  '800080',
  '008080',
  'C0C0C0',
  '808080',
  '9999FF',
  '993366',
  'FFFFCC',
  'CCFFFF',
  '660066',
  'FF8080',
  '0066CC',
  'CCCCFF',
  '000080',
  'FF00FF',
  'FFFF00',
  '00FFFF',
  '800080',
  '800000',
  '008080',
  '0000FF',
  '00CCFF',
  'CCFFFF',
  'CCFFCC',
  'FFFF99',
  '99CCFF',
  'FF99CC',
  'CC99FF',
  'FFCC99',
  '3366FF',
  '33CCCC',
  '99CC00',
  'FFCC00',
  'FF9900',
  'FF6600',
  '666699',
  '969696',
  '003366',
  '339966',
  '003300',
  '333300',
  '993300',
  '993366',
  '333399',
  '333333',
];

function applyTint(hex: string, tint: number): string {
  if (!tint) return hex;
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  l = tint < 0 ? l * (1 + tint) : l * (1 - tint) + tint;
  const hue = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let rr = l;
  let gg = l;
  let bb = l;
  if (s) {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    rr = hue(p, q, h + 1 / 3);
    gg = hue(p, q, h);
    bb = hue(p, q, h - 1 / 3);
  }
  const x = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `${x(rr)}${x(gg)}${x(bb)}`.toUpperCase();
}

// ───────── 스타일 ─────────
interface Font {
  name: string;
  size: number; // pt
  bold: boolean;
  italic: boolean;
  underline: string | null;
  strike: boolean;
  color: string | null;
}
interface Edge {
  style: string;
  color: string;
}
interface Border {
  left?: Edge;
  right?: Edge;
  top?: Edge;
  bottom?: Edge;
}
interface Xf {
  font: number;
  fill: number;
  border: number;
  numFmt: number;
  h: string;
  v: string;
  wrap: boolean;
  indent: number;
  shrink: boolean;
}
interface Styles {
  fonts: Font[];
  fills: (string | null)[];
  borders: Border[];
  xfs: Xf[];
  numFmts: Map<number, string>;
  mdw: number; // 기본 글꼴의 숫자 폭(px) — 열 너비 환산용
}

const cache = new WeakMap<XlsxPackage, { styles: Styles; strings: Run[][]; images: Map<string, string> }>();

function first(el: Element | null | undefined, name: string): Element | null {
  if (!el) return null;
  for (const c of Array.from(el.children)) if (c.localName === name) return c;
  return null;
}
function kids(el: Element | null | undefined, name: string): Element[] {
  return el ? Array.from(el.children).filter((c) => c.localName === name) : [];
}

function themeColors(pkg: XlsxPackage): string[] {
  const path = 'xl/theme/theme1.xml';
  if (!pkg.has(path)) return [];
  const d = pkg.doc(path);
  const scheme = d.getElementsByTagNameNS(A_NS, 'clrScheme')[0];
  if (!scheme) return [];
  const get = (name: string) => {
    const el = first(scheme, name);
    const c = el?.firstElementChild;
    return (c?.getAttribute('lastClr') ?? c?.getAttribute('val') ?? '000000').toUpperCase();
  };
  // 엑셀의 테마 번호 순서: lt1, dk1, lt2, dk2, accent1~6, hlink, folHlink
  return ['lt1', 'dk1', 'lt2', 'dk2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'].map(get);
}

function makeColor(theme: string[]) {
  return (el: Element | null): string | null => {
    if (!el) return null;
    const tint = Number(el.getAttribute('tint') ?? 0);
    const rgb = el.getAttribute('rgb');
    if (rgb) return '#' + applyTint(rgb.slice(-6), tint);
    const th = el.getAttribute('theme');
    if (th !== null && theme[Number(th)]) return '#' + applyTint(theme[Number(th)], tint);
    const idx = el.getAttribute('indexed');
    if (idx !== null) {
      const i = Number(idx);
      if (i === 64 || i === 65) return null; // 시스템 기본색
      if (INDEXED[i]) return '#' + applyTint(INDEXED[i], tint);
    }
    return null;
  };
}

function parseFont(el: Element, color: (e: Element | null) => string | null): Font {
  const val = (n: string) => first(el, n)?.getAttribute('val');
  const has = (n: string) => {
    const e = first(el, n);
    return !!e && e.getAttribute('val') !== '0' && e.getAttribute('val') !== 'false';
  };
  const u = first(el, 'u');
  return {
    name: val('name') ?? val('rFont') ?? '맑은 고딕',
    size: Number(val('sz') ?? 11),
    bold: has('b'),
    italic: has('i'),
    underline: u ? (u.getAttribute('val') ?? 'single') : null,
    strike: has('strike'),
    color: color(first(el, 'color')),
  };
}

function loadStyles(pkg: XlsxPackage): Styles {
  const theme = themeColors(pkg);
  const color = makeColor(theme);
  const d = pkg.doc('xl/styles.xml');
  const root = d.documentElement;
  const fonts = kids(first(root, 'fonts'), 'font').map((f) => parseFont(f, color));
  const fills = kids(first(root, 'fills'), 'fill').map((f) => {
    const p = first(f, 'patternFill');
    if (p) {
      const type = p.getAttribute('patternType') ?? 'none';
      if (type === 'none') return null;
      return color(first(p, 'fgColor')) ?? color(first(p, 'bgColor'));
    }
    const g = first(f, 'gradientFill');
    if (g) return color(first(first(g, 'stop'), 'color'));
    return null;
  });
  const borders = kids(first(root, 'borders'), 'border').map((b) => {
    const out: Border = {};
    for (const side of ['left', 'right', 'top', 'bottom'] as const) {
      const e = first(b, side);
      const style = e?.getAttribute('style');
      if (e && style && style !== 'none') out[side] = { style, color: color(first(e, 'color')) ?? '#000000' };
    }
    return out;
  });
  const xfs = kids(first(root, 'cellXfs'), 'xf').map((x) => {
    const a = first(x, 'alignment');
    return {
      font: Number(x.getAttribute('fontId') ?? 0),
      fill: Number(x.getAttribute('fillId') ?? 0),
      border: Number(x.getAttribute('borderId') ?? 0),
      numFmt: Number(x.getAttribute('numFmtId') ?? 0),
      h: a?.getAttribute('horizontal') ?? 'general',
      v: a?.getAttribute('vertical') ?? 'bottom',
      wrap: a?.getAttribute('wrapText') === '1' || a?.getAttribute('wrapText') === 'true',
      indent: Number(a?.getAttribute('indent') ?? 0),
      shrink: a?.getAttribute('shrinkToFit') === '1',
    };
  });
  const numFmts = new Map<number, string>();
  for (const n of kids(first(root, 'numFmts'), 'numFmt')) numFmts.set(Number(n.getAttribute('numFmtId')), n.getAttribute('formatCode') ?? 'General');
  const f0 = fonts[0];
  // 기본 글꼴의 숫자 폭: 맑은 고딕 11pt ≈ 8px, Calibri 11pt ≈ 7px
  const mdw = Math.max(5, Math.round((f0?.size ?? 11) * (/calibri|arial/i.test(f0?.name ?? '') ? 0.64 : 0.73)));
  return { fonts, fills, borders, xfs, numFmts, mdw };
}

// ───────── 문자열 ─────────
interface Run {
  text: string;
  font?: Font;
}

function loadStrings(pkg: XlsxPackage, color: (e: Element | null) => string | null): Run[][] {
  if (!pkg.has('xl/sharedStrings.xml')) return [];
  const d = pkg.doc('xl/sharedStrings.xml');
  return Array.from(d.getElementsByTagNameNS(NS, 'si')).map((si) => runsOf(si, color));
}

function runsOf(container: Element, color: (e: Element | null) => string | null): Run[] {
  const runs = kids(container, 'r');
  if (!runs.length)
    return [
      {
        text: kids(container, 't')
          .map((t) => t.textContent ?? '')
          .join(''),
      },
    ];
  return runs.map((r) => {
    const rPr = first(r, 'rPr');
    return {
      text: kids(r, 't')
        .map((t) => t.textContent ?? '')
        .join(''),
      font: rPr ? parseFont(rPr, color) : undefined,
    };
  });
}

function data(pkg: XlsxPackage) {
  let c = cache.get(pkg);
  if (!c) {
    const styles = loadStyles(pkg);
    const color = makeColor(themeColors(pkg));
    c = { styles, strings: loadStrings(pkg, color), images: new Map() };
    cache.set(pkg, c);
  }
  return c;
}

/** 양식을 고친 뒤 다시 그릴 때 (문자열·서식 캐시를 비웁니다) */
export function invalidate(pkg: XlsxPackage) {
  const c = cache.get(pkg);
  if (c) for (const url of c.images.values()) URL.revokeObjectURL(url);
  cache.delete(pkg);
}

// ───────── 숫자 서식 ─────────
const BUILTIN: Record<number, string> = {
  0: 'General',
  1: '0',
  2: '0.00',
  3: '#,##0',
  4: '#,##0.00',
  9: '0%',
  10: '0.00%',
  37: '#,##0 ;(#,##0)',
  38: '#,##0 ;[Red](#,##0)',
  41: '_-* #,##0_-;-* #,##0_-;_-* "-"_-;_-@_-',
  42: '_-"₩"* #,##0_-;-"₩"* #,##0_-;_-"₩"* "-"_-;_-@_-',
  49: '@',
};

function formatNumber(n: number, code: string): string {
  if (!code || code === 'General') return Number.isInteger(n) ? String(n) : String(Math.round(n * 1e9) / 1e9);
  const sections = code.split(';');
  let sec = sections[0];
  let value = n;
  if (n < 0 && sections[1]) {
    sec = sections[1];
    value = -n;
  } else if (n === 0 && sections[2]) sec = sections[2];
  // 문자열 조각·간격·색 표시 정리
  let out = '';
  let numPart = '';
  let numStart = -1;
  for (let i = 0; i < sec.length; i++) {
    const ch = sec[i];
    if (ch === '"') {
      const j = sec.indexOf('"', i + 1);
      out += sec.slice(i + 1, j < 0 ? undefined : j);
      i = j < 0 ? sec.length : j;
    } else if (ch === '\\') {
      out += sec[i + 1] ?? '';
      i++;
    } else if (ch === '_') {
      out += ' ';
      i++;
    } else if (ch === '*') {
      i++;
    } else if (ch === '[') {
      i = sec.indexOf(']', i);
    } else if ('#0,.?'.includes(ch)) {
      if (numStart < 0) {
        numStart = out.length;
        out += '\u0000';
      }
      numPart += ch;
    } else if (ch === '%') {
      value *= 100;
      out += '%';
    } else if (ch === '@') {
      out += String(n);
    } else out += ch;
  }
  if (numStart < 0) return out.trim() ? out : String(n);
  const dec = numPart.includes('.') ? numPart.split('.')[1].replace(/[^0#?]/g, '').length : 0;
  const grouped = numPart.split('.')[0].includes(',');
  const s = value.toLocaleString('en-US', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
    useGrouping: grouped,
  });
  return out.replace('\u0000', s);
}

// ───────── 시트 ─────────
interface CellData {
  s: number;
  runs: Run[];
  isNumber: boolean;
}

export interface RenderOptions {
  /** 강조할 칸(병합이면 왼쪽 위 칸) — 바뀐 부분 표시 */
  highlight?: Iterable<string>;
}

export interface RenderedSheet {
  el: HTMLDivElement;
  width: number;
  height: number;
  /** 인쇄 여백 (px, 96dpi) */
  margins: { left: number; right: number; top: number; bottom: number };
  centered: boolean;
}

const PX_PER_PT = 96 / 72;
const EMU_PER_PX = 9525;

function fontFamily(name: string): string {
  const fallback = "'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Noto Sans CJK KR', sans-serif";
  return `'${name.replace(/'/g, '')}', ${fallback}`;
}

function applyFont(el: HTMLElement, f: Font) {
  el.style.fontFamily = fontFamily(f.name);
  el.style.fontSize = `${f.size * PX_PER_PT}px`;
  el.style.fontWeight = f.bold ? '700' : '400';
  el.style.fontStyle = f.italic ? 'italic' : 'normal';
  const deco = [f.underline ? 'underline' : '', f.strike ? 'line-through' : ''].filter(Boolean).join(' ');
  el.style.textDecoration = deco || 'none';
  if (f.underline === 'double') el.style.textDecorationStyle = 'double';
  el.style.color = f.color ?? '#000000';
}

const BORDER_W: Record<string, number> = {
  thin: 1,
  hair: 1,
  dotted: 1,
  dashed: 1,
  dashDot: 1,
  dashDotDot: 1,
  medium: 2,
  mediumDashed: 2,
  mediumDashDot: 2,
  mediumDashDotDot: 2,
  slantDashDot: 2,
  thick: 3,
  double: 3,
};
function cssBorder(e: Edge): string {
  const w = BORDER_W[e.style] ?? 1;
  const style = e.style === 'double' ? 'double' : /dot/i.test(e.style) && !/dash/i.test(e.style) ? 'dotted' : e.style === 'hair' ? 'dotted' : /dash/i.test(e.style) ? 'dashed' : 'solid';
  return `${w}px ${style} ${e.color}`;
}

export function renderSheet(pkg: XlsxPackage, sheet: SheetInfo, opts: RenderOptions = {}): RenderedSheet {
  const { styles, strings, images } = data(pkg);
  const theme = themeColors(pkg);
  const color = makeColor(theme);
  const doc = pkg.doc(sheet.path);
  const root = doc.documentElement;

  // 열 너비 (px)
  const fmt = first(root, 'sheetFormatPr');
  const mdw = styles.mdw;
  const charsToPx = (w: number) => Math.trunc(((256 * w + Math.trunc(128 / mdw)) / 256) * mdw);
  const defColW = fmt?.getAttribute('defaultColWidth') ? charsToPx(Number(fmt.getAttribute('defaultColWidth'))) : charsToPx(Number(fmt?.getAttribute('baseColWidth') ?? 8)) + 5;
  const defRowH = Number(fmt?.getAttribute('defaultRowHeight') ?? 15) * PX_PER_PT;
  const colW = new Map<number, number>();
  const colStyle = new Map<number, number>();
  for (const col of kids(first(root, 'cols'), 'col')) {
    const min = Number(col.getAttribute('min'));
    const max = Number(col.getAttribute('max'));
    const hidden = col.getAttribute('hidden') === '1';
    const w = hidden ? 0 : charsToPx(Number(col.getAttribute('width') ?? 0));
    for (let c = min; c <= Math.min(max, 16384); c++) {
      colW.set(c, w);
      if (col.getAttribute('style')) colStyle.set(c, Number(col.getAttribute('style')));
    }
  }

  // 행·칸
  const rowH = new Map<number, number>();
  const rowStyle = new Map<number, number>();
  const cells = new Map<string, CellData>();
  let maxRow = 0;
  let maxCol = 0;
  for (const row of kids(first(root, 'sheetData'), 'row')) {
    const r = Number(row.getAttribute('r'));
    maxRow = Math.max(maxRow, r);
    if (row.getAttribute('hidden') === '1') rowH.set(r, 0);
    else if (row.getAttribute('ht')) rowH.set(r, Number(row.getAttribute('ht')) * PX_PER_PT);
    if (row.getAttribute('customFormat') === '1' && row.getAttribute('s')) rowStyle.set(r, Number(row.getAttribute('s')));
    for (const c of kids(row, 'c')) {
      const ref = c.getAttribute('r')!;
      const { c: cn } = parseRef(ref);
      maxCol = Math.max(maxCol, cn);
      const s = Number(c.getAttribute('s') ?? 0);
      const t = c.getAttribute('t');
      const v = first(c, 'v')?.textContent ?? null;
      let runs: Run[] = [];
      let isNumber = false;
      if (t === 's' && v !== null) runs = strings[Number(v)] ?? [];
      else if (t === 'inlineStr') runs = runsOf(first(c, 'is') ?? c, color);
      else if (t === 'str' || t === 'e') runs = v !== null ? [{ text: v }] : [];
      else if (t === 'b') runs = v !== null ? [{ text: v === '1' ? 'TRUE' : 'FALSE' }] : [];
      else if (v !== null && v !== '') {
        const xf = styles.xfs[s];
        const code = xf ? (styles.numFmts.get(xf.numFmt) ?? BUILTIN[xf.numFmt] ?? 'General') : 'General';
        runs = [{ text: formatNumber(Number(v), code) }];
        isNumber = true;
      }
      cells.set(ref, { s, runs, isNumber });
    }
  }
  const area = sheet.area ?? {
    c1: 1,
    r1: 1,
    c2: Math.max(1, maxCol),
    r2: Math.max(1, maxRow),
  };
  const W = (c: number) => colW.get(c) ?? defColW;
  const H = (r: number) => rowH.get(r) ?? defRowH;
  const xs: number[] = [];
  const ys: number[] = [];
  let acc = 0;
  for (let c = area.c1; c <= area.c2 + 1; c++) {
    xs[c] = acc;
    acc += W(c);
  }
  const width = xs[area.c2 + 1];
  acc = 0;
  for (let r = area.r1; r <= area.r2 + 1; r++) {
    ys[r] = acc;
    acc += H(r);
  }
  const height = ys[area.r2 + 1];

  // 병합
  const merges = new Map<string, { c1: number; r1: number; c2: number; r2: number }>();
  const covered = new Set<string>();
  for (const m of kids(first(root, 'mergeCells'), 'mergeCell')) {
    const [a, b] = (m.getAttribute('ref') ?? '').split(':');
    if (!b) continue;
    const p = parseRef(a);
    const q = parseRef(b);
    merges.set(`${colLetters(p.c)}${p.r}`, {
      c1: p.c,
      r1: p.r,
      c2: q.c,
      r2: q.r,
    });
    for (let r = p.r; r <= q.r; r++) for (let c = p.c; c <= q.c; c++) if (r !== p.r || c !== p.c) covered.add(`${colLetters(c)}${r}`);
  }

  const styleAt = (c: number, r: number) => {
    const cell = cells.get(`${colLetters(c)}${r}`);
    if (cell) return cell.s;
    return rowStyle.get(r) ?? colStyle.get(c) ?? 0;
  };
  const borderAt = (c: number, r: number) => styles.borders[styles.xfs[styleAt(c, r)]?.border ?? 0] ?? {};

  const highlight = new Set(Array.from(opts.highlight ?? [], (x) => x.toUpperCase()));
  const el = document.createElement('div');
  el.className = 'xlsx-sheet';
  Object.assign(el.style, {
    position: 'relative',
    width: `${width}px`,
    height: `${height}px`,
    background: '#ffffff',
    overflow: 'hidden',
  });
  const fills = document.createDocumentFragment();
  const texts = document.createDocumentFragment();
  const lines = document.createDocumentFragment();

  const line = (x: number, y: number, w: number, h: number, edge: Edge, horizontal: boolean) => {
    const t = BORDER_W[edge.style] ?? 1;
    const d = document.createElement('div');
    Object.assign(d.style, {
      position: 'absolute',
      left: `${x - (horizontal ? 0 : t / 2)}px`,
      top: `${y - (horizontal ? t / 2 : 0)}px`,
      width: `${horizontal ? w : 0}px`,
      height: `${horizontal ? 0 : h}px`,
    });
    d.style[horizontal ? 'borderTop' : 'borderLeft'] = cssBorder(edge);
    lines.appendChild(d);
  };

  for (let r = area.r1; r <= area.r2; r++) {
    if (!H(r)) continue;
    for (let c = area.c1; c <= area.c2; c++) {
      const ref = `${colLetters(c)}${r}`;
      if (covered.has(ref) || !W(c)) continue;
      const m = merges.get(ref);
      const c2 = Math.min(m?.c2 ?? c, area.c2);
      const r2 = Math.min(m?.r2 ?? r, area.r2);
      const x = xs[c];
      const y = ys[r];
      const w = xs[c2 + 1] - x;
      const h = ys[r2 + 1] - y;
      if (w <= 0 || h <= 0) continue;
      const s = styleAt(c, r);
      const xf = styles.xfs[s] ?? styles.xfs[0];
      const bg = xf ? styles.fills[xf.fill] : null;
      const cell = cells.get(ref);
      const hl = highlight.has(ref);

      if (bg || hl) {
        const f = document.createElement('div');
        Object.assign(f.style, {
          position: 'absolute',
          left: `${x}px`,
          top: `${y}px`,
          width: `${w}px`,
          height: `${h}px`,
          background: bg ?? 'transparent',
        });
        if (hl) f.style.boxShadow = 'inset 0 0 0 9999px rgba(255, 214, 10, 0.45)';
        fills.appendChild(f);
      }

      // 테두리: 병합 범위는 바깥 칸들의 테두리만
      for (let cc = c; cc <= c2; cc++) {
        const top = borderAt(cc, r).top;
        if (top) line(xs[cc], y, W(cc), 0, top, true);
        const bottom = borderAt(cc, r2).bottom;
        if (bottom) line(xs[cc], ys[r2 + 1], W(cc), 0, bottom, true);
      }
      for (let rr = r; rr <= r2; rr++) {
        if (!H(rr)) continue;
        const left = borderAt(c, rr).left;
        if (left) line(x, ys[rr], 0, H(rr), left, false);
        const right = borderAt(c2, rr).right;
        if (right) line(xs[c2 + 1], ys[rr], 0, H(rr), right, false);
      }

      const text = cell?.runs.map((x) => x.text).join('') ?? '';
      if (!text.trim() && !hl) continue;
      if (!text) continue;
      const box = document.createElement('div');
      const hAlign = xf?.h === 'general' ? (cell?.isNumber ? 'right' : 'left') : (xf?.h ?? 'left');
      const vAlign = xf?.v ?? 'bottom';
      const wrap = !!xf?.wrap || hAlign === 'justify' || hAlign === 'distributed';
      Object.assign(box.style, {
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        width: `${w}px`,
        height: `${h}px`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: vAlign === 'top' ? 'flex-start' : vAlign === 'center' || vAlign === 'justify' || vAlign === 'distributed' ? 'center' : 'flex-end',
        alignItems: hAlign === 'center' || hAlign === 'centerContinuous' ? 'center' : hAlign === 'right' ? 'flex-end' : 'flex-start',
        padding: `0 ${2 + (xf?.indent ?? 0) * mdw * 1.5}px 0 ${2 + (hAlign === 'left' || hAlign === 'general' ? (xf?.indent ?? 0) * mdw * 1.5 : 0)}px`,
        boxSizing: 'border-box',
        overflow: wrap ? 'hidden' : 'visible',
        lineHeight: '1.2',
      });
      const inner = document.createElement('div');
      Object.assign(inner.style, {
        whiteSpace: wrap ? 'pre-wrap' : 'pre',
        wordBreak: 'keep-all',
        overflowWrap: 'anywhere',
        textAlign: hAlign === 'center' || hAlign === 'centerContinuous' ? 'center' : hAlign === 'right' ? 'right' : hAlign === 'justify' || hAlign === 'distributed' ? 'justify' : 'left',
        maxWidth: wrap ? '100%' : 'none',
      });
      const baseFont = styles.fonts[xf?.font ?? 0] ?? styles.fonts[0];
      applyFont(inner, baseFont);
      for (const run of cell!.runs) {
        const span = document.createElement('span');
        span.textContent = wrap ? run.text : run.text.replace(/\r?\n/g, ' ');
        if (run.font) applyFont(span, run.font);
        inner.appendChild(span);
      }
      box.appendChild(inner);
      texts.appendChild(box);
    }
  }

  el.append(fills, lines, texts);

  // 그림·도형 (로고, 하단 주소 띠, 화살표 등)
  const colX = (col: number) => {
    if (xs[col] !== undefined) return xs[col];
    let v = 0;
    if (col >= area.c1) for (let c = area.c1; c < col; c++) v += W(c);
    else for (let c = col; c < area.c1; c++) v -= W(c);
    return v;
  };
  const rowY = (row: number) => {
    if (ys[row] !== undefined) return ys[row];
    let v = 0;
    if (row >= area.r1) for (let r = area.r1; r < row; r++) v += H(r);
    else for (let r = row; r < area.r1; r++) v -= H(r);
    return v;
  };
  const sheetRels = pkg.rels(sheet.path);
  for (const dr of kids(root, 'drawing')) {
    const target = sheetRels.get(dr.getAttributeNS(REL_NS, 'id') ?? '');
    if (!target) continue;
    const drawPath = pkg.resolve(sheet.path, target);
    if (!pkg.has(drawPath)) continue;
    const drawRels = pkg.rels(drawPath);
    const dd = pkg.doc(drawPath);
    for (const anchor of Array.from(dd.documentElement.children)) {
      const pos = (p: Element | null) => {
        if (!p) return null;
        const num = (n: string) => Number(first(p, n)?.textContent ?? 0);
        return {
          x: colX(num('col') + 1) + num('colOff') / EMU_PER_PX,
          y: rowY(num('row') + 1) + num('rowOff') / EMU_PER_PX,
        };
      };
      const from = pos(first(anchor, 'from'));
      if (!from) continue;
      let w = 0;
      let h = 0;
      const to = pos(first(anchor, 'to'));
      if (to) {
        w = to.x - from.x;
        h = to.y - from.y;
      } else {
        const ext = first(anchor, 'ext');
        w = Number(ext?.getAttribute('cx') ?? 0) / EMU_PER_PX;
        h = Number(ext?.getAttribute('cy') ?? 0) / EMU_PER_PX;
      }
      if (from.x >= width || from.y >= height || from.x + w <= 0 || from.y + h <= 0) continue;
      const box = { x: from.x, y: from.y, w, h };
      for (const item of Array.from(anchor.children)) {
        if (item.localName === 'pic') {
          const blip = item.getElementsByTagNameNS(A_NS, 'blip')[0];
          const rid = blip?.getAttributeNS(REL_NS, 'embed');
          const media = rid ? drawRels.get(rid) : null;
          if (!media || w <= 0 || h <= 0) continue;
          const mediaPath = pkg.resolve(drawPath, media);
          let url = images.get(mediaPath);
          if (!url && pkg.has(mediaPath)) {
            const ext = mediaPath.split('.').pop()!.toLowerCase();
            const type = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'gif' ? 'image/gif' : 'image/png';
            url = URL.createObjectURL(new Blob([pkg.files[mediaPath] as BlobPart], { type }));
            images.set(mediaPath, url);
          }
          if (!url) continue;
          const img = document.createElement('img');
          img.src = url;
          img.alt = '';
          Object.assign(img.style, {
            position: 'absolute',
            left: `${box.x}px`,
            top: `${box.y}px`,
            width: `${w}px`,
            height: `${h}px`,
          });
          el.appendChild(img);
        } else if (item.localName === 'sp' || item.localName === 'cxnSp') {
          const shape = drawShape(item, box, theme);
          if (shape) el.appendChild(shape);
        }
      }
    }
  }

  const pm = first(root, 'pageMargins');
  const inch = (n: string, d: number) => Number(pm?.getAttribute(n) ?? d) * 96;
  const po = first(root, 'printOptions');
  return {
    el,
    width,
    height,
    margins: {
      left: inch('left', 0.7),
      right: inch('right', 0.7),
      top: inch('top', 0.75),
      bottom: inch('bottom', 0.75),
    },
    centered: po?.getAttribute('horizontalCentered') === '1',
  };
}

// ───────── 도형 (DrawingML) ─────────
const SCHEME: Record<string, number> = {
  lt1: 0,
  bg1: 0,
  dk1: 1,
  tx1: 1,
  lt2: 2,
  bg2: 2,
  dk2: 3,
  tx2: 3,
  accent1: 4,
  accent2: 5,
  accent3: 6,
  accent4: 7,
  accent5: 8,
  accent6: 9,
  hlink: 10,
  folHlink: 11,
};

function rgbToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = (max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4) / 6;
  return [h, s, l];
}
function hslToHex(h: number, s: number, l: number): string {
  const hue = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r = l;
  let g = l;
  let b = l;
  if (s) {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue(p, q, h + 1 / 3);
    g = hue(p, q, h);
    b = hue(p, q, h - 1 / 3);
  }
  const x = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `${x(r)}${x(g)}${x(b)}`;
}

/** a:srgbClr / a:schemeClr / a:sysClr / a:prstClr 와 밝기 조정(lumMod·lumOff·shade·tint) */
function drawingColor(el: Element | null | undefined, theme: string[]): string | null {
  if (!el) return null;
  let hex: string | null = null;
  if (el.localName === 'srgbClr') hex = el.getAttribute('val');
  else if (el.localName === 'schemeClr') hex = theme[SCHEME[el.getAttribute('val') ?? ''] ?? -1] ?? null;
  else if (el.localName === 'sysClr') hex = el.getAttribute('lastClr') ?? (el.getAttribute('val') === 'window' ? 'FFFFFF' : '000000');
  else if (el.localName === 'prstClr')
    hex =
      (
        {
          black: '000000',
          white: 'FFFFFF',
          red: 'FF0000',
          blue: '0000FF',
        } as Record<string, string>
      )[el.getAttribute('val') ?? ''] ?? null;
  if (!hex) return null;
  for (const m of Array.from(el.children)) {
    const v = Number(m.getAttribute('val') ?? 100000) / 100000;
    if (m.localName === 'shade' || m.localName === 'tint') {
      const ch = [0, 2, 4].map((i) => parseInt(hex!.slice(i, i + 2), 16));
      hex = ch
        .map((c) =>
          Math.round(m.localName === 'shade' ? c * v : c + (255 - c) * (1 - v))
            .toString(16)
            .padStart(2, '0'),
        )
        .join('');
    } else if (m.localName === 'lumMod' || m.localName === 'lumOff') {
      const [h, s, l] = rgbToHsl(hex);
      hex = hslToHex(h, s, m.localName === 'lumMod' ? l * v : l + v);
    }
  }
  return '#' + hex.toUpperCase();
}

function fillOf(container: Element | null, theme: string[]): string | null | undefined {
  if (!container) return undefined;
  if (first(container, 'noFill')) return null;
  const sf = first(container, 'solidFill');
  if (sf) return drawingColor(sf.firstElementChild, theme);
  return undefined;
}

function drawShape(item: Element, box: { x: number; y: number; w: number; h: number }, theme: string[]): HTMLElement | null {
  const spPr = first(item, 'spPr');
  const style = first(item, 'style');
  const prst = first(spPr, 'prstGeom')?.getAttribute('prst') ?? 'rect';
  const ln = first(spPr, 'ln');
  const lnRef = first(style, 'lnRef');
  let lineColor = fillOf(ln, theme);
  if (lineColor === undefined) lineColor = Number(lnRef?.getAttribute('idx') ?? 0) > 0 ? drawingColor(lnRef?.firstElementChild, theme) : null;
  const lineW = ln?.getAttribute('w') ? Number(ln.getAttribute('w')) / EMU_PER_PX : Number(lnRef?.getAttribute('idx') ?? 0) >= 2 ? 1.5 : 1;

  if (prst === 'line' || /connector/i.test(prst)) {
    if (!lineColor) return null;
    const xfrm = first(spPr, 'xfrm');
    const flipH = xfrm?.getAttribute('flipH') === '1';
    const flipV = xfrm?.getAttribute('flipV') === '1';
    const pad = 8;
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    const w = Math.max(box.w, 1);
    const h = Math.max(box.h, 1);
    svg.setAttribute('width', String(w + pad * 2));
    svg.setAttribute('height', String(h + pad * 2));
    Object.assign((svg as unknown as HTMLElement).style, {
      position: 'absolute',
      left: `${box.x - pad}px`,
      top: `${box.y - pad}px`,
      overflow: 'visible',
    });
    const x1 = pad + (flipH ? box.w : 0);
    const x2 = pad + (flipH ? 0 : box.w);
    const y1 = pad + (flipV ? box.h : 0);
    const y2 = pad + (flipV ? 0 : box.h);
    const line = document.createElementNS(svgNS, 'line');
    for (const [k, v] of Object.entries({
      x1,
      y1,
      x2,
      y2,
      stroke: lineColor,
      'stroke-width': lineW,
    }))
      line.setAttribute(k, String(v));
    svg.appendChild(line);
    const tail = first(ln, 'tailEnd')?.getAttribute('type');
    if (tail && tail !== 'none') {
      const ang = Math.atan2(y2 - y1, x2 - x1);
      const len = 4 + lineW * 3;
      const pts = [
        [x2, y2],
        [x2 - len * Math.cos(ang - 0.45), y2 - len * Math.sin(ang - 0.45)],
        [x2 - len * Math.cos(ang + 0.45), y2 - len * Math.sin(ang + 0.45)],
      ];
      const head = document.createElementNS(svgNS, 'polygon');
      head.setAttribute('points', pts.map((p) => p.join(',')).join(' '));
      head.setAttribute('fill', lineColor);
      svg.appendChild(head);
    }
    return svg as unknown as HTMLElement;
  }

  if (box.w <= 0 || box.h <= 0) return null;
  const fillRef = first(style, 'fillRef');
  let fill = fillOf(spPr, theme);
  if (fill === undefined) fill = Number(fillRef?.getAttribute('idx') ?? 0) > 0 ? drawingColor(fillRef?.firstElementChild, theme) : null;
  const div = document.createElement('div');
  Object.assign(div.style, {
    position: 'absolute',
    left: `${box.x}px`,
    top: `${box.y}px`,
    width: `${box.w}px`,
    height: `${box.h}px`,
    background: fill ?? 'transparent',
    border: lineColor ? `${lineW}px solid ${lineColor}` : 'none',
    borderRadius: prst === 'ellipse' ? '50%' : prst === 'roundRect' ? `${Math.min(box.w, box.h) * 0.16}px` : '0',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  });

  const tx = first(item, 'txBody');
  if (tx) {
    const fontRef = first(style, 'fontRef');
    const defColor = drawingColor(fontRef?.firstElementChild, theme) ?? '#000000';
    const body = first(tx, 'bodyPr');
    const anchorPos = body?.getAttribute('anchor') ?? 't';
    const ins = (n: string, d: number) => Number(body?.getAttribute(n) ?? d) / EMU_PER_PX;
    div.style.justifyContent = anchorPos === 'ctr' ? 'center' : anchorPos === 'b' ? 'flex-end' : 'flex-start';
    div.style.padding = `${ins('tIns', 45720)}px ${ins('rIns', 91440)}px ${ins('bIns', 45720)}px ${ins('lIns', 91440)}px`;
    for (const p of kids(tx, 'p')) {
      const para = document.createElement('div');
      const algn = first(p, 'pPr')?.getAttribute('algn') ?? 'l';
      Object.assign(para.style, {
        textAlign: algn === 'ctr' ? 'center' : algn === 'r' ? 'right' : algn === 'just' ? 'justify' : 'left',
        whiteSpace: 'pre-wrap',
        lineHeight: '1.2',
        wordBreak: 'keep-all',
      });
      let any = false;
      for (const r of Array.from(p.children)) {
        if (r.localName === 'br') {
          para.appendChild(document.createElement('br'));
          continue;
        }
        if (r.localName !== 'r' && r.localName !== 'fld') continue;
        const rPr = first(r, 'rPr');
        const span = document.createElement('span');
        span.textContent = first(r, 't')?.textContent ?? '';
        const face = (first(rPr, 'ea') ?? first(rPr, 'latin'))?.getAttribute('typeface') ?? '';
        Object.assign(span.style, {
          fontFamily: fontFamily(face && !face.startsWith('+') ? face : '맑은 고딕'),
          fontSize: `${(Number(rPr?.getAttribute('sz') ?? 1100) / 100) * PX_PER_PT}px`,
          fontWeight: rPr?.getAttribute('b') === '1' ? '700' : '400',
          fontStyle: rPr?.getAttribute('i') === '1' ? 'italic' : 'normal',
          textDecoration: rPr?.getAttribute('u') && rPr.getAttribute('u') !== 'none' ? 'underline' : 'none',
          color: fillOf(rPr, theme) ?? defColor,
        });
        para.appendChild(span);
        any = true;
      }
      if (!any) {
        const end = first(p, 'endParaRPr');
        para.style.fontSize = `${(Number(end?.getAttribute('sz') ?? 1100) / 100) * PX_PER_PT}px`;
        para.innerHTML = '&nbsp;';
      }
      div.appendChild(para);
    }
  }
  return div;
}

/** A4 세로 한 장(794×1123px)에 인쇄 배율로 맞춰 앉힙니다 */
export const A4 = { width: 794, height: 1123 };

export function a4Page(sheet: RenderedSheet, footnote?: string): HTMLDivElement {
  const page = document.createElement('div');
  page.className = 'xlsx-page';
  Object.assign(page.style, {
    position: 'relative',
    width: `${A4.width}px`,
    height: `${A4.height}px`,
    background: '#ffffff',
    overflow: 'hidden',
  });
  const { left, right, top, bottom } = sheet.margins;
  // 여백이 0인 양식도 있어 최소 여백 12px 은 둡니다 (프린터 인쇄 불가 영역)
  const ml = Math.max(left, 12);
  const mr = Math.max(right, 12);
  const mt = Math.max(top, 12);
  const mb = Math.max(bottom, footnote ? 28 : 12);
  const scale = Math.min((A4.width - ml - mr) / sheet.width, (A4.height - mt - mb) / sheet.height);
  const w = sheet.width * scale;
  const holder = document.createElement('div');
  Object.assign(holder.style, {
    position: 'absolute',
    top: `${mt}px`,
    left: `${Math.max(ml, (A4.width - w) / 2)}px`,
    transformOrigin: '0 0',
    transform: `scale(${scale})`,
  });
  holder.appendChild(sheet.el);
  page.appendChild(holder);
  if (footnote) {
    const f = document.createElement('div');
    f.textContent = footnote;
    Object.assign(f.style, {
      position: 'absolute',
      left: '0',
      right: '0',
      bottom: '8px',
      textAlign: 'center',
      font: "9px 'Malgun Gothic', 'Noto Sans KR', sans-serif",
      color: '#8a8478',
    });
    page.appendChild(f);
  }
  return page;
}
