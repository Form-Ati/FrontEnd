import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// 라우트 이동 시 스크롤을 맨 위로 올리고, 주요 영역으로 포커스를 옮긴다(스크린리더 대응).
// 뒤로가기(POP)는 사용자의 기존 위치 기대를 존중해 스크롤을 강제하지 않는다.
export function ScrollToTop() {
  const { pathname } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    if (navType !== 'POP') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      // 데스크톱 폰 프레임은 자체 스크롤 컨테이너(#app-scroll)를 가진다
      const scroller = document.getElementById('app-scroll');
      if (scroller) scroller.scrollTop = 0;
    }
    // 새 화면의 주요 영역으로 포커스 이동 (있을 때만)
    const main = document.getElementById('main');
    if (main) {
      main.focus({ preventScroll: true });
    }
  }, [pathname, navType]);

  return null;
}
