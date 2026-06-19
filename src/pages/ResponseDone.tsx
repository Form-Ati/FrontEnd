import { useLocation, useNavigate } from 'react-router-dom';
import { IllustClap } from '@/components/Illust';
import { Button } from '@/components/Button';
import { useMe } from '@/api/queries';
import styles from './Onboard.module.css';

// 응답 완료 (mockup 8).
export function ResponseDone() {
  const navigate = useNavigate();
  const { state } = useLocation() as { state?: { reward?: number } };
  const reward = state?.reward ?? 1;
  const { data: me } = useMe();

  return (
    <div className={styles.page}>
      <div className={styles.center}>
        <IllustClap size={120} />
        <h1 className={styles.title}>수고했어요! 🎉</h1>
        <p className={styles.sub}>크레딧 {reward}개를 받았어요.</p>

        <div className={styles.creditCard} style={{ cursor: 'default' }}>
          <span className={styles.creditCardLabel}>현재 보유 크레딧</span>
          <span className={styles.creditCardValue}>
            <span className="num">{me?.responseCredit ?? 0}</span>
            <span className={styles.creditCardUnit}>개</span>
          </span>
        </div>
      </div>

      <div className={styles.actions}>
        <Button size="lg" full variant="secondary" onClick={() => navigate('/feed')}>
          피드로 돌아가기
        </Button>
        <Button size="lg" full onClick={() => navigate('/feed')}>
          다른 설문 하기
        </Button>
      </div>
    </div>
  );
}
