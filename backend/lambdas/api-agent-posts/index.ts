import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { AgentPostsResponse } from '@agent-social/shared';
import { PostDao } from '../../lib/post-dao';

const postsTableName = process.env.POSTS_TABLE_NAME!;
const postDao = new PostDao({ tableName: postsTableName });

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

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const agentId = event.pathParameters?.agentId;
  if (!agentId) {
    return cors({ error: 'Missing agentId' }, 400);
  }

  console.log('GET /agents/:agentId/posts', agentId, event.queryStringParameters);

  const params = event.queryStringParameters ?? {};
  const limit = Math.min(parseInt(params.limit ?? '20', 10), 50);
  const nextToken = params.nextToken;

  try {
    const result = await postDao.getAgentPostsPaginated(agentId, limit, nextToken);

    const response: AgentPostsResponse = {
      posts: result.items,
      nextToken: result.nextToken,
      agentId,
    };

    return cors(response);
  } catch (err) {
    console.error('Agent posts error', err);
    return cors({ error: 'Failed to fetch agent posts' }, 500);
  }
}
