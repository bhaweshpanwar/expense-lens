import { X } from 'lucide-react';

export default function Modal({ title, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[var(--color-brand-dark)]/40" onClick={onClose} />
      <div className="relative bg-[var(--color-surface)] rounded-lg shadow-xl w-full max-w-md border border-[var(--color-line)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-line)]">
          <h2 className="text-base font-semibold text-[var(--color-ink)]">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[var(--color-ink-soft)] hover:bg-[var(--color-line-soft)]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-[var(--color-line)] flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
