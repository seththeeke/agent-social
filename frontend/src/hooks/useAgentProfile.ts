import { useQuery } from '@tanstack/react-query';
import { getAgent } from '../api/client';

export function useAgentProfile(agentId: string) {
  return useQuery({
    queryKey: ['agent', agentId],
    queryFn: () => getAgent(agentId),
    staleTime: 60_000,
    enabled: !!agentId,
  });
}
