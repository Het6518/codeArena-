import { CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { getVerdictLabel } from '../../constants/languages';

const NEUTRAL_STATUSES = ['INTERNAL_ERROR', 'PENDING'];

export function VerdictBadge({ status, compact = false }) {
  const iconSize = compact ? 14 : 18;
  let variant = 'wrong';
  let Icon = XCircle;

  if (status === 'ACCEPTED') {
    variant = 'accepted';
    Icon = CheckCircle2;
  } else if (status === 'PENDING') {
    variant = 'neutral';
    Icon = Clock;
  } else if (NEUTRAL_STATUSES.includes(status)) {
    variant = 'neutral';
    Icon = AlertTriangle;
  }

  return (
    <span className={`verdict-badge ${variant} ${compact ? 'compact' : ''}`}>
      <Icon size={iconSize} /> {getVerdictLabel(status)}
    </span>
  );
}
