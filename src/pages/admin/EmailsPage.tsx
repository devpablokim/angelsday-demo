import { formatDateTime } from '@shared/dates';
import { EMAIL_RULES, planEmails, type PlannedEmail } from '@shared/emailRules';
import { honoreeLabel } from '@shared/eventTypes';
import type { Booking } from '@shared/types';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Icon } from '../../components/Icon';
import { EventBadge, PageLoading, Switch, useToast } from '../../components/ui';
import { useBookings, useEmailRules, useStore } from '../../data/hooks';
import { conditionText, errorMessage, triggerText } from './adminUtils';
import { EmailPreview, PlanChip } from './detail/EmailsTab';

export function EmailsPage() {
  const bookings = useBookings();
  const enabled = useEmailRules();
  const store = useStore();
  const toast = useToast();
  const [running, setRunning] = useState(false);
  const [preview, setPreview] = useState<{ booking: Booking; ruleId: string } | null>(null);

  const upcoming = useMemo(() => {
    if (!bookings) return [];
    const now = Date.now();
    const horizon = now + 14 * 86400000;
    const rows: { b: Booking; p: PlannedEmail }[] = [];
    for (const b of bookings) {
      for (const p of planEmails(b, enabled)) {
        if (p.status === 'due') rows.push({ b, p });
        else if (p.status === 'scheduled' && p.scheduledFor && new Date(p.scheduledFor).getTime() <= horizon) rows.push({ b, p });
      }
    }
    return rows.sort((a, z) => (a.p.status === 'due' ? -1 : 0) - (z.p.status === 'due' ? -1 : 0) || (a.p.scheduledFor ?? '').localeCompare(z.p.scheduledFor ?? ''));
  }, [bookings, enabled]);

  if (!bookings) return <PageLoading />;

  const dueCount = upcoming.filter((r) => r.p.status === 'due').length;
  const sample = bookings.find((b) => !b.cancelledAt && b.quote) ?? bookings[0];
  const sentTotal = bookings.reduce((s, b) => s + b.emails.length, 0);

  async function run() {
    setRunning(true);
    try {
      const n = await store.runEmailScheduler();
      toast(n ? `메일 ${n}통을 발송했어요.` : '지금 보낼 메일이 없어요.');
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setRunning(false);
    }
  }

  async function toggle(id: string, v: boolean) {
    try {
      await store.saveEmailRules({ ...enabled, [id]: v });
      toast(v ? '자동 메일을 켰어요.' : '자동 메일을 껐어요.');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <div>
          <div className="overline">EMAIL AUTOMATION</div>
          <h1 className="display-md">메일 자동화</h1>
          <p className="caption">지금까지 {sentTotal}통 발송 · 지금 발송 대상 {dueCount}통</p>
        </div>
        <button className="btn btn--primary btn--sm" onClick={() => void run()} disabled={running}>
          {running ? <span className="spinner" /> : <Icon name="send" size={16} />} 지금 스케줄러 실행
        </button>
      </div>

      <div className="callout callout--neutral mb-16">
        <span className="callout__icon">i</span>
        <p className="body-sm">
          운영 환경에서는 Cloud Functions 스케줄러가 <b className="text-ink">매일 오전 10:00(KST)</b>에 고객별 발송 시점을 계산해 메일을 보내고, 문의 접수 · 견적 발송 · 결제 같은 행동 메일은 즉시 발송돼요.
          {store.mode === 'demo' ? ' 데모 모드에서는 실제 메일 대신 발송 기록만 남아요.' : ''}
        </p>
      </div>

      <section className="card">
        <div className="title-md">자동 메일 규칙 {EMAIL_RULES.length}개</div>
        <ul className="rule-list mt-8">
          {EMAIL_RULES.map((r) => (
            <li key={r.id} className={`rule ${enabled[r.id] === false ? 'is-off' : ''}`}>
              <div className="rule__main">
                <div className="title-sm">{r.name}</div>
                <div className="caption">
                  <span className="rule__when">{triggerText(r)}</span> · 대상: {conditionText(r)}
                </div>
              </div>
              <div className="rule__actions">
                {sample && (
                  <button className="btn btn--ghost btn--sm" onClick={() => setPreview({ booking: sample, ruleId: r.id })}>
                    미리보기
                  </button>
                )}
                <Switch checked={enabled[r.id] !== false} onChange={(v) => void toggle(r.id, v)} label={<span className="sr-only">{r.name} 사용</span>} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card mt-16">
        <div className="card__head">
          <div>
            <div className="title-md">발송 예정 (14일 이내)</div>
            <p className="caption">조건(단계, 결제 여부)을 만족하는 경우에만 발송돼요.</p>
          </div>
        </div>
        {upcoming.length === 0 ? (
          <p className="caption">14일 이내 예정된 메일이 없어요.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>발송 시각</th>
                  <th>고객</th>
                  <th>메일</th>
                  <th>상태</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {upcoming.map(({ b, p }) => (
                  <tr key={`${b.id}-${p.rule.id}`}>
                    <td className="caption">{p.status === 'due' ? '지금' : formatDateTime(p.scheduledFor!)}</td>
                    <td>
                      <Link to={`/admin/bookings/${b.id}?tab=emails`} className="row gap-8">
                        <EventBadge type={b.eventType} short />
                        <span className="text-ink">{honoreeLabel(b.eventType, b.honorees)}</span>
                      </Link>
                    </td>
                    <td>{p.rule.name}</td>
                    <td>
                      <PlanChip status={p.status} />
                    </td>
                    <td>
                      <button className="btn btn--ghost btn--sm" onClick={() => setPreview({ booking: b, ruleId: p.rule.id })}>
                        미리보기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <EmailPreview booking={preview?.booking ?? null} ruleId={preview?.ruleId ?? null} onClose={() => setPreview(null)} />
    </div>
  );
}
