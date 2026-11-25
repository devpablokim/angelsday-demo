import { contractDateOf, contractValues, dateDisplay, eventWhenDisplay } from '@shared/contract';
import { formatDateTime } from '@shared/dates';
import type { ContractCancellation, ContractTemplateId } from '@shared/types';
import { VENUE } from '@shared/venue';
import { Fragment, type ReactNode } from 'react';
import { Logo } from '../../brand/Logo';
import { CLAUSE4_TABLE, CLAUSES, DOC_LAYOUTS, type DocItem, type DocTable } from './layouts';

export interface ContractDocMeta {
  version?: number;
  issuedAt?: string;
  confirmedAt?: string;
  /** 발행 전 미리보기 */
  draft?: boolean;
}

/** 2026. 10. 23 10:30 */
function issuedText(iso: string): string {
  const d = new Date(iso);
  const k = new Date(d.getTime() + 9 * 3600000);
  return `${k.getUTCFullYear()}. ${k.getUTCMonth() + 1}. ${k.getUTCDate()} ${String(k.getUTCHours()).padStart(2, '0')}:${String(k.getUTCMinutes()).padStart(2, '0')}`;
}

const digits = (s: string) => s.replace(/[,\s원₩\\]/g, '');
function amountNum(s: string | undefined): number | null {
  const d = digits(s ?? '');
  return /^\d+$/.test(d) ? Number(d) : null;
}
/** '800000' → '800,000원', 숫자가 아니면 적힌 그대로 ('별도문의', '350,000~') */
function amountText(s: string | undefined): string {
  const t = (s ?? '').trim();
  if (!t) return '';
  const n = amountNum(t);
  return n !== null ? `${n.toLocaleString('ko-KR')}원` : t.replace(/\s+/g, ' ');
}
function lines(s: string | undefined): string[] {
  return (s ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}
/** '대인\n53,000\n(미션고객가)' → 53,000원 · (미션고객가) */
function buffetPrice(s: string | undefined): { price: string; extra: string } {
  const ls = lines(s).filter((l) => !/^(대인|소인)$/.test(l));
  return { price: amountText(ls[0]), extra: ls.slice(1).join(' ') };
}

/**
 * 계약서 — 엔젤스데이 계약서 4종의 내용을 우리 디자인 시스템 문서로 그립니다.
 * A4 두 장(앞면 계약서 · 뒷면 행사 계약 규정)이며, 화면 미리보기와 PDF 가 같은 마크업을 씁니다.
 * highlight 에 넣은 필드 키는 노란색으로 표시합니다 (이전 판과 바뀐 곳).
 */
export function ContractDocument({
  templateId,
  values: raw,
  highlight,
  meta = {},
  cancelled,
  frame,
}: {
  templateId: ContractTemplateId;
  values: Record<string, string>;
  highlight?: string[];
  meta?: ContractDocMeta;
  cancelled?: ContractCancellation;
  /** 화면 미리보기용 A4 틀로 감쌉니다 */
  frame?: boolean;
}) {
  const L = DOC_LAYOUTS[templateId];
  const v = contractValues(templateId, raw);
  const hl = new Set(highlight ?? []);
  const V = ({ k, children, empty = '—' }: { k: string; children?: ReactNode; empty?: string }) => (
    <span className={`cdoc-v${hl.has(k) ? ' is-changed' : ''}`} data-key={k}>
      {children ?? ((v[k] ?? '').trim() || empty)}
    </span>
  );
  const deposit = amountNum(v.deposit);
  const signDate = contractDateOf(v);
  const ruleDeposit = amountNum(v.rulesDeposit) ?? deposit;
  const manager = v.manager || v.rulesManager || '';
  const customer = v.rulesCustomer || v.host1Name || '';
  const wrap = (node: ReactNode, key: string) =>
    frame ? (
      <div className="a4-frame" key={key}>
        {node}
      </div>
    ) : (
      <Fragment key={key}>{node}</Fragment>
    );

  const head = (overline: string, title: string) => (
    <header className="cdoc__head">
      <div>
        <div className="overline">
          {overline}
          {meta.version ? ` · V${meta.version}` : ''}
        </div>
        <h1 className="cdoc__title">{title}</h1>
        <p className="cdoc__meta">
          {meta.draft ? '발행 전 미리보기' : meta.issuedAt ? `${issuedText(meta.issuedAt)} 발행` : ''}
          {manager && ` · 담당 ${manager}`}
        </p>
      </div>
      <Logo layout="horizontal" variant="ink" height={30} showTagline={false} />
    </header>
  );

  const foot = (page: number) => (
    <footer className="cdoc__foot">
      <span>
        {VENUE.name} · {VENUE.address} · {VENUE.phone} · 사업자등록번호 {VENUE.bizNo}
      </span>
      <span>{page} / 2</span>
    </footer>
  );

  const stamp = cancelled && (
    <div className="cdoc-stamp" aria-label="취소된 계약">
      <b>계약 취소</b>
      <span>{formatDateTime(cancelled.at)}</span>
    </div>
  );

  // ───── 앞면 ─────
  const front = (
    <article className="a4-page cdoc">
      {stamp}
      {head(L.overline, L.title)}

      <section className="cdoc-sec">
        <h2 className="cdoc-sec__title">행사 정보</h2>
        <dl className="cdoc-grid">
          {L.info.map((i) => (
            <div key={i.key} className={i.wide ? 'is-wide' : undefined}>
              <dt>{i.label}</dt>
              <dd>{i.when ? <V k={i.key}>{eventWhenDisplay(v[i.key]) || '—'}</V> : <V k={i.key} />}</dd>
            </div>
          ))}
        </dl>
        {L.guarantee && <p className="cdoc-note">{L.guarantee.join(' ')}</p>}
      </section>

      <section className="cdoc-sec">
        <h2 className="cdoc-sec__title">계약자 (주최자)</h2>
        <dl className="cdoc-grid cdoc-grid--one">
          {L.hosts.map((h) => (
            <div key={h.name}>
              <dt>{h.label}</dt>
              <dd>
                <V k={h.name} />
                {h.phone && (
                  <span className="cdoc-sub">
                    <V k={h.phone} empty="" />
                  </span>
                )}
                {h.en && (v[h.en] || hl.has(h.en)) && (
                  <span className="cdoc-sub">
                    영문 <V k={h.en} />
                  </span>
                )}
                {h.email && (v[h.email] || hl.has(h.email)) && (
                  <span className="cdoc-sub">
                    <V k={h.email} />
                  </span>
                )}
                {h.cashReceipt && (v[h.cashReceipt] || hl.has(h.cashReceipt)) && (
                  <span className="cdoc-sub">
                    현금영수증 <V k={h.cashReceipt} />
                  </span>
                )}
              </dd>
            </div>
          ))}
          {L.email && (
            <div>
              <dt>E-mail</dt>
              <dd>
                <V k={L.email} />
              </dd>
            </div>
          )}
          <div>
            <dt>주소</dt>
            <dd>
              {L.address.map((k, i) => (
                <span key={k}>
                  {i > 0 && ' '}
                  <V k={k} empty={i ? '' : '—'} />
                </span>
              ))}
            </dd>
          </div>
        </dl>
      </section>

      <section className="cdoc-sec cdoc-pay">
        <div className="cdoc-pay__deposit">
          <span className="cdoc-pay__label">계약금</span>
          <V k="deposit">{deposit !== null ? `${deposit.toLocaleString('ko-KR')}원` : (v.deposit ?? '').trim() || '—'}</V>
          {(v.depositMemo || hl.has('depositMemo')) && (
            <span className="cdoc-pay__memo">
              입금 <V k="depositMemo" />
            </span>
          )}
        </div>
        <div className="cdoc-pay__bank">
          <span className="cdoc-pay__label">입금 계좌</span>
          <b>
            {VENUE.bank.name} {VENUE.bank.account}
          </b>
          <span>예금주 {VENUE.bank.holder}</span>
          {L.depositNote && <span className="cdoc-pay__warn">{L.depositNote}</span>}
        </div>
      </section>

      <div className={`cdoc-tables${L.tablesSideBySide ? ' is-side' : ''}`}>
        {L.tables.map((t) => (
          <ItemTable key={t.title} table={t} v={v} V={V} />
        ))}
      </div>
      {L.tableFoot && <p className="cdoc-note">{L.tableFoot}</p>}

      {L.vendors && (
        <section className="cdoc-sec">
          <h2 className="cdoc-sec__title">{L.vendors.title}</h2>
          <div className="cdoc-vendors">
            {L.vendors.rows.map((r) => (
              <span key={r.label} className="cdoc-chip">
                {r.label}
                {r.key && (v[r.key] || hl.has(r.key)) && (
                  <>
                    {' '}
                    <V k={r.key} />
                  </>
                )}
              </span>
            ))}
          </div>
          <p className="cdoc-note">{L.vendors.note}</p>
        </section>
      )}

      <section className="cdoc-sec">
        <h2 className="cdoc-sec__title">뷔페 · 식음료</h2>
        <div className={`cdoc-food${L.buffet.guestsKey ? ' has-guests' : ''}`}>
          {(
            [
              ['대인', 'buffetAdult', ''],
              ['소인', 'buffetChild', L.buffet.childAge],
            ] as const
          ).map(([label, key, sub]) => {
            const p = buffetPrice(v[key]);
            return (
              <div key={key} className="cdoc-food__tile">
                <span className="cdoc-pay__label">
                  BUFFET · {label}
                  {sub && ` (${sub})`}
                </span>
                <V k={key}>
                  <b className="cdoc-food__price">{p.price || '—'}</b>
                  {p.extra && <span className="cdoc-sub">{p.extra}</span>}
                </V>
              </div>
            );
          })}
          {L.buffet.guestsKey && (
            <div className="cdoc-food__tile">
              <span className="cdoc-pay__label">뷔페 인원</span>
              <b className="cdoc-food__price">
                <V k={L.buffet.guestsKey} />
              </b>
            </div>
          )}
          <ul className="cdoc-food__drinks">
            {L.drinks.map((d) => (
              <li key={d.label}>
                <span>{d.label}</span>
                <b>{d.price}</b>
              </li>
            ))}
          </ul>
        </div>
        <p className="cdoc-note">
          {L.buffet.notes.join(' · ')}
          {L.drinksNote && <> · {L.drinksNote}</>}
        </p>
      </section>

      <div className="cdoc-cols">
        {L.side.map((s) => (
          <section key={s.title} className="cdoc-sec">
            <h2 className="cdoc-sec__title">{s.title}</h2>
            <ul className="cdoc-list">
              {s.lines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </section>
        ))}
        {L.notesKey && (
          <section className="cdoc-sec">
            <h2 className="cdoc-sec__title">준비 사항</h2>
            <p className="cdoc-pre">
              <V k={L.notesKey} empty="없음" />
            </p>
          </section>
        )}
      </div>

      <section className="cdoc-sec">
        <h2 className="cdoc-sec__title">행사 규정 (취소 · 위약금)</h2>
        <dl className="cdoc-rules">
          {L.rules.map(([when, what]) => (
            <div key={when}>
              <dt>{when}</dt>
              <dd>{what}</dd>
            </div>
          ))}
        </dl>
        {L.rulesNote && <p className="cdoc-note">{L.rulesNote}</p>}
      </section>

      <div className="cdoc-spacer" />
      <section className="cdoc-sign">
        <div>
          <span className="cdoc-pay__label">계약일</span>
          <b>
            <V k="contractDate">{signDate ? dateDisplay(signDate) : '—'}</V>
          </b>
        </div>
        <div>
          <span className="cdoc-pay__label">담당자</span>
          <b>
            <V k="manager" />
          </b>
          <span className="cdoc-seal">(인)</span>
        </div>
        <div>
          <span className="cdoc-pay__label">고객 확인</span>
          <b>{customer || '—'}</b>
          {meta.confirmedAt ? <span className="cdoc-confirmed">온라인 확인 {formatDateTime(meta.confirmedAt)}</span> : <span className="cdoc-seal">(인)</span>}
        </div>
      </section>
      {foot(1)}
    </article>
  );

  // ───── 뒷면: 행사 계약 규정 ─────
  const back = (
    <article className="a4-page cdoc cdoc--terms">
      {head('TERMS & CONDITIONS', '행사 계약 규정')}
      <p className="cdoc-lead">
        저희 {VENUE.name}에서는 고객님의 소중한 행사를 위하여
        <br />
        최상의 서비스를 제공하겠습니다.
      </p>
      <ol className="cdoc-clauses">
        <li data-n="1.">
          본 계약의 체결 시 행사 주최자는 본 계약의 앞면에 명시된 연회 행사 계약금{' '}
          <V k="rulesDeposit">
            <b>{ruleDeposit !== null ? `${ruleDeposit.toLocaleString('ko-KR')}원` : '—'}</b>
          </V>
          을 지급하기로 합니다. 다만, 계약금은 본 계약에 따른 행사 종료 후 확정된 연회 행사 비용에서 공제됩니다. <b>{L.clause1Refund}</b>
          <span className="cdoc-clauses__sub">* 정부에서 공식 인정되는 질병은 정부 지침에 따라 인정됩니다. (예: 코로나) 이 외 질병은 예약금 반환 및 위약금 상황에 적용되지 않습니다.</span>
        </li>
        <li data-n="2.">{CLAUSES[2]}</li>
        <li data-n="3.">{CLAUSES[3]}</li>
        <li data-n="4.">
          행사를 취소하실 경우에는 예정된 행사일로부터 최소 30일 이전에 통보해 주셔야 하며, 30일 이전에 통보를 하지 않고 취소하실 경우에 다음의 청구할 권리를 갖습니다.
          <table className="cdoc-penalty">
            <thead>
              <tr>
                <th>취소 시점</th>
                <th>계약상 예상 총액의 배상</th>
              </tr>
            </thead>
            <tbody>
              {CLAUSE4_TABLE.map(([when, rate]) => (
                <tr key={when}>
                  <td>{when}</td>
                  <td>{rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <span className="cdoc-clauses__sub">* 계약금을 제외한 예상 행사비 총액</span>
        </li>
        {[5, 6, 7, 8, 9, 10, 11].map((n) => (
          <li key={n} data-n={`${n}.`}>
            {CLAUSES[n]}
          </li>
        ))}
        {L.clause12 && <li data-n="12.">백일 전 이벤트 수령 후 취소 시 예약금은 반환되지 않습니다. (백일상, 홈파티 등)</li>}
      </ol>

      <div className="cdoc-spacer" />
      <section className="cdoc-sign cdoc-sign--two">
        <div>
          <span className="cdoc-pay__label">SIGNED BY · 고객님</span>
          <b>
            <V k="rulesCustomer">{customer || '—'}</V>
          </b>
          {meta.confirmedAt ? <span className="cdoc-confirmed">온라인 확인 {formatDateTime(meta.confirmedAt)}</span> : <span className="cdoc-seal">(서명)</span>}
        </div>
        <div>
          <span className="cdoc-pay__label">SIGNED BY · 담당자</span>
          <b>
            <V k="rulesManager">{manager || '—'}</V>
          </b>
          <span className="cdoc-seal">(서명)</span>
        </div>
      </section>
      <p className="cdoc-thanks">{VENUE.name}를 이용해 주셔서 진심으로 감사드리며, 서명하시기 전에 계약 규정을 읽어 주시기 바랍니다.</p>
      {foot(2)}
    </article>
  );

  return (
    <>
      {wrap(front, 'front')}
      {wrap(back, 'back')}
    </>
  );
}

function ItemTable({ table: t, v, V }: { table: DocTable; v: Record<string, string>; V: (p: { k: string; children?: ReactNode; empty?: string }) => ReactNode }) {
  const amountCell = (r: DocItem) => {
    if (r.amountText !== undefined) return r.amountText || '—';
    if (!r.amount) return '—';
    if (r.actual && (v[r.actual] ?? '').trim()) {
      return (
        <>
          <span className="cdoc-strike">
            정가 <V k={r.amount}>{amountText(v[r.amount])}</V> →
          </span>{' '}
          <V k={r.actual}>{amountText(v[r.actual])}</V>
        </>
      );
    }
    return <V k={r.amount}>{amountText(v[r.amount]) || '—'}</V>;
  };
  return (
    <section className="cdoc-sec">
      <h2 className="cdoc-sec__title">{t.title}</h2>
      <table className="cdoc-table">
        <thead>
          <tr>
            <th>품목</th>
            {t.vat ? (
              <>
                <th className="num">공급가</th>
                <th className="num">VAT</th>
                <th className="num">합계</th>
              </>
            ) : (
              <th className="num">금액</th>
            )}
          </tr>
        </thead>
        <tbody>
          {t.rows.map((r) => {
            const n = r.amount ? amountNum(v[r.amount]) : null;
            const vat = n !== null ? Math.round(n * 0.1) : null;
            const note = r.note ? (v[r.note] ?? '').trim() : r.noteText;
            return (
              <tr key={r.label}>
                <td>
                  <b className="cdoc-item">{r.label}</b>
                  {note && <span className="cdoc-badge">{r.note ? <V k={r.note}>{note.replace(/\s+/g, ' ')}</V> : note}</span>}
                  {r.desc && <span className="cdoc-desc">{r.desc}</span>}
                </td>
                <td className="num">{amountCell(r)}</td>
                {t.vat && (
                  <>
                    <td className="num cdoc-muted">{vat !== null ? vat.toLocaleString('ko-KR') : '—'}</td>
                    <td className="num">{n !== null && vat !== null ? <b>{(n + vat).toLocaleString('ko-KR')}원</b> : '—'}</td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {t.foot && <p className="cdoc-note">{t.foot.join(' ')}</p>}
    </section>
  );
}
