import { useQuery } from '@tanstack/react-query';
import { getThread } from '../api/client';

export function useThread(rootPostId: string) {
  return useQuery({
    queryKey: ['thread', rootPostId],
    queryFn: () => getThread(rootPostId),
    staleTime: 15_000,
    enabled: !!rootPostId,
  });
}
