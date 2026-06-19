import { Link } from 'react-router-dom';
import type { Survey, User } from '@/types/domain';
import { estLabel, relativeTime } from '@/lib/format';
import styles from './SurveyCard.module.css';

// design_system.md §4.3 설문 카드 (피드 핵심) — mockup 레이아웃.
export function SurveyCard({ survey, owner }: { survey: Survey; owner?: User }) {
  const remain = Math.max(0, survey.targetCount - survey.collectedCount);
  const nearEnd = remain > 0 && remain <= Math.ceil(survey.targetCount * 0.2);

  return (
    <Link to={`/surveys/${survey.id}`} className={styles.card}>
      <h3 className={styles.title}>{survey.title}</h3>

      <div className={styles.author}>
        <span className={styles.avatar} aria-hidden>
          {owner?.nickname?.[0] ?? '익'}
        </span>
        <span className="sm muted">
          {owner?.university ? `${owner.university} · ` : ''}
          {owner?.nickname ?? '익명'}
        </span>
      </div>

      <div className={styles.chips}>
        <span className={styles.chip}>{estLabel(survey.estMinutes)}</span>
        <span className={styles.chip}>
          <b className="num">{survey.targetCount}</b>명 목표
        </span>
      </div>

      <div className={styles.bottom}>
        <span className={`caption ${nearEnd ? styles.urgent : 'muted'}`}>
          {nearEnd ? '마감 임박' : relativeTime(survey.createdAt)}
        </span>
        <span className={styles.reward}>크레딧 +{survey.costPerResponse}</span>
      </div>
    </Link>
  );
}
