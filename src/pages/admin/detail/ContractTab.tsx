import { CHANNEL_LABEL, CONTRACT_GROUPS, CONTRACT_TEMPLATES, contractAutoValues, contractDiff, contractTemplate, latestContract, templateForEvent } from '@shared/contract';
import { formatDateTime, todayKST, won } from '@shared/dates';
import * as ops from '@shared/ops';
import type { Booking, ChangeChannel, ContractChange, ContractTemplateId } from '@shared/types';
import { useEffect, useMemo, useState } from 'react';
import { ContractDownloads, ContractHistoryPdfButton } from '../../../components/ContractDocs';
import { ContractPreview } from '../../../components/ContractPreview';
import { Icon } from '../../../components/Icon';
import { Sheet, useToast } from '../../../components/ui';
import { useAdmin, useStore } from '../../../data/hooks';
import { templateValues } from '../../../lib/contract/generate';
import { errorMessage, useSaveBooking } from '../adminUtils';

const OPEN_GROUPS = new Set(['행사', '주최자', '계약금', '계약']);

/**
 * 계약서 — 엔젤스데이 엑셀 양식에 예약 정보를 자동으로 채우고, 직원이 확인한 뒤 버튼 하나로 발행합니다.
 * 발행할 때마다 판(v1, v2…)이 쌓이고, 두 번째 판부터는 변경 기록(요청자·경로·사유·금액)을 꼭 남깁니다.
 */
export function ContractTab({ booking: b }: { booking: Booking }) {
  const admin = useAdmin();
  const store = useStore();
  const toast = useToast();
  const save = useSaveBooking();
  const latest = latestContract(b);
  const staff = admin?.name || '관리자';

  const [templateId, setTemplateId] = useState<ContractTemplateId>(latest?.templateId ?? templateForEvent(b.eventType));
  const [defaults, setDefaults] = useState<Record<string, string> | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [issueOpen, setIssueOpen] = useState(false);
  const tpl = contractTemplate(templateId);

  // 양식 기본값(표준 단가·문구) + 예약 자동값, 이미 발행한 판이 있으면 그 판의 값에서 시작
  useEffect(() => {
    let alive = true;
    setDefaults(null);
    templateValues(templateId)
      .then((d) => {
        if (!alive) return;
        setDefaults(d);
        const base =
          latest && latest.templateId === templateId
            ? latest.values
            : contractAutoValues(templateId, b, {
                manager: b.manager?.name || staff,
                today: todayKST(),
              });
        setValues({ ...d, ...base });
      })
      .catch((e) => toast(errorMessage(e), 'error'));
    return () => {
      alive = false;
    };
    // 판이 새로 발행되면 그 값으로 다시 시작합니다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, latest?.version]);

  const previous = latest && defaults ? { ...defaults, ...latest.values } : null;
  const changed = useMemo(() => (previous && latest?.templateId === templateId ? contractDiff(templateId, previous, values) : []), [previous, values, templateId, latest?.templateId]);
  const changedKeys = changed.map((c) => c.key);
  const dirty = !latest || latest.templateId !== templateId || changed.length > 0;

  function refill() {
    const auto = contractAutoValues(templateId, b, {
      manager: b.manager?.name || staff,
      today: todayKST(),
    });
    setValues((v) => ({ ...v, ...auto }));
    toast('예약 정보(일시·홀·인원·연락처·계약금)로 다시 채웠어요.');
  }

  if (!defaults) {
    return (
      <div className="card">
        <span className="spinner spinner--dark" /> 계약서 양식을 불러오는 중…
      </div>
    );
  }

  return (
    <div className="contract-tab">
      <section className="card contract-tab__head">
        <div className="grow">
          <div className="title-md">계약서</div>
          <p className="caption">
            엔젤스데이 엑셀 양식 그대로 채워집니다. 확인한 뒤 발행하면 고객 페이지에 공개되고 메일이 나가요.
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
          <select className="input" value={templateId} onChange={(e) => setTemplateId(e.target.value as ContractTemplateId)}>
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
            <div className="title-sm">칸 채우기</div>
            <button className="btn btn--ghost btn--sm" onClick={refill}>
              <Icon name="refresh" size={16} /> 예약 정보로 다시 채우기
            </button>
          </div>
          {changed.length > 0 && (
            <p className="callout callout--neutral mt-12 body-sm">
              v{latest!.version}와 달라진 칸 {changed.length}개는 노란색으로 표시돼요.
            </p>
          )}
          {CONTRACT_GROUPS.map((g) => {
            const fields = tpl.fields.filter((x) => x.group === g);
            if (!fields.length) return null;
            return (
              <details key={g} className="contract-group" open={OPEN_GROUPS.has(g) || fields.some((x) => changedKeys.includes(x.key))}>
                <summary>{g}</summary>
                <div className="contract-group__fields">
                  {fields.map((x) => {
                    const isChanged = changedKeys.includes(x.key);
                    const props = {
                      className: `input${x.kind === 'multiline' ? ' textarea' : ''}`,
                      value: values[x.key] ?? '',
                      onChange: (e: { target: { value: string } }) => setValues((v) => ({ ...v, [x.key]: e.target.value })),
                    };
                    return (
                      <label key={x.key} className={`field${isChanged ? ' is-changed' : ''}`}>
                        <span className="field__label">
                          {x.label}{' '}
                          <span className="caption">
                            {x.sheet === 1 ? '뒷면' : ''} {x.cell}
                          </span>
                        </span>
                        {x.kind === 'multiline' ? <textarea rows={2} {...props} /> : <input inputMode={x.kind === 'number' ? 'numeric' : undefined} {...props} />}
                        {isChanged && <span className="caption">이전: {previous?.[x.key] || '(비어 있음)'}</span>}
                        {!isChanged && x.hint && <span className="caption">{x.hint}</span>}
                      </label>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </section>

        <section className="contract-side">
          <div className="card contract-actions">
            <div className="row wrap gap-8">
              <ContractDownloads booking={b} templateId={templateId} values={values} footnote={`${tpl.label} · 미리보기 (발행 전)`} />
            </div>
            <button className="btn btn--primary btn--block mt-12" disabled={!dirty} onClick={() => setIssueOpen(true)}>
              <Icon name="check" size={18} /> {latest ? (dirty ? `변경 계약서 v${latest.version + 1} 발행` : `v${latest.version} 발행됨 · 바뀐 내용 없음`) : '확인하고 v1 발행'}
            </button>
            <p className="caption mt-8">발행하면 고객 페이지에 PDF로 공개되고 안내 메일이 나가요. 고객이 ‘확인’을 누르면 확정으로 기록됩니다.</p>
          </div>
          <ContractPreview templateId={templateId} values={values} highlight={changedKeys} />
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
            const next = ops.issueContract(b, templateId, values, staff, change);
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
  return (
    <section className="card">
      <div className="row between wrap gap-8">
        <div>
          <div className="title-md">발행 이력</div>
          <p className="caption">모든 판을 그대로 보관합니다. 변경 기록은 지우거나 고칠 수 없어요.</p>
        </div>
        <ContractHistoryPdfButton booking={b} />
      </div>
      <div className="contract-versions mt-16">
        {[...c.versions].reverse().map((v) => {
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
                    version={v.version}
                    size="sm"
                    footnote={`${contractTemplate(v.templateId).label} v${v.version} · ${formatDateTime(v.issuedAt)} 발행`}
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
                    {ch.items.map((i) => (
                      <li key={i.key}>
                        <span className="caption">{i.label}</span>
                        <div>
                          <s className="text-muted">{i.before || '—'}</s> → <b>{i.after || '—'}</b>
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
