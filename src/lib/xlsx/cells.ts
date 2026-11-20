// 칸 값 읽기·쓰기 — 칸의 서식 번호(s)는 그대로 두고 값만 바꿉니다.
import { NS, parseRef, type SheetInfo, type XlsxPackage } from './pkg';

function sheetData(pkg: XlsxPackage, sheet: SheetInfo): Element {
  const d = pkg.doc(sheet.path);
  return d.getElementsByTagNameNS(NS, 'sheetData')[0];
}

function findRow(data: Element, r: number, create: boolean): Element | null {
  let before: Element | null = null;
  for (const row of Array.from(data.children)) {
    const n = Number(row.getAttribute('r'));
    if (n === r) return row;
    if (n > r) {
      before = row;
      break;
    }
  }
  if (!create) return null;
  const row = data.ownerDocument.createElementNS(NS, 'row');
  row.setAttribute('r', String(r));
  data.insertBefore(row, before);
  return row;
}

function findCell(pkg: XlsxPackage, sheet: SheetInfo, ref: string, create: boolean): Element | null {
  const { c, r } = parseRef(ref);
  const row = findRow(sheetData(pkg, sheet), r, create);
  if (!row) return null;
  let before: Element | null = null;
  for (const cell of Array.from(row.children)) {
    const cr = parseRef(cell.getAttribute('r') ?? 'A1');
    if (cr.c === c) return cell;
    if (cr.c > c) {
      before = cell;
      break;
    }
  }
  if (!create) return null;
  const cell = row.ownerDocument.createElementNS(NS, 'c');
  cell.setAttribute('r', ref.toUpperCase());
  const rowStyle = row.getAttribute('s');
  if (rowStyle && row.getAttribute('customFormat') === '1') cell.setAttribute('s', rowStyle);
  row.insertBefore(cell, before);
  return cell;
}

/** 칸에 값을 씁니다. 문자열은 칸 안 문자열(inlineStr), 숫자는 숫자로. null·'' 이면 비웁니다. */
export function setCell(pkg: XlsxPackage, sheet: SheetInfo, ref: string, value: string | number | null | undefined) {
  const cell = findCell(pkg, sheet, ref, true)!;
  while (cell.firstChild) cell.removeChild(cell.firstChild);
  cell.removeAttribute('t');
  if (value === null || value === undefined || value === '') return;
  const d = cell.ownerDocument;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const v = d.createElementNS(NS, 'v');
    v.textContent = String(value);
    cell.appendChild(v);
    return;
  }
  cell.setAttribute('t', 'inlineStr');
  const is = d.createElementNS(NS, 'is');
  const t = d.createElementNS(NS, 't');
  t.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve');
  t.textContent = String(value);
  is.appendChild(t);
  cell.appendChild(is);
}

function textNodesOf(pkg: XlsxPackage, cell: Element): Element[] {
  const t = cell.getAttribute('t');
  if (t === 's') {
    const idx = Number(cell.getElementsByTagNameNS(NS, 'v')[0]?.textContent ?? -1);
    const sst = pkg.doc('xl/sharedStrings.xml');
    const si = sst.getElementsByTagNameNS(NS, 'si')[idx];
    return si ? Array.from(si.getElementsByTagNameNS(NS, 't')).filter((x) => x.parentElement?.localName !== 'rPh') : [];
  }
  if (t === 'inlineStr') return Array.from(cell.getElementsByTagNameNS(NS, 't'));
  return [];
}

/** 칸의 현재 글자 (숫자는 숫자 그대로의 문자열) */
export function readCell(pkg: XlsxPackage, sheet: SheetInfo, ref: string): string {
  const cell = findCell(pkg, sheet, ref, false);
  if (!cell) return '';
  const nodes = textNodesOf(pkg, cell);
  if (nodes.length) return nodes.map((n) => n.textContent ?? '').join('');
  return cell.getElementsByTagNameNS(NS, 'v')[0]?.textContent ?? '';
}

/**
 * 긴 문구 안의 일부만 바꿉니다 (글자별 서식 — 굵게·빨강·밑줄 — 은 그대로).
 * 예: 규정면 '계약금 \\ 500,000 을 지급' 의 금액만 바꾸기. 바꾼 곳이 있으면 true.
 */
export function replaceInCell(pkg: XlsxPackage, sheet: SheetInfo, ref: string, pattern: RegExp, replacement: string): boolean {
  const cell = findCell(pkg, sheet, ref, false);
  if (!cell) return false;
  let done = false;
  for (const node of textNodesOf(pkg, cell)) {
    const before = node.textContent ?? '';
    const after = before.replace(pattern, replacement);
    if (after !== before) {
      node.textContent = after;
      node.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve');
      done = true;
      if (!pattern.global) break;
    }
  }
  return done;
}

/** 엑셀에서 열 때 수식을 다시 계산하도록 */
export function recalcOnOpen(pkg: XlsxPackage) {
  const wb = pkg.doc('xl/workbook.xml');
  let calc = wb.getElementsByTagNameNS(NS, 'calcPr')[0];
  if (!calc) {
    calc = wb.createElementNS(NS, 'calcPr');
    wb.documentElement.appendChild(calc);
  }
  calc.setAttribute('fullCalcOnLoad', '1');
}
