import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
  BatchGetItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { Agent } from '@agent-social/shared';

const AGENT_PK_PREFIX = 'AGENT#';

/** DDB item shape for Agents table (PascalCase attributes per spec). */
interface AgentItem {
  PK: string;
  Version: number;
  PersonaName: string;
  PersonaPrompt: string;
  Interests: string[];
  Topics: string[];
  RssFeeds: string[];
  FollowingList: string[];
  PostingFrequency: number;
  SearchFrequency: number;
  AvatarUrl: string;
  CreatedAt: string;
}

function itemToAgent(item: AgentItem): Agent {
  const agentId = item.PK.startsWith(AGENT_PK_PREFIX)
    ? item.PK.slice(AGENT_PK_PREFIX.length)
    : item.PK;
  return {
    agentId,
    version: item.Version ?? 1,
    personaName: item.PersonaName,
    personaPrompt: item.PersonaPrompt,
    interests: item.Interests ?? [],
    topics: item.Topics ?? [],
    rssFeeds: item.RssFeeds ?? [],
    followingList: item.FollowingList ?? [],
    postingFrequency: item.PostingFrequency,
    searchFrequency: item.SearchFrequency,
    avatarUrl: item.AvatarUrl,
    createdAt: item.CreatedAt,
  };
}

function agentToItem(agent: Agent): AgentItem {
  return {
    PK: `${AGENT_PK_PREFIX}${agent.agentId}`,
    Version: agent.version,
    PersonaName: agent.personaName,
    PersonaPrompt: agent.personaPrompt,
    Interests: agent.interests,
    Topics: agent.topics,
    RssFeeds: agent.rssFeeds,
    FollowingList: agent.followingList,
    PostingFrequency: agent.postingFrequency,
    SearchFrequency: agent.searchFrequency,
    AvatarUrl: agent.avatarUrl,
    CreatedAt: agent.createdAt,
  };
}

export interface AgentDaoOptions {
  tableName: string;
  client?: DynamoDBClient;
}

export class AgentDao {
  private readonly tableName: string;
  private readonly client: DynamoDBClient;

  constructor(options: AgentDaoOptions) {
    this.tableName = options.tableName;
    this.client = options.client ?? new DynamoDBClient({});
  }

  async getAgent(agentId: string): Promise<Agent | null> {
    const result = await this.client.send(
      new GetItemCommand({
        TableName: this.tableName,
        Key: marshall({
          PK: `${AGENT_PK_PREFIX}${agentId}`,
        }),
      })
    );

    if (!result.Item) return null;
    const item = unmarshall(result.Item) as AgentItem;
    return itemToAgent(item);
  }

  async getAllAgents(): Promise<Agent[]> {
    const result = await this.client.send(
      new ScanCommand({
        TableName: this.tableName,
      })
    );

    if (!result.Items?.length) return [];
    return result.Items.map((i) => itemToAgent(unmarshall(i) as AgentItem));
  }

  /** Put (create or overwrite) an agent. */
  async putAgent(agent: Agent): Promise<void> {
    await this.client.send(
      new PutItemCommand({
        TableName: this.tableName,
        Item: marshall(agentToItem(agent), { removeUndefinedValues: true }),
      })
    );
  }

  /** Batch get agents by their IDs. Returns a map of agentId -> Agent. */
  async batchGetAgents(agentIds: string[]): Promise<Map<string, Agent>> {
    if (agentIds.length === 0) return new Map();

    const uniqueIds = [...new Set(agentIds)];
    const keys = uniqueIds.map((id) => marshall({ PK: `${AGENT_PK_PREFIX}${id}` }));

    const result = await this.client.send(
      new BatchGetItemCommand({
        RequestItems: {
          [this.tableName]: { Keys: keys },
        },
      })
    );

    const agentMap = new Map<string, Agent>();
    const items = result.Responses?.[this.tableName] ?? [];
    for (const item of items) {
      const agent = itemToAgent(unmarshall(item) as AgentItem);
      agentMap.set(agent.agentId, agent);
    }
    return agentMap;
  }
}
