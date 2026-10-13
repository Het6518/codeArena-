import { cn } from '../../utils/cn';

const variants = {
  primary: 'button button-primary',
  secondary: 'button button-secondary',
  ghost: 'button button-ghost',
};

const sizes = {
  small: 'button-small',
  medium: '',
  large: 'button-large',
};

export function Button({ className, variant = 'primary', size = 'medium', type = 'button', ...props }) {
  return <button type={type} className={cn(variants[variant], sizes[size], className)} {...props} />;
}
