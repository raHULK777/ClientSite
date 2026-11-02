"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { apiMutate } from "@/lib/client-api";
import { fullName } from "@/lib/format";

import type { SessionUser } from "@/lib/api-types";

export function PortalHeader({
  companyName,
  user,
}: {
  companyName: string;
  user: SessionUser;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function signOut() {
    setPending(true);
    setError(false);
    try {
      await apiMutate("/auth/logout", "POST", {});
      router.replace("/login");
      router.refresh();
    } catch {
      setPending(false);
      setError(true);
    }
  }

  return (
    <header className="border-b border-ink bg-paper-raised">
      <div className="mx-auto flex min-h-16 w-full max-w-4xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="type-label truncate text-[10px] text-ink">{companyName}</p>
          <p className="text-[11px] text-muted">Client portal</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="hidden text-right text-[11px] leading-tight text-muted sm:block">
            Signed in as
            <span className="block font-semibold text-ink">{fullName(user)}</span>
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            loading={pending}
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>
      {error ? (
        <p role="alert" className="mx-auto max-w-4xl px-4 pb-2 text-xs text-revision">
          Sign out failed. Try again.
        </p>
      ) : null}
    </header>
  );
}
