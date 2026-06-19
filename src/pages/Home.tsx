import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/Bits';
import { ReciprocityGauge } from '@/components/ReciprocityGauge';
import { IllustRobot } from '@/components/Illust';
import { Skeleton } from '@/components/Skeleton';
import { IconPlus, IconChevronRight } from '@/components/icons';
import { useMe, useReciprocity } from '@/api/queries';
import styles from './Home.module.css';

// 홈 (mockup 4).
export function Home() {
  const navigate = useNavigate();
  const { data: me, isLoading } = useMe();
  const { given, received } = useReciprocity();

  return (
    <AppShell brand>
      <Card className={styles.gaugeCard}>
        <div className={styles.gaugeHead}>
          <span className="h3">내 상호성 게이지</span>
          <span className={styles.help} title="받은 응답과 갚은 응답의 균형이에요." aria-hidden>
            ?
          </span>
        </div>
        <ReciprocityGauge given={given} received={received} />
      </Card>

      <button className={styles.creditCard} onClick={() => navigate('/credits')}>
        <div>
          <p className="caption muted">보유 크레딧</p>
          {isLoading ? (
            <Skeleton height={32} width={72} style={{ marginTop: 4 }} />
          ) : (
            <p className={styles.creditValue}>
              <span className="num">{me?.responseCredit ?? 0}</span>
              <span className={styles.creditUnit}>개</span>
            </p>
          )}
        </div>
        <span className={styles.plus} aria-hidden>
          <IconPlus size={20} />
        </span>
      </button>

      <button className={styles.aiCard} onClick={() => navigate('/ai')}>
        <div className={styles.aiText}>
          <p className="h3">AI 설문 설계로</p>
          <p className="sm muted">더 좋은 설문을 만들어보세요</p>
          <span className={styles.aiCta}>
            시작하기 <IconChevronRight size={16} />
          </span>
        </div>
        <div className={styles.robot} aria-hidden>
          <IllustRobot size={76} />
        </div>
      </button>
    </AppShell>
  );
}
