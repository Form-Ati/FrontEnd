// TanStack Query 훅 — develop_system.md §2.2 서버상태=TanStack Query.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from './mockApi';
import { useDb } from '@/store/db';

// 상호성: 갚은 응답(=기여도) vs 받은 응답(내 설문이 받은 VERIFIED 응답 수)
export function useReciprocity() {
  const currentUserId = useDb((s) => s.currentUserId);
  const users = useDb((s) => s.users);
  const surveys = useDb((s) => s.surveys);
  const responses = useDb((s) => s.responses);
  return useMemo(() => {
    const meUser = users.find((u) => u.id === currentUserId);
    const mineIds = new Set(surveys.filter((s) => s.ownerId === currentUserId).map((s) => s.id));
    const received = responses.filter(
      (r) => mineIds.has(r.surveyId) && r.status === 'VERIFIED',
    ).length;
    return { given: meUser?.contribution ?? 0, received };
  }, [currentUserId, users, surveys, responses]);
}

export const qk = {
  me: ['me'] as const,
  feed: (page: number) => ['feed', page] as const,
  survey: (id: number) => ['survey', id] as const,
  mySurveys: ['surveys', 'mine'] as const,
  responseCredit: ['credit', 'response'] as const,
  aiCredit: ['credit', 'ai'] as const,
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
          k === 'credit'
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
