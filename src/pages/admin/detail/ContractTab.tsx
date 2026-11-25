import {
  activeCancellation,
  CHANNEL_LABEL,
  CONTRACT_GROUPS,
  CONTRACT_TEMPLATES,
  contractAutoValues,
  contractCancellations,
  contractDateFields,
  contractDateOf,
  contractDefaults,
  contractDiff,
  contractTemplate,
  eventWhenText,
  latestContract,
  parseEventWhen,
  syncRuleFields,
  templateForEvent,
  type ContractField,
} from '@shared/contract';
import { formatDateTime, todayKST, won } from '@shared/dates';
import * as ops from '@shared/ops';
import type { Booking, ChangeChannel, ContractChange, ContractTemplateId } from '@shared/types';
import { useEffect, useMemo, useState } from 'react';
import { ContractDownloads, ContractHistoryPdfButton } from '../../../components/ContractDocs';
import { ContractPreview } from '../../../components/ContractPreview';
import { Icon } from '../../../components/Icon';
import { Sheet, useToast } from '../../../components/ui';
import { useAdmin, useStore } from '../../../data/hooks';
import { errorMessage, useSaveBooking } from '../adminUtils';
import { CancelContractSheet, RestoreContractSheet } from './ContractCancel';

const OPEN_GROUPS = new Set(['행사', '주최자', '계약금', '계약']);
/** 계약일은 날짜 하나로 입력 (양식에 따라 년·월·일·요일 칸으로 나눠 씀) */
const DATE_KEYS = new Set(['contractYear', 'contractMonth', 'contractDay', 'contractWeekday', 'contractDate']);

function startValues(templateId: ContractTemplateId, b: Booking, staff: string): Record<string, string> {
  const latest = latestContract(b);
  const base = latest && latest.templateId === templateId ? latest.values : contractAutoValues(templateId, b, { manager: b.manager?.name || staff, today: todayKST() });
  return { ...contractDefaults(templateId), ...base };
}

/**
 * 계약서 — 예약 정보를 계약서 칸에 자동으로 채우고, 직원이 확인한 뒤 버튼 하나로 발행합니다.
 * 화면·PDF 는 우리 디자인 시스템 계약서(A4 두 장), 엑셀 양식 파일도 함께 받을 수 있습니다.
 * 발행할 때마다 판(v1, v2…)이 쌓이고, 두 번째 판부터는 변경 기록(요청자·경로·사유·금액)을 남깁니다.
 * 계약 취소·철회는 언제든 할 수 있고, 기록으로 남습니다.
 */
export function ContractTab({ booking: b }: { booking: Booking }) {
  const admin = useAdmin();
  const store = useStore();
  const toast = useToast();
  const save = useSaveBooking();
  const latest = latestContract(b);
  const cancelled = activeCancellation(b);
  const staff = admin?.name || '관리자';

  const [templateId, setTemplateId] = useState<ContractTemplateId>(latest?.templateId ?? templateForEvent(b.eventType));
  const [values, setValues] = useState<Record<string, string>>(() => startValues(templateId, b, staff));
  const [issueOpen, setIssueOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const tpl = contractTemplate(templateId);

  // 양식을 바꾸거나 판이 새로 발행되면 그 값으로 다시 시작합니다
  useEffect(() => {
    setValues(startValues(templateId, b, staff));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, latest?.version]);

  const current = useMemo(() => syncRuleFields(values), [values]);
  const previous = useMemo(() => (latest ? syncRuleFields({ ...contractDefaults(latest.templateId), ...latest.values }) : null), [latest]);
  const changed = useMemo(() => (previous && latest?.templateId === templateId ? contractDiff(templateId, previous, current) : []), [previous, current, templateId, latest?.templateId]);
  const changedKeys = changed.map((c) => c.key);
  const dirty = !latest || latest.templateId !== templateId || changed.length > 0;
  const set = (patch: Record<string, string>) => setValues((v) => ({ ...v, ...patch }));

  function refill() {
    set(contractAutoValues(templateId, b, { manager: b.manager?.name || staff, today: todayKST() }));
    toast('예약 정보(일시·홀·인원·연락처·계약금)로 다시 채웠어요.');
  }

  const meta = dirty ? { draft: true, version: latest ? latest.version + 1 : 1 } : { version: latest!.version, issuedAt: latest!.issuedAt, confirmedAt: latest!.confirmedAt };

  return (
    <div className="contract-tab">
      {cancelled && (
        <section className="card contract-cancelled">
          <div className="grow">
            <div className="row wrap gap-8">
              <span className="badge badge--error">계약 취소</span>
              <b className="text-ink">{formatDateTime(cancelled.at)}</b>
              {b.cancelledAt && <span className="caption">예약도 취소됨</span>}
            </div>
            <p className="body-sm mt-8">
              사유: {cancelled.reason} · 위약금 <b className="text-ink">{won(cancelled.penalty)}</b> · 환불 <b className="text-ink">{won(cancelled.refund)}</b> · 처리 {cancelled.staff}
            </p>
            {cancelled.rule && <p className="caption">적용 규정: {cancelled.rule}</p>}
          </div>
          <button className="btn btn--secondary" onClick={() => setRestoreOpen(true)}>
            <Icon name="refresh" size={18} /> 취소 철회
          </button>
        </section>
      )}

      <section className="card contract-tab__head">
        <div className="grow">
          <div className="title-md">계약서</div>
          <p className="caption">
            예약 정보가 계약서에 자동으로 채워져요. 확인한 뒤 발행하면 고객 페이지에 공개되고 메일이 나가요.
            {latest && (
              <>
                {' '}
                · 최신 <b className="text-ink">v{latest.version}</b> {formatDateTime(latest.issuedAt)} 발행 ·{' '}
                {latest.confirmedAt ? <span className="text-gold">고객 확인 {formatDateTime(latest.confirmedAt)}</span> : '고객 확인 전'}
              </>
            )}
          </p>
        </div>
        <label className="field contract-tab__tpl">
          <span className="field__label">양식</span>
          <select className="input" value={templateId} disabled={!!cancelled} onChange={(e) => setTemplateId(e.target.value as ContractTemplateId)}>
            {CONTRACT_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <div className="contract-grid">
        <section className="card contract-form">
          <div className="row between wrap gap-8">
            <div className="title-sm">계약 내용</div>
            <button className="btn btn--ghost btn--sm" onClick={refill} disabled={!!cancelled}>
              <Icon name="refresh" size={16} /> 예약 정보로 다시 채우기
            </button>
          </div>
          {changed.length > 0 && !cancelled && (
            <p className="callout callout--neutral mt-12 body-sm">
              v{latest!.version}와 달라진 칸 {changed.length}개는 노란색으로 표시돼요.
            </p>
          )}
          <fieldset className="contract-form__fields" disabled={!!cancelled}>
            {CONTRACT_GROUPS.filter((g) => g !== '규정면').map((g) => {
              const fields = tpl.fields.filter((x) => x.group === g && !DATE_KEYS.has(x.key));
              const hasDate = g === '계약' && tpl.fields.some((x) => DATE_KEYS.has(x.key));
              if (!fields.length && !hasDate) return null;
              const dateChanged = changedKeys.some((k) => DATE_KEYS.has(k));
              return (
                <details key={g} className="contract-group" open={OPEN_GROUPS.has(g) || fields.some((x) => changedKeys.includes(x.key))}>
                  <summary>{g}</summary>
                  <div className="contract-group__fields">
                    {hasDate && (
                      <label className={`field${dateChanged ? ' is-changed' : ''}`}>
                        <span className="field__label">계약일</span>
                        <input type="date" className="input" value={contractDateOf(values) ?? ''} onChange={(e) => e.target.value && set(contractDateFields(templateId, e.target.value))} />
                      </label>
                    )}
                    {fields.map((x) =>
                      x.key === 'eventDate' ? (
                        <EventWhenField
                          key={x.key}
                          booking={b}
                          value={values.eventDate}
                          changed={changedKeys.includes('eventDate')}
                          before={previous?.eventDate}
                          onChange={(s) => set({ eventDate: s })}
                        />
                      ) : (
                        <FieldInput key={x.key} field={x} value={values[x.key] ?? ''} changed={changedKeys.includes(x.key)} before={previous?.[x.key]} onChange={(s) => set({ [x.key]: s })} />
                      ),
                    )}
                  </div>
                </details>
              );
            })}
          </fieldset>
        </section>

        <section className="contract-side">
          <div className="card contract-actions">
            <div className="row wrap gap-8">
              <ContractDownloads booking={b} templateId={templateId} values={current} meta={meta} cancelled={cancelled} xlsx />
            </div>
            {cancelled ? (
              <p className="caption mt-12">취소된 계약이에요. 다시 발행하려면 먼저 ‘취소 철회’를 눌러 주세요.</p>
            ) : (
              <>
                <button className="btn btn--primary btn--block mt-12" disabled={!dirty} onClick={() => setIssueOpen(true)}>
                  <Icon name="check" size={18} /> {latest ? (dirty ? `변경 계약서 v${latest.version + 1} 발행` : `v${latest.version} 발행됨 · 바뀐 내용 없음`) : '확인하고 v1 발행'}
                </button>
                <p className="caption mt-8">발행하면 고객 페이지에 공개되고 안내 메일이 나가요. 고객이 ‘확인’을 누르면 확정으로 기록됩니다.</p>
                {latest && (
                  <button className="btn btn--danger btn--sm btn--block mt-12" onClick={() => setCancelOpen(true)}>
                    <Icon name="close" size={16} /> 계약 취소
                  </button>
                )}
              </>
            )}
          </div>
          <ContractPreview templateId={templateId} values={current} highlight={cancelled ? [] : changedKeys} meta={meta} cancelled={cancelled} />
        </section>
      </div>

      <ContractHistory booking={b} />

      <IssueSheet
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        booking={b}
        staff={staff}
        changed={changed}
        isFirst={!latest}
        templateChanged={!!latest && latest.templateId !== templateId}
        onIssue={async (change) => {
          try {
            const next = ops.issueContract(b, templateId, current, staff, change);
            if (!(await save(next))) return;
            // 첫 판은 자동 안내 메일(계약서 발행), 변경 판은 바로 다시 보냅니다
            if (latest) await store.sendEmailNow(b.id, 'contract_issued');
            toast(latest ? `변경 계약서 v${latest.version + 1}을 발행하고 고객에게 알렸어요.` : '계약서 v1을 발행했어요. 고객 페이지에 공개되고 메일이 나가요.');
            setIssueOpen(false);
          } catch (e) {
            toast(errorMessage(e), 'error');
          }
        }}
      />
      <CancelContractSheet open={cancelOpen} onClose={() => setCancelOpen(false)} booking={b} />
      <RestoreContractSheet open={restoreOpen} onClose={() => setRestoreOpen(false)} booking={b} />
    </div>
  );
}

function FieldInput({ field: x, value, changed, before, onChange }: { field: ContractField; value: string; changed: boolean; before?: string; onChange: (s: string) => void }) {
  const props = {
    className: `input${x.kind === 'multiline' ? ' textarea' : ''}`,
    value,
    onChange: (e: { target: { value: string } }) => onChange(e.target.value),
  };
  return (
    <label className={`field${changed ? ' is-changed' : ''}`}>
      <span className="field__label">{x.label}</span>
      {x.kind === 'multiline' ? <textarea rows={2} {...props} /> : <input inputMode={x.kind === 'number' ? 'numeric' : undefined} {...props} />}
      {changed && <span className="caption">이전: {before || '(비어 있음)'}</span>}
      {!changed && x.hint && <span className="caption">{x.hint}</span>}
    </label>
  );
}

/** 행사 일시 — 날짜 · 시작 · 종료로 나눠 입력하고, 엑셀 양식 칸 모양으로 저장합니다 */
function EventWhenField({ booking: b, value, changed, before, onChange }: { booking: Booking; value?: string; changed: boolean; before?: string; onChange: (s: string) => void }) {
  const [h, m] = b.time.split(':').map(Number);
  const w = parseEventWhen(value) ?? { date: b.date, start: b.time, end: `${String(Math.min(23, h + 3)).padStart(2, '0')}:${String(m).padStart(2, '0')}` };
  const put = (patch: Partial<typeof w>) => {
    const next = { ...w, ...patch };
    if (next.date && /^\d{2}:\d{2}$/.test(next.start) && /^\d{2}:\d{2}$/.test(next.end)) onChange(eventWhenText(next));
  };
  return (
    <div className={`field${changed ? ' is-changed' : ''}`}>
      <span className="field__label">행사 일시</span>
      <div className="contract-when">
        <input type="date" className="input" aria-label="행사일" value={w.date} onChange={(e) => put({ date: e.target.value })} />
        <input type="time" className="input" aria-label="시작" value={w.start} onChange={(e) => put({ start: e.target.value })} />
        <span className="caption">~</span>
        <input type="time" className="input" aria-label="종료" value={w.end} onChange={(e) => put({ end: e.target.value })} />
      </div>
      {changed && <span className="caption">이전: {before ? before.replace(/\s+/g, ' ') : '(비어 있음)'}</span>}
    </div>
  );
}

const CHANNELS: ChangeChannel[] = ['phone', 'kakao', 'sms', 'email', 'visit'];

function IssueSheet({
  open,
  onClose,
  booking: b,
  staff,
  changed,
  isFirst,
  templateChanged,
  onIssue,
}: {
  open: boolean;
  onClose: () => void;
  booking: Booking;
  staff: string;
  changed: ContractChange['items'];
  isFirst: boolean;
  templateChanged: boolean;
  onIssue: (change?: ops.ContractChangeInput) => Promise<void>;
}) {
  const [requester, setRequester] = useState(`${b.customer.name} ${b.customer.phone}`);
  const [channel, setChannel] = useState<ChangeChannel>('phone');
  const [staffName, setStaffName] = useState(staff);
  const [amount, setAmount] = useState('0');
  const [memo, setMemo] = useState('');
  const [busy, setBusy] = useState(false);
  const delta = Number(amount.replace(/[^\d-]/g, '')) || 0;

  async function submit() {
    setBusy(true);
    try {
      await onIssue(
        isFirst
          ? undefined
          : {
              requester: requester.trim(),
              channel,
              staff: staffName.trim(),
              amountDelta: delta,
              settlement: delta > 0 ? 'extra' : delta < 0 ? 'refund' : 'none',
              memo: memo.trim(),
            },
      );
    } finally {
      setBusy(false);
    }
  }
  const ready = isFirst || (requester.trim() && staffName.trim() && memo.trim());

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isFirst ? '계약서 v1 발행' : '변경 계약서 발행 · 변경 기록'}
      footer={
        <button className="btn btn--primary btn--block" disabled={!ready || busy} onClick={() => void submit()}>
          {busy ? <span className="spinner" /> : <Icon name="check" size={18} />} {isFirst ? '확인했어요 · 발행하고 고객에게 알리기' : '변경 기록 남기고 발행'}
        </button>
      }
    >
      {isFirst ? (
        <p className="body-sm">미리보기에서 행사일·장소·인원·계약금·담당자를 한 번 더 확인해 주세요. 발행하면 고객 페이지에 공개되고 ‘계약서가 준비되었어요’ 메일이 나가요.</p>
      ) : (
        <div className="stack gap-12">
          <div>
            <div className="title-sm">바뀐 내용</div>
            <ul className="contract-changes mt-8">
              {templateChanged && <li>계약서 양식 변경</li>}
              {changed.map((c) => (
                <li key={c.key}>
                  <span className="caption">{c.label}</span>
                  <div>
                    <s className="text-muted">{c.before || '—'}</s> → <b>{c.after || '—'}</b>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <label className="field">
            <span className="field__label">요청자 (이름·연락처) *</span>
            <input className="input" value={requester} onChange={(e) => setRequester(e.target.value)} />
          </label>
          <div className="field">
            <span className="field__label">요청 경로 *</span>
            <div className="row wrap gap-8">
              {CHANNELS.map((c) => (
                <button key={c} type="button" className="chip" aria-pressed={channel === c} onClick={() => setChannel(c)}>
                  {CHANNEL_LABEL[c]}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span className="field__label">접수·수정한 직원 *</span>
            <input className="input" value={staffName} onChange={(e) => setStaffName(e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">금액 변동 (원) — 추가금은 +, 환불은 −</span>
            <input className="input" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <span className="caption">{delta > 0 ? `추가금 ${won(delta)}` : delta < 0 ? `환불 ${won(-delta)}` : '금액 변동 없음'}</span>
          </label>
          <label className="field">
            <span className="field__label">변경 사유 *</span>
            <textarea className="textarea" rows={2} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예) 고객 요청으로 보증 인원 80명 → 95명" />
          </label>
          <p className="caption">변경 기록은 발행 뒤에 지우거나 고칠 수 없어요. 정정이 필요하면 새 변경으로 남겨 주세요. 고객에게 변경 안내 메일이 바로 나가요.</p>
        </div>
      )}
    </Sheet>
  );
}

function ContractHistory({ booking: b }: { booking: Booking }) {
  const c = b.contract;
  if (!c?.versions.length) return null;
  const cancellations = contractCancellations(b);
  const lastCancel = activeCancellation(b);
  return (
    <section className="card">
      <div className="row between wrap gap-8">
        <div>
          <div className="title-md">발행 · 취소 이력</div>
          <p className="caption">모든 판과 취소·철회 기록을 그대로 보관합니다. 기록은 지우거나 고칠 수 없어요.</p>
        </div>
        <ContractHistoryPdfButton booking={b} />
      </div>
      {cancellations.length > 0 && (
        <ul className="contract-cancels mt-16">
          {[...cancellations].reverse().map((x) => (
            <li key={x.id} className={x.kind === 'cancel' ? 'is-cancel' : 'is-restore'}>
              <b>{x.kind === 'cancel' ? '계약 취소' : '취소 철회'}</b> · {formatDateTime(x.at)} · {x.staff}
              {x.withBooking ? (x.kind === 'cancel' ? ' · 예약 함께 취소' : ' · 예약 복구') : ''}
              <div className="caption">
                {x.kind === 'cancel' && `위약금 ${won(x.penalty)} · 환불 ${won(x.refund)} · `}사유: {x.reason}
                {x.requester && ` · 요청 ${x.requester} (${CHANNEL_LABEL[x.channel]})`}
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="contract-versions mt-16">
        {[...c.versions].reverse().map((v, i) => {
          const ch = c.changes.find((x) => x.version === v.version);
          return (
            <article key={v.version} className="contract-version">
              <div className="row between wrap gap-8">
                <div>
                  <b className="text-ink">v{v.version}</b> · {contractTemplate(v.templateId).label} · {formatDateTime(v.issuedAt)} · {v.issuedBy}
                  <div className="caption">{v.confirmedAt ? `고객 확인 ${formatDateTime(v.confirmedAt)}` : '고객 확인 전'}</div>
                </div>
                <div className="row wrap gap-8">
                  <ContractDownloads
                    booking={b}
                    templateId={v.templateId}
                    values={v.values}
                    meta={{ version: v.version, issuedAt: v.issuedAt, confirmedAt: v.confirmedAt }}
                    cancelled={i === 0 ? lastCancel : undefined}
                    size="sm"
                    pdfLabel="PDF"
                    xlsx
                  />
                </div>
              </div>
              {ch && (
                <div className="contract-version__change">
                  <div className="caption">
                    {formatDateTime(ch.at)} · 요청 {ch.requester} ({CHANNEL_LABEL[ch.channel]}) · 접수 {ch.staff} ·{' '}
                    {ch.amountDelta ? `${ch.amountDelta > 0 ? '추가금' : '환불'} ${won(Math.abs(ch.amountDelta))}` : '금액 변동 없음'}
                  </div>
                  <ul className="contract-changes">
                    {ch.items.map((it) => (
                      <li key={it.key}>
                        <span className="caption">{it.label}</span>
                        <div>
                          <s className="text-muted">{it.before || '—'}</s> → <b>{it.after || '—'}</b>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="caption">사유: {ch.memo}</div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
