import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/Button';
import { Card, ProgressBar, StatusBadge } from '@/components/Bits';
import { ErrorState, Skeleton } from '@/components/Skeleton';
import { IconShare, IconCheck } from '@/components/icons';
import { useMe, useSurvey } from '@/api/queries';
import { api } from '@/api/api';
import { ApiError } from '@/api/errors';
import { useToast } from '@/store/ui';
import { ReportSheet } from './ReportSheet';
import styles from './SurveyDetail.module.css';

export function SurveyDetail() {
  const { id } = useParams();
  const surveyId = Number(id);
  const navigate = useNavigate();
  const { data: survey, isLoading, isError, refetch } = useSurvey(surveyId);
  const { data: me } = useMe();
  const owner = survey?.owner;
  const push = useToast((s) => s.push);
  const [starting, setStarting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  if (isError) {
    return (
      <AppShell back title="설문 상세" hideNav>
        <ErrorState onRetry={() => refetch()} message="설문을 불러오지 못했어요." />
      </AppShell>
    );
  }
  if (isLoading || !survey) {
    return (
      <AppShell back title="설문 상세" hideNav>
        <div className={styles.skeletonWrap}>
          <Skeleton height={24} width={90} radius="var(--radius-full)" />
          <Skeleton height={28} width="85%" />
          <Skeleton height={28} width="60%" />
          <Skeleton height={16} width="40%" style={{ marginTop: 8 }} />
          <Skeleton height={120} radius="var(--radius-lg)" style={{ marginTop: 16 }} />
        </div>
      </AppShell>
    );
  }

  const isOwner = me?.id === survey.ownerId;
  const remain = Math.max(0, survey.targetCount - survey.collectedCount);

  const start = async () => {
    setStarting(true);
    try {
      await api.startResponse(survey.id); // 체류시간 기록 후 앱 내 응답으로
      navigate(`/surveys/${survey.id}/fill`);
    } catch (e) {
      if (e instanceof ApiError) push(e.message, 'warning');
    } finally {
      setStarting(false);
    }
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      push('설문 링크를 복사했어요.', 'default');
    } catch {
      push('링크 복사에 실패했어요.', 'warning');
    }
  };

  return (
    <AppShell
      back
      title="설문 상세"
      hideNav
      action={
        <button className={styles.iconBtn} aria-label="공유" onClick={share}>
          <IconShare />
        </button>
      }
    >
      <span className={styles.estChip}>약 {survey.estMinutes}분 소요</span>
      <h1 className={styles.title}>{survey.title}</h1>

      <div className={styles.author}>
        <span className={styles.avatar} aria-hidden>
          {owner?.nickname?.[0]}
        </span>
        <span className="sm muted">
          {owner?.university} {owner?.nickname}
        </span>
        {isOwner && <StatusBadge status={survey.status} />}
      </div>

      {survey.description && <p className={styles.desc}>{survey.description}</p>}

      <div className={styles.rewardBox}>
        <IconCheck size={18} />
        응답 완료 시 크레딧 <b>{survey.costPerResponse}개</b> 지급
      </div>

      {!isOwner && (
        <div className={styles.selfNote}>
          <IconCheck size={18} /> 폼앗이 안에서 바로 응답하는 설문이에요.
        </div>
      )}

      {isOwner ? (
        <Card className={styles.ownerCard}>
          <div className={styles.ownerHead}>
            <span className="sm muted">
              수집 <b className="num">{survey.collectedCount}</b> / {survey.targetCount}명
            </span>
            <span className="sm muted">잔여 {remain}명</span>
          </div>
          <ProgressBar value={survey.collectedCount} max={survey.targetCount} />
          <Button variant="secondary" full onClick={() => navigate('/my-surveys')}>
            내 설문에서 관리하기
          </Button>
        </Card>
      ) : (
        <div className={styles.section}>
          <p className={styles.label}>응답 전 확인해주세요</p>
          <ul className={styles.checklist}>
            <li>
              <IconCheck size={18} /> 1인 1회만 참여할 수 있어요.
            </li>
            <li>
              <IconCheck size={18} /> 성의 있는 응답이 중요해요!
            </li>
            <li>
              <IconCheck size={18} /> 제출하면 완료가 자동 확인돼요.
            </li>
          </ul>
        </div>
      )}

      {!isOwner && (
        <>
          <div className={styles.cta}>
            <Button size="lg" full loading={starting} onClick={start}>
              설문 응답하고 크레딧 받기
            </Button>
          </div>
          <button className={styles.reportLink} onClick={() => setReportOpen(true)}>
            이 설문 신고하기
          </button>
        </>
      )}

      <ReportSheet open={reportOpen} onClose={() => setReportOpen(false)} targetResponseId={null} />
    </AppShell>
  );
}
