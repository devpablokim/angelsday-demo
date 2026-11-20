// 계약서 만들기 — 엔젤스데이 엑셀 양식(public/contracts/*.xlsx)에 값을 채워
//  ① 원본 양식 그대로의 엑셀(.xlsx) ② 같은 모양의 A4 PDF 를 만듭니다.
import { contractTemplate, type ContractField } from '@shared/contract';
import type { ContractTemplateId } from '@shared/types';
import { readCell, recalcOnOpen, replaceInCell, setCell } from '../xlsx/cells';
import { XlsxPackage } from '../xlsx/pkg';
import { a4Page, A4, renderSheet } from '../xlsx/render';

const bytesCache = new Map<ContractTemplateId, Promise<Uint8Array>>();
const AMOUNT = /\d{1,3}(?:,\d{3})+|\d{4,}/;

function templateBytes(id: ContractTemplateId): Promise<Uint8Array> {
  let p = bytesCache.get(id);
  if (!p) {
    const url = `${import.meta.env.BASE_URL}${contractTemplate(id).file}`;
    p = fetch(url).then(async (r) => {
      if (!r.ok) throw new Error(`계약서 양식을 불러오지 못했어요 (${r.status})`);
      return new Uint8Array(await r.arrayBuffer());
    });
    p.catch(() => bytesCache.delete(id));
    bytesCache.set(id, p);
  }
  return p;
}

export async function openTemplate(id: ContractTemplateId): Promise<XlsxPackage> {
  return new XlsxPackage((await templateBytes(id)).slice());
}

/** 양식에 원래 적혀 있는 값 (표준 단가·문구) — 자동으로 채우지 않는 칸의 기본값 */
export async function templateValues(id: ContractTemplateId): Promise<Record<string, string>> {
  const pkg = await openTemplate(id);
  const out: Record<string, string> = {};
  for (const f of contractTemplate(id).fields) {
    const text = readCell(pkg, pkg.sheet(f.sheet), f.cell);
    out[f.key] = f.replaceAmount ? (AMOUNT.exec(text)?.[0] ?? '') : text;
  }
  return out;
}

const toNumber = (v: string) => {
  const n = Number(v.replace(/[,\s원₩\\]/g, ''));
  return v.trim() && Number.isFinite(n) ? n : null;
};

function writeField(pkg: XlsxPackage, f: ContractField, value: string) {
  const sheet = pkg.sheet(f.sheet);
  if (f.replaceAmount) {
    const n = toNumber(value);
    if (n !== null) replaceInCell(pkg, sheet, f.cell, AMOUNT, n.toLocaleString('ko-KR'));
    return;
  }
  const n = f.kind === 'number' ? toNumber(value) : null;
  setCell(pkg, sheet, f.cell, n !== null ? n : value);
  if (n !== null && f.vatCell) setCell(pkg, sheet, f.vatCell, Math.round(n * 0.1));
  if (n !== null && f.totalCell) setCell(pkg, sheet, f.totalCell, n + Math.round(n * 0.1));
}

/** 값을 채운 계약서 (엑셀 패키지) */
export async function buildContract(id: ContractTemplateId, values: Record<string, string>): Promise<XlsxPackage> {
  const pkg = await openTemplate(id);
  for (const f of contractTemplate(id).fields) {
    if (values[f.key] === undefined) continue;
    writeField(pkg, f, values[f.key]);
  }
  recalcOnOpen(pkg);
  return pkg;
}

/** 바뀐 칸 표시용: 필드 키 → 시트별 칸 주소 */
export function cellsOf(id: ContractTemplateId, keys: Iterable<string>): [string[], string[]] {
  const want = new Set(keys);
  const out: [string[], string[]] = [[], []];
  for (const f of contractTemplate(id).fields) if (want.has(f.key)) out[f.sheet].push(f.cell);
  return out;
}

/** 화면·PDF 용 A4 페이지들 (앞면·뒷면) */
export function contractPages(pkg: XlsxPackage, opts: { highlight?: [string[], string[]]; footnote?: string } = {}): HTMLDivElement[] {
  return pkg.sheets.map((s, i) => a4Page(renderSheet(pkg, s, { highlight: opts.highlight?.[i] }), opts.footnote));
}

export function downloadBytes(bytes: Uint8Array, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function downloadXlsx(pkg: XlsxPackage, filename: string) {
  downloadBytes(pkg.save(), filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

/** A4 세로 PDF — 시트 한 장 = PDF 한 쪽 */
export async function downloadPdf(pkg: XlsxPackage, filename: string, footnote?: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  const stage = document.createElement('div');
  Object.assign(stage.style, {
    position: 'fixed',
    left: '-12000px',
    top: '0',
    pointerEvents: 'none',
  });
  document.body.appendChild(stage);
  try {
    const pages = contractPages(pkg, { footnote });
    pages.forEach((p) => stage.appendChild(p));
    await document.fonts?.ready;
    await Promise.all(Array.from(stage.querySelectorAll('img')).map((img) => (img.complete ? null : new Promise((r) => ((img.onload = r), (img.onerror = r))))));
    const pdf = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
    });
    for (let i = 0; i < pages.length; i++) {
      const canvas = await html2canvas(pages[i], {
        scale: 2.5,
        backgroundColor: '#ffffff',
        logging: false,
        width: A4.width,
        height: A4.height,
        windowWidth: A4.width,
      });
      if (i > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.94), 'JPEG', 0, 0, 210, 297);
    }
    pdf.save(filename);
  } finally {
    stage.remove();
  }
}
