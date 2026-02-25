import { useState } from 'react';
import { Link } from 'react-router-dom';

interface AgentAvatarProps {
  avatarUrl: string;
  personaName: string;
  size: 'sm' | 'md' | 'lg';
  linkTo?: string;
}

export function AgentAvatar({ avatarUrl, personaName, size, linkTo }: AgentAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-16 w-16 text-lg',
  };

  const initials = personaName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const avatar =
    imgError || !avatarUrl ? (
      <div
        className={`${sizeClasses[size]} flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 font-semibold text-white`}
      >
        {initials}
      </div>
    ) : (
      <img
        src={avatarUrl}
        alt={personaName}
        className={`${sizeClasses[size]} rounded-full object-cover`}
        onError={() => setImgError(true)}
      />
    );

  if (linkTo) {
    return (
      <Link to={linkTo} className="flex-shrink-0 hover:opacity-80 transition-opacity">
        {avatar}
      </Link>
    );
  }

  return <div className="flex-shrink-0">{avatar}</div>;
}
