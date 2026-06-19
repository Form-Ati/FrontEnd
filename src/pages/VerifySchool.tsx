import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconBack } from '@/components/icons';
import { IllustShield, IconLock } from '@/components/Illust';
import { Button } from '@/components/Button';
import { useAuth } from '@/store/auth';
import { useToast } from '@/store/ui';
import styles from './Onboard.module.css';

// 학교 인증 (mockup 2). service.md §6 대학 이메일 인증.
export function VerifySchool() {
  const navigate = useNavigate();
  const setAuthed = useAuth((s) => s.setAuthed);
  const push = useToast((s) => s.push);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const send = () => {
    if (email.trim().length < 2) return;
    setSent(true);
    push('인증 메일을 보냈어요.', 'default');
  };

  const verify = async () => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 500));
    setAuthed(true); // 데모: 시드 사용자로 입장
    navigate('/welcome');
  };

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate(-1)} aria-label="뒤로">
        <IconBack />
      </button>
      <p className={styles.headerTitle}>학교 인증</p>

      <div className={styles.center}>
        <IllustShield size={120} />
        <h1 className={styles.title}>
          학교 이메일로
          <br />
          인증해주세요
        </h1>
        <p className={styles.sub}>인증된 학교 구성원만 이용할 수 있어요.</p>

        <div className={styles.emailRow}>
          <input
            className={styles.emailInput}
            placeholder="이메일을 입력하세요"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="학교 이메일"
          />
          <span className={styles.suffix}>@univ.ac.kr</span>
        </div>

        {sent && (
          <input
            className={styles.codeInput}
            placeholder="인증 코드 6자리"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            aria-label="인증 코드"
          />
        )}
      </div>

      <div className={styles.actions}>
        {!sent ? (
          <Button size="lg" full disabled={email.trim().length < 2} onClick={send}>
            인증 메일 보내기
          </Button>
        ) : (
          <Button size="lg" full loading={busy} disabled={code.length !== 6} onClick={verify}>
            인증하고 시작하기
          </Button>
        )}
        <p className={styles.lockNote}>
          <IconLock size={14} /> 개인 정보는 안전하게 보호돼요.
        </p>
      </div>
    </div>
  );
}
