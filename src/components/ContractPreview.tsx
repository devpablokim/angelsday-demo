import type { ContractTemplateId } from '@shared/types';
import { useEffect, useRef, useState } from 'react';
import { buildContract, cellsOf, contractPages } from '../lib/contract/generate';
import type { XlsxPackage } from '../lib/xlsx/pkg';
import { A4, invalidate } from '../lib/xlsx/render';

/**
 * 계약서 미리보기 — 엑셀 양식에 값을 채워 인쇄 모양(A4) 그대로 보여 줍니다.
 * highlight 에 넣은 칸(필드 키)은 노란색으로 표시합니다 (이전 판과 바뀐 부분).
 */
export function ContractPreview({ templateId, values, highlight, footnote }: { templateId: ContractTemplateId; values: Record<string, string>; highlight?: string[]; footnote?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const key = JSON.stringify(values);
  const hl = (highlight ?? []).join(',');

  useEffect(() => {
    let alive = true;
    let pkg: XlsxPackage | null = null;
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        pkg = await buildContract(templateId, JSON.parse(key) as Record<string, string>);
        if (!alive || !host.current) return;
        const pages = contractPages(pkg, { highlight: hl ? cellsOf(templateId, hl.split(',')) : undefined, footnote });
        host.current.replaceChildren(
          ...pages.map((p) => {
            const frame = document.createElement('div');
            frame.className = 'contract-page';
            frame.appendChild(p);
            return frame;
          }),
        );
        fit();
        setError('');
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : '계약서를 그리지 못했어요.');
      } finally {
        if (alive) setBusy(false);
      }
    }, 180);
    return () => {
      alive = false;
      clearTimeout(t);
      if (pkg) invalidate(pkg);
    };
  }, [templateId, key, hl, footnote]);

  // 화면 폭에 맞춰 A4 를 줄여 보여 줍니다
  function fit() {
    const el = host.current;
    if (!el) return;
    const w = el.clientWidth;
    el.style.setProperty('--contract-scale', String(w / A4.width));
  }
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="contract-preview">
      {error && <p className="field__error">{error}</p>}
      <div ref={host} className={`contract-preview__pages${busy ? ' is-busy' : ''}`} aria-label="계약서 미리보기" />
    </div>
  );
}
