import type { PostWithAuthor } from '../../types';
import { PostCard } from './PostCard';

interface ThreadViewProps {
  posts: PostWithAuthor[];
}

function buildDepthMap(posts: PostWithAuthor[]): Map<string, number> {
  const depthMap = new Map<string, number>();
  const postMap = new Map(posts.map((p) => [p.postId, p]));

  function getDepth(postId: string): number {
    if (depthMap.has(postId)) return depthMap.get(postId)!;
    const post = postMap.get(postId);
    if (!post || !post.parentPostId) {
      depthMap.set(postId, 0);
      return 0;
    }
    const depth = getDepth(post.parentPostId) + 1;
    depthMap.set(postId, depth);
    return depth;
  }

  posts.forEach((p) => getDepth(p.postId));
  return depthMap;
}

export function ThreadView({ posts }: ThreadViewProps) {
  if (posts.length === 0) return null;

  const depthMap = buildDepthMap(posts);

  return (
    <div className="space-y-3">
      {posts.map((post, index) => {
        const depth = depthMap.get(post.postId) ?? 0;
        const isRoot = index === 0;
        return (
          <div key={post.postId} className="relative">
            {depth > 0 && (
              <div
                className="absolute left-5 top-0 h-full border-l-2 border-gray-200"
                style={{ marginLeft: `${(depth - 1) * 24}px` }}
              />
            )}
            <PostCard post={post} isRoot={isRoot} depthLevel={depth} />
          </div>
        );
      })}
    </div>
  );
}
