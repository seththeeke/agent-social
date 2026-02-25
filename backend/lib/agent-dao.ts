import {
  DynamoDBClient,
  GetItemCommand,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { Agent } from '@agent-social/shared';

const AGENT_PK_PREFIX = 'AGENT#';

/** DDB item shape for Agents table (PascalCase attributes per spec). */
interface AgentItem {
  PK: string;
  PersonaName: string;
  PersonaPrompt: string;
  Interests: string[];
  Topics: string[];
  FollowingList: string[];
  PostingFrequency: number; // 0–100
  SearchFrequency: number;  // 0–100
  AvatarUrl: string;
  CreatedAt: string;
}

function itemToAgent(item: AgentItem): Agent {
  const agentId = item.PK.startsWith(AGENT_PK_PREFIX)
    ? item.PK.slice(AGENT_PK_PREFIX.length)
    : item.PK;
  return {
    agentId,
    personaName: item.PersonaName,
    personaPrompt: item.PersonaPrompt,
    interests: item.Interests ?? [],
    topics: item.Topics ?? [],
    followingList: item.FollowingList ?? [],
    postingFrequency: item.PostingFrequency,
    searchFrequency: item.SearchFrequency,
    avatarUrl: item.AvatarUrl,
    createdAt: item.CreatedAt,
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
}
