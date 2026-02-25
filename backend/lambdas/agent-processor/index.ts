import type { SQSEvent, SQSRecord } from 'aws-lambda';
import type { Agent, NewPostEvent, Post } from '@agent-social/shared';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { AgentDao } from '../../lib/agent-dao';
import { PostDao } from '../../lib/post-dao';
import { buildPrompt } from './prompt-builder';

const QUEUE_NAME_PREFIX = 'agent-social-agent-';

const agentsTableName = process.env.AGENTS_TABLE_NAME!;
const postsTableName = process.env.POSTS_TABLE_NAME!;
const modelId = process.env.BEDROCK_MODEL_ID ?? 'anthropic.claude-3-haiku-20240307-v1:0';
const maxThreadDepth = parseInt(process.env.MAX_THREAD_DEPTH ?? '10', 10);

const bedrock = new BedrockRuntimeClient({});
const agentDao = new AgentDao({ tableName: agentsTableName });
const postDao = new PostDao({ tableName: postsTableName });

function agentIdFromQueueArn(eventSourceArn: string): string {
  const name = eventSourceArn.split(':').pop() ?? '';
  if (name.startsWith(QUEUE_NAME_PREFIX)) {
    return name.slice(QUEUE_NAME_PREFIX.length);
  }
  return name;
}

function shouldEngage(
  agent: Agent,
  event: NewPostEvent,
  thread: Post[]
): boolean {
  if (event.authorAgentId === agent.agentId) return false;
  if (thread.length >= maxThreadDepth) return false;

  const followsAuthor = agent.followingList.includes(event.authorAgentId);
  const interestMatch = event.hashtags.some((h) => agent.interests.includes(h));
  if (!followsAuthor && !interestMatch) return false;

  return Math.random() < agent.postingFrequency / 100;
}

function parseNovaResponseBody(body: Uint8Array): string {
  const decoded = new TextDecoder().decode(body);
  const parsed = JSON.parse(decoded) as {
    output?: { message?: { content?: Array<{ text?: string }> } };
  };
  const content = parsed.output?.message?.content;
  if (!Array.isArray(content) || content.length === 0) return '';
  const first = content[0];
  if (typeof first?.text === 'string') {
    return first.text.trim();
  }
  return '';
}

export async function handler(event: SQSEvent): Promise<void> {
  console.log('Agent processor invoked', 'recordCount', event.Records.length);
  for (const record of event.Records) {
    await processRecord(record);
  }
}

async function processRecord(record: SQSRecord): Promise<void> {
  const agentId = agentIdFromQueueArn(record.eventSourceARN);
  if (!agentId) {
    console.log('Could not derive agentId from queue ARN');
    return;
  }

  let newPostEvent: NewPostEvent;
  try {
    newPostEvent = JSON.parse(record.body) as NewPostEvent;
  } catch {
    console.log('Invalid SQS body for agent', agentId);
    return;
  }
  if (newPostEvent.eventType !== 'NEW_POST') {
    console.log('Skip non NEW_POST event for agent', agentId);
    return;
  }

  console.log('Processing', agentId, 'postId', newPostEvent.postId, 'rootPostId', newPostEvent.rootPostId);

  const agent = await agentDao.getAgent(agentId);
  if (!agent) {
    console.log('Agent not found', agentId);
    return;
  }

  const thread = await postDao.getThread(newPostEvent.rootPostId);
  const triggeringPost = thread.find((p) => p.postId === newPostEvent.postId);
  if (!triggeringPost) {
    console.log('Triggering post not in thread', newPostEvent.postId, 'agent', agentId);
    return;
  }

  if (!shouldEngage(agent, newPostEvent, thread)) {
    console.log('Skip engage for agent', agentId, 'postId', newPostEvent.postId);
    return;
  }

  console.log('Engaging agent', agentId, 'replying to', newPostEvent.postId);
  const prompt = buildPrompt(agent, thread, triggeringPost);

  const response = await bedrock.send(
    new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        messages: [
          { role: 'user', content: [{ text: prompt }] },
        ],
        inferenceConfig: {
          maxTokens: 150,
        },
      }),
    })
  );

  if (!response.body) {
    console.log('No Bedrock response body for agent', agentId);
    return;
  }

  const replyText = parseNovaResponseBody(response.body);
  if (!replyText || replyText.toUpperCase() === 'SKIP') {
    console.log('Skip reply for agent', agentId, replyText ? 'model returned SKIP' : 'empty response');
    return;
  }

  const post = await postDao.makePost({
    authorAgentId: agent.agentId,
    content: replyText.slice(0, 280),
    parentPostId: newPostEvent.postId,
    rootPostId: newPostEvent.rootPostId,
  });
  console.log('Posted reply for agent', agentId, 'postId', post.postId);
}
