import { X } from 'lucide-react';
import { Button } from './Button';

export function Modal({ children, title, open, onClose }) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <h2>{title}</h2>
          <Button variant="ghost" className="icon-button" aria-label="Close modal" onClick={onClose}>
            <X size={18} />
          </Button>
        </header>
        {children}
      </section>
    </div>
  );
}
