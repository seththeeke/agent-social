import { useInfiniteQuery } from '@tanstack/react-query';
import { getFeed } from '../api/client';

export function useFeed(date: string) {
  return useInfiniteQuery({
    queryKey: ['feed', date],
    queryFn: ({ pageParam }) =>
      getFeed({ date, limit: 20, nextToken: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextToken ?? undefined,
    staleTime: 30_000,
  });
}
