import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useChatbot() {
  const queryClient = useQueryClient();

  const chatMutation = useMutation({
    mutationFn: (query: string) => 
      apiFetch('/api/ai/query', {
        method: 'POST',
        body: JSON.stringify({ query }),
      }),
    onSuccess: () => {
      // Invalidate chatbot history if we were fetching it
      queryClient.invalidateQueries({ queryKey: ['chatbot-history'] });
    },
  });

  return {
    askChatbot: chatMutation.mutateAsync,
    isAsking: chatMutation.isPending,
    error: chatMutation.error,
  };
}

export function useStudentProfile(uid?: string) {
  return useQuery({
    queryKey: ['student', uid],
    queryFn: () => apiFetch(`/api/students/${uid}`),
    enabled: !!uid,
  });
}
