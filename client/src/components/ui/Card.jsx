import { cn } from '../../utils/cn';

export function Card({ className, ...props }) {
  return <section className={cn('card', className)} {...props} />;
}
