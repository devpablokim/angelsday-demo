import { DEFAULT_CATALOG } from '@shared/catalog';
import { formatDateTime } from '@shared/dates';
import { uid } from '@shared/ids';
import type { Catalog, CatalogItem, HallId } from '@shared/types';
import { HALLS } from '@shared/venue';
import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../../components/Icon';
import { Sheet, useToast } from '../../components/ui';
import { useCatalog, useStore } from '../../data/hooks';
import { digitsOnly, errorMessage } from './adminUtils';

export function PricingPage() {
  const saved = useCatalog();
  const store = useStore();
  const toast = useToast();
  const [cat, setCat] = useState<Catalog>(saved);
  const [dirty, setDirty] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  useEffect(() => {
    if (!dirty) setCat(saved);
  }, [saved, dirty]);

  const groups = useMemo(() => {
    const order: string[] = [];
    for (const i of cat.items) if (!order.includes(i.category)) order.push(i.category);
    return order.map((c) => ({ category: c, items: cat.items.filter((i) => i.category === c) }));
  }, [cat.items]);

  function patch(p: Partial<Catalog>) {
    setCat({ ...cat, ...p });
    setDirty(true);
  }
  function patchItem(key: string, p: Partial<CatalogItem>) {
    patch({ items: cat.items.map((i) => (i.key === key ? { ...i, ...p } : i)) });
  }
  function addItem(category: string) {
    patch({ items: [...cat.items, { key: uid('item'), category, label: '새 항목', price: 0, unit: '식' }] });
  }

  async function onSave() {
    try {
      await store.saveCatalog(cat);
      setDirty(false);
      toast('가격표를 저장했어요. 새 견적부터 적용돼요.');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <div>
          <div className="overline">PRICING</div>
          <h1 className="display-md">가격표</h1>
          <p className="caption">필요사항 → 견적 자동 작성에 쓰이는 단가입니다. 최근 저장 {formatDateTime(saved.updatedAt)}</p>
        </div>
        <div className="row gap-8">
          <button className="btn btn--ghost btn--sm" onClick={() => setResetOpen(true)}>
            기본값 불러오기
          </button>
          <button className="btn btn--primary btn--sm" disabled={!dirty} onClick={() => void onSave()}>
            저장
          </button>
        </div>
      </div>

      <div className="callout mb-16">
        <span className="callout__icon">!</span>
        <div>
          <div className="title-sm">데모 가격은 예시입니다. 실제 가격으로 수정하세요.</div>
          <p className="caption">모든 금액은 VAT 포함 원 단위예요. “인원 기준”을 설정하면 견적 자동 작성 시 인원수로 수량이 계산돼요 (1 = 1인당 1개, 10 = 10인당 1세트).</p>
        </div>
      </div>

      <div className="pricing-grid">
        <section className="card">
          <div className="title-md">홀 대관료</div>
          <ul className="list mt-8">
            {HALLS.map((h) => (
              <li key={h.id} className="list-item price-row">
                <span className="grow">
                  <b className="text-ink">{h.name}</b>
                  <span className="caption"> 보증 {h.guaranteed} · 좌석 {h.seats}</span>
                </span>
                <input
                  className="input input--sm num price-input"
                  inputMode="numeric"
                  value={(cat.hallRental[h.id as HallId] ?? 0).toLocaleString('ko-KR')}
                  onChange={(e) => patch({ hallRental: { ...cat.hallRental, [h.id]: digitsOnly(e.target.value) } })}
                  aria-label={`${h.name} 대관료`}
                />
                <span className="caption">원</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <div className="title-md">할인 · 예약금 정책</div>
          <ul className="list mt-8">
            {cat.discountPresets.map((d) => (
              <li key={d.id} className="list-item price-row">
                <input className="input input--sm grow" value={d.label} onChange={(e) => patch({ discountPresets: cat.discountPresets.map((x) => (x.id === d.id ? { ...x, label: e.target.value } : x)) })} aria-label="할인 이름" />
                <input className="input input--sm num rate-input" inputMode="numeric" value={d.rate} onChange={(e) => patch({ discountPresets: cat.discountPresets.map((x) => (x.id === d.id ? { ...x, rate: Math.min(100, digitsOnly(e.target.value)) } : x)) })} aria-label="할인율" />
                <span className="caption">%</span>
                <button className="btn btn--ghost btn--icon" onClick={() => patch({ discountPresets: cat.discountPresets.filter((x) => x.id !== d.id) })} aria-label={`${d.label} 삭제`}>
                  <Icon name="trash" size={16} />
                </button>
              </li>
            ))}
          </ul>
          <button className="btn btn--ghost btn--sm mt-8" onClick={() => patch({ discountPresets: [...cat.discountPresets, { id: uid('dc'), label: '새 할인', rate: 5 }] })}>
            <Icon name="plus" size={16} /> 할인 추가
          </button>
          <div className="form-grid form-grid--2 mt-16">
            <label className="field">
              <span className="field__label">기본 예약금 비율 (%)</span>
              <input className="input" inputMode="numeric" value={cat.defaultDepositRate} onChange={(e) => patch({ defaultDepositRate: Math.min(100, digitsOnly(e.target.value)) })} />
            </label>
            <label className="field">
              <span className="field__label">견적 유효기간 (일)</span>
              <input className="input" inputMode="numeric" value={cat.quoteValidDays} onChange={(e) => patch({ quoteValidDays: Math.max(1, digitsOnly(e.target.value)) })} />
            </label>
          </div>
        </section>
      </div>

      {groups.map((g) => (
        <section key={g.category} className="card mt-16">
          <div className="card__head">
            <div className="title-md">{g.category}</div>
            <button className="btn btn--ghost btn--sm" onClick={() => addItem(g.category)}>
              <Icon name="plus" size={16} /> 항목 추가
            </button>
          </div>
          <div className="catalog-rows">
            <div className="catalog-row catalog-row--head" aria-hidden="true">
              <span>항목명</span>
              <span className="num">단가</span>
              <span>단위</span>
              <span>인원 기준</span>
              <span>기준 인원</span>
              <span />
            </div>
            {g.items.map((i) => (
              <div key={i.key} className="catalog-row">
                <input className="input input--sm" value={i.label} onChange={(e) => patchItem(i.key, { label: e.target.value })} aria-label="항목명" />
                <input className="input input--sm num" inputMode="numeric" value={i.price.toLocaleString('ko-KR')} onChange={(e) => patchItem(i.key, { price: digitsOnly(e.target.value) })} aria-label={`${i.label} 단가`} />
                <input className="input input--sm" value={i.unit} onChange={(e) => patchItem(i.key, { unit: e.target.value })} aria-label="단위" />
                <input className="input input--sm" inputMode="numeric" value={i.peoplePerUnit ?? ''} placeholder="고정" onChange={(e) => patchItem(i.key, { peoplePerUnit: digitsOnly(e.target.value) || undefined })} aria-label="인원 기준 (명당)" />
                <select className="select select--sm" value={i.basis ?? 'all'} onChange={(e) => patchItem(i.key, { basis: e.target.value as 'adults' | 'all' })} aria-label="기준 인원" disabled={!i.peoplePerUnit}>
                  <option value="all">전체 인원</option>
                  <option value="adults">성인만</option>
                </select>
                <button className="btn btn--ghost btn--icon" onClick={() => patch({ items: cat.items.filter((x) => x.key !== i.key) })} aria-label={`${i.label} 삭제`}>
                  <Icon name="trash" size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="card mt-16">
        <div className="title-md">새 카테고리</div>
        <div className="row gap-8 mt-8">
          <input className="input input--sm grow" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="예) 웰컴 드링크" aria-label="카테고리 이름" />
          <button
            className="btn btn--secondary btn--sm"
            disabled={!newCategory.trim()}
            onClick={() => {
              addItem(newCategory.trim());
              setNewCategory('');
            }}
          >
            추가
          </button>
        </div>
        <p className="caption mt-8">새 항목은 견적 작성 화면의 “가격표에서 항목 추가”에서 고를 수 있어요. 필요사항 선택지와 자동으로 연결되는 항목은 기본 항목 키를 유지해 주세요.</p>
      </section>

      {dirty && (
        <div className="save-bar">
          <span className="body-sm">저장하지 않은 변경사항이 있어요.</span>
          <button className="btn btn--gold btn--sm" onClick={() => void onSave()}>
            저장
          </button>
        </div>
      )}

      <Sheet
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="기본 가격표를 불러올까요?"
        footer={
          <button
            className="btn btn--primary btn--block"
            onClick={() => {
              setCat({ ...DEFAULT_CATALOG, updatedAt: saved.updatedAt });
              setDirty(true);
              setResetOpen(false);
            }}
          >
            불러오기 (저장 전까지 적용되지 않아요)
          </button>
        }
      >
        <p className="body-sm">현재 화면의 수정 내용이 기본 예시 가격으로 바뀌어요.</p>
      </Sheet>
    </div>
  );
}
