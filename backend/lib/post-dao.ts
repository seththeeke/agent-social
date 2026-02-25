import {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { Post } from '@agent-social/shared';
import { randomUUID } from 'crypto';

const POST_PK_PREFIX = 'POST#';
const SK_METADATA = 'METADATA';
const THREAD_INDEX = 'ThreadIndex';
const AGENT_POSTS_INDEX = 'AgentPostsIndex';
const FEED_INDEX = 'FeedIndex';

/** DDB item shape for Posts table (PascalCase + GSI keys). */
interface PostItem {
  PK: string;
  SK: string;
  AuthorAgentId: string;
  Content: string;
  ParentPostId?: string;
  RootPostId: string;
  Hashtags: string[];
  Mentions: string[];
  LikeCount: number;
  RepostCount: number;
  CreatedAt: string;
  DatePartition: string;
  threadPk: string;
  authorPk: string;
  feedPk: string;
}

function itemToPost(item: PostItem): Post {
  const postId = item.PK.startsWith(POST_PK_PREFIX)
    ? item.PK.slice(POST_PK_PREFIX.length)
    : item.PK;
  return {
    postId,
    authorAgentId: item.AuthorAgentId,
    content: item.Content,
    parentPostId: item.ParentPostId ?? null,
    rootPostId: item.RootPostId,
    hashtags: item.Hashtags ?? [],
    mentions: item.Mentions ?? [],
    likeCount: item.LikeCount ?? 0,
    repostCount: item.RepostCount ?? 0,
    createdAt: item.CreatedAt,
    datePartition: item.DatePartition,
  };
}

export interface PostDaoOptions {
  tableName: string;
  client?: DynamoDBClient;
}

export interface MakePostParams {
  authorAgentId: string;
  content: string;
  parentPostId?: string;
  rootPostId?: string;
  hashtags?: string[];
  mentions?: string[];
}

export interface PaginatedResult<T> {
  items: T[];
  nextToken: string | null;
}

export class PostDao {
  private readonly tableName: string;
  private readonly client: DynamoDBClient;

  constructor(options: PostDaoOptions) {
    this.tableName = options.tableName;
    this.client = options.client ?? new DynamoDBClient({});
  }

  async makePost(params: MakePostParams): Promise<Post> {
    const postId = randomUUID();
    const createdAt = new Date().toISOString();
    const datePartition = createdAt.slice(0, 10); // YYYY-MM-DD
    const rootPostId = params.rootPostId ?? postId;
    const parentPostId = params.parentPostId ?? undefined;

    const item: PostItem = {
      PK: `${POST_PK_PREFIX}${postId}`,
      SK: SK_METADATA,
      AuthorAgentId: params.authorAgentId,
      Content: params.content,
      RootPostId: rootPostId,
      Hashtags: params.hashtags ?? [],
      Mentions: params.mentions ?? [],
      LikeCount: 0,
      RepostCount: 0,
      CreatedAt: createdAt,
      DatePartition: datePartition,
      threadPk: `ROOT#${rootPostId}`,
      authorPk: `AUTHOR#${params.authorAgentId}`,
      feedPk: `DATE#${datePartition}`,
    };
    if (parentPostId != null) item.ParentPostId = parentPostId;

    await this.client.send(
      new PutItemCommand({
        TableName: this.tableName,
        Item: marshall(item, { removeUndefinedValues: true }),
      })
    );

    return {
      postId,
      authorAgentId: params.authorAgentId,
      content: params.content,
      parentPostId: parentPostId ?? null,
      rootPostId,
      hashtags: item.Hashtags,
      mentions: item.Mentions,
      likeCount: 0,
      repostCount: 0,
      createdAt,
      datePartition,
    };
  }

  async getThread(rootPostId: string): Promise<Post[]> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: THREAD_INDEX,
        KeyConditionExpression: 'threadPk = :pk',
        ExpressionAttributeValues: marshall({
          ':pk': `ROOT#${rootPostId}`,
        }),
      })
    );

    if (!result.Items?.length) return [];
    // ThreadIndex sort key is CreatedAt; Query returns oldest-first by default
    return result.Items.map((i) => itemToPost(unmarshall(i) as PostItem));
  }

  async getFeed(date: string): Promise<Post[]> {
    // date should be YYYY-MM-DD
    const feedPk = date.includes('#') ? date : `DATE#${date}`;
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: FEED_INDEX,
        KeyConditionExpression: 'feedPk = :pk',
        ExpressionAttributeValues: marshall({
          ':pk': feedPk,
        }),
      })
    );

    if (!result.Items?.length) return [];
    return result.Items.map((i) => itemToPost(unmarshall(i) as PostItem));
  }

  async getFeedPaginated(
    date: string,
    limit: number = 20,
    nextToken?: string
  ): Promise<PaginatedResult<Post>> {
    const feedPk = date.includes('#') ? date : `DATE#${date}`;
    const exclusiveStartKey = nextToken
      ? JSON.parse(Buffer.from(nextToken, 'base64').toString('utf-8'))
      : undefined;

    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: FEED_INDEX,
        KeyConditionExpression: 'feedPk = :pk',
        FilterExpression: 'attribute_not_exists(ParentPostId)',
        ExpressionAttributeValues: marshall({ ':pk': feedPk }),
        ScanIndexForward: false, // newest first
        Limit: limit,
        ExclusiveStartKey: exclusiveStartKey,
      })
    );

    const items = result.Items?.map((i) => itemToPost(unmarshall(i) as PostItem)) ?? [];
    const newToken = result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : null;

    return { items, nextToken: newToken };
  }

  async getAgentPosts(agentId: string): Promise<Post[]> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: AGENT_POSTS_INDEX,
        KeyConditionExpression: 'authorPk = :pk',
        ExpressionAttributeValues: marshall({
          ':pk': `AUTHOR#${agentId}`,
        }),
        ScanIndexForward: false, // newest first
      })
    );

    if (!result.Items?.length) return [];
    return result.Items.map((i) => itemToPost(unmarshall(i) as PostItem));
  }

  async getAgentPostsPaginated(
    agentId: string,
    limit: number = 20,
    nextToken?: string
  ): Promise<PaginatedResult<Post>> {
    const exclusiveStartKey = nextToken
      ? JSON.parse(Buffer.from(nextToken, 'base64').toString('utf-8'))
      : undefined;

    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: AGENT_POSTS_INDEX,
        KeyConditionExpression: 'authorPk = :pk',
        ExpressionAttributeValues: marshall({ ':pk': `AUTHOR#${agentId}` }),
        ScanIndexForward: false,
        Limit: limit,
        ExclusiveStartKey: exclusiveStartKey,
      })
    );

    const items = result.Items?.map((i) => itemToPost(unmarshall(i) as PostItem)) ?? [];
    const newToken = result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : null;

    return { items, nextToken: newToken };
  }
}
