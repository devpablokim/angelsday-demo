import { promoOf } from '@shared/calendar';
import { formatDate, formatDateTime, todayKST, won } from '@shared/dates';
import { uid } from '@shared/ids';
import * as ops from '@shared/ops';
import { calcQuote, draftQuote, guestCounts, lineAmount } from '@shared/quote';
import type { Booking, CatalogItem, Quote, QuoteLine } from '@shared/types';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../../components/Icon';
import { QuoteDocument } from '../../../components/QuoteDocument';
import { Empty, Sheet, useToast } from '../../../components/ui';
import { useAdminCalendar, useCatalog } from '../../../data/hooks';
import { elementToPdf } from '../../../lib/pdf';
import { digitsOnly, errorMessage, useSaveBooking } from '../adminUtils';

function nextVersion(b: Booking): number {
  if (!b.quote) return 1;
  return b.quote.status === 'draft' ? b.quote.version : b.quote.version + 1;
}

export function QuoteTab({ booking: b }: { booking: Booking }) {
  const catalog = useCatalog();
  const calendar = useAdminCalendar();
  const save = useSaveBooking();
  const toast = useToast();
  const promo = promoOf(b.date, calendar);

  const [draft, setDraft] = useState<Quote | null>(b.quote ?? null);
  const [dirty, setDirty] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  // 외부(다른 탭·고객)에서 견적이 바뀌면, 편집 중이 아닐 때만 동기화
  useEffect(() => {
    if (!dirty) setDraft(b.quote ?? null);
  }, [b.quote, dirty]);

  const totals = draft ? calcQuote(draft) : null;
  const sentLocked = !!b.quote && b.quote.status !== 'draft';
  const counts = guestCounts(b);

  const grouped = useMemo(() => {
    const m = new Map<string, CatalogItem[]>();
    for (const i of catalog.items) {
      if (!m.has(i.category)) m.set(i.category, []);
      m.get(i.category)!.push(i);
    }
    return [...m.entries()];
  }, [catalog.items]);

  function update(patch: Partial<Quote>) {
    if (!draft) return;
    setDraft({ ...draft, ...patch, updatedAt: new Date().toISOString() });
    setDirty(true);
  }
  function updateLine(id: string, patch: Partial<QuoteLine>) {
    if (!draft) return;
    update({ lines: draft.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  }
  function autoBuild() {
    const q = draftQuote(b, catalog, promo?.discountRate);
    setDraft({ ...q, version: nextVersion(b), memo: draft?.memo ?? q.memo });
    setDirty(true);
    toast(`필요사항 기준으로 ${q.lines.length}개 항목을 구성했어요.`);
  }
  function addFromCatalog(key: string) {
    const item = catalog.items.find((i) => i.key === key);
    if (!item || !draft) return;
    const base = item.basis === 'adults' ? counts.adults : counts.all;
    const qty = item.peoplePerUnit ? Math.max(1, Math.ceil(base / item.peoplePerUnit)) : 1;
    update({ lines: [...draft.lines, { id: uid('ql'), category: item.category, label: item.label, unitPrice: item.price, qty, unit: item.unit, catalogKey: item.key }] });
  }
  function addCustom() {
    if (!draft) return;
    update({ lines: [...draft.lines, { id: uid('ql'), category: '기타', label: '추가 항목', unitPrice: 0, qty: 1, unit: '식' }] });
  }

  async function saveDraft() {
    if (!draft) return;
    if (await save(ops.saveQuoteDraft(b, { ...draft, status: 'draft' }), '견적을 임시 저장했어요.')) setDirty(false);
  }
  async function send() {
    if (!draft) return;
    const version = sentLocked && dirty ? b.quote!.version + 1 : draft.version;
    if (await save(ops.sendQuote(b, { ...draft, version }), `견적서 v${version}을 고객에게 발송했어요.`)) {
      setDirty(false);
      setSendOpen(false);
    }
  }
  async function downloadPdf() {
    if (!pdfRef.current || !draft) return;
    setPdfBusy(true);
    try {
      await elementToPdf(pdfRef.current, `엔젤스데이_견적서_${b.customer.name}_v${draft.version}.pdf`);
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="stack gap-16">
      <AdjustRequests booking={b} />

      {!draft ? (
        <section className="card">
          <Empty>
            아직 견적서가 없어요.
            <p className="caption mt-8">{b.requirementsSubmittedAt ? '고객이 제출한 필요사항으로 견적 항목을 자동 구성할 수 있어요.' : '고객이 필요사항을 아직 제출하지 않았어요. 문의 내용 기준으로 먼저 작성할 수도 있어요.'}</p>
            <button className="btn btn--primary mt-16" onClick={autoBuild}>
              <Icon name="sparkle" size={18} /> 필요사항으로 자동 작성
            </button>
          </Empty>
        </section>
      ) : (
        <div className="quote-builder">
          <section className="card quote-builder__main">
            <div className="card__head">
              <div>
                <div className="title-md">
                  견적서 v{sentLocked && dirty ? b.quote!.version + 1 : draft.version}
                  <span className={`badge ${b.quote?.status === 'draft' || !b.quote ? 'badge--outline' : b.quote.status === 'accepted' ? 'badge--success' : 'badge--gold'}`} style={{ marginLeft: 8 }}>
                    {!b.quote ? '새 견적' : b.quote.status === 'draft' ? '임시 저장' : b.quote.status === 'accepted' ? '결제 완료' : '발송됨'}
                  </span>
                  {dirty && <span className="badge badge--warning" style={{ marginLeft: 6 }}>수정 중</span>}
                </div>
                <p className="caption">
                  {b.quote?.sentAt ? `최근 발송 ${formatDateTime(b.quote.sentAt)} · ` : ''}성인 {counts.adults}명 · 소인 {counts.kids}명 기준
                </p>
              </div>
              <button className="btn btn--secondary btn--sm" onClick={autoBuild}>
                <Icon name="sparkle" size={16} /> 다시 자동 작성
              </button>
            </div>

            <div className="qlines" role="table" aria-label="견적 항목">
              <div className="qlines__head" role="row">
                <span>구분</span>
                <span>항목</span>
                <span className="num">단가</span>
                <span className="num">수량</span>
                <span>단위</span>
                <span className="num">금액</span>
                <span />
              </div>
              {draft.lines.map((l) => (
                <div className="qline" role="row" key={l.id}>
                  <input className="input input--sm qline__cat" value={l.category} onChange={(e) => updateLine(l.id, { category: e.target.value })} aria-label="구분" />
                  <input className="input input--sm qline__label" value={l.label} onChange={(e) => updateLine(l.id, { label: e.target.value })} aria-label="항목" />
                  <input className="input input--sm num qline__price" inputMode="numeric" value={l.unitPrice.toLocaleString('ko-KR')} onChange={(e) => updateLine(l.id, { unitPrice: digitsOnly(e.target.value) })} aria-label="단가" />
                  <input className="input input--sm num qline__qty" inputMode="numeric" value={l.qty} onChange={(e) => updateLine(l.id, { qty: digitsOnly(e.target.value) })} aria-label="수량" />
                  <input className="input input--sm qline__unit" value={l.unit} onChange={(e) => updateLine(l.id, { unit: e.target.value })} aria-label="단위" />
                  <span className="qline__amount price">{lineAmount(l).toLocaleString('ko-KR')}</span>
                  <button className="btn btn--ghost btn--icon qline__del" onClick={() => update({ lines: draft.lines.filter((x) => x.id !== l.id) })} aria-label={`${l.label} 삭제`}>
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div className="row wrap gap-8 mt-16">
              <select className="select select--sm qadd" value="" onChange={(e) => addFromCatalog(e.target.value)} aria-label="가격표에서 항목 추가">
                <option value="">+ 가격표에서 항목 추가</option>
                {grouped.map(([cat, items]) => (
                  <optgroup key={cat} label={cat}>
                    {items.map((i) => (
                      <option key={i.key} value={i.key}>
                        {i.label} — {i.price.toLocaleString('ko-KR')}원/{i.unit}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <button className="btn btn--secondary btn--sm" onClick={addCustom}>
                <Icon name="plus" size={16} /> 직접 입력 항목
              </button>
            </div>

            <hr className="divider mt-24" />

            <div className="stack gap-16 mt-24">
              <div className="field">
                <span className="field__label">할인</span>
                <div className="row wrap gap-8">
                  <button className="chip chip--sm" aria-pressed={draft.discountRate === 0 && !draft.discountLabel} onClick={() => update({ discountRate: 0, discountLabel: '' })}>
                    할인 없음
                  </button>
                  {promo?.discountRate ? (
                    <button className="chip chip--sm" aria-pressed={draft.discountRate === promo.discountRate && draft.discountLabel?.includes('프로모션')} onClick={() => update({ discountRate: promo.discountRate!, discountLabel: `프로모션일 특가 ${promo.discountRate}%` })}>
                      이 날 프로모션 {promo.discountRate}%
                    </button>
                  ) : null}
                  {catalog.discountPresets.map((p) => (
                    <button key={p.id} className="chip chip--sm" aria-pressed={draft.discountRate === p.rate && draft.discountLabel === p.label} onClick={() => update({ discountRate: p.rate, discountLabel: p.label })}>
                      {p.label} {p.rate}%
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-grid form-grid--2">
                <label className="field">
                  <span className="field__label">할인율 (%)</span>
                  <input className="input" inputMode="decimal" value={draft.discountRate} onChange={(e) => update({ discountRate: Math.min(100, Number(e.target.value.replace(/[^\d.]/g, '')) || 0) })} />
                </label>
                <label className="field">
                  <span className="field__label">할인 표기</span>
                  <input className="input" value={draft.discountLabel ?? ''} onChange={(e) => update({ discountLabel: e.target.value })} placeholder="예) 평일 할인" />
                </label>
                <label className="field">
                  <span className="field__label">추가 할인 (원)</span>
                  <input className="input" inputMode="numeric" value={draft.extraDiscount.toLocaleString('ko-KR')} onChange={(e) => update({ extraDiscount: digitsOnly(e.target.value) })} />
                </label>
                <label className="field">
                  <span className="field__label">예약금 비율 (%)</span>
                  <input className="input" inputMode="numeric" value={draft.depositRate} onChange={(e) => update({ depositRate: Math.min(100, digitsOnly(e.target.value)) })} />
                </label>
                <label className="field">
                  <span className="field__label">견적 유효기간</span>
                  <input className="input" type="date" value={draft.validUntil} min={todayKST()} onChange={(e) => update({ validUntil: e.target.value })} />
                </label>
              </div>
              <label className="field">
                <span className="field__label">고객에게 전하는 메모</span>
                <textarea className="textarea" value={draft.memo ?? ''} onChange={(e) => update({ memo: e.target.value })} placeholder="견적서 하단에 표시돼요. 반영한 요청사항, 포함 서비스 등을 적어 주세요." />
              </label>
            </div>
          </section>

          <aside className="quote-builder__side">
            <section className="card card--ink adm-quote-summary">
              <div className="overline" style={{ color: 'var(--color-gold-light)' }}>
                TOTAL
              </div>
              <dl>
                <div>
                  <dt>소계</dt>
                  <dd>{won(totals!.subtotal)}</dd>
                </div>
                <div>
                  <dt>할인 {draft.discountRate ? `${draft.discountRate}%` : ''}</dt>
                  <dd>−{won(totals!.discountAmount)}</dd>
                </div>
                <div className="adm-quote-summary__total">
                  <dt>총 견적 금액</dt>
                  <dd className="numeral">{won(totals!.total)}</dd>
                </div>
                <div>
                  <dt>예약금 {draft.depositRate}%</dt>
                  <dd>{won(totals!.deposit)}</dd>
                </div>
                <div>
                  <dt>잔금 (당일)</dt>
                  <dd>{won(totals!.balance)}</dd>
                </div>
              </dl>
              <p className="caption" style={{ color: 'var(--color-on-ink-muted)' }}>
                유효기간 {formatDate(draft.validUntil)}까지
              </p>
            </section>
            <div className="stack gap-8">
              <button className="btn btn--gold btn--block" onClick={() => setSendOpen(true)} disabled={draft.lines.length === 0 || (sentLocked && !dirty)}>
                <Icon name="send" size={18} /> {sentLocked ? (dirty ? `수정본 v${b.quote!.version + 1} 발송` : '발송 완료') : '고객에게 견적 발송'}
              </button>
              <div className="row gap-8">
                <button className="btn btn--secondary grow btn--sm" onClick={() => setPreviewOpen(true)}>
                  미리보기
                </button>
                <button className="btn btn--secondary grow btn--sm" onClick={() => void downloadPdf()} disabled={pdfBusy}>
                  {pdfBusy ? <span className="spinner spinner--dark" /> : <Icon name="download" size={16} />} PDF
                </button>
              </div>
              <button className="btn btn--ghost btn--sm" onClick={() => void saveDraft()} disabled={!dirty || sentLocked}>
                임시 저장
              </button>
              {sentLocked && <p className="caption">발송된 견적은 수정 후 다시 발송하면 새 버전으로 고객에게 전달돼요. 발송 전까지 수정 내용은 이 화면에만 있어요.</p>}
            </div>
          </aside>
        </div>
      )}

      {draft && (
        <div className="adm-pdf-stage" aria-hidden="true">
          <QuoteDocument ref={pdfRef} booking={b} quote={{ ...draft, version: sentLocked && dirty ? b.quote!.version + 1 : draft.version }} forPdf />
        </div>
      )}

      <Sheet open={previewOpen} onClose={() => setPreviewOpen(false)} title="견적서 미리보기 (고객 화면)" wide>
        {draft && <QuoteDocument booking={b} quote={draft} />}
      </Sheet>

      <Sheet
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        title="견적서를 발송할까요?"
        footer={
          <div className="row gap-8">
            <button className="btn btn--secondary grow" onClick={() => setSendOpen(false)}>
              취소
            </button>
            <button className="btn btn--primary grow" onClick={() => void send()}>
              발송하기
            </button>
          </div>
        }
      >
        {totals && (
          <div className="stack gap-8 body-sm">
            <p>
              <b className="text-ink">{b.customer.name}</b>님의 고객 페이지 STEP 2에 견적서가 표시되고, <b className="text-ink">{b.customer.email || '(이메일 없음)'}</b>으로 안내 메일이 발송돼요.
            </p>
            <dl className="kv mt-8">
              <dt>총 견적</dt>
              <dd className="price">{won(totals.total)}</dd>
              <dt>할인</dt>
              <dd>
                {draft?.discountRate}% {draft?.discountLabel}
              </dd>
              <dt>예약금</dt>
              <dd className="price">{won(totals.deposit)}</dd>
            </dl>
            {b.adjustRequests.some((r) => r.status === 'open') && <p className="caption">열린 조정 요청은 발송과 함께 “반영 완료”로 처리돼요.</p>}
          </div>
        )}
      </Sheet>
    </div>
  );
}

function AdjustRequests({ booking: b }: { booking: Booking }) {
  const save = useSaveBooking();
  const [replies, setReplies] = useState<Record<string, string>>({});
  if (b.adjustRequests.length === 0) return null;
  const list = [...b.adjustRequests].reverse();
  return (
    <section className="card">
      <div className="title-md">견적 조정 요청</div>
      <ul className="adjust-list mt-16">
        {list.map((r) => (
          <li key={r.id} className={`adjust ${r.status === 'open' ? 'adjust--open' : ''}`}>
            <div className="row between gap-8">
              <span className={`badge ${r.status === 'open' ? 'badge--warning' : 'badge--success'}`}>{r.status === 'open' ? '답변 필요' : '처리 완료'}</span>
              <span className="caption">{formatDateTime(r.at)}</span>
            </div>
            <p className="body-sm text-ink mt-8">“{r.message}”</p>
            {r.reply && (
              <p className="adjust__reply body-sm">
                <b>답변</b> {r.reply} {r.repliedAt && <span className="caption">· {formatDateTime(r.repliedAt)}</span>}
              </p>
            )}
            {r.status === 'open' && (
              <div className="row gap-8 mt-8">
                <input className="input input--sm grow" value={replies[r.id] ?? ''} onChange={(e) => setReplies({ ...replies, [r.id]: e.target.value })} placeholder="고객에게 보낼 답변" aria-label="답변" />
                <button
                  className="btn btn--primary btn--sm"
                  disabled={!replies[r.id]?.trim()}
                  onClick={async () => {
                    if (await save(ops.replyAdjust(b, r.id, replies[r.id].trim()), '답변을 등록했어요.')) setReplies({ ...replies, [r.id]: '' });
                  }}
                >
                  답변
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
