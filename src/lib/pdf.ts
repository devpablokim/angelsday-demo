/**
 * 견적서 PDF 생성 — 화면의 견적서 DOM 을 고해상도로 캡처해 A4 PDF 로 저장합니다.
 * 브라우저가 한글을 렌더링하므로 별도 한글 폰트 임베딩이 필요 없습니다.
 */
export async function elementToPdf(el: HTMLElement, filename: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  await document.fonts?.ready;
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false, windowWidth: 820 });
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const imgW = pageW - margin * 2;
  const imgH = (canvas.height * imgW) / canvas.width;
  const usableH = pageH - margin * 2;
  const img = canvas.toDataURL('image/jpeg', 0.92);
  if (imgH <= usableH) {
    pdf.addImage(img, 'JPEG', margin, margin, imgW, imgH);
  } else {
    // 여러 페이지로 나눠 담기
    let y = 0;
    const sliceH = Math.floor((usableH * canvas.width) / imgW);
    while (y < canvas.height) {
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = Math.min(sliceH, canvas.height - y);
      slice.getContext('2d')!.drawImage(canvas, 0, y, canvas.width, slice.height, 0, 0, canvas.width, slice.height);
      if (y > 0) pdf.addPage();
      pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, imgW, (slice.height * imgW) / canvas.width);
      y += sliceH;
    }
  }
  pdf.save(filename);
}
