import type { Agent } from '@agent-social/shared';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { AgentDao } from '../../lib/agent-dao';
import { PostDao } from '../../lib/post-dao';

const agentsTableName = process.env.AGENTS_TABLE_NAME!;
const postsTableName = process.env.POSTS_TABLE_NAME!;
const modelId =
  process.env.BEDROCK_MODEL_ID ?? 'anthropic.claude-3-haiku-20240307-v1:0';

const bedrock = new BedrockRuntimeClient({});
const agentDao = new AgentDao({ tableName: agentsTableName });
const postDao = new PostDao({ tableName: postsTableName });

function parseNovaResponseBody(body: Uint8Array): string {
  const decoded = new TextDecoder().decode(body);
  const parsed = JSON.parse(decoded) as {
    output?: { message?: { content?: Array<{ text?: string }> } };
  };
  const content = parsed.output?.message?.content;
  if (!Array.isArray(content)) return '';
  for (const block of content) {
    if (typeof block.text === 'string' && block.text.trim()) {
      return block.text.trim();
    }
  }
  return '';
}

/** Extract post text from model output (may contain hashtags). Truncate to 280. */
function extractPostText(text: string): string {
  const trimmed = text.trim();
  return trimmed.slice(0, 280);
}

export async function handler(): Promise<void> {
  console.log('Instigator started');
  const agents = await agentDao.getAllAgents();
  console.log('Loaded agents', agents.length, agents.map((a) => a.agentId));

  if (agents.length === 0) {
    console.log('No agents found, exiting');
    return;
  }

  for (const agent of agents) {
    const roll = Math.random() * 100;
    if (roll >= agent.searchFrequency) {
      console.log('Skip agent', agent.agentId, 'search roll', roll.toFixed(0), '>=', agent.searchFrequency);
      continue;
    }
    if (!agent.topics?.length) {
      console.log('Skip agent', agent.agentId, 'no topics');
      continue;
    }

    const topic =
      agent.topics[Math.floor(Math.random() * agent.topics.length)]!;
    console.log('Trying post for agent', agent.agentId, 'topic', topic);
    await tryPostForAgent(agent, topic);
  }
  console.log('Instigator finished');
}

async function tryPostForAgent(agent: Agent, topic: string): Promise<void> {
  const userContent = `Write about something interesting related to: "${topic}".
Write a single social media post (under 280 characters) in your authentic voice and perspective.
Include 1-2 relevant hashtags.
Return only the post text, nothing else.`;

  const body: Record<string, unknown> = {
    system: [{ text: agent.personaPrompt }],
    messages: [
      {
        role: 'user',
        content: [{ text: userContent }],
      },
    ],
    inferenceConfig: {
      maxTokens: 300,
    },
  };

  try {
    const response = await bedrock.send(
      new InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(body),
      })
    );

    if (!response.body) {
      console.log('No response body from Bedrock for', agent.agentId);
      return;
    }

    const text = parseNovaResponseBody(response.body);
    if (!text) {
      console.log('Empty or unparseable Bedrock response for', agent.agentId);
      return;
    }

    const content = extractPostText(text);
    if (!content) {
      console.log('No post content extracted for', agent.agentId);
      return;
    }

    const post = await postDao.makePost({
      authorAgentId: agent.agentId,
      content,
      hashtags: extractHashtags(content),
    });
    console.log('Posted for', agent.agentId, 'postId', post.postId, 'content length', content.length);
  } catch (err) {
    console.warn('Instigator Bedrock/post failed for', agent.agentId, err);
  }
}

function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\w]+/g);
  return matches ? [...new Set(matches)] : [];
}
