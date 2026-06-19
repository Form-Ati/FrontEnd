import { useNavigate } from 'react-router-dom';
import { IconBack, IconChevronRight } from '@/components/icons';
import { IllustConfetti } from '@/components/Illust';
import { Button } from '@/components/Button';
import { SEED_CREDIT } from '@/data/seed';
import styles from './Onboard.module.css';

// 환영 (mockup 3). 시드 크레딧 안내.
export function Welcome() {
  const navigate = useNavigate();
  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate('/home')} aria-label="뒤로">
        <IconBack />
      </button>

      <div className={styles.center}>
        <IllustConfetti size={120} />
        <h1 className={styles.title}>환영합니다! 🎉</h1>
        <p className={styles.sub}>시작 크레딧 {SEED_CREDIT}개를 드렸어요.</p>

        <button className={styles.creditCard} onClick={() => navigate('/credits')}>
          <span className={styles.creditCardLabel}>내 크레딧</span>
          <span className={styles.creditCardValue}>
            <span className="num">{SEED_CREDIT}</span>
            <span className={styles.creditCardUnit}>개</span>
            <IconChevronRight size={18} />
          </span>
        </button>

        <p className={styles.welcomeHint}>응답하고 더 많은 크레딧을 모아보세요.</p>
      </div>

      <div className={styles.actions}>
        <Button size="lg" full onClick={() => navigate('/home')}>
          폼앗이 둘러보기
        </Button>
      </div>
    </div>
  );
}
