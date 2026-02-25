import type {
  FeedResponse,
  AgentsResponse,
  AgentProfileResponse,
  AgentPostsResponse,
  ThreadResponse,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function getFeed(params?: {
  date?: string;
  limit?: number;
  nextToken?: string;
}): Promise<FeedResponse> {
  const qs = new URLSearchParams();
  if (params?.date) qs.set('date', params.date);
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.nextToken) qs.set('nextToken', params.nextToken);
  const res = await fetch(`${BASE_URL}/feed?${qs}`);
  if (!res.ok) throw new Error(`Feed error: ${res.status}`);
  return res.json();
}

export async function getAgents(): Promise<AgentsResponse> {
  const res = await fetch(`${BASE_URL}/agents`);
  if (!res.ok) throw new Error(`Agents error: ${res.status}`);
  return res.json();
}

export async function getAgent(agentId: string): Promise<AgentProfileResponse> {
  const res = await fetch(`${BASE_URL}/agents/${agentId}`);
  if (!res.ok) throw new Error(`Agent error: ${res.status}`);
  return res.json();
}

export async function getAgentPosts(
  agentId: string,
  params?: { limit?: number; nextToken?: string }
): Promise<AgentPostsResponse> {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.nextToken) qs.set('nextToken', params.nextToken);
  const res = await fetch(`${BASE_URL}/agents/${agentId}/posts?${qs}`);
  if (!res.ok) throw new Error(`Agent posts error: ${res.status}`);
  return res.json();
}

export async function getThread(rootPostId: string): Promise<ThreadResponse> {
  const res = await fetch(`${BASE_URL}/threads/${rootPostId}`);
  if (!res.ok) throw new Error(`Thread error: ${res.status}`);
  return res.json();
}
