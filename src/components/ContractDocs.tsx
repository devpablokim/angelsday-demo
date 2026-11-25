import { CHANNEL_LABEL, contractTemplate } from '@shared/contract';
import { formatDate, formatDateTime, won } from '@shared/dates';
import { eventConfig } from '@shared/eventTypes';
import type { Booking, ContractCancellation, ContractTemplateId } from '@shared/types';
import { VENUE } from '@shared/venue';
import { forwardRef, useRef, useState } from 'react';
import { Logo } from '../brand/Logo';
import { buildContract, downloadXlsx } from '../lib/contract/generate';
import { elementToPdf } from '../lib/pdf';
import { ContractDocument, type ContractDocMeta } from './contract/ContractDocument';
import { renderToPdf } from './contract/renderPdf';
import { Icon } from './Icon';
import { useToast } from './ui';

/** 파일 이름: 엔젤스데이_웨딩계약서_성춘향_v2 */
export function contractFileBase(b: Booking, templateId: ContractTemplateId, version?: number) {
  return `${VENUE.name}_${contractTemplate(templateId).label.replace(/[\s·]/g, '')}_${b.customer.name}${version ? `_v${version}` : ''}`;
}

/** 계약서 PDF (A4 두 장) · 엑셀(원본 양식) 내려받기 */
export function ContractDownloads({
  booking: b,
  templateId,
  values,
  meta = {},
  cancelled,
  size = 'md',
  xlsx,
  pdfLabel = '계약서 PDF',
}: {
  booking: Booking;
  templateId: ContractTemplateId;
  values: Record<string, string>;
  meta?: ContractDocMeta;
  cancelled?: ContractCancellation;
  size?: 'sm' | 'md';
  /** 엑셀 원본 양식 버튼도 보이기 (관리자) */
  xlsx?: boolean;
  pdfLabel?: string;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<'' | 'xlsx' | 'pdf'>('');
  const base = contractFileBase(b, templateId, meta.version);
  const icon = size === 'sm' ? 16 : 18;

  async function run(kind: 'xlsx' | 'pdf') {
    setBusy(kind);
    try {
      if (kind === 'xlsx') downloadXlsx(await buildContract(templateId, values), `${base}.xlsx`);
      else await renderToPdf(<ContractDocument templateId={templateId} values={values} meta={meta} cancelled={cancelled} />, `${base}.pdf`);
    } catch (e) {
      toast(e instanceof Error ? e.message : '계약서 파일을 만들지 못했어요.', 'error');
    } finally {
      setBusy('');
    }
  }

  return (
    <>
      <button className={`btn btn--secondary${size === 'sm' ? ' btn--sm' : ''}`} onClick={() => void run('pdf')} disabled={!!busy}>
        {busy === 'pdf' ? <span className="spinner spinner--dark" /> : <Icon name="download" size={icon} />} {pdfLabel}
      </button>
      {xlsx && (
        <button className={`btn btn--ghost${size === 'sm' ? ' btn--sm' : ''}`} onClick={() => void run('xlsx')} disabled={!!busy} title="엔젤스데이 엑셀 양식에 같은 내용을 채운 파일">
          {busy === 'xlsx' ? <span className="spinner spinner--dark" /> : <Icon name="download" size={icon} />} 엑셀 양식
        </button>
      )}
    </>
  );
}

/** 변경 이력서 — 분쟁 시 출력용 (발행 판 · 변경 기록 전부) */
export const ContractHistoryDocument = forwardRef<HTMLDivElement, { booking: Booking }>(function ContractHistoryDocument({ booking: b }, ref) {
  const c = b.contract;
  return (
    <div ref={ref} className="quote-doc quote-doc--pdf">
      <div className="quote-doc__head" data-pdf-keep>
        <div>
          <div className="overline">CONTRACT CHANGE LOG</div>
          <h2 className="quote-doc__title">계약 변경 이력서</h2>
          <p className="caption">출력일 {formatDateTime(new Date().toISOString())}</p>
        </div>
        <Logo layout="horizontal" variant="ink" height={34} showTagline={false} />
      </div>
      <dl className="quote-doc__info" data-pdf-keep>
        <div>
          <dt>고객</dt>
          <dd>
            {b.customer.name} 님 · {b.customer.phone}
          </dd>
        </div>
        <div>
          <dt>행사</dt>
          <dd>
            {eventConfig(b.eventType).label} · {formatDate(b.date)} {b.time}
          </dd>
        </div>
      </dl>
      <table className="quote-doc__table">
        <thead>
          <tr>
            <th>판</th>
            <th>발행</th>
            <th>발행 직원</th>
            <th>고객 확인</th>
          </tr>
        </thead>
        <tbody>
          {c?.versions.map((v) => (
            <tr key={v.version}>
              <td>
                v{v.version} · {contractTemplate(v.templateId).label}
              </td>
              <td>{formatDateTime(v.issuedAt)}</td>
              <td>{v.issuedBy}</td>
              <td>{v.confirmedAt ? formatDateTime(v.confirmedAt) : '확인 전'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table className="quote-doc__table mt-24">
        <thead>
          <tr>
            <th>변경 일시 · 판</th>
            <th>변경 항목 (변경 전 → 변경 후)</th>
            <th>요청 · 접수</th>
            <th className="num">금액 변동</th>
          </tr>
        </thead>
        <tbody>
          {(c?.changes ?? []).length === 0 && (
            <tr>
              <td colSpan={4}>변경 기록이 없어요. (최초 계약 그대로)</td>
            </tr>
          )}
          {c?.changes.map((ch) => (
            <tr key={ch.id}>
              <td>
                {formatDateTime(ch.at)}
                <br />v{ch.version}
              </td>
              <td>
                {ch.items.map((i) => (
                  <div key={i.key}>
                    {i.label}: {i.before || '—'} → <b>{i.after || '—'}</b>
                  </div>
                ))}
                <div className="caption">사유: {ch.memo}</div>
              </td>
              <td>
                {ch.requester}
                <br />
                {CHANNEL_LABEL[ch.channel]} · 접수 {ch.staff}
              </td>
              <td className="num">
                {ch.amountDelta ? `${ch.amountDelta > 0 ? '+' : '−'}${won(Math.abs(ch.amountDelta))}` : '변동 없음'}
                <br />
                <span className="caption">{ch.settlement === 'extra' ? '추가금' : ch.settlement === 'refund' ? '환불' : ''}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {(c?.cancellations ?? []).length > 0 && (
        <table className="quote-doc__table mt-24">
          <thead>
            <tr>
              <th>취소 · 철회 일시</th>
              <th>내용</th>
              <th>요청 · 처리</th>
              <th className="num">위약금 · 환불</th>
            </tr>
          </thead>
          <tbody>
            {c!.cancellations!.map((x) => (
              <tr key={x.id}>
                <td>{formatDateTime(x.at)}</td>
                <td>
                  <b>{x.kind === 'cancel' ? '계약 취소' : '취소 철회'}</b>
                  {x.withBooking ? (x.kind === 'cancel' ? ' · 예약 함께 취소' : ' · 예약 복구') : ''}
                  <div className="caption">사유: {x.reason}</div>
                  {x.rule && <div className="caption">적용 규정: {x.rule}</div>}
                </td>
                <td>
                  {x.requester}
                  <br />
                  {CHANNEL_LABEL[x.channel]} · 처리 {x.staff}
                </td>
                <td className="num">{x.kind === 'cancel' ? `${won(x.penalty)} · ${won(x.refund)}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="quote-doc__foot" data-pdf-keep>
        변경 기록은 지우거나 고칠 수 없으며, 정정은 새 기록으로만 남습니다. · {VENUE.name} · {VENUE.address} · {VENUE.phone}
      </p>
    </div>
  );
});

export function ContractHistoryPdfButton({ booking: b, className = 'btn btn--secondary btn--sm' }: { booking: Booking; className?: string }) {
  const toast = useToast();
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  async function run() {
    if (!ref.current) return;
    setBusy(true);
    try {
      await elementToPdf(ref.current, `${VENUE.name}_계약변경이력서_${b.customer.name}.pdf`);
    } catch {
      toast('변경 이력서를 만들지 못했어요.', 'error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button className={className} onClick={() => void run()} disabled={busy}>
        {busy ? <span className="spinner spinner--dark" /> : <Icon name="download" size={16} />} 변경 이력서 PDF
      </button>
      <div className="adm-pdf-stage" aria-hidden="true">
        <ContractHistoryDocument ref={ref} booking={b} />
      </div>
    </>
  );
}
