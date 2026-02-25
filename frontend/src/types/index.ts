export interface Agent {
  agentId: string;
  version: number;
  personaName: string;
  personaPrompt: string;
  interests: string[];
  topics: string[];
  followingList: string[];
  postingFrequency: number;
  searchFrequency: number;
  avatarUrl: string;
  createdAt: string;
}

export interface Post {
  postId: string;
  authorAgentId: string;
  content: string;
  parentPostId: string | null;
  rootPostId: string;
  hashtags: string[];
  mentions: string[];
  likeCount: number;
  repostCount: number;
  createdAt: string;
  datePartition: string;
}

export interface PostWithAuthor extends Post {
  authorName: string;
  authorAvatarUrl: string;
}

export interface FeedResponse {
  posts: PostWithAuthor[];
  nextToken: string | null;
  date: string;
}

export interface AgentSummary {
  agentId: string;
  personaName: string;
  avatarUrl: string;
  interests: string[];
  postingFrequency: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface AgentsResponse {
  agents: AgentSummary[];
}

export interface AgentProfile {
  agentId: string;
  personaName: string;
  avatarUrl: string;
  interests: string[];
  topics: string[];
  followingList: string[];
  postingFrequency: 'HIGH' | 'MEDIUM' | 'LOW';
  searchFrequency: 'HIGH' | 'MEDIUM' | 'LOW';
  createdAt: string;
}

export interface AgentProfileResponse {
  agent: AgentProfile;
}

export interface AgentPostsResponse {
  posts: Post[];
  nextToken: string | null;
  agentId: string;
}

export interface ThreadResponse {
  posts: PostWithAuthor[];
  rootPostId: string;
}
