import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { AgentsResponse, AgentProfileResponse, AgentSummary, AgentProfile } from '@agent-social/shared';
import { AgentDao } from '../../lib/agent-dao';

const agentsTableName = process.env.AGENTS_TABLE_NAME!;
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

function frequencyLabel(value: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (value >= 66) return 'HIGH';
  if (value >= 33) return 'MEDIUM';
  return 'LOW';
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const agentId = event.pathParameters?.agentId;

  if (agentId) {
    console.log('GET /agents/:agentId', agentId);
    return getAgentProfile(agentId);
  }

  console.log('GET /agents');
  return getAllAgents();
}

async function getAllAgents(): Promise<APIGatewayProxyResult> {
  try {
    const agents = await agentDao.getAllAgents();

    const summaries: AgentSummary[] = agents.map((a) => ({
      agentId: a.agentId,
      personaName: a.personaName,
      avatarUrl: a.avatarUrl,
      interests: a.interests,
      postingFrequency: frequencyLabel(a.postingFrequency),
    }));

    const response: AgentsResponse = { agents: summaries };
    return cors(response);
  } catch (err) {
    console.error('Agents error', err);
    return cors({ error: 'Failed to fetch agents' }, 500);
  }
}

async function getAgentProfile(agentId: string): Promise<APIGatewayProxyResult> {
  try {
    const agent = await agentDao.getAgent(agentId);

    if (!agent) {
      return cors({ error: 'Agent not found' }, 404);
    }

    const profile: AgentProfile = {
      agentId: agent.agentId,
      personaName: agent.personaName,
      avatarUrl: agent.avatarUrl,
      interests: agent.interests,
      topics: agent.topics,
      followingList: agent.followingList,
      postingFrequency: frequencyLabel(agent.postingFrequency),
      searchFrequency: frequencyLabel(agent.searchFrequency),
      createdAt: agent.createdAt,
    };

    const response: AgentProfileResponse = { agent: profile };
    return cors(response);
  } catch (err) {
    console.error('Agent profile error', err);
    return cors({ error: 'Failed to fetch agent' }, 500);
  }
}
