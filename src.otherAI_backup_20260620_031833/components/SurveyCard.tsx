import { Link } from 'react-router-dom';
import type { Survey, User } from '@/types/domain';
import { estLabel, relativeTime } from '@/lib/format';
import styles from './SurveyCard.module.css';

// design_system.md §4.3 설문 카드 (피드 핵심) — mockup 레이아웃.
export function SurveyCard({ survey, owner }: { survey: Survey; owner?: User }) {
  const remain = Math.max(0, survey.targetCount - survey.collectedCount);
  const nearEnd = remain > 0 && remain <= Math.ceil(survey.targetCount * 0.2);
  const progress =
    survey.targetCount > 0
      ? Math.min(100, Math.round((survey.collectedCount / survey.targetCount) * 100))
      : 0;
  const statusLabel = nearEnd ? '마감 임박' : survey.estMinutes <= 2 ? '짧은 설문' : relativeTime(survey.createdAt);
  const categoryClass = categoryTone(survey.category);

  return (
    <Link to={`/surveys/${survey.id}`} className={`${styles.card} ${categoryClass} ${nearEnd ? styles.nearEnd : ''}`}>
      <div className={styles.decisionBar}>
        <span className={styles.reward}>
          <b className="num">+{survey.costPerResponse}</b>
          <small>크레딧</small>
        </span>
        <span>
          <b className="num">{estLabel(survey.estMinutes)}</b>
          <small>소요</small>
        </span>
        <span>
          <b className="num">{remain}</b>
          <small>명 남음</small>
        </span>
      </div>

      <h3 className={styles.title}>{survey.title}</h3>
      {survey.description && <p className={styles.description}>{survey.description}</p>}

      <div className={styles.contextLine}>
        <span className={styles.category}>{survey.category ?? '기타'}</span>
        <span className={`${styles.status} ${nearEnd ? styles.urgent : ''}`}>{statusLabel}</span>
      </div>

      <div className={styles.progressWrap}>
        <div className={styles.progressHead}>
          <span>
            응답 <b className="num">{survey.collectedCount}</b>/<b className="num">{survey.targetCount}</b>명
          </span>
          <span className="num">{progress}%</span>
        </div>
        <div
          className={styles.progress}
          role="progressbar"
          aria-valuenow={survey.collectedCount}
          aria-valuemax={survey.targetCount}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className={styles.bottom}>
        <span className={styles.author}>
          <span className={styles.avatar} aria-hidden>
            {owner?.nickname?.[0] ?? '익'}
          </span>
          <span>
            {owner?.nickname ?? '익명'}
            {owner?.university ? <small>{owner.university}</small> : null}
          </span>
        </span>
        <span className={styles.joinHint}>응답하고 크레딧 받기</span>
      </div>
    </Link>
  );
}

function categoryTone(category: Survey['category']) {
  switch (category) {
    case '학업/전공':
      return styles.catStudy;
    case '소비/트렌드':
      return styles.catTrend;
    case '건강/운동':
      return styles.catHealth;
    case '창업/사업':
      return styles.catStartup;
    case '심리/행동':
      return styles.catMind;
    case '사회/시사':
      return styles.catSociety;
    default:
      return styles.catEtc;
  }
}
