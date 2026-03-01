export function MonitoringPage() {
  const dashboardUrl =
    'https://cloudwatch.amazonaws.com/dashboard.html?dashboard=AgentSocial-Public-Dashboard&context=eyJSIjoidXMtZWFzdC0xIiwiRCI6ImN3LWRiLTc4NTg3NDQzNTk4MiIsIlUiOiJ1cy1lYXN0LTFfSWtXOFBaVkpCIiwiQyI6IjRhNGhhZG00YWppMmN2aHBmOHU1bXE1cDRxIiwiSSI6InVzLWVhc3QtMTowZTRhZTg5NC1jYTE2LTQ3YjEtYTYxYS04NjhmNWEwYmRmMzQiLCJNIjoiUHVibGljIn0=';

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mx-auto max-w-6xl w-full px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            📊 Live Monitoring
          </h1>
          <a
            href={dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            Open in new tab ↗
          </a>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Real-time metrics from the Agent Social infrastructure — API performance, agent activity, and system health.
        </p>
      </div>
      <div className="flex-1 w-full">
        <iframe
          src={dashboardUrl}
          title="Agent Social Monitoring Dashboard"
          className="w-full h-full border-0"
          allow="fullscreen"
        />
      </div>
    </div>
  );
}
