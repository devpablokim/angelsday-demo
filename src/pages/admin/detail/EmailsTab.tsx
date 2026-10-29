import { formatDateTime } from '@shared/dates';
import { emailHtml, planEmails, renderEmail, type PlanStatus } from '@shared/emailRules';
import type { Booking } from '@shared/types';
import { useState } from 'react';
import { Icon } from '../../../components/Icon';
import { Sheet, useToast } from '../../../components/ui';
import { useEmailRules, useStore } from '../../../data/hooks';
import { emailBaseUrl, errorMessage, PLAN_LABEL, triggerText } from '../adminUtils';

export function PlanChip({ status }: { status: PlanStatus }) {
  return <span className={`plan-chip plan-chip--${status}`}>{PLAN_LABEL[status]}</span>;
}

export function EmailPreview({ booking, ruleId, onClose }: { booking: Booking | null; ruleId: string | null; onClose: () => void }) {
  const open = !!booking && !!ruleId;
  const content = open ? renderEmail(ruleId!, booking!, emailBaseUrl()) : null;
  return (
    <Sheet open={open} onClose={onClose} title={content ? content.subject : ''} wide>
      {content && (
        <>
          <p className="caption mb-16">
            받는 사람: {booking!.customer.email || '(이메일 없음)'} · 미리보기: {content.preheader}
          </p>
          <iframe className="email-frame" title="메일 미리보기" srcDoc={emailHtml(content)} sandbox="" />
        </>
      )}
    </Sheet>
  );
}

export function EmailsTab({ booking: b }: { booking: Booking }) {
  const store = useStore();
  const enabled = useEmailRules();
  const toast = useToast();
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const plan = planEmails(b, enabled);

  async function sendNow(ruleId: string) {
    setBusy(ruleId);
    try {
      await store.sendEmailNow(b.id, ruleId);
      toast('메일을 발송했어요.');
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="stack gap-16">
      <section className="card">
        <div className="card__head">
          <div>
            <div className="title-md">자동 메일 일정</div>
            <p className="caption">받는 사람 {b.customer.email || '— 이메일이 없어 발송되지 않아요'} · 매일 10:00(KST) 스케줄러가 발송 대상 메일을 보냅니다.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>메일</th>
                <th>발송 시점</th>
                <th>상태</th>
                <th>일시</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {plan.map((p) => (
                <tr key={p.rule.id}>
                  <td>
                    <b className="text-ink">{p.rule.name}</b>
                  </td>
                  <td className="caption">{triggerText(p.rule)}</td>
                  <td>
                    <PlanChip status={p.status} />
                    {p.reason && <div className="caption">{p.reason}</div>}
                  </td>
                  <td className="caption">{p.sentAt ? formatDateTime(p.sentAt) : p.scheduledFor ? formatDateTime(p.scheduledFor) : '—'}</td>
                  <td>
                    <div className="row gap-4">
                      <button className="btn btn--ghost btn--sm" onClick={() => setPreview(p.rule.id)}>
                        미리보기
                      </button>
                      <button className="btn btn--secondary btn--sm" disabled={busy === p.rule.id || !b.customer.email} onClick={() => void sendNow(p.rule.id)}>
                        {busy === p.rule.id ? <span className="spinner spinner--dark" /> : <Icon name="send" size={14} />} 지금 발송
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="title-md">발송 기록 {b.emails.length}건</div>
        {b.emails.length === 0 ? (
          <p className="caption mt-8">아직 보낸 메일이 없어요.</p>
        ) : (
          <ul className="list mt-8">
            {[...b.emails].reverse().map((e) => (
              <li key={e.id} className="list-item">
                <Icon name="mail" size={18} />
                <div className="list-item__body">
                  <div className="list-item__title">{e.subject}</div>
                  <div className="list-item__meta">
                    {formatDateTime(e.sentAt)} · {e.to} · {e.status === 'sent' ? '발송 완료' : '실패'}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <EmailPreview booking={preview ? b : null} ruleId={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
