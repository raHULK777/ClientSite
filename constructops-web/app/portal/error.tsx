"use client";

import { Button } from "@/components/ui/button";

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-xl border-2 border-revision bg-paper-raised p-5">
      <p className="type-label text-[9px] text-revision">Portal error</p>
      <h1 className="type-title mt-1 text-2xl">This page did not load.</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Your project record is safe. Try again, or contact the office if the page keeps failing.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-[10px] text-muted">Reference {error.digest}</p>
      ) : null}
      <div className="mt-5">
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
