import type { ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { pagesToPdf } from '../../lib/pdf';

/** 화면 밖에서 문서를 그린 뒤 .a4-page 하나를 PDF 한 쪽으로 저장합니다 */
export async function renderToPdf(node: ReactNode, filename: string): Promise<void> {
  const stage = document.createElement('div');
  stage.className = 'pdf-offstage';
  document.body.appendChild(stage);
  const root = createRoot(stage);
  try {
    flushSync(() => root.render(node));
    await pagesToPdf(Array.from(stage.querySelectorAll<HTMLElement>('.a4-page')), filename);
  } finally {
    root.unmount();
    stage.remove();
  }
}
