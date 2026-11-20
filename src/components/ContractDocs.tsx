import { CHANNEL_LABEL, contractTemplate } from '@shared/contract';
import { formatDate, formatDateTime, won } from '@shared/dates';
import { eventConfig } from '@shared/eventTypes';
import type { Booking, ContractTemplateId } from '@shared/types';
import { VENUE } from '@shared/venue';
import { forwardRef, useRef, useState } from 'react';
import { Logo } from '../brand/Logo';
import { buildContract, downloadPdf, downloadXlsx } from '../lib/contract/generate';
import { elementToPdf } from '../lib/pdf';
import { Icon } from './Icon';
import { useToast } from './ui';

/** 파일 이름: 엔젤스데이_웨딩 계약서_성춘향_v2 */
export function contractFileBase(b: Booking, templateId: ContractTemplateId, version?: number) {
  return `${VENUE.name}_${contractTemplate(templateId).label.replace(/\s/g, '')}_${b.customer.name}${version ? `_v${version}` : ''}`;
}

/** 엑셀(원본 양식) · A4 PDF 내려받기 버튼 */
export function ContractDownloads({
  booking: b,
  templateId,
  values,
  version,
  footnote,
  size = 'md',
  only,
}: {
  booking: Booking;
  templateId: ContractTemplateId;
  values: Record<string, string>;
  version?: number;
  footnote?: string;
  size?: 'sm' | 'md';
  only?: 'pdf' | 'xlsx';
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<'' | 'xlsx' | 'pdf'>('');
  const base = contractFileBase(b, templateId, version);
  const cls = `btn btn--secondary${size === 'sm' ? ' btn--sm' : ''}`;

  async function run(kind: 'xlsx' | 'pdf') {
    setBusy(kind);
    try {
      const pkg = await buildContract(templateId, values);
      if (kind === 'xlsx') downloadXlsx(pkg, `${base}.xlsx`);
      else await downloadPdf(pkg, `${base}.pdf`, footnote);
    } catch (e) {
      toast(e instanceof Error ? e.message : '계약서 파일을 만들지 못했어요.', 'error');
    } finally {
      setBusy('');
    }
  }

  return (
    <>
      {only !== 'pdf' && (
        <button className={cls} onClick={() => void run('xlsx')} disabled={!!busy}>
          {busy === 'xlsx' ? <span className="spinner spinner--dark" /> : <Icon name="download" size={size === 'sm' ? 16 : 18} />} 엑셀 (원본 양식)
        </button>
      )}
      {only !== 'xlsx' && (
        <button className={cls} onClick={() => void run('pdf')} disabled={!!busy}>
          {busy === 'pdf' ? <span className="spinner spinner--dark" /> : <Icon name="download" size={size === 'sm' ? 16 : 18} />} A4 PDF
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
