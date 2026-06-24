import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconBack,
  IconClose,
  IconCopy,
  IconChevronRight,
} from '@/components/icons';
import { Button } from '@/components/Button';
import { Sheet } from '@/components/Sheet';
import { QuestionView } from '@/components/QuestionView';
import {
  coerceForType,
  estimateMinutes,
  newDraft,
  needsOptions,
  toQuestionInput,
  validateQuestions,
  type DraftQuestion,
} from '@/lib/questions';
import { QUESTION_TYPE_LABEL, type QuestionType, CATEGORIES } from '@/types/domain';
import { api } from '@/api/api';
import { ApiError } from '@/api/errors';
import { useInvalidateAll } from '@/api/queries';
import { useToast } from '@/store/ui';
import { confirmDialog } from '@/store/confirm';
import styles from './SurveyBuilder.module.css';

const serialize = (title: string, description: string, qs: DraftQuestion[]) =>
  JSON.stringify({
    title,
    description,
    q: qs.map(({ uid: _uid, ...rest }) => rest),
  });

const TYPE_ORDER: QuestionType[] = [
  'short',
  'paragraph',
  'single',
  'multi',
  'dropdown',
  'scale',
  'date',
];

// 자체 설문 빌더 — 구글폼 레퍼런스 UX.
export function SurveyBuilder() {
  const navigate = useNavigate();
  const invalidate = useInvalidateAll();
  const push = useToast((s) => s.push);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<DraftQuestion[]>([newDraft('single')]);
  const [activeUid, setActiveUid] = useState<string>(questions[0]?.uid ?? '');
  const [preview, setPreview] = useState(false);
  const [errorUids, setErrorUids] = useState<Set<string>>(new Set());
  const [dragUid, setDragUid] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);

  // 작성 중 이탈 방지 — 초기 스냅샷과 비교해 변경 여부 판단
  const initialSnap = useRef(serialize('', '', [questions[0]]));
  const publishedRef = useRef(false);
  const dirty =
    !publishedRef.current && serialize(title, description, questions) !== initialSnap.current;

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const tryExit = async () => {
    if (
      dirty &&
      !(await confirmDialog({
        title: '작성 중인 설문을 나갈까요?',
        body: '저장하지 않은 내용은 사라져요.',
        confirmLabel: '나가기',
        cancelLabel: '계속 작성',
        tone: 'danger',
      }))
    )
      return;
    navigate(-1);
  };

  const requestRemove = async (uid: string) => {
    const q = questions.find((x) => x.uid === uid);
    if (
      q?.title.trim() &&
      !(await confirmDialog({
        title: '이 질문을 삭제할까요?',
        body: '입력한 내용이 사라져요.',
        confirmLabel: '삭제',
        tone: 'danger',
      }))
    )
      return;
    remove(uid);
  };

  const patch = (uid: string, p: Partial<DraftQuestion>) =>
    setQuestions((qs) => qs.map((q) => (q.uid === uid ? { ...q, ...p } : q)));

  const addQuestion = () => {
    const q = newDraft('single');
    setQuestions((qs) => {
      const idx = qs.findIndex((x) => x.uid === activeUid);
      const next = [...qs];
      next.splice(idx >= 0 ? idx + 1 : qs.length, 0, q);
      return next;
    });
    setActiveUid(q.uid);
  };

  const duplicate = (uid: string) =>
    setQuestions((qs) => {
      const idx = qs.findIndex((q) => q.uid === uid);
      if (idx < 0) return qs;
      const copy = { ...qs[idx], uid: newDraft().uid, options: [...qs[idx].options] };
      const next = [...qs];
      next.splice(idx + 1, 0, copy);
      return next;
    });

  const remove = (uid: string) =>
    setQuestions((qs) => (qs.length <= 1 ? qs : qs.filter((q) => q.uid !== uid)));

  const move = (uid: string, dir: -1 | 1) =>
    setQuestions((qs) => {
      const idx = qs.findIndex((q) => q.uid === uid);
      const to = idx + dir;
      if (idx < 0 || to < 0 || to >= qs.length) return qs;
      const next = [...qs];
      [next[idx], next[to]] = [next[to], next[idx]];
      return next;
    });

  const reorderTo = (targetUid: string) =>
    setQuestions((qs) => {
      if (!dragUid || dragUid === targetUid) return qs;
      const from = qs.findIndex((q) => q.uid === dragUid);
      const to = qs.findIndex((q) => q.uid === targetUid);
      if (from < 0 || to < 0) return qs;
      const next = [...qs];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });

  const openPublish = () => {
    const errs = validateQuestions(questions);
    if (!title.trim()) {
      push('설문 제목을 입력해 주세요.', 'warning');
      return;
    }
    if (errs.length) {
      setErrorUids(new Set(errs.map((e) => e.uid)));
      push(errs[0].message, 'warning');
      setPreview(false);
      return;
    }
    setErrorUids(new Set());
    setPublishOpen(true);
  };

  return (
    <div className={styles.page}>
      <div className={styles.accent} />
      <header className={styles.header}>
        <button className={styles.icon} onClick={tryExit} aria-label="뒤로">
          <IconBack />
        </button>
        <span className={styles.headerTitle}>설문 만들기</span>
        <button
          className={styles.previewBtn}
          onClick={() => setPreview((p) => !p)}
          aria-pressed={preview}
        >
          {preview ? '편집' : '미리보기'}
        </button>
      </header>

      <div className={styles.body}>
        {/* 폼 헤더 */}
        <div className={`${styles.formHead} ${styles.cardBase}`}>
          {preview ? (
            <>
              <h1 className={styles.previewTitle}>{title || '제목 없는 설문'}</h1>
              {description && <p className={styles.previewDesc}>{description}</p>}
            </>
          ) : (
            <>
              <input
                className={styles.titleInput}
                placeholder="설문 제목"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <input
                className={styles.descInput}
                placeholder="설문 설명 (선택)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </>
          )}
        </div>

        {/* 문항 */}
        {preview ? (
          <div className={styles.previewList}>
            {questions.map((q, i) => (
              <QuestionView
                key={q.uid}
                question={q}
                index={i}
                value={q.type === 'multi' ? [] : ''}
                onChange={() => {}}
                disabled
              />
            ))}
          </div>
        ) : (
          <ul className={styles.list}>
            {questions.map((q) => (
              <li
                key={q.uid}
                onDragOver={(e) => {
                  if (dragUid) e.preventDefault();
                }}
                onDrop={() => {
                  reorderTo(q.uid);
                  setDragUid(null);
                }}
              >
                <QuestionEditor
                  q={q}
                  active={activeUid === q.uid}
                  invalid={errorUids.has(q.uid)}
                  onActivate={() => setActiveUid(q.uid)}
                  onPatch={(p) => patch(q.uid, p)}
                  onDuplicate={() => duplicate(q.uid)}
                  onRemove={() => requestRemove(q.uid)}
                  onMoveUp={() => move(q.uid, -1)}
                  onMoveDown={() => move(q.uid, 1)}
                  onDragStart={() => setDragUid(q.uid)}
                  onDragEnd={() => setDragUid(null)}
                  removable={questions.length > 1}
                />
              </li>
            ))}
          </ul>
        )}

        {!preview && (
          <button className={styles.addBtn} onClick={addQuestion}>
            + 질문 추가
          </button>
        )}
      </div>

      <div className={styles.footer}>
        <Button size="lg" full onClick={openPublish}>
          발행하기
        </Button>
      </div>

      {publishOpen && (
        <PublishSheet
          questionCount={questions.length}
          onClose={() => setPublishOpen(false)}
          onPublish={async (meta) => {
            try {
              const survey = await api.createSurvey({
                title: title.trim(),
                description: description.trim() || undefined,
                externalUrl: null,
                selfBuilt: true,
                proofRequired: false,
                category: meta.category,
                estMinutes: meta.estMinutes,
                targetCount: meta.targetCount,
                questions: questions.map(toQuestionInput),
              });
              publishedRef.current = true; // 이탈 경고 해제
              invalidate();
              push('설문을 발행했어요. 피드에 노출됩니다.', 'positive');
              navigate(`/surveys/${survey.id}`, { replace: true });
            } catch (e) {
              if (e instanceof ApiError) push(e.message, 'warning');
            }
          }}
        />
      )}
    </div>
  );
}

// ─────────────────── 문항 에디터 카드 ───────────────────
function QuestionEditor({
  q,
  active,
  invalid,
  removable,
  onActivate,
  onPatch,
  onDuplicate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragEnd,
}: {
  q: DraftQuestion;
  active: boolean;
  invalid: boolean;
  removable: boolean;
  onActivate: () => void;
  onPatch: (p: Partial<DraftQuestion>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const setOption = (i: number, val: string) => {
    const options = [...q.options];
    options[i] = val;
    onPatch({ options });
  };
  const addOption = () => onPatch({ options: [...q.options, `옵션 ${q.options.length + 1}`] });
  const removeOption = (i: number) =>
    onPatch({ options: q.options.filter((_, idx) => idx !== i) });

  return (
    <div
      className={`${styles.cardBase} ${styles.qCard} ${active ? styles.qActive : ''} ${
        invalid ? styles.qInvalid : ''
      }`}
      onClick={onActivate}
    >
      <div
        className={styles.handle}
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        aria-hidden
      >
        ⠿
      </div>

      <div className={styles.qTop}>
        <input
          className={styles.qTitle}
          placeholder="질문"
          value={q.title}
          onChange={(e) => onPatch({ title: e.target.value })}
        />
        <select
          className={styles.typeSelect}
          value={q.type}
          onChange={(e) => onPatch(coerceForType(q, e.target.value as QuestionType))}
          aria-label="질문 유형"
        >
          {TYPE_ORDER.map((t) => (
            <option key={t} value={t}>
              {QUESTION_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </div>

      {/* 유형별 바디 */}
      <div className={styles.qBody}>
        {q.type === 'short' && <p className={styles.ghost}>단답형 텍스트</p>}
        {q.type === 'paragraph' && <p className={styles.ghost}>장문형 텍스트</p>}
        {q.type === 'date' && <p className={styles.ghost}>날짜 (월/일/년)</p>}

        {needsOptions(q.type) &&
          q.options.map((opt, i) => (
            <div key={i} className={styles.optRow}>
              <span className={styles.optMark} data-type={q.type} aria-hidden>
                {q.type === 'dropdown' ? `${i + 1}` : ''}
              </span>
              <input
                className={styles.optInput}
                value={opt}
                placeholder={`옵션 ${i + 1}`}
                onChange={(e) => setOption(i, e.target.value)}
              />
              {q.options.length > 1 && (
                <button
                  className={styles.optRemove}
                  onClick={() => removeOption(i)}
                  aria-label="옵션 삭제"
                >
                  <IconClose size={16} />
                </button>
              )}
            </div>
          ))}
        {needsOptions(q.type) && (
          <button className={styles.addOpt} onClick={addOption}>
            <span className={styles.optMark} data-type={q.type} aria-hidden />
            옵션 추가
          </button>
        )}

        {q.type === 'scale' && (
          <div className={styles.scaleEdit}>
            <div className={styles.scaleRange}>
              <span>1</span>
              <span className={styles.scaleTo}>~</span>
              <select
                className={styles.scaleSelect}
                value={q.scaleMax}
                onChange={(e) => onPatch({ scaleMax: Number(e.target.value) })}
                aria-label="배율 최대값"
              >
                {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <input
              className={styles.scaleLabelInput}
              placeholder="1 라벨 (예: 매우 불만족)"
              value={q.scaleMinLabel ?? ''}
              onChange={(e) => onPatch({ scaleMinLabel: e.target.value })}
            />
            <input
              className={styles.scaleLabelInput}
              placeholder={`${q.scaleMax} 라벨 (예: 매우 만족)`}
              value={q.scaleMaxLabel ?? ''}
              onChange={(e) => onPatch({ scaleMaxLabel: e.target.value })}
            />
          </div>
        )}
      </div>

      {/* 푸터 */}
      <div className={styles.qFooter}>
        <div className={styles.moveGroup}>
          <button className={styles.footBtn} onClick={onMoveUp} aria-label="위로 이동">
            <span className={styles.chevUp}>
              <IconChevronRight size={16} />
            </span>
          </button>
          <button className={styles.footBtn} onClick={onMoveDown} aria-label="아래로 이동">
            <span className={styles.chevDown}>
              <IconChevronRight size={16} />
            </span>
          </button>
        </div>
        <div className={styles.footRight}>
          <button className={styles.footBtn} onClick={onDuplicate} aria-label="복제">
            <IconCopy size={18} />
          </button>
          <button
            className={`${styles.footBtn} ${!removable ? styles.footDisabled : ''}`}
            onClick={onRemove}
            disabled={!removable}
            aria-label="삭제"
          >
            <TrashIcon />
          </button>
          <span className={styles.vline} />
          <label className={styles.reqToggle}>
            필수
            <button
              type="button"
              role="switch"
              aria-checked={q.required}
              className={`${styles.switch} ${q.required ? styles.switchOn : ''}`}
              onClick={() => onPatch({ required: !q.required })}
            >
              <span className={styles.knob} />
            </button>
          </label>
        </div>
      </div>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 7h14M10 7V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12" />
    </svg>
  );
}

// ─────────────────── 발행 설정 시트 ───────────────────
function PublishSheet({
  questionCount,
  onClose,
  onPublish,
}: {
  questionCount: number;
  onClose: () => void;
  onPublish: (meta: { category: string; targetCount: number; estMinutes: number }) => void;
}) {
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [targetCount, setTargetCount] = useState(50);
  const [estMinutes, setEstMinutes] = useState(estimateMinutes(questionCount));
  const [busy, setBusy] = useState(false);

  return (
    <Sheet label="발행 설정" onClose={onClose}>
      <h2 className="h2">발행 설정</h2>
      <p className="sm muted">피드 노출과 크레딧 산정에 쓰여요.</p>

      <label className={styles.sheetField}>
        <span>카테고리</span>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <div className={styles.sheetRow}>
        <label className={styles.sheetField}>
          <span>목표 응답 수</span>
          <input
            type="number"
            min={1}
            value={targetCount}
            onChange={(e) => setTargetCount(Math.max(1, Number(e.target.value)))}
          />
        </label>
        <label className={styles.sheetField}>
          <span>예상 소요 (분)</span>
          <input
            type="number"
            min={1}
            value={estMinutes}
            onChange={(e) => setEstMinutes(Math.max(1, Number(e.target.value)))}
          />
        </label>
      </div>

      <div className={styles.sheetActions}>
        <Button variant="secondary" full onClick={onClose}>
          취소
        </Button>
        <Button
          full
          loading={busy}
          onClick={async () => {
            setBusy(true);
            await onPublish({ category, targetCount, estMinutes });
            setBusy(false);
          }}
        >
          발행하기
        </Button>
      </div>
    </Sheet>
  );
}
