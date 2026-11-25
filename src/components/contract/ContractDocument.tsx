import { contractDateOf, contractValues, eventWhenDisplay } from '@shared/contract';
import type { ContractCancellation, ContractTemplateId } from '@shared/types';
import { VENUE } from '@shared/venue';
import { Fragment, type ReactNode } from 'react';
import { Logo } from '../../brand/Logo';
import { CLAUSE4_TABLE, CLAUSES, DOC_LAYOUTS, type DocItem, type DocLayout, type DocTable } from './layouts';

export interface ContractDocMeta {
  version?: number;
  issuedAt?: string;
  confirmedAt?: string;
  /** 발행 전 미리보기 */
  draft?: boolean;
}

const WD = ['일', '월', '화', '수', '목', '금', '토'];
const pad = (n: number) => String(n).padStart(2, '0');
/** ISO 시각 → 한국 시각 2026. 10. 23 10:30 */
function kst(iso: string): string {
  const k = new Date(new Date(iso).getTime() + 9 * 3600000);
  return `${k.getUTCFullYear()}. ${k.getUTCMonth() + 1}. ${k.getUTCDate()} ${pad(k.getUTCHours())}:${pad(k.getUTCMinutes())}`;
}
/** 2026-10-23 → 2026년 10월 23일 (금) */
function longDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${y}년 ${m}월 ${d}일 (${WD[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]})`;
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

type Cell = { label: ReactNode; value: ReactNode; wide?: boolean };

/**
 * 계약서 — 엔젤스데이 계약서 4종(돌·생신·웨딩·연회)의 내용을 실제 계약서 양식(괘선 표)으로 그립니다.
 * A4 두 장(앞면 계약서 · 뒷면 행사 계약 규정)이며, 화면 미리보기와 PDF 가 같은 마크업을 씁니다.
 * 각 표는 왼쪽에 구분 열(행사·계약자·계약금…)을 두고 라벨 칸은 아이보리, 값 칸은 흰 바탕입니다.
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
  const has = (k?: string) => !!k && (!!(v[k] ?? '').trim() || hl.has(k));
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

  const letterhead = (
    <header className="cdoc__letterhead">
      <Logo layout="horizontal" variant="ink" height={24} showTagline={false} />
      <div className="cdoc__issued">
        <span>
          {meta.version ? `계약서 v${meta.version}` : '계약서'}
          {meta.draft ? ' · 발행 전 미리보기' : meta.issuedAt ? ` · ${kst(meta.issuedAt)} 발행` : ''}
        </span>
        {manager && <span>담당 {manager}</span>}
      </div>
    </header>
  );
  const titleBlock = (overline: string, title: string) => (
    <div className="cdoc__titleblock">
      <div className="cdoc__overline">{overline}</div>
      <h1 className="cdoc__title">{title}</h1>
    </div>
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
      <span>{kst(cancelled.at)}</span>
    </div>
  );

  // ───── 행사 · 계약자 · 계약금 ─────
  const info: Cell[] = L.info.map((i) => ({ label: i.label, value: i.when ? <V k={i.key}>{eventWhenDisplay(v[i.key]) || '—'}</V> : <V k={i.key} />, wide: i.wide }));
  const hostCells: Cell[] = L.hosts.map((h) => ({
    label: h.label,
    value: (
      <>
        <b className="cf-strong">
          <V k={h.name} />
        </b>
        {has(h.phone) && (
          <span className="cf-after">
            <V k={h.phone!} />
          </span>
        )}
        {has(h.cashReceipt) && (
          <span className="cf-after">
            현금영수증 <V k={h.cashReceipt!} />
          </span>
        )}
        {has(h.en) && (
          <span className="cf-line">
            영문 <V k={h.en!} />
          </span>
        )}
        {has(h.email) && (
          <span className="cf-line">
            <V k={h.email!} />
          </span>
        )}
      </>
    ),
  }));
  const contactCells: Cell[] = [
    ...(L.email ? [{ label: 'E-mail', value: <V k={L.email} /> }] : []),
    {
      label: '주소',
      value: (
        <>
          {L.address.map((k, i) => (
            <Fragment key={k}>
              {i > 0 && has(k) && ' '}
              <V k={k} empty={i ? '' : '—'} />
            </Fragment>
          ))}
        </>
      ),
    },
  ];
  const payCells: Cell[] = [
    {
      label: '계약금',
      value: (
        <>
          <b className="cf-amount">
            <V k="deposit">{deposit !== null ? `${deposit.toLocaleString('ko-KR')}원` : (v.deposit ?? '').trim() || '—'}</V>
          </b>
          {has('depositMemo') && (
            <span className="cf-after">
              <V k="depositMemo" /> 입금
            </span>
          )}
          {L.depositNote && <span className="cf-line cf-gold">{L.depositNote}</span>}
        </>
      ),
    },
    {
      label: '입금 계좌',
      value: (
        <>
          <b className="cf-strong">
            {VENUE.bank.name} {VENUE.bank.account}
          </b>
          <span className="cf-line">예금주 {VENUE.bank.holder}</span>
        </>
      ),
    },
  ];

  // ───── 앞면 ─────
  const front = (
    <article className="a4-page cdoc">
      {stamp}
      {letterhead}
      {titleBlock(L.overline, L.title)}

      <table className="cf">
        <FormCols />
        <tbody>
          <Group label="행사" rows={rowsOf(info)} note={L.guarantee?.join(' ')} />
          <Group label="계약자" rows={[...rowsOf(hostCells), ...rowsOf(contactCells)]} />
          <Group label="계약금" rows={rowsOf(payCells)} />
        </tbody>
      </table>

      <ItemsTable layout={L} v={v} V={V} has={has} />

      <BuffetTable layout={L} v={v} V={V} />

      <table className="cf">
        <FormCols />
        <tbody>
          <Group
            label="안내"
            rows={[
              ...L.side.map((s) => [{ label: s.title, value: s.lines.join(' · '), wide: true }]),
              ...(L.notesKey ? [[{ label: '준비 사항', value: <V k={L.notesKey} empty="없음" />, wide: true }]] : []),
            ]}
          />
        </tbody>
      </table>

      <RulesTable rules={L.rules} note={[`위약금은 ${L.rulesBase} 기준으로 배상하셔야 합니다.`, L.rulesNote].filter(Boolean).join(' ')} />

      <div className="cdoc-spacer" />
      <section className="cf-sign">
        <p className="cf-sign__date">
          <span>계약일</span>
          <V k="contractDate">{signDate ? longDate(signDate) : '　　　　년　　월　　일'}</V>
        </p>
        <div className="cf-sign__row">
          <Party role="회사 · 담당자" name={<V k="manager" empty="" />} sub={VENUE.name} seal="(인)" />
          <Party role="고객 확인" name={customer} sub={meta.confirmedAt ? `온라인 확인 ${kst(meta.confirmedAt)}` : undefined} subGold seal="(인)" />
        </div>
      </section>
      {foot(1)}
    </article>
  );

  // ───── 뒷면: 행사 계약 규정 ─────
  const back = (
    <article className="a4-page cdoc cdoc--terms">
      {letterhead}
      {titleBlock('TERMS & CONDITIONS', '행사 계약 규정')}
      <p className="cdoc-lead">저희 {VENUE.name}에서는 고객님의 소중한 행사를 위하여 최상의 서비스를 제공하겠습니다.</p>
      <ol className="cdoc-clauses">
        <Clause n={1}>
          본 계약의 체결 시 행사 주최자는 본 계약의 앞면에 명시된 연회 행사 계약금{' '}
          <V k="rulesDeposit">
            <b>{ruleDeposit !== null ? `${ruleDeposit.toLocaleString('ko-KR')}원` : '—'}</b>
          </V>
          을 지급하기로 합니다. 다만, 계약금은 본 계약에 따른 행사 종료 후 확정된 연회 행사 비용에서 공제됩니다. <b>{L.clause1Refund}</b>
          <span className="cdoc-clauses__sub">※ 정부에서 공식 인정되는 질병은 정부 지침에 따라 인정됩니다. (예: 코로나) 이 외 질병은 예약금 반환 및 위약금 상황에 적용되지 않습니다.</span>
        </Clause>
        <Clause n={2}>{CLAUSES[2]}</Clause>
        <Clause n={3}>{CLAUSES[3]}</Clause>
        <Clause n={4}>
          행사를 취소하실 경우에는 예정된 행사일로부터 최소 30일 이전에 통보해 주셔야 하며, 30일 이전에 통보를 하지 않고 취소하실 경우에 다음의 청구할 권리를 갖습니다.
          <table className="cf cf--penalty">
            <tbody>
              <tr className="cf-head">
                <th>취소 시점</th>
                <th className="num">배상</th>
                <th>취소 시점</th>
                <th className="num">배상</th>
              </tr>
              {[0, 1, 2].map((r) => (
                <tr key={r}>
                  {[CLAUSE4_TABLE[r], CLAUSE4_TABLE[r + 3]].map(([when, rate]) => (
                    <Fragment key={when}>
                      <td>{when}</td>
                      <td className="num">
                        <b>{rate}</b>
                      </td>
                    </Fragment>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <span className="cdoc-clauses__sub">※ 배상 비율은 계약상 예상 총액 기준이며, 예상 총액은 계약금을 제외한 예상 행사비 총액입니다.</span>
        </Clause>
        {[5, 6, 7, 8, 9, 10, 11].map((n) => (
          <Clause key={n} n={n}>
            {CLAUSES[n]}
          </Clause>
        ))}
        {L.clause12 && <Clause n={12}>백일 전 이벤트 수령 후 취소 시 예약금은 반환되지 않습니다. (백일상, 홈파티 등)</Clause>}
      </ol>

      <div className="cdoc-spacer" />
      <section className="cf-sign">
        <p className="cf-sign__closing">{VENUE.name}를 이용해 주셔서 진심으로 감사드리며, 서명하시기 전에 계약 규정을 읽어 주시기 바랍니다.</p>
        <div className="cf-sign__row">
          <Party role="SIGNED BY · 고객님" name={<V k="rulesCustomer">{customer || ''}</V>} sub={meta.confirmedAt ? `온라인 확인 ${kst(meta.confirmedAt)}` : undefined} subGold seal="(서명)" />
          <Party role="SIGNED BY · 담당자" name={<V k="rulesManager">{manager}</V>} sub={VENUE.name} seal="(서명)" />
        </div>
      </section>
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

/** 구분 열 · 라벨 · 값 · 라벨 · 값 */
function FormCols() {
  return (
    <colgroup>
      <col className="cf-col-sec" />
      <col className="cf-col-label" />
      <col />
      <col className="cf-col-label" />
      <col />
    </colgroup>
  );
}

function rowsOf(cells: Cell[]): Cell[][] {
  const rows: Cell[][] = [];
  let cur: Cell[] = [];
  for (const c of cells) {
    if (c.wide) {
      if (cur.length) rows.push(cur);
      rows.push([c]);
      cur = [];
      continue;
    }
    cur.push(c);
    if (cur.length === 2) {
      rows.push(cur);
      cur = [];
    }
  }
  if (cur.length) rows.push(cur.map((c) => ({ ...c, wide: cur.length === 1 })));
  return rows;
}

function Group({ label, rows, note }: { label: string; rows: Cell[][]; note?: string }) {
  const span = rows.length + (note ? 1 : 0);
  return (
    <>
      {rows.map((row, i) => (
        <tr key={i}>
          {i === 0 && (
            <th className="cf-sec" rowSpan={span} scope="rowgroup">
              {label}
            </th>
          )}
          {row.map((c, j) => (
            <Fragment key={j}>
              <th className="cf-label" scope="row">
                {c.label}
              </th>
              <td colSpan={row.length === 1 ? 3 : 1}>{c.value}</td>
            </Fragment>
          ))}
        </tr>
      ))}
      {note && (
        <tr>
          <td className="cf-note" colSpan={4}>
            ※ {note}
          </td>
        </tr>
      )}
    </>
  );
}

function Party({ role, name, sub, subGold, seal }: { role: string; name: ReactNode; sub?: string; subGold?: boolean; seal: string }) {
  return (
    <div className="cf-party">
      <span className="cf-party__role">{role}</span>
      <div className="cf-party__line">
        <b>{name}</b>
        <i>{seal}</i>
      </div>
      {sub && <span className={`cf-party__sub${subGold ? ' is-gold' : ''}`}>{sub}</span>}
    </div>
  );
}

function Clause({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li>
      <span className="cdoc-clauses__no">{n}.</span>
      <div>{children}</div>
    </li>
  );
}

type VComp = (p: { k: string; children?: ReactNode; empty?: string }) => ReactNode;

/** 품목 표 — 웨딩은 공급가·부가세·합계, 생신은 품목·추가 옵션을 나란히, 그 밖에는 품목·내용·금액 */
function ItemsTable({ layout: L, v, V, has }: { layout: DocLayout; v: Record<string, string>; V: VComp; has: (k?: string) => boolean }) {
  const amountCell = (r: DocItem) => {
    if (r.amountText !== undefined) return r.amountText || '—';
    if (!r.amount) return '—';
    if (r.actual && (v[r.actual] ?? '').trim()) {
      return (
        <>
          <span className="cf-muted cf-small">
            정가 <V k={r.amount}>{amountText(v[r.amount])}</V>
          </span>
          <br />
          <V k={r.actual}>{amountText(v[r.actual])}</V>
        </>
      );
    }
    return <V k={r.amount}>{amountText(v[r.amount]) || '—'}</V>;
  };
  const noteOf = (r: DocItem): ReactNode => {
    const parts: ReactNode[] = [];
    if (r.desc) parts.push(<span key="d">{r.desc}</span>);
    if (r.note && has(r.note))
      parts.push(
        <b key="n" className="cf-gold">
          <V k={r.note}>{(v[r.note] ?? '').replace(/\s+/g, ' ').trim()}</V>
        </b>,
      );
    else if (r.noteText)
      parts.push(
        <b key="n" className="cf-gold">
          {r.noteText}
        </b>,
      );
    return parts.length ? parts.reduce<ReactNode[]>((acc, p, i) => (i ? [...acc, ' · ', p] : [p]), []) : null;
  };
  const vendors = (span: number) =>
    L.vendors && (
      <tr>
        <th className="cf-sec" scope="row">
          협력 업체
        </th>
        <td colSpan={span}>
          {L.vendors.rows.map((r, i) => (
            <Fragment key={r.label}>
              {i > 0 && <span className="cf-dot"> · </span>}
              {r.label}
              {r.key && has(r.key) && (
                <>
                  {' '}
                  <b className="cf-strong">
                    <V k={r.key} />
                  </b>
                </>
              )}
            </Fragment>
          ))}
          <span className="cf-line cf-muted cf-small">※ {L.vendors.note} 협력 업체는 선택 사항입니다.</span>
        </td>
      </tr>
    );
  const foot = [...L.tables.flatMap((t) => t.foot ?? []), ...(L.tableFoot ? [L.tableFoot] : [])];

  // 생신: 품목 · 추가 옵션을 한 표에 나란히
  if (L.tablesSideBySide && L.tables.length === 2) {
    const [a, b] = L.tables;
    const n = Math.max(a.rows.length, b.rows.length);
    return (
      <table className="cf cf--items cf--side">
        <colgroup>
          <col className="cf-col-sec" />
          <col className="cf-col-item" />
          <col className="cf-col-money" />
          <col />
          <col className="cf-col-item" />
          <col className="cf-col-money" />
          <col />
        </colgroup>
        <tbody>
          <tr className="cf-head">
            <th className="cf-sec" rowSpan={n + 1 + (foot.length ? 1 : 0)} scope="rowgroup">
              품목
            </th>
            <th>{a.title}</th>
            <th className="num">금액</th>
            <th>비고</th>
            <th>{b.title}</th>
            <th className="num">금액</th>
            <th>비고</th>
          </tr>
          {Array.from({ length: n }, (_, i) => (
            <tr key={i}>
              {[a.rows[i], b.rows[i]].map((r, j) =>
                r ? (
                  <Fragment key={j}>
                    <td className="cf-item">{r.label}</td>
                    <td className="num">{amountCell(r)}</td>
                    <td className="cf-small">{noteOf(r)}</td>
                  </Fragment>
                ) : (
                  <td key={j} colSpan={3} />
                ),
              )}
            </tr>
          ))}
          {foot.length > 0 && (
            <tr>
              <td className="cf-note" colSpan={6}>
                ※ {foot.join(' ')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    );
  }

  return (
    <>
      {L.tables.map((t, ti) => (
        <table key={t.title} className="cf cf--items">
          <ItemCols table={t} />
          <tbody>
            <tr className="cf-head">
              <th className="cf-sec" rowSpan={t.rows.length + 1 + (foot.length && ti === L.tables.length - 1 ? 1 : 0)} scope="rowgroup">
                {t.title}
              </th>
              <th>품목</th>
              <th>내용 · 비고</th>
              {t.vat ? (
                <>
                  <th className="num">공급가</th>
                  <th className="num">부가세</th>
                  <th className="num">합계</th>
                </>
              ) : (
                <th className="num">금액</th>
              )}
            </tr>
            {t.rows.map((r) => {
              const n = r.amount ? amountNum(v[r.amount]) : null;
              const vat = n !== null ? Math.round(n * 0.1) : null;
              return (
                <tr key={r.label}>
                  <td className="cf-item">{r.label}</td>
                  <td className="cf-small cf-muted">{noteOf(r) ?? ''}</td>
                  <td className="num">{amountCell(r)}</td>
                  {t.vat && (
                    <>
                      <td className="num cf-muted">{vat !== null ? vat.toLocaleString('ko-KR') : '—'}</td>
                      <td className="num">{n !== null && vat !== null ? <b className="cf-strong">{(n + vat).toLocaleString('ko-KR')}원</b> : '—'}</td>
                    </>
                  )}
                </tr>
              );
            })}
            {foot.length > 0 && ti === L.tables.length - 1 && (
              <tr>
                <td className="cf-note" colSpan={t.vat ? 5 : 3}>
                  ※ {foot.join(' ')}
                </td>
              </tr>
            )}
            {ti === L.tables.length - 1 && vendors(t.vat ? 5 : 3)}
          </tbody>
        </table>
      ))}
    </>
  );
}

function ItemCols({ table: t }: { table: DocTable }) {
  return (
    <colgroup>
      <col className="cf-col-sec" />
      <col className="cf-col-item" />
      <col />
      {t.vat ? (
        <>
          <col className="cf-col-money" />
          <col className="cf-col-vat" />
          <col className="cf-col-money" />
        </>
      ) : (
        <col className="cf-col-money" />
      )}
    </colgroup>
  );
}

/** 뷔페 · 식음료 — 대인 · 소인 단가, 주류 · 음료, 비고 */
function BuffetTable({ layout: L, v, V }: { layout: DocLayout; v: Record<string, string>; V: VComp }) {
  const price = (key: string) => {
    const p = buffetPrice(v[key]);
    return (
      <V k={key}>
        <b className="cf-strong">{p.price || '—'}</b>
        {p.extra && <span className="cf-after cf-muted">{p.extra}</span>}
      </V>
    );
  };
  const cells: Cell[] = [
    { label: '대인 (1인)', value: price('buffetAdult') },
    {
      label: '소인 (1인)',
      value: (
        <>
          {price('buffetChild')}
          <span className="cf-after cf-muted">{L.buffet.childAge}</span>
        </>
      ),
    },
    ...(L.buffet.guestsKey ? [{ label: '뷔페 인원', value: <V k={L.buffet.guestsKey} />, wide: true }] : []),
    {
      label: '주류 · 음료',
      wide: true,
      value: L.drinks.map((d, i) => (
        <Fragment key={d.label}>
          {i > 0 && <span className="cf-dot">{'  ·  '}</span>}
          {d.label} <b className="cf-strong">{d.price}</b>
        </Fragment>
      )),
    },
  ];
  const note = [...L.buffet.notes, ...(L.drinksNote ? [L.drinksNote] : [])].join(' · ');
  return (
    <table className="cf">
      <FormCols />
      <tbody>
        <Group label="뷔페 · 식음료" rows={rowsOf(cells)} note={note} />
      </tbody>
    </table>
  );
}

/** 행사 규정 — 취소 시점별 위약금을 한 줄 일정표로 */
function RulesTable({ rules, note }: { rules: [string, string][]; note?: string }) {
  return (
    <table className="cf cf--rules">
      <colgroup>
        <col className="cf-col-sec" />
        {rules.map((r) => (
          <col key={r[0]} />
        ))}
      </colgroup>
      <tbody>
        <tr className="cf-head">
          <th className="cf-sec" rowSpan={note ? 3 : 2} scope="rowgroup">
            행사 규정
          </th>
          {rules.map(([when]) => (
            <th key={when}>{when}</th>
          ))}
        </tr>
        <tr>
          {rules.map(([when, what]) => (
            <td key={when}>
              <b className="cf-strong">{what}</b>
            </td>
          ))}
        </tr>
        {note && (
          <tr>
            <td className="cf-note" colSpan={rules.length}>
              ※ {note}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
