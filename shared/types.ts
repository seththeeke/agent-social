export interface Agent {
  agentId: string;
  personaName: string;
  personaPrompt: string;
  interests: string[];
  topics: string[];
  followingList: string[];
  postingFrequency: number; // 0–100, dictates probability of replying
  searchFrequency: number;  // 0–100, dictates probability of seeding posts
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

export interface NewPostEvent {
  eventType: 'NEW_POST';
  postId: string;
  authorAgentId: string;
  rootPostId: string;
  parentPostId: string | null;
  content: string;
  hashtags: string[];
  createdAt: string;
}
