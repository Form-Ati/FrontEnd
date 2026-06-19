// 화면 포커스용 일러스트 — 그린 팔레트, 화이트 기반. 부드러운 라운드 스타일.
// (icon.png 시트의 글로우 배경이 흰 카드에 어울리지 않아 동일 무드로 새로 그림)
type P = { size?: number };

// 학교 인증 — 방패 + 체크
export const IllustShield = ({ size = 120 }: P) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
    <circle cx="60" cy="60" r="60" fill="var(--teal-50)" />
    <path
      d="M60 28l22 8v18c0 16-9.5 27-22 32-12.5-5-22-16-22-32V36z"
      fill="var(--teal-100)"
      stroke="var(--teal-500)"
      strokeWidth="3.5"
      strokeLinejoin="round"
    />
    <path
      d="M50 60l7 7 14-15"
      stroke="var(--teal-600)"
      strokeWidth="4.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// 환영 — 파티 포퍼 + 색종이
export const IllustConfetti = ({ size = 120 }: P) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
    <circle cx="60" cy="60" r="60" fill="var(--teal-50)" />
    <path d="M36 84l16-40 28 28z" fill="var(--teal-300)" stroke="var(--teal-600)" strokeWidth="3" strokeLinejoin="round" />
    <path d="M36 84l9-13 11 11z" fill="var(--teal-600)" />
    <circle cx="82" cy="40" r="4" fill="var(--amber-500)" />
    <circle cx="70" cy="30" r="3" fill="var(--teal-500)" />
    <circle cx="92" cy="58" r="3.5" fill="var(--coral-500)" />
    <path d="M84 30l3-6M96 44l6-2M88 70l5 4" stroke="var(--teal-500)" strokeWidth="3" strokeLinecap="round" />
    <rect x="74" y="48" width="6" height="6" rx="1.5" fill="var(--amber-500)" transform="rotate(20 77 51)" />
  </svg>
);

// 응답 중 — 스톱워치
export const IllustStopwatch = ({ size = 120 }: P) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
    <circle cx="60" cy="60" r="60" fill="var(--teal-50)" />
    <rect x="54" y="22" width="12" height="8" rx="2" fill="var(--teal-600)" />
    <path d="M60 30v-4" stroke="var(--teal-600)" strokeWidth="3" strokeLinecap="round" />
    <circle cx="60" cy="66" r="28" fill="#fff" stroke="var(--teal-500)" strokeWidth="3.5" />
    <path d="M60 66V50" stroke="var(--teal-600)" strokeWidth="4" strokeLinecap="round" />
    <path d="M60 66l11 6" stroke="var(--teal-500)" strokeWidth="4" strokeLinecap="round" />
    <path d="M84 42l6-6" stroke="var(--teal-600)" strokeWidth="3.5" strokeLinecap="round" />
  </svg>
);

// 응답 완료 — 박수
export const IllustClap = ({ size = 120 }: P) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
    <circle cx="60" cy="60" r="60" fill="var(--teal-50)" />
    <path d="M30 28l-7 5M40 22l-3 8M26 42l-8 1" stroke="var(--amber-500)" strokeWidth="3" strokeLinecap="round" />
    <g transform="rotate(-12 58 64)">
      <path d="M48 52c0-3 2-5 5-5s5 2 5 5v10" fill="var(--teal-100)" stroke="var(--teal-600)" strokeWidth="3" />
      <path d="M58 50c0-3 2-5 5-5s5 2 5 5v12" fill="var(--teal-100)" stroke="var(--teal-600)" strokeWidth="3" />
      <path d="M68 53c0-3 2-4 4-4s4 2 4 5l-1 14c-1 9-8 16-17 16s-16-7-16-17V58c0-3 2-5 5-5s5 2 5 5" fill="var(--teal-300)" stroke="var(--teal-600)" strokeWidth="3" strokeLinejoin="round" />
    </g>
    <path d="M88 36l7 4M92 30l3 7M82 28l1 7" stroke="var(--teal-500)" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// 신뢰 마크 — 잠금
export const IconLock = ({ size = 16 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);
