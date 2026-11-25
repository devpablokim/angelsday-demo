// 엑셀 계약서 — 엔젤스데이 엑셀 양식(public/contracts/*.xlsx)에 값을 채워 원본 양식 그대로의 .xlsx 를 만듭니다.
// (화면·PDF 계약서는 우리 디자인 시스템 문서 — components/contract/ContractDocument)
import { contractTemplate, contractValues, syncRuleFields, type ContractField } from '@shared/contract';
import type { ContractTemplateId } from '@shared/types';
import { recalcOnOpen, replaceInCell, setCell } from '../xlsx/cells';
import { XlsxPackage } from '../xlsx/pkg';

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
export async function buildContract(id: ContractTemplateId, input: Record<string, string>): Promise<XlsxPackage> {
  const pkg = await openTemplate(id);
  const values = syncRuleFields(contractValues(id, input));
  for (const f of contractTemplate(id).fields) {
    if (values[f.key] === undefined) continue;
    writeField(pkg, f, values[f.key]);
  }
  recalcOnOpen(pkg);
  return pkg;
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
