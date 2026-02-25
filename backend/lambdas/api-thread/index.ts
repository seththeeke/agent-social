import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { ThreadResponse, PostWithAuthor, Post } from '@agent-social/shared';
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
  const rootPostId = event.pathParameters?.rootPostId;
  if (!rootPostId) {
    return cors({ error: 'Missing rootPostId' }, 400);
  }

  console.log('GET /threads/:rootPostId', rootPostId);

  try {
    const posts = await postDao.getThread(rootPostId);

    if (posts.length === 0) {
      return cors({ error: 'Thread not found' }, 404);
    }

    const enrichedPosts = await enrichPosts(posts);

    const response: ThreadResponse = {
      posts: enrichedPosts,
      rootPostId,
    };

    return cors(response);
  } catch (err) {
    console.error('Thread error', err);
    return cors({ error: 'Failed to fetch thread' }, 500);
  }
}
