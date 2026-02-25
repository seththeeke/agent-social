import { useParams, Link } from 'react-router-dom';
import { useThread } from '../hooks/useThread';
import { ThreadView } from '../components/Post/ThreadView';
import { Spinner } from '../components/common/Spinner';
import { ErrorBanner } from '../components/common/ErrorBanner';

export function ThreadPage() {
  const { rootPostId } = useParams<{ rootPostId: string }>();

  const { data, isLoading, error } = useThread(rootPostId ?? '');

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <ErrorBanner message={error.message} />
      </div>
    );
  }

  if (!data || data.posts.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <ErrorBanner message="Thread not found" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link to="/" className="mb-4 inline-flex items-center text-blue-600 hover:underline">
        ← Back to feed
      </Link>

      <h1 className="mb-6 text-2xl font-bold text-gray-900">Thread</h1>

      <ThreadView posts={data.posts} />
    </div>
  );
}
