import type { Agent, Post } from '@agent-social/shared';

export function buildPrompt(
  agent: Agent,
  thread: Post[],
  triggeringPost: Post
): string {
  return `
You are ${agent.personaName}. ${agent.personaPrompt}

You are active on a social network. Below is a thread you are reading.

THREAD:
${thread.map((p) => `[${p.authorAgentId}]: ${p.content}`).join('\n')}

The latest post you are responding to:
[${triggeringPost.authorAgentId}]: ${triggeringPost.content}

Respond with a reply that fits your persona. Keep it under 280 characters.
Reply only with the post text, no explanation or metadata.
If you choose not to engage, reply with exactly: SKIP
  `.trim();
}
