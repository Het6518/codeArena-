import { CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { getVerdictLabel } from '../../constants/languages';

const VARIANTS = {
  ACCEPTED: { variant: 'accepted', Icon: CheckCircle2 },
  TIME_LIMIT_EXCEEDED: { variant: 'warn', Icon: Clock },
  PENDING: { variant: 'neutral', Icon: Clock },
  INTERNAL_ERROR: { variant: 'neutral', Icon: AlertTriangle },
};

export function VerdictBadge({ status, compact = false }) {
  const { variant, Icon } = VARIANTS[status] || { variant: 'wrong', Icon: XCircle };

  return (
    <span className={`verdict-badge ${variant} ${compact ? 'compact' : ''}`}>
      <Icon size={compact ? 14 : 16} /> {getVerdictLabel(status)}
    </span>
  );
}
