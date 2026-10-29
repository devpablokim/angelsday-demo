import { formatDateTime } from '@shared/dates';
import { displayValue, eventConfig, isFieldVisible, missingRequired } from '@shared/eventTypes';
import * as ops from '@shared/ops';
import type { Booking, HallId, Requirements } from '@shared/types';
import { hallName } from '@shared/venue';
import { useEffect, useState } from 'react';
import { FieldInput } from '../../../components/FieldInput';
import { Icon } from '../../../components/Icon';
import { useToast } from '../../../components/ui';
import { useCatalog } from '../../../data/hooks';
import { useSaveBooking } from '../adminUtils';

export function RequirementsTab({ booking: b }: { booking: Booking }) {
  const cfg = eventConfig(b.eventType);
  const catalog = useCatalog();
  const save = useSaveBooking();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Requirements>(b.requirements);
  useEffect(() => {
    if (!editing) setValues(b.requirements);
  }, [b.requirements, editing]);

  const guests = Number(values.guestsAdult ?? 0) + Number(values.guestsKids ?? 0);

  async function onSave() {
    const missing = missingRequired(b.eventType, values);
    if (missing.length) {
      toast(`필수 항목을 확인해 주세요: ${missing.map((f) => f.label).join(', ')}`, 'error');
      return;
    }
    if (await save(ops.submitRequirements(b, values, 'admin'), '필요사항을 저장했어요.')) setEditing(false);
  }

  return (
    <div className="stack gap-16">
      <div className={`callout ${b.requirementsSubmittedAt ? 'callout--neutral' : ''}`}>
        <span className="callout__icon">{b.requirementsSubmittedAt ? '✓' : '!'}</span>
        <div className="grow">
          <div className="title-sm">{b.requirementsSubmittedAt ? `고객 제출 완료 · ${formatDateTime(b.requirementsSubmittedAt)}` : '고객이 아직 필요사항을 제출하지 않았어요'}</div>
          <p className="caption">{b.requirementsSubmittedAt ? '수정하면 STEP 2(견적)로 진행된 상태가 유지되고, 타임라인에 기록돼요.' : '아래는 고객이 작성 중인 임시 저장 내용이에요. 전화로 받은 내용을 대신 입력하고 제출할 수 있어요.'}</p>
        </div>
        {!editing ? (
          <button className="btn btn--secondary btn--sm" onClick={() => setEditing(true)}>
            <Icon name="edit" size={16} /> 관리자 수정
          </button>
        ) : (
          <div className="row gap-8">
            <button className="btn btn--ghost btn--sm" onClick={() => setEditing(false)}>
              취소
            </button>
            <button className="btn btn--primary btn--sm" onClick={() => void onSave()}>
              {b.requirementsSubmittedAt ? '저장' : '저장 후 제출 처리'}
            </button>
          </div>
        )}
      </div>

      {cfg.sections.map((sec) => {
        const fields = sec.fields.filter((f) => isFieldVisible(f, values));
        return (
          <section key={sec.id} className="card">
            <div className="title-md">{sec.title}</div>
            {editing ? (
              <div className="stack gap-24 mt-16">
                {fields.map((f) => (
                  <FieldInput
                    key={f.key}
                    field={f}
                    value={values[f.key]}
                    catalog={catalog}
                    guests={guests}
                    onChange={(v) => setValues((x) => ({ ...x, [f.key]: v }))}
                  />
                ))}
              </div>
            ) : (
              <dl className="kv mt-16">
                {fields.map((f) => (
                  <div key={f.key} className="kv__row">
                    <dt>{f.label}</dt>
                    <dd>{f.kind === 'hall' ? hallName(values[f.key] as HallId | undefined) : displayValue(f, values[f.key])}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        );
      })}
    </div>
  );
}
