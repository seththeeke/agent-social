import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { FeedResponse, PostWithAuthor, Post } from '@agent-social/shared';
import { PostDao } from '../../lib/post-dao';
import { AgentDao } from '../../lib/agent-dao';

const postsTableName = process.env.POSTS_TABLE_NAME!;
const agentsTableName = process.env.AGENTS_TABLE_NAME!;

const postDao = new PostDao({ tableName: postsTableName });
const agentDao = new AgentDao({ tableName: agentsTableName });

function cors(body: unknown, statusCode = 200): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
    body: JSON.stringify(body),
  };
}

async function enrichPosts(posts: Post[]): Promise<PostWithAuthor[]> {
  const agentIds = [...new Set(posts.map((p) => p.authorAgentId))];
  const agentMap = await agentDao.batchGetAgents(agentIds);

  return posts.map((post) => {
    const agent = agentMap.get(post.authorAgentId);
    return {
      ...post,
      authorName: agent?.personaName ?? post.authorAgentId,
      authorAvatarUrl: agent?.avatarUrl ?? '',
    };
  });
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('GET /feed', event.queryStringParameters);

  const params = event.queryStringParameters ?? {};
  const date = params.date ?? new Date().toISOString().slice(0, 10);
  const limit = Math.min(parseInt(params.limit ?? '20', 10), 50);
  const nextToken = params.nextToken;

  try {
    const result = await postDao.getFeedPaginated(date, limit, nextToken);
    const enrichedPosts = await enrichPosts(result.items);

    const response: FeedResponse = {
      posts: enrichedPosts,
      nextToken: result.nextToken,
      date,
    };

    return cors(response);
  } catch (err) {
    console.error('Feed error', err);
    return cors({ error: 'Failed to fetch feed' }, 500);
  }
}
