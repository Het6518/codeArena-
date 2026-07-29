import { cn } from '../../utils/cn';

export function Badge({ className, tone = 'neutral', ...props }) {
  return <span className={cn('badge', `badge-${tone}`, className)} {...props} />;
}
