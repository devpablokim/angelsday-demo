import type { ContractCancellation, ContractTemplateId } from '@shared/types';
import { A4Preview } from './contract/A4Preview';
import { ContractDocument, type ContractDocMeta } from './contract/ContractDocument';

/**
 * 계약서 미리보기 — 출력(A4 PDF)과 똑같은 모양을 화면 폭에 맞춰 보여 줍니다.
 * highlight 에 넣은 필드 키는 노란색으로 표시합니다 (이전 판과 바뀐 부분).
 */
export function ContractPreview({
  templateId,
  values,
  highlight,
  meta,
  cancelled,
}: {
  templateId: ContractTemplateId;
  values: Record<string, string>;
  highlight?: string[];
  meta?: ContractDocMeta;
  cancelled?: ContractCancellation;
}) {
  return (
    <A4Preview label="계약서 미리보기">
      <ContractDocument templateId={templateId} values={values} highlight={highlight} meta={meta} cancelled={cancelled} frame />
    </A4Preview>
  );
}
