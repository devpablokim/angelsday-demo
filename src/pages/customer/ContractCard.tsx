import { contractTemplate, latestContract } from '@shared/contract';
import { formatDateTime } from '@shared/dates';
import * as ops from '@shared/ops';
import type { Booking } from '@shared/types';
import { useState } from 'react';
import { ContractDownloads } from '../../components/ContractDocs';
import { ContractPreview } from '../../components/ContractPreview';
import { Icon } from '../../components/Icon';
import { Sheet, useToast } from '../../components/ui';
import { useStore } from '../../data/hooks';

/**
 * 고객 페이지의 계약서 — 최신 판을 A4 그대로 보고 PDF 로 받고, ‘계약 내용을 확인했어요’로 확정합니다.
 * 변경된 판이면 바뀐 내용(변경 전 → 변경 후)을 먼저 보여 줍니다.
 */
export function ContractCard({ booking: b }: { booking: Booking }) {
  const store = useStore();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const v = latestContract(b);
  if (!v) return null;
  const change = v.version > 1 ? b.contract?.changes.find((c) => c.version === v.version) : undefined;
  const tpl = contractTemplate(v.templateId);
  const footnote = `${tpl.label} v${v.version} · ${formatDateTime(v.issuedAt)} 발행`;

  async function confirm() {
    setBusy(true);
    try {
      await store.saveBooking(ops.confirmContract(b, v!.version));
      toast('계약 내용을 확인했다고 엔젤스데이에 알렸어요.');
    } catch (e) {
      toast(e instanceof Error ? e.message : '확인을 보내지 못했어요. 다시 시도해 주세요.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`card contract-card${v.confirmedAt ? '' : ' card--gold'}`}>
      <div className="row between wrap gap-8">
        <div>
          <span className="overline">CONTRACT</span>
          <h3 className="title-md mt-4">{change ? '계약서가 변경되었어요' : '계약서'}</h3>
          <p className="caption">
            {tpl.label} v{v.version} · {formatDateTime(v.issuedAt)} 발행
          </p>
        </div>
        <span className={`badge${v.confirmedAt ? '' : ' badge--gold'}`}>{v.confirmedAt ? '확인 완료' : '확인 필요'}</span>
      </div>

      {change && (
        <div className="contract-card__change mt-12">
          <div className="title-sm">바뀐 내용</div>
          <ul className="contract-changes mt-8">
            {change.items.map((i) => (
              <li key={i.key}>
                <span className="caption">{i.label}</span>
                <div>
                  <s className="text-muted">{i.before || '—'}</s> → <b>{i.after || '—'}</b>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="row wrap gap-8 mt-16">
        <button className="btn btn--secondary" onClick={() => setOpen(true)}>
          <Icon name="doc" size={18} /> 계약서 보기
        </button>
        <ContractDownloads booking={b} templateId={v.templateId} values={v.values} version={v.version} footnote={footnote} only="pdf" />
      </div>

      {v.confirmedAt ? (
        <p className="caption mt-12">{formatDateTime(v.confirmedAt)}에 계약 내용을 확인하셨어요.</p>
      ) : (
        <>
          <button className="btn btn--primary btn--block mt-16" onClick={() => void confirm()} disabled={busy}>
            {busy ? <span className="spinner" /> : <Icon name="check" size={18} />} 계약 내용을 확인했어요
          </button>
          <p className="caption mt-8">{change ? '확인을 누르시면 변경 내용이 확정돼요.' : '내용이 다르면 담당자에게 알려 주세요. 수정한 계약서를 다시 보내드려요.'}</p>
        </>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title={`${tpl.label} v${v.version}`} wide>
        <ContractPreview templateId={v.templateId} values={v.values} highlight={change?.items.map((i) => i.key)} footnote={footnote} />
      </Sheet>
    </section>
  );
}
