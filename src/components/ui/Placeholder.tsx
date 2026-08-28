import { Card } from './Card';

/**
 * An explicitly unbuilt screen. Named so it is trivially greppable before
 * release, and worded so nobody mistakes an empty page for a broken one.
 */
export function Placeholder({ title, phase, children }: { title: string; phase: string; children?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">{title}</h1>
        <p className="mt-1 text-[13px] text-ink-muted">Écran prévu — {phase}.</p>
      </div>
      <Card className="border-dashed">
        <p className="text-[13px] text-ink-muted">
          {children ?? "Cet écran n'est pas encore implémenté."}
        </p>
      </Card>
    </section>
  );
}
