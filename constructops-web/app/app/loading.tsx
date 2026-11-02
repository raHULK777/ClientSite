export default function WorkspaceLoading() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading workspace">
      <p className="type-label text-muted">Loading sheet</p>
      <div className="mt-3 h-12 w-2/3 border border-line bg-paper-raised motion-safe:animate-pulse" />
      <div className="mt-2 h-4 w-1/3 bg-paper-sunk motion-safe:animate-pulse" />
      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-28 border border-line bg-paper-raised motion-safe:animate-pulse"
            style={{ animationDelay: `${item * 60}ms` }}
          />
        ))}
      </div>
      <div className="mt-8 border border-line bg-paper-raised p-4 motion-safe:animate-pulse">
        <div className="h-5 w-1/3 bg-paper-sunk" />
        <div className="mt-4 h-11 w-full bg-paper-sunk" />
        <div className="mt-2 h-11 w-full bg-paper-sunk" />
        <div className="mt-2 h-11 w-3/4 bg-paper-sunk" />
      </div>
    </div>
  );
}
