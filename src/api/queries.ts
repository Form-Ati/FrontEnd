// TanStack Query 훅 — develop_system.md §2.2 서버상태=TanStack Query.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export const qk = {
  me: ['me'] as const,
  feed: (page: number) => ['feed', page] as const,
  survey: (id: number) => ['survey', id] as const,
  mySurveys: ['surveys', 'mine'] as const,
  responseCredit: ['credit', 'response'] as const,
  aiCredit: ['credit', 'ai'] as const,
  teams: ['teams'] as const,
  team: (id: number) => ['teams', id] as const,
  teamInvites: (id: number) => ['teams', id, 'invites'] as const,
  teamCredit: (id: number) => ['teams', id, 'credit'] as const,
};

export const useMe = () => useQuery({ queryKey: qk.me, queryFn: () => api.me() });

export const useFeed = (page = 0) =>
  useQuery({ queryKey: qk.feed(page), queryFn: () => api.feed(page) });

export const useSurvey = (id: number) =>
  useQuery({ queryKey: qk.survey(id), queryFn: () => api.getSurvey(id), enabled: !!id });

export const useSurveyQuestions = (id: number) =>
  useQuery({
    queryKey: ['survey', id, 'questions'] as const,
    queryFn: () => api.getSurveyQuestions(id),
    enabled: !!id,
  });

export const useMySurveys = () =>
  useQuery({ queryKey: qk.mySurveys, queryFn: () => api.mySurveys() });

export const useResponseCredit = () =>
  useQuery({ queryKey: qk.responseCredit, queryFn: () => api.responseCredit() });

export const useAiCredit = () =>
  useQuery({ queryKey: qk.aiCredit, queryFn: () => api.aiCredit() });

export const useTeams = () =>
  useQuery({ queryKey: qk.teams, queryFn: () => api.teams() });

export const useTeam = (id: number) =>
  useQuery({ queryKey: qk.team(id), queryFn: () => api.team(id), enabled: !!id });

export const useTeamInvites = (id: number, enabled = true) =>
  useQuery({
    queryKey: qk.teamInvites(id),
    queryFn: () => api.teamInvites(id),
    enabled: !!id && enabled,
  });

export const useTeamCredit = (id: number) =>
  useQuery({ queryKey: qk.teamCredit(id), queryFn: () => api.teamCredit(id), enabled: !!id });

// 상호성: 갚은 응답(=기여도) vs 받은 응답(내 설문이 모은 응답 수 합).
// 인메모리 db 대신 서버 데이터(useMe + useMySurveys)로 산출한다.
export function useReciprocity() {
  const { data: me } = useMe();
  const { data: mySurveys } = useMySurveys();
  const given = me?.contribution ?? 0;
  const received = (mySurveys ?? []).reduce((sum, s) => sum + s.collectedCount, 0);
  return { given, received };
}

// 정산 후 광범위 무효화 (잔액/피드/설문/원장 동시 변동)
export function useInvalidateAll() {
  const qc = useQueryClient();
  return () =>
    qc.invalidateQueries({
      predicate: (q) => {
        const k = q.queryKey[0];
        return (
          k === 'me' ||
          k === 'feed' ||
          k === 'survey' ||
          k === 'surveys' ||
          k === 'credit' ||
          k === 'teams'
        );
      },
    });
}

export function useCompleteResponse() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: api.completeResponse,
    onSuccess: () => invalidate(),
  });
}
