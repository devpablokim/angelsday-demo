/**
 * 견적서 PDF 생성 — 화면의 견적서 DOM 을 고해상도로 캡처해 A4 PDF 로 저장합니다.
 * 브라우저가 한글을 렌더링하므로 별도 한글 폰트 임베딩이 필요 없습니다.
 *
 * 한 페이지를 조금 넘으면(FIT_ONE_PAGE) 살짝 줄여 한 장에 담고,
 * 그보다 길면 블록 경계에서만 페이지를 나눕니다.
 *  - `tr` 과 `[data-pdf-keep]` 블록은 중간에서 잘리지 않습니다.
 *  - `[data-pdf-keep-next]` 블록은 바로 다음 블록과 같은 페이지에 둡니다. (표의 분류 행 등)
 *  - 표가 다음 페이지로 이어지면 `thead` 를 맨 위에 다시 그립니다.
 */
/** 이 비율까지 넘치면 페이지를 나누지 않고 한 장에 맞춰 줄입니다. */
const FIT_ONE_PAGE = 1.15;

interface Range {
  top: number;
  bottom: number;
}

interface Page {
  start: number;
  end: number;
  header: Range | null;
}

/** 캡처한 캔버스 기준(px) 으로 블록 위치를 잽니다. */
function measure(el: HTMLElement, scale: number) {
  const base = el.getBoundingClientRect().top;
  const rangeOf = (n: Element): Range => {
    const r = n.getBoundingClientRect();
    return { top: Math.round((r.top - base) * scale), bottom: Math.round((r.bottom - base) * scale) };
  };
  const blocks = [...el.querySelectorAll('[data-pdf-keep], tr')].map(rangeOf);
  el.querySelectorAll('[data-pdf-keep-next]').forEach((n) => {
    const next = n.nextElementSibling;
    blocks.push(next ? { top: rangeOf(n).top, bottom: rangeOf(next).bottom } : rangeOf(n));
  });
  const thead = el.querySelector('thead');
  const table = thead?.closest('table');
  const header = thead && table ? { ...rangeOf(thead), tableBottom: rangeOf(table).bottom } : null;
  return { blocks, header };
}

function paginate(total: number, capacity: number, { blocks, header }: ReturnType<typeof measure>): Page[] {
  const contentEnd = blocks.length ? Math.min(total, Math.max(...blocks.map((b) => b.bottom))) : total;
  const pages: Page[] = [];
  let start = 0;
  while (start < contentEnd - 1) {
    const repeat = pages.length > 0 && header && start >= header.bottom && start < header.tableBottom ? header : null;
    const room = capacity - (repeat ? repeat.bottom - repeat.top : 0);
    let end = Math.min(start + room, total);
    if (end < total) {
      // 경계가 블록을 가로지르면 그 블록 위로 올립니다 (올린 자리가 또 다른 블록 안이면 반복)
      for (let moved = true; moved; ) {
        moved = false;
        for (const b of blocks) {
          if (b.top > start && b.top < end && b.bottom > end) {
            end = b.top;
            moved = true;
          }
        }
      }
    }
    pages.push({ start, end, header: repeat });
    start = end;
  }
  return pages;
}

export async function elementToPdf(el: HTMLElement, filename: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  await document.fonts?.ready;
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false, windowWidth: 820 });
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const imgW = pageW - margin * 2;
  const mmPerPx = imgW / canvas.width;
  const capacity = Math.floor((pageH - margin * 2) / mmPerPx);

  const measured = measure(el, canvas.height / el.getBoundingClientRect().height);
  const contentEnd = Math.max(0, ...measured.blocks.map((b) => b.bottom));
  if (contentEnd > capacity && contentEnd <= capacity * FIT_ONE_PAGE) {
    // 한 페이지를 조금 넘는 정도면 두 장으로 나누지 않고 살짝 줄여서 한 장에 담습니다.
    const h = Math.min(canvas.height, contentEnd + 40);
    const fit = (pageH - margin * 2) / (h * mmPerPx);
    const page = document.createElement('canvas');
    page.width = canvas.width;
    page.height = h;
    page.getContext('2d')!.drawImage(canvas, 0, 0);
    pdf.addImage(page.toDataURL('image/jpeg', 0.92), 'JPEG', (pageW - imgW * fit) / 2, margin, imgW * fit, h * mmPerPx * fit);
    pdf.save(filename);
    return;
  }

  const pages = paginate(canvas.height, capacity, measured);
  pages.forEach((p, i) => {
    const headH = p.header ? p.header.bottom - p.header.top : 0;
    const sliceH = p.end - p.start;
    const page = document.createElement('canvas');
    page.width = canvas.width;
    page.height = headH + sliceH;
    const ctx = page.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, page.width, page.height);
    if (p.header) ctx.drawImage(canvas, 0, p.header.top, canvas.width, headH, 0, 0, canvas.width, headH);
    ctx.drawImage(canvas, 0, p.start, canvas.width, sliceH, 0, headH, canvas.width, sliceH);
    if (i > 0) pdf.addPage();
    pdf.addImage(page.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, imgW, page.height * mmPerPx);
    if (pages.length > 1) {
      pdf.setFontSize(8);
      pdf.setTextColor(140, 132, 120);
      pdf.text(`${i + 1} / ${pages.length}`, pageW / 2, pageH - 5, { align: 'center' });
    }
  });
  pdf.save(filename);
}
