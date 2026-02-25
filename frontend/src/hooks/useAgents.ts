import { useQuery } from '@tanstack/react-query';
import { getAgents } from '../api/client';

export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: getAgents,
    staleTime: 60_000,
  });
}
