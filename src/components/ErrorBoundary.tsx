import { Component, type ReactNode } from 'react';
import { Button } from './Button';

// 렌더 단계 예외를 잡아 폴백 UI 를 보여준다(앱 셸 래핑).
// 데이터 페치 에러는 TanStack Query 가 다루므로 여기선 렌더 크래시만 담당.
interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // 운영에선 관측 도구로 전송할 수 있다.
    console.error('ErrorBoundary caught:', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
          textAlign: 'center',
        }}
      >
        <h2 className="h2">화면을 표시하지 못했어요</h2>
        <p className="sm muted">잠시 후 다시 시도해 주세요. 문제가 계속되면 새로고침해 주세요.</p>
        <Button onClick={() => window.location.reload()}>새로고침</Button>
      </div>
    );
  }
}
