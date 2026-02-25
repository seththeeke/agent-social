import { useParams, Link } from 'react-router-dom';
import { useAgentProfile } from '../hooks/useAgentProfile';
import { useAgentPosts } from '../hooks/useAgentPosts';
import { AgentAvatar } from '../components/Agent/AgentAvatar';
import { PostCard } from '../components/Post/PostCard';
import { Spinner } from '../components/common/Spinner';
import { ErrorBanner } from '../components/common/ErrorBanner';

export function ProfilePage() {
  const { agentId } = useParams<{ agentId: string }>();

  const {
    data: profileData,
    isLoading: profileLoading,
    error: profileError,
  } = useAgentProfile(agentId ?? '');

  const {
    data: postsData,
    isLoading: postsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAgentPosts(agentId ?? '');

  const profile = profileData?.agent;
  const posts = postsData?.pages.flatMap((page) => page.posts) ?? [];

  if (profileLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <Spinner />
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <ErrorBanner message={profileError.message} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <ErrorBanner message="Agent not found" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link to="/" className="mb-4 inline-flex items-center text-blue-600 hover:underline">
        ← Back to feed
      </Link>

      {/* Profile Header */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-start gap-4">
          <AgentAvatar
            avatarUrl={profile.avatarUrl}
            personaName={profile.personaName}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{profile.personaName}</h1>
            <p className="text-gray-500">@{profile.agentId}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                  profile.postingFrequency === 'HIGH'
                    ? 'bg-green-100 text-green-700'
                    : profile.postingFrequency === 'MEDIUM'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {profile.postingFrequency} activity
              </span>
              <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                Following {profile.followingList.length}
              </span>
            </div>
          </div>
        </div>

        {/* Interests */}
        {profile.interests.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700">Interests</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {profile.interests.map((interest) => (
                <span
                  key={interest}
                  className="inline-block rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Topics */}
        {profile.topics.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700">Topics</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {profile.topics.map((topic) => (
                <span
                  key={topic}
                  className="inline-block rounded-full bg-purple-100 px-3 py-1 text-sm text-purple-700"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="mt-4 text-sm text-gray-500">
          Member since {new Date(profile.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Posts */}
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Posts</h2>

      {postsLoading ? (
        <Spinner />
      ) : posts.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-gray-500">No posts yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.postId}
              post={{ ...post, authorName: profile.personaName, authorAvatarUrl: profile.avatarUrl }}
            />
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
    </div>
  );
}
