import { useEffect, useRef, useState } from 'react';
import { reciprocityState } from '@/lib/logic';
import styles from './ReciprocityGauge.module.css';

interface Props {
  given: number; // 갚은 응답
  received: number; // 받은 응답
}

// design_system.md §4.2 상호성 게이지 — 폼앗이의 시그니처.
// 반원형 게이지 + 스마일 얼굴. 균형일 때 가득 차고 환하게 웃는다.
// 유일하게 "특별한 모션"을 허락받는 컴포넌트. 색 + 라벨 함께(§7).
const TRACK_LEN = 317.6; // 260° 호 길이 (r=70)

export function ReciprocityGauge({ given, received }: Props) {
  const { state } = reciprocityState(given, received);
  const health = received === 0 ? 1 : Math.max(0.08, Math.min(1, given / received));
  const happy = state !== 'owing';

  const label =
    state === 'owing' ? '응답을 갚을 때예요' : state === 'ahead' ? '여유롭게 앞서 있어요' : '균형이에요!';

  const [pulse, setPulse] = useState(false);
  const prev = useRef(state);
  useEffect(() => {
    if (state === 'balanced' && prev.current !== 'balanced') {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 900);
      prev.current = state;
      return () => clearTimeout(t);
    }
    prev.current = state;
  }, [state]);

  return (
    <div
      className={styles.wrap}
      data-state={state}
      role="img"
      aria-label={`상호성 ${label}. 받은 응답 ${received}개, 갚은 응답 ${given}개`}
    >
      <div className={`${styles.gaugeBox} ${pulse ? styles.pulse : ''}`}>
        <svg viewBox="0 0 200 165" className={styles.svg}>
          <path
            d="M46.4 135 A70 70 0 1 1 153.6 135"
            className={styles.track}
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M46.4 135 A70 70 0 1 1 153.6 135"
            className={styles.progress}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${health * TRACK_LEN} ${TRACK_LEN}`}
          />
          {/* 스마일 얼굴 */}
          <circle cx="100" cy="95" r="34" className={styles.face} />
          <circle cx="88" cy="90" r="3.4" className={styles.eye} />
          <circle cx="112" cy="90" r="3.4" className={styles.eye} />
          {happy ? (
            <path d="M86 103q14 12 28 0" className={styles.mouth} fill="none" strokeLinecap="round" />
          ) : (
            <path d="M88 106h24" className={styles.mouth} fill="none" strokeLinecap="round" />
          )}
        </svg>
        <span className={`${styles.stateLabel} ${styles[`label_${state}`]}`}>{label}</span>
      </div>

      <div className={styles.legend}>
        <span className={styles.legItem}>
          <i className={styles.dotReceived} aria-hidden /> 받은 응답 <b className="num">{received}</b>
        </span>
        <span className={styles.legItem}>
          <i className={styles.dotGiven} aria-hidden /> 갚은 응답 <b className="num">{given}</b>
        </span>
      </div>
    </div>
  );
}
