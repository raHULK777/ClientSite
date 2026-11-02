"use client";

import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-xl border-2 border-revision bg-paper-raised p-5">
      <p className="type-label text-[9px] text-revision">Sheet error</p>
      <h1 className="type-title mt-1 text-2xl">The sheet did not load.</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Nothing was changed. Try the sheet again, or return to the project index.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-[10px] text-muted">Reference {error.digest}</p>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={reset}>Try again</Button>
        <Link href="/app" className={buttonVariants({ variant: "secondary" })}>
          Project index
        </Link>
      </div>
    </div>
  );
}
