// 엑셀(xlsx) 파일을 브라우저에서 열고 고치고 다시 저장합니다.
// xlsx 는 zip 안의 XML 묶음이라, 필요한 칸의 값만 바꾸고 나머지(서식·로고·인쇄 설정)는 바이트 그대로 둡니다.
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

export const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

export interface SheetInfo {
  name: string;
  path: string; // 'xl/worksheets/sheet1.xml'
  index: number;
  /** 인쇄 영역 (1부터 세는 열·행) */
  area?: { c1: number; r1: number; c2: number; r2: number };
}

export class XlsxPackage {
  readonly files: Record<string, Uint8Array>;
  private docs = new Map<string, Document>();
  readonly sheets: SheetInfo[];

  constructor(bytes: Uint8Array) {
    this.files = unzipSync(bytes);
    const wb = this.doc('xl/workbook.xml');
    const rels = this.rels('xl/workbook.xml');
    const areas = new Map<number, SheetInfo['area']>();
    for (const dn of Array.from(wb.getElementsByTagNameNS(NS, 'definedName'))) {
      if (dn.getAttribute('name') !== '_xlnm.Print_Area') continue;
      const id = Number(dn.getAttribute('localSheetId'));
      const range = (dn.textContent ?? '').split(',')[0].split('!').pop()!.replace(/\$/g, '');
      const [a, b] = range.split(':');
      const p = parseRef(a);
      const q = parseRef(b ?? a);
      areas.set(id, { c1: p.c, r1: p.r, c2: q.c, r2: q.r });
    }
    this.sheets = Array.from(wb.getElementsByTagNameNS(NS, 'sheet')).map((s, index) => ({
      name: s.getAttribute('name') ?? `Sheet${index + 1}`,
      path: resolvePath('xl/workbook.xml', rels.get(s.getAttributeNS(REL_NS, 'id') ?? '') ?? ''),
      index,
      area: areas.get(index),
    }));
  }

  static async fromUrl(url: string): Promise<XlsxPackage> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`양식 파일을 불러오지 못했어요 (${res.status})`);
    return new XlsxPackage(new Uint8Array(await res.arrayBuffer()));
  }

  has(path: string) {
    return path in this.files;
  }

  text(path: string): string {
    return strFromU8(this.files[path]);
  }

  /** XML 문서 (고친 뒤 save() 전에 commit 으로 되돌려 씁니다) */
  doc(path: string): Document {
    let d = this.docs.get(path);
    if (!d) {
      d = new DOMParser().parseFromString(this.text(path), 'application/xml');
      this.docs.set(path, d);
    }
    return d;
  }

  commit(path: string) {
    const d = this.docs.get(path);
    if (d) this.files[path] = strToU8(new XMLSerializer().serializeToString(d));
  }

  /** 관계 파일: Id → 대상 경로(원문) */
  rels(partPath: string): Map<string, string> {
    const dir = partPath.slice(0, partPath.lastIndexOf('/') + 1);
    const relPath = `${dir}_rels/${partPath.slice(dir.length)}.rels`;
    const out = new Map<string, string>();
    if (!this.has(relPath)) return out;
    const d = new DOMParser().parseFromString(this.text(relPath), 'application/xml');
    for (const r of Array.from(d.getElementsByTagName('Relationship'))) out.set(r.getAttribute('Id') ?? '', r.getAttribute('Target') ?? '');
    return out;
  }

  resolve(partPath: string, target: string) {
    return resolvePath(partPath, target);
  }

  save(): Uint8Array {
    for (const path of this.docs.keys()) this.commit(path);
    return zipSync(this.files, { level: 6 });
  }

  sheet(nameOrIndex: string | number): SheetInfo {
    const s = typeof nameOrIndex === 'number' ? this.sheets[nameOrIndex] : this.sheets.find((x) => x.name === nameOrIndex);
    if (!s) throw new Error(`시트를 찾을 수 없어요: ${nameOrIndex}`);
    return s;
  }
}

export function colNum(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + ch.charCodeAt(0) - 64;
  return n;
}

export function colLetters(n: number): string {
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function parseRef(ref: string): { c: number; r: number } {
  const m = /^([A-Z]+)(\d+)$/.exec(ref.trim().toUpperCase());
  if (!m) throw new Error(`칸 주소가 올바르지 않아요: ${ref}`);
  return { c: colNum(m[1]), r: Number(m[2]) };
}

function resolvePath(base: string, target: string): string {
  if (target.startsWith('/')) return target.slice(1);
  const parts = base.split('/').slice(0, -1);
  for (const seg of target.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}
