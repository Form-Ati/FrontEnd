import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { ReciprocityGauge } from '@/components/ReciprocityGauge';
import { Skeleton } from '@/components/Skeleton';
import { IconChevronRight, IconCredit } from '@/components/icons';
import { useMe, useReciprocity } from '@/api/queries';
import styles from './Home.module.css';

// 홈 (mockup 4).
export function Home() {
  const navigate = useNavigate();
  const { data: me, isLoading } = useMe();
  const { given, received } = useReciprocity();

  return (
    <AppShell brand>
      <section className={styles.gaugeCard}>
        <div className={styles.gaugeHead}>
          <span>내 상호성 게이지</span>
          <p>내가 받은 응답과 도와준 응답의 균형을 봅니다.</p>
        </div>
        <ReciprocityGauge given={given} received={received} />
      </section>

      <button className={styles.creditCard} onClick={() => navigate('/credits')}>
        <span className={styles.creditIcon} aria-hidden>
          <IconCredit size={22} />
        </span>
        <div className={styles.creditCopy}>
          <p>현재 사용 가능 크레딧</p>
          {isLoading ? (
            <Skeleton height={32} width={72} style={{ marginTop: 4 }} />
          ) : (
            <p className={styles.creditValue}>
              <span className="num">{me?.responseCredit ?? 0}</span>
              <span className={styles.creditUnit}>개</span>
            </p>
          )}
          <span>짧게 답하고 크레딧을 받아보세요</span>
        </div>
        <span className={styles.creditAction}>
          내역 보기 <IconChevronRight size={16} />
        </span>
      </button>

      <button className={styles.aiCard} onClick={() => navigate('/ai')}>
        <div className={styles.aiText}>
          <p>주제만 적으면 질문 구성을 잡아드릴게요</p>
          <span>질문 생성부터 응답 목표 설정까지 한 번에 이어집니다.</span>
          <span className={styles.aiCta}>
            설문 설계 시작 <IconChevronRight size={16} />
          </span>
        </div>
        <div className={styles.flow} aria-hidden>
          <span>주제</span>
          <i />
          <span>질문</span>
          <i />
          <span>목표</span>
          <i />
          <span>배포</span>
        </div>
      </button>
    </AppShell>
  );
}
