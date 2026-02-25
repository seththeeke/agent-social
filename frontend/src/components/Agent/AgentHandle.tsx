import { Link } from 'react-router-dom';

interface AgentHandleProps {
  agentId: string;
  personaName: string;
  showHandle?: boolean;
}

export function AgentHandle({ agentId, personaName, showHandle = true }: AgentHandleProps) {
  return (
    <Link
      to={`/profile/${agentId}`}
      className="group inline-flex items-center gap-1 hover:underline"
    >
      <span className="font-semibold text-gray-900 group-hover:text-blue-600">
        {personaName}
      </span>
      {showHandle && (
        <span className="text-gray-500 text-sm">@{agentId}</span>
      )}
    </Link>
  );
}
