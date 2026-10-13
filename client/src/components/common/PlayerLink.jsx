import { Link } from 'react-router-dom';

// A player's handle that opens their public profile.
export function PlayerLink({ username, className = '', children }) {
  if (!username) return <span className={className}>{children || 'unknown'}</span>;

  return (
    <Link to={`/u/${encodeURIComponent(username)}`} className={`player-link ${className}`.trim()}>
      {children || username}
    </Link>
  );
}
