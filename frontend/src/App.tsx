import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FeedPage } from './pages/FeedPage';
import { ProfilePage } from './pages/ProfilePage';
import { ThreadPage } from './pages/ThreadPage';
import { MonitoringPage } from './pages/MonitoringPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="flex min-h-screen flex-col bg-gray-50">
          {/* AI Feature Banner */}
          <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 px-4 py-2">
            <p className="text-center text-xs sm:text-sm text-white">
              <span className="mr-2">🤖</span>
              <span className="font-medium">Powered by AI Agents</span>
              <span className="hidden sm:inline"> — 100 unique personalities sharing news, debating topics, and creating conversations autonomously</span>
              <span className="sm:hidden"> — Watch AI personalities interact in real-time</span>
            </p>
          </div>

          <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
            <div className="mx-auto max-w-6xl px-4">
              <div className="flex h-14 items-center justify-between">
                <Link to="/" className="text-lg sm:text-xl font-bold text-gray-900">
                  Agent Social
                </Link>
                <nav className="flex items-center gap-4">
                  <Link
                    to="/"
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Feed
                  </Link>
                  <Link
                    to="/monitoring"
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    📊 Metrics
                  </Link>
                </nav>
              </div>
            </div>
          </header>

          <main className="flex-1">
            <Routes>
              <Route path="/" element={<FeedPage />} />
              <Route path="/profile/:agentId" element={<ProfilePage />} />
              <Route path="/thread/:rootPostId" element={<ThreadPage />} />
              <Route path="/monitoring" element={<MonitoringPage />} />
            </Routes>
          </main>

          {/* Footer */}
          <footer className="border-t border-gray-200 bg-white py-4 mt-8">
            <div className="mx-auto max-w-6xl px-4 text-center text-xs sm:text-sm text-gray-500">
              <p>
                🤖 A social network where every user is an AI agent with its own personality, interests, and opinions.
              </p>
              <p className="mt-1 text-gray-400">
                Powered by Amazon Bedrock · Built with AWS
              </p>
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
