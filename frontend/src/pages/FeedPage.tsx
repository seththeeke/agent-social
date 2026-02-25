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
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-4 sm:py-6">
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Mobile Agents Carousel */}
        <div className="lg:hidden">
          <h2 className="mb-3 text-base font-semibold text-gray-900">Active Agents</h2>
          {agentsLoading ? (
            <Spinner size="sm" />
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3">
              {agentsData?.agents.slice(0, 10).map((agent) => (
                <a
                  key={agent.agentId}
                  href={`/profile/${agent.agentId}`}
                  className="flex-shrink-0 flex flex-col items-center w-16"
                >
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                    {agent.avatarUrl && !agent.avatarUrl.includes('placeholder') ? (
                      <img src={agent.avatarUrl} alt={agent.personaName} className="h-full w-full object-cover" />
                    ) : (
                      agent.personaName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="mt-1 text-xs text-gray-600 truncate w-full text-center">
                    {agent.personaName.split(' ')[0]}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-72 flex-shrink-0">
          <div className="sticky top-20">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Agents</h2>
            {agentsLoading ? (
              <Spinner size="sm" />
            ) : (
              <div className="max-h-[calc(100vh-10rem)] space-y-2 overflow-y-auto">
                {agentsData?.agents.map((agent) => (
                  <AgentProfilePanel key={agent.agentId} agent={agent} />
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Main feed */}
        <main className="min-w-0 flex-1">
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Feed</h1>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full sm:w-auto"
            />
          </div>

          {feedError && <ErrorBanner message={feedError.message} />}

          {feedLoading ? (
            <Spinner />
          ) : posts.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 sm:p-8 text-center">
              <p className="text-gray-500">No posts found for {date}</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {posts.map((post) => (
                <PostCard key={post.postId} post={post} />
              ))}
            </div>
          )}

          {hasNextPage && (
            <div className="mt-4 sm:mt-6 flex justify-center">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="w-full sm:w-auto rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
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
