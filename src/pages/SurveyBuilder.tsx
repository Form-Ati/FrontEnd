import { useEffect, useRef, useState, type ReactNode } from 'react';
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
  newSection,
  needsOptions,
  toQuestionInput,
  validateQuestions,
  type DraftQuestion,
  type DraftSection,
} from '@/lib/questions';
import { QUESTION_TYPE_LABEL, type QuestionType, CATEGORIES } from '@/types/domain';
import { api } from '@/api/api';
import { ApiError } from '@/api/errors';
import { useInvalidateAll, useTeams } from '@/api/queries';
import { useToast } from '@/store/ui';
import { confirmDialog } from '@/store/confirm';
import type { Team } from '@/types/domain';
import styles from './SurveyBuilder.module.css';

const serialize = (
  title: string,
  description: string,
  sections: DraftSection[],
  qs: DraftQuestion[],
) =>
  JSON.stringify({
    title,
    description,
    sections: sections.map(({ uid: _uid, ...rest }) => rest),
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
  const { data: teams } = useTeams();
  const initialSection = useRef(newSection());

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sections, setSections] = useState<DraftSection[]>([initialSection.current]);
  const [questions, setQuestions] = useState<DraftQuestion[]>([
    newDraft('single', initialSection.current.uid),
  ]);
  const [activeUid, setActiveUid] = useState<string>(questions[0]?.uid ?? '');
  const [preview, setPreview] = useState(false);
  const [errorUids, setErrorUids] = useState<Set<string>>(new Set());
  const [dragUid, setDragUid] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);

  // 작성 중 이탈 방지 — 초기 스냅샷과 비교해 변경 여부 판단
  const initialSnap = useRef(serialize('', '', [initialSection.current], [questions[0]]));
  const publishedRef = useRef(false);
  const dirty =
    !publishedRef.current && serialize(title, description, sections, questions) !== initialSnap.current;

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

  const patchSection = (uid: string, p: Partial<DraftSection>) =>
    setSections((ss) => ss.map((s) => (s.uid === uid ? { ...s, ...p } : s)));

  const addQuestion = () => {
    const active = questions.find((x) => x.uid === activeUid);
    const sectionUid = active?.sectionUid ?? sections[0]?.uid ?? '';
    const q = newDraft('single', sectionUid);
    setQuestions((qs) => {
      const idx = qs.findIndex((x) => x.uid === activeUid);
      const next = [...qs];
      next.splice(idx >= 0 ? idx + 1 : qs.length, 0, q);
      return next;
    });
    setActiveUid(q.uid);
  };

  const addQuestionToSection = (sectionUid: string) => {
    const q = newDraft('single', sectionUid);
    setQuestions((qs) => {
      const lastInSection = qs.map((x, i) => ({ x, i })).filter(({ x }) => x.sectionUid === sectionUid).at(-1);
      const next = [...qs];
      next.splice(lastInSection ? lastInSection.i + 1 : qs.length, 0, q);
      return next;
    });
    setActiveUid(q.uid);
  };

  const addSection = () => {
    const section = newSection(`섹션 ${sections.length + 1}`);
    const q = newDraft('single', section.uid);
    setSections((ss) => [...ss, section]);
    setQuestions((qs) => [...qs, q]);
    setActiveUid(q.uid);
  };

  const requestRemoveSection = async (sectionUid: string) => {
    if (sections.length <= 1) return;
    const section = sections.find((s) => s.uid === sectionUid);
    const count = questions.filter((q) => q.sectionUid === sectionUid).length;
    if (
      !(await confirmDialog({
        title: '이 섹션을 삭제할까요?',
        body: `${section?.title || '섹션'}에 있는 질문 ${count}개도 함께 삭제돼요.`,
        confirmLabel: '삭제',
        tone: 'danger',
      }))
    ) {
      return;
    }
    const nextSections = sections.filter((s) => s.uid !== sectionUid);
    setSections(nextSections);
    setQuestions((qs) => {
      const next = qs.filter((q) => q.sectionUid !== sectionUid);
      if (next.length) return next;
      return [newDraft('single', nextSections[0]?.uid ?? '')];
    });
    setActiveUid((uid) => {
      const next = questions.find((q) => q.sectionUid !== sectionUid && q.uid !== uid);
      return next?.uid ?? '';
    });
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
      if (idx < 0) return qs;
      const sectionUid = qs[idx].sectionUid;
      const sameSection = qs
        .map((q, i) => ({ q, i }))
        .filter(({ q }) => q.sectionUid === sectionUid);
      const localIdx = sameSection.findIndex(({ q }) => q.uid === uid);
      const target = sameSection[localIdx + dir];
      if (!target) return qs;
      const next = [...qs];
      [next[idx], next[target.i]] = [next[target.i], next[idx]];
      return next;
    });

  const reorderTo = (targetUid: string) =>
    setQuestions((qs) => {
      if (!dragUid || dragUid === targetUid) return qs;
      const from = qs.findIndex((q) => q.uid === dragUid);
      const to = qs.findIndex((q) => q.uid === targetUid);
      if (from < 0 || to < 0) return qs;
      if (qs[from].sectionUid !== qs[to].sectionUid) return qs;
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
            {sections.map((section) => (
              <SectionPreview key={section.uid} section={section}>
                {questions
                  .filter((q) => q.sectionUid === section.uid)
                  .map((q) => (
                    <QuestionView
                      key={q.uid}
                      question={q}
                      index={questions.findIndex((x) => x.uid === q.uid)}
                      value={q.type === 'multi' ? [] : ''}
                      onChange={() => {}}
                      disabled
                    />
                  ))}
              </SectionPreview>
            ))}
          </div>
        ) : (
          <div className={styles.sectionList}>
            {sections.map((section, sectionIndex) => {
              const sectionQuestions = questions.filter((q) => q.sectionUid === section.uid);
              return (
                <section key={section.uid} className={styles.sectionBlock}>
                  <SectionEditor
                    section={section}
                    index={sectionIndex}
                    removable={sections.length > 1}
                    onPatch={(p) => patchSection(section.uid, p)}
                    onRemove={() => requestRemoveSection(section.uid)}
                  />
                  <ul className={styles.list}>
                    {sectionQuestions.map((q) => (
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
                  <button className={styles.addQuestionBtn} onClick={() => addQuestionToSection(section.uid)}>
                    + 이 섹션에 질문 추가
                  </button>
                </section>
              );
            })}
          </div>
        )}

        {!preview && (
          <button className={styles.addBtn} onClick={addSection}>
            + 섹션 추가
          </button>
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
          teams={teams ?? []}
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
                teamId: meta.teamId,
                sections: sections.map((section, i) => ({
                  clientId: section.uid,
                  title: section.title.trim() || `섹션 ${i + 1}`,
                  description: section.description.trim() || null,
                })),
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

function SectionEditor({
  section,
  index,
  removable,
  onPatch,
  onRemove,
}: {
  section: DraftSection;
  index: number;
  removable: boolean;
  onPatch: (p: Partial<DraftSection>) => void;
  onRemove: () => void;
}) {
  return (
    <div className={`${styles.cardBase} ${styles.sectionEditor}`}>
      <div className={styles.sectionBadge}>섹션 {index + 1}</div>
      <input
        className={styles.sectionTitleInput}
        placeholder={`섹션 ${index + 1}`}
        value={section.title}
        onChange={(e) => onPatch({ title: e.target.value })}
      />
      <input
        className={styles.sectionDescInput}
        placeholder="섹션 설명 (선택)"
        value={section.description}
        onChange={(e) => onPatch({ description: e.target.value })}
      />
      {removable && (
        <button className={styles.sectionRemove} onClick={onRemove} aria-label="섹션 삭제">
          <IconClose size={18} />
        </button>
      )}
    </div>
  );
}

function SectionPreview({
  section,
  children,
}: {
  section: DraftSection;
  children: ReactNode;
}) {
  return (
    <section className={styles.previewSection}>
      <div className={`${styles.cardBase} ${styles.previewSectionHead}`}>
        <h2 className={styles.previewSectionTitle}>{section.title || '제목 없는 섹션'}</h2>
        {section.description && <p className={styles.previewDesc}>{section.description}</p>}
      </div>
      {children}
    </section>
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
  teams,
  onClose,
  onPublish,
}: {
  questionCount: number;
  teams: Team[];
  onClose: () => void;
  onPublish: (meta: { category: string; targetCount: number; estMinutes: number; teamId: number | null }) => void;
}) {
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [targetCount, setTargetCount] = useState(50);
  const [estMinutes, setEstMinutes] = useState(estimateMinutes(questionCount));
  const [ownerScope, setOwnerScope] = useState('personal');
  const [busy, setBusy] = useState(false);
  const selectedTeam = teams.find((team) => String(team.id) === ownerScope);

  return (
    <Sheet label="발행 설정" onClose={onClose}>
      <h2 className="h2">발행 설정</h2>
      <p className="sm muted">피드 노출과 크레딧 산정에 쓰여요.</p>

      <label className={styles.sheetField}>
        <span>발행 주체</span>
        <select value={ownerScope} onChange={(e) => setOwnerScope(e.target.value)}>
          <option value="personal">개인 크레딧</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name} · {team.responseCredit}개
            </option>
          ))}
        </select>
      </label>
      {selectedTeam && (
        <p className={styles.sheetNote}>
          응답 보상은 {selectedTeam.name} 팀 크레딧에서 차감돼요.
        </p>
      )}

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
            await onPublish({
              category,
              targetCount,
              estMinutes,
              teamId: selectedTeam ? selectedTeam.id : null,
            });
            setBusy(false);
          }}
        >
          발행하기
        </Button>
      </div>
    </Sheet>
  );
}
