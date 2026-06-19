import { useState } from 'react';
import { Button } from '@/components/Button';
import { TextArea } from '@/components/Field';
import { Sheet } from '@/components/Sheet';
import { api } from '@/api/mockApi';
import { useToast } from '@/store/ui';
import type { ReportReason } from '@/types/domain';
import styles from './ReportSheet.module.css';

const REASONS: { value: ReportReason; label: string; desc: string }[] = [
  { value: 'LOW_EFFORT', label: '무성의 응답', desc: '성의 없이 빠르게 채운 응답' },
  { value: 'FAKE', label: '허위 응답', desc: '실제로 응답하지 않고 완료 처리' },
  { value: 'SPAM', label: '스팸/부적절', desc: '광고, 유도, 부적절한 설문' },
];

// service.md A3 / §6 신고. design_system.md §5 보이스(사과 없이, 명확하게).
export function ReportSheet({
  open,
  onClose,
  targetResponseId,
}: {
  open: boolean;
  onClose: () => void;
  targetResponseId: number | null;
}) {
  const push = useToast((s) => s.push);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const submit = async () => {
    if (!reason) return;
    setBusy(true);
    try {
      await api.report({ targetResponseId, reason, note });
      push('신고를 접수했어요. 검토 후 처리됩니다.', 'default');
      onClose();
      setReason(null);
      setNote('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet label="신고하기" onClose={onClose}>
      <h2 className="h2">무엇이 문제인가요?</h2>
      <div className={styles.reasons}>
        {REASONS.map((r) => (
          <button
            key={r.value}
            className={`${styles.reason} ${reason === r.value ? styles.on : ''}`}
            onClick={() => setReason(r.value)}
          >
            <span className={styles.reasonLabel}>{r.label}</span>
            <span className="caption muted">{r.desc}</span>
          </button>
        ))}
      </div>
      <TextArea
        id="note"
        label="상세 내용 (선택)"
        placeholder="어떤 점이 문제였는지 적어주면 검토에 도움이 돼요."
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className={styles.footer}>
        <Button variant="secondary" full onClick={onClose}>
          취소
        </Button>
        <Button variant="danger" full disabled={!reason} loading={busy} onClick={submit}>
          신고하기
        </Button>
      </div>
    </Sheet>
  );
}
