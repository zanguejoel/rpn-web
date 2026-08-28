/** The Cameroonian flag band that opens every screen in the mockups. */
export function FlagStripe({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <div className="flex h-1 w-full">
        <div className="flex-1 bg-flag-green" />
        <div className="flex-1 bg-flag-red" />
        <div className="flex-1 bg-flag-yellow" />
      </div>
    </div>
  );
}
