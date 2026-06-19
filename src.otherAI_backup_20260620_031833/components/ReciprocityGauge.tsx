import { reciprocityState } from '@/lib/logic';
import styles from './ReciprocityGauge.module.css';

interface Props {
  given: number; // 갚은 응답
  received: number; // 받은 응답
}

export function ReciprocityGauge({ given, received }: Props) {
  const { state, ratio } = reciprocityState(given, received);
  const score = Math.min(100, Math.round(ratio * 100));
  const receivedShare = received + given > 0 ? (received / (received + given)) * 100 : 50;
  const givenShare = 100 - receivedShare;

  const label =
    state === 'owing' ? '응답을 갚을 때예요' : state === 'ahead' ? '여유롭게 앞서 있어요' : '균형이에요!';
  const body =
    state === 'owing'
      ? '내 설문이 받은 만큼, 다른 설문도 조금 더 도와주세요'
      : state === 'ahead'
        ? '도와준 응답이 충분해요. 크레딧을 써서 내 설문을 모아보세요'
        : '받은 만큼 도와주고 있어요';

  return (
    <div
      className={styles.wrap}
      data-state={state}
      role="img"
      aria-label={`상호성 ${label}. 받은 응답 ${received}개, 갚은 응답 ${given}개`}
    >
      <div className={styles.symbolRow}>
        <svg viewBox="0 0 156 92" className={styles.symbol} aria-hidden>
          <path className={styles.loopMuted} d="M47 24h37c17 0 30 10 30 22s-13 22-30 22H71" />
          <path className={styles.loopStrong} d="M109 68H72c-17 0-30-10-30-22s13-22 30-22h13" />
          <path className={styles.arrowA} d="M83 14l12 10-12 10" />
          <path className={styles.arrowB} d="M73 78 61 68l12-10" />
          <circle className={styles.center} cx="78" cy="46" r="18" />
          <path className={styles.centerMark} d="M68 46h20M78 36v20" />
        </svg>
        <div className={styles.stateCopy}>
          <span className={styles.stateLabel}>{label}</span>
          <p>{body}</p>
        </div>
      </div>

      <div className={styles.balanceBar} aria-hidden>
        <span className={styles.receivedFill} style={{ width: `${receivedShare}%` }} />
        <span className={styles.givenFill} style={{ width: `${givenShare}%` }} />
      </div>

      <div className={styles.legend}>
        <span className={styles.legItem} data-kind="received">
          <em>받은 응답</em>
          <b className="num">{received}</b>
          <small>내 설문으로 들어온 도움</small>
        </span>
        <span className={styles.legItem} data-kind="given">
          <em>도와준 응답</em>
          <b className="num">{given}</b>
          <small>다른 설문에 보탠 응답</small>
        </span>
        <span className={styles.score}>
          <em>균형 점수</em>
          <b className="num">{score}%</b>
        </span>
      </div>
    </div>
  );
}
