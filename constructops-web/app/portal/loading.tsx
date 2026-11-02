export default function PortalLoading() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading your projects">
      <div className="h-3 w-28 bg-paper-sunk motion-safe:animate-pulse" />
      <div className="mt-3 h-12 w-3/4 border border-line bg-paper-raised motion-safe:animate-pulse" />
      <div className="mt-2 h-4 w-2/3 bg-paper-sunk motion-safe:animate-pulse" />
      <div className="mt-8 h-px w-full bg-line" />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="h-24 border border-line bg-paper-raised motion-safe:animate-pulse"
            style={{ animationDelay: `${item * 60}ms` }}
          />
        ))}
      </div>
      <div className="mt-6 h-44 border border-line bg-paper-raised motion-safe:animate-pulse" />
    </div>
  );
}
