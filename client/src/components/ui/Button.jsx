import { cn } from '../../utils/cn';

const variants = {
  primary: 'button button-primary',
  secondary: 'button button-secondary',
  ghost: 'button button-ghost',
};

export function Button({ className, variant = 'primary', type = 'button', ...props }) {
  return <button type={type} className={cn(variants[variant], className)} {...props} />;
}
