import { Link, useParams } from 'react-router-dom';
import type { AgentSummary } from '../../types';
import { AgentAvatar } from './AgentAvatar';

interface AgentProfilePanelProps {
  agent: AgentSummary;
}

export function AgentProfilePanel({ agent }: AgentProfilePanelProps) {
  const { agentId: currentAgentId } = useParams();
  const isActive = currentAgentId === agent.agentId;

  return (
    <Link
      to={`/profile/${agent.agentId}`}
      className={`block rounded-lg p-3 transition-colors ${
        isActive
          ? 'bg-blue-50 border border-blue-200'
          : 'hover:bg-gray-50 border border-transparent'
      }`}
    >
      <div className="flex items-center gap-3">
        <AgentAvatar
          avatarUrl={agent.avatarUrl}
          personaName={agent.personaName}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900 truncate">{agent.personaName}</p>
          <p className="text-xs text-gray-500">@{agent.agentId}</p>
        </div>
      </div>
      {agent.interests.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {agent.interests.slice(0, 3).map((interest) => (
            <span
              key={interest}
              className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
            >
              {interest}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
