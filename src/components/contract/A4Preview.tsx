import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { A4_PX } from '../../lib/pdf';

/**
 * A4 페이지(.a4-frame > .a4-page)를 화면 폭에 맞춰 줄여 보여 줍니다.
 * 페이지 내용이 A4 보다 길면 PDF 와 똑같이 한 장 크기로 줄여서, 화면과 출력물이 같아 보이게 합니다.
 */
export function A4Preview({ children, busy, label = '문서 미리보기' }: { children: ReactNode; busy?: boolean; label?: string }) {
  const host = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    const fit = () => {
      el.querySelectorAll<HTMLElement>('.a4-frame').forEach((frame) => {
        const page = frame.querySelector<HTMLElement>('.a4-page');
        if (!page) return;
        const w = frame.clientWidth;
        const shrink = Math.min(1, A4_PX.height / Math.max(page.scrollHeight, 1));
        const s = (w / A4_PX.width) * shrink;
        page.style.transform = `translateX(${((w - A4_PX.width * s) / 2).toFixed(2)}px) scale(${s.toFixed(5)})`;
      });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    el.querySelectorAll('.a4-page').forEach((p) => ro.observe(p));
    return () => ro.disconnect();
  });

  return (
    <div ref={host} className={`a4-preview${busy ? ' is-busy' : ''}`} aria-label={label}>
      {children}
    </div>
  );
}
