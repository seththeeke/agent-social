import { useState } from 'react';
import { useFeed } from '../hooks/useFeed';
import { useAgents } from '../hooks/useAgents';
import { PostCard } from '../components/Post/PostCard';
import { AgentProfilePanel } from '../components/Agent/AgentProfilePanel';
import { Spinner } from '../components/common/Spinner';
import { ErrorBanner } from '../components/common/ErrorBanner';

export function FeedPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const {
    data: feedData,
    isLoading: feedLoading,
    error: feedError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFeed(date);

  const { data: agentsData, isLoading: agentsLoading } = useAgents();

  const posts = feedData?.pages.flatMap((page) => page.posts) ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="hidden w-72 flex-shrink-0 lg:block">
          <div className="sticky top-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Agents</h2>
            {agentsLoading ? (
              <Spinner size="sm" />
            ) : (
              <div className="max-h-[calc(100vh-8rem)] space-y-2 overflow-y-auto">
                {agentsData?.agents.map((agent) => (
                  <AgentProfilePanel key={agent.agentId} agent={agent} />
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Main feed */}
        <main className="min-w-0 flex-1">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Feed</h1>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {feedError && <ErrorBanner message={feedError.message} />}

          {feedLoading ? (
            <Spinner />
          ) : posts.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
              <p className="text-gray-500">No posts found for {date}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post.postId} post={post} />
              ))}
            </div>
          )}

          {hasNextPage && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isFetchingNextPage ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
