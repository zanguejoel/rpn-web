import { Button } from './Button';

export function LoadingState({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-12 text-ink-muted">
      <span
        aria-hidden="true"
        className="size-7 animate-spin rounded-full border-[3px] border-accent border-t-transparent"
      />
      <p className="text-sm font-semibold">{label}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-3 p-12 text-center">
      <p className="max-w-md text-sm font-semibold text-ink-muted">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Réessayer
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
      <p className="text-sm font-bold text-ink">{title}</p>
      {hint && <p className="max-w-md text-[13px] text-ink-muted">{hint}</p>}
    </div>
  );
}
