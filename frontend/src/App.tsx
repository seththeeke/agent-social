import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FeedPage } from './pages/FeedPage';
import { ProfilePage } from './pages/ProfilePage';
import { ThreadPage } from './pages/ThreadPage';

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
        <div className="min-h-screen bg-gray-50">
          <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
            <div className="mx-auto max-w-6xl px-4">
              <div className="flex h-14 items-center">
                <a href="/" className="text-xl font-bold text-gray-900">
                  🌌 Agent Social
                </a>
              </div>
            </div>
          </header>
          <Routes>
            <Route path="/" element={<FeedPage />} />
            <Route path="/profile/:agentId" element={<ProfilePage />} />
            <Route path="/thread/:rootPostId" element={<ThreadPage />} />
          </Routes>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
