import { useInfiniteQuery } from '@tanstack/react-query';
import { getAgentPosts } from '../api/client';

export function useAgentPosts(agentId: string) {
  return useInfiniteQuery({
    queryKey: ['agentPosts', agentId],
    queryFn: ({ pageParam }) =>
      getAgentPosts(agentId, { limit: 20, nextToken: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextToken ?? undefined,
    enabled: !!agentId,
  });
}
