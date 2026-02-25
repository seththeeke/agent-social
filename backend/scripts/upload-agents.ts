/**
 * Upload all agent JSON files from scripts/agents/ to the DynamoDB Agents table.
 * Overwrites existing items with the same agentId.
 *
 * Usage: from repo root:
 *   AGENTS_TABLE_NAME=agent-social-agents cd backend && npx ts-node scripts/upload-agents.ts
 *
 * Or from backend with table name in env:
 *   AGENTS_TABLE_NAME=agent-social-agents npm run upload-agents
 */

import * as path from 'path';
import * as fs from 'fs';
import { AgentDao } from '../lib/agent-dao';
import type { Agent } from '@agent-social/shared';

const TABLE_NAME = process.env.AGENTS_TABLE_NAME;
if (!TABLE_NAME) {
  console.error('Set AGENTS_TABLE_NAME (e.g. agent-social-agents)');
  process.exit(1);
}

// scripts/agents relative to repo root; when run from backend, cwd is backend
const agentsDir =
  process.cwd().endsWith('backend')
    ? path.join(process.cwd(), '..', 'scripts', 'agents')
    : path.join(process.cwd(), 'scripts', 'agents');

if (!fs.existsSync(agentsDir)) {
  console.error('Agents directory not found:', agentsDir);
  process.exit(1);
}

const dao = new AgentDao({ tableName: TABLE_NAME });

function loadAgents(): Agent[] {
  const files = fs.readdirSync(agentsDir).filter((f) => f.endsWith('.json'));
  const agents: Agent[] = [];

  for (const file of files) {
    const filePath = path.join(agentsDir, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw) as Record<string, unknown>;

    const agentId = (data.agentId as string) ?? path.basename(file, '.json');
    const agent: Agent = {
      agentId,
      version: typeof data.version === 'number' ? data.version : 1,
      personaName: String(data.personaName ?? ''),
      personaPrompt: String(data.personaPrompt ?? ''),
      interests: Array.isArray(data.interests) ? (data.interests as string[]) : [],
      topics: Array.isArray(data.topics) ? (data.topics as string[]) : [],
      rssFeeds: Array.isArray(data.rssFeeds) ? (data.rssFeeds as string[]) : [],
      followingList: Array.isArray(data.followingList)
        ? (data.followingList as string[])
        : [],
      postingFrequency:
        typeof data.postingFrequency === 'number' ? data.postingFrequency : 50,
      searchFrequency:
        typeof data.searchFrequency === 'number' ? data.searchFrequency : 50,
      avatarUrl: String(data.avatarUrl ?? ''),
      createdAt:
        typeof data.createdAt === 'string'
          ? data.createdAt
          : new Date().toISOString(),
    };
    agents.push(agent);
  }

  return agents;
}

async function main(): Promise<void> {
  const agents = loadAgents();
  if (agents.length === 0) {
    console.log('No agent JSON files found in', agentsDir);
    return;
  }

  console.log(`Uploading ${agents.length} agent(s) to ${TABLE_NAME}...`);
  for (const agent of agents) {
    await dao.putAgent(agent);
    console.log(`  ${agent.agentId} (v${agent.version})`);
  }
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
