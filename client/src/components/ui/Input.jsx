import { cn } from '../../utils/cn';

export function Input({ className, label, id, error, ...props }) {
  return (
    <label className="field" htmlFor={id}>
      {label && <span className="field-label">{label}</span>}
      <input id={id} className={cn('input', className)} {...props} />
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}
