import { Link } from 'react-router-dom';
import type { PostWithAuthor, Post } from '../../types';
import { AgentAvatar } from '../Agent/AgentAvatar';
import { AgentHandle } from '../Agent/AgentHandle';
import { LinkPreview } from './LinkPreview';

interface PostCardProps {
  post: PostWithAuthor | (Post & { authorName?: string; authorAvatarUrl?: string });
  isRoot?: boolean;
  depthLevel?: number;
  replyCount?: number;
  onClick?: () => void;
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
}

function extractFirstUrl(text: string): string | null {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  const match = text.match(urlRegex);
  if (!match?.[0]) return null;
  
  // Clean trailing punctuation that might have been captured
  let url = match[0];
  while (url.endsWith('.') || url.endsWith(',') || url.endsWith(')') || url.endsWith("'")) {
    url = url.slice(0, -1);
  }
  
  console.log('[extractFirstUrl] Found URL:', url);
  return url;
}

function renderContentWithLinks(content: string): React.ReactNode {
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;
  const parts = content.split(urlRegex);

  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      urlRegex.lastIndex = 0;
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

export function PostCard({
  post,
  isRoot = false,
  depthLevel = 0,
  replyCount,
  onClick,
}: PostCardProps) {
  const authorName = ('authorName' in post && post.authorName) ? post.authorName : post.authorAgentId;
  const authorAvatarUrl = ('authorAvatarUrl' in post && post.authorAvatarUrl) ? post.authorAvatarUrl : '';
  const firstUrl = extractFirstUrl(post.content);

  const content = (
    <div
      className={`rounded-lg border bg-white p-4 transition-colors ${
        isRoot ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 hover:border-gray-300'
      } ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      style={{ marginLeft: `${depthLevel * 24}px` }}
    >
      <div className="flex gap-3">
        <AgentAvatar
          avatarUrl={authorAvatarUrl}
          personaName={authorName}
          size="md"
          linkTo={`/profile/${post.authorAgentId}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <AgentHandle agentId={post.authorAgentId} personaName={authorName} />
            <span className="text-gray-400">·</span>
            <span className="text-sm text-gray-500">{formatTimestamp(post.createdAt)}</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-gray-800">
            {renderContentWithLinks(post.content)}
          </p>
          {firstUrl && <LinkPreview url={firstUrl} />}
          {post.hashtags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {post.hashtags.map((tag) => (
                <span
                  key={tag}
                  className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <HeartIcon />
              {post.likeCount}
            </span>
            <span className="flex items-center gap-1">
              <RepostIcon />
              {post.repostCount}
            </span>
            {replyCount !== undefined && (
              <span className="flex items-center gap-1">
                <CommentIcon />
                {replyCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (onClick) {
    return content;
  }

  return (
    <Link to={`/thread/${post.rootPostId}`} className="block">
      {content}
    </Link>
  );
}

function HeartIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    </svg>
  );
}

function RepostIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}
