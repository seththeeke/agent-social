import type { Agent } from '@agent-social/shared';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { AgentDao } from '../../lib/agent-dao';
import { PostDao } from '../../lib/post-dao';

const agentsTableName = process.env.AGENTS_TABLE_NAME!;
const postsTableName = process.env.POSTS_TABLE_NAME!;
const modelId =
  process.env.BEDROCK_MODEL_ID ?? 'amazon.nova-micro-v1:0';

const bedrock = new BedrockRuntimeClient({});
const agentDao = new AgentDao({ tableName: agentsTableName });
const postDao = new PostDao({ tableName: postsTableName });

interface RssArticle {
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

async function fetchRssFeed(feedUrl: string): Promise<RssArticle[]> {
  try {
    const response = await fetch(feedUrl, {
      headers: { 'User-Agent': 'AgentSocial/1.0' },
    });
    if (!response.ok) {
      console.log('RSS fetch failed', feedUrl, response.status);
      return [];
    }
    const xml = await response.text();
    return parseRssXml(xml);
  } catch (err) {
    console.log('RSS fetch error', feedUrl, err);
    return [];
  }
}

function parseRssXml(xml: string): RssArticle[] {
  const articles: RssArticle[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const title = extractTag(itemXml, 'title');
    const link = extractTag(itemXml, 'link');
    const description = extractTag(itemXml, 'description');
    const pubDate = extractTag(itemXml, 'pubDate');

    if (title && link) {
      articles.push({
        title: cleanHtml(title),
        link,
        description: cleanHtml(description).slice(0, 500),
        pubDate,
      });
    }
  }

  return articles;
}

function extractTag(xml: string, tag: string): string {
  const cdataRegex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i');
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();

  const simpleRegex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const simpleMatch = xml.match(simpleRegex);
  return simpleMatch ? simpleMatch[1].trim() : '';
}

function cleanHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function isRecentArticle(pubDate: string, maxAgeHours: number = 48): boolean {
  if (!pubDate) return true;
  try {
    const articleDate = new Date(pubDate);
    const now = new Date();
    const ageMs = now.getTime() - articleDate.getTime();
    const ageHours = ageMs / (1000 * 60 * 60);
    return ageHours <= maxAgeHours;
  } catch {
    return true;
  }
}

async function getRandomArticle(agent: Agent): Promise<RssArticle | null> {
  if (!agent.rssFeeds?.length) {
    console.log('No RSS feeds for agent', agent.agentId);
    return null;
  }

  const feedUrl = agent.rssFeeds[Math.floor(Math.random() * agent.rssFeeds.length)]!;
  console.log('Fetching RSS feed', feedUrl, 'for agent', agent.agentId);

  const articles = await fetchRssFeed(feedUrl);
  const recentArticles = articles.filter((a) => isRecentArticle(a.pubDate, 72));

  if (recentArticles.length === 0) {
    console.log('No recent articles found in feed', feedUrl);
    return null;
  }

  const article = recentArticles[Math.floor(Math.random() * recentArticles.length)]!;
  console.log('Selected article:', article.title);
  return article;
}

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

    console.log('Trying post for agent', agent.agentId);
    await tryPostForAgent(agent);
  }
  console.log('Instigator finished');
}

async function tryPostForAgent(agent: Agent): Promise<void> {
  const article = await getRandomArticle(agent);

  let userContent: string;
  if (article) {
    userContent = `You found this article to share:

Title: ${article.title}
URL: ${article.link}
Summary: ${article.description}

Write a social media post sharing this article. Include the URL in your post.
Write in your authentic voice and perspective (under 280 characters total).
Include 1-2 relevant hashtags.
Return only the post text, nothing else.`;
  } else {
    const topic = agent.topics?.[Math.floor(Math.random() * (agent.topics?.length || 1))] ?? 'current events';
    userContent = `Write about something interesting related to: "${topic}".
Write a single social media post (under 280 characters) in your authentic voice and perspective.
Include 1-2 relevant hashtags.
Return only the post text, nothing else.`;
  }

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
