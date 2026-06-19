import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import {
  IconBell,
  IconGear,
  IconChevronRight,
  IconCredit,
  IconReport,
  IconCheck,
  IconMoon,
  IconDashboard,
  IconSun,
} from '@/components/icons';
import { useMe, useReciprocity } from '@/api/queries';
import { useAuth } from '@/store/auth';
import { useToast, useUi } from '@/store/ui';
import { confirmDialog } from '@/store/confirm';
import { reciprocityState } from '@/lib/logic';
import styles from './MyPage.module.css';

// 마이페이지 (mockup 12).
export function MyPage() {
  const navigate = useNavigate();
  const { data: me } = useMe();
  const { given, received } = useReciprocity();
  const doLogout = useAuth((s) => s.logout);
  const push = useToast((s) => s.push);
  const logout = async () => {
    if (await confirmDialog({ title: '로그아웃할까요?', confirmLabel: '로그아웃', tone: 'danger' }))
      doLogout();
  };
  const { theme, toggleTheme } = useUi();

  const { ratio } = reciprocityState(given, received);
  const score = Math.min(100, Math.round(ratio * 100));
  const isGood = score >= 90;
  const initial = me?.nickname?.slice(0, 1) ?? '나';

  return (
    <AppShell
      title="마이페이지"
      action={
        <>
          <button className={styles.icon} aria-label="알림" onClick={() => push('새 알림이 없어요.')}>
            <IconBell />
          </button>
          <button className={styles.icon} aria-label="설정" onClick={() => push('설정은 준비 중이에요.')}>
            <IconGear />
          </button>
        </>
      }
    >
      <section className={styles.profileCard}>
        <div className={styles.profileTop}>
          <div className={styles.avatar} aria-hidden>
            {initial}
          </div>
          <div className={styles.identity}>
            <p className={styles.name}>{me?.nickname}</p>
            <p className="sm muted">{me?.university}</p>
            <div className={styles.badges}>
              {me?.verifiedAt && (
                <span className={styles.verified}>
                  <IconCheck size={14} /> 학교 인증
                </span>
              )}
              {isGood && <span className={styles.badge}>상호성 우수</span>}
            </div>
          </div>
        </div>

        <div className={styles.balanceGrid}>
          <BalanceCard
            icon={<IconCredit size={19} />}
            label="응답 크레딧"
            value={me?.responseCredit ?? 0}
            helper="내 설문 응답을 모을 때 사용"
            tone="response"
          />
          <BalanceCard
            icon={<IconDashboard size={19} />}
            label="AI 크레딧"
            value={me?.aiCredit ?? 0}
            helper="질문 생성과 감수에 사용"
            tone="ai"
          />
        </div>
      </section>

      <section className={styles.reciprocityCard} aria-label="상호성 현황">
        <div className={styles.reciprocityHead}>
          <div>
            <span>상호성 점수</span>
            <p>내가 받은 만큼, 나도 도와주고 있는지 보여줘요</p>
          </div>
          <strong>
            <span className="num">{score}</span>%
          </strong>
        </div>
        <div
          className={styles.reciprocityBar}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemax={100}
        >
          <span style={{ width: `${score}%` }} />
        </div>
        <div className={styles.stats}>
          <Stat label="받은 응답" value={received} />
          <span className={styles.divider} aria-hidden />
          <Stat label="도와준 응답" value={given} />
          <span className={styles.divider} aria-hidden />
          <Stat label="균형" value={score} suffix="%" />
        </div>
      </section>

      <ul className={styles.menu}>
        <MenuItem icon={<IconCredit size={20} />} label="크레딧 내역" onClick={() => navigate('/credits')} />
        <MenuItem icon={<IconReport size={20} />} label="신고 내역" onClick={() => push('접수된 신고가 없어요.')} />
        <MenuItem icon={<IconHelp />} label="도움말" onClick={() => push('도움말은 준비 중이에요.')} />
        <li className={styles.item}>
          <span className={styles.itemLeft}>
            {theme === 'dark' ? <IconMoon size={20} /> : <IconSun size={20} />} 다크 모드
          </span>
          <button
            className={`${styles.switch} ${theme === 'dark' ? styles.switchOn : ''}`}
            role="switch"
            aria-checked={theme === 'dark'}
            aria-label="다크 모드"
            onClick={toggleTheme}
          >
            <span className={styles.knob} />
          </button>
        </li>
      </ul>

      <button className={styles.logout} onClick={logout}>
        로그아웃
      </button>
    </AppShell>
  );
}

function BalanceCard({
  icon,
  label,
  value,
  helper,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  helper: string;
  tone: 'response' | 'ai';
}) {
  return (
    <div className={`${styles.balanceCard} ${tone === 'ai' ? styles.balanceAi : styles.balanceResponse}`}>
      <span className={styles.balanceIcon}>{icon}</span>
      <span className="caption muted">{label}</span>
      <strong>
        <span className="num">{value}</span>개
      </strong>
      <small>{helper}</small>
    </div>
  );
}

function Stat({ label, value, suffix = '' }: { label: string; value: number; suffix?: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>
        <span className="num">{value}</span>
        {suffix}
      </span>
      <span className="caption muted">{label}</span>
    </div>
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <li>
      <button className={styles.item} onClick={onClick}>
        <span className={styles.itemLeft}>
          {icon} {label}
        </span>
        <IconChevronRight size={18} />
      </button>
    </li>
  );
}

function IconHelp() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7" />
      <path d="M12 17h.01" />
    </svg>
  );
}
