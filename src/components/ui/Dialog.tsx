import { useEffect, useId, useRef } from 'react';

/**
 * A modal dialog: Escape closes it, Tab stays inside, focus goes to the first field on open and back
 * to whatever had it on close, and a click on the backdrop dismisses. Keyboard users get the same
 * dialog as everyone else.
 */
export function Dialog({
  title,
  description,
  onClose,
  children,
  busy = false,
}: {
  title: string;
  description?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  /** While an action is running, Escape and the backdrop do nothing: closing mid-request loses the result. */
  busy?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const first = panelRef.current?.querySelector<HTMLElement>(
      'input, select, textarea, button:not([data-dialog-close])',
    );
    first?.focus();
    return () => previouslyFocused?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        if (!busy) onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), select, textarea, input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [busy, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-[var(--radius-card)] bg-surface-raised p-5 shadow-[var(--shadow-raised)]"
      >
        <h2 id={titleId} className="font-display text-base font-bold text-ink">
          {title}
        </h2>
        {description && <div className="mt-1 text-[12px] text-ink-muted">{description}</div>}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
