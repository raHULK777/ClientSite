"use client";

import { useState, type FormEvent } from "react";

import { apiMutate, ClientApiError } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Field, fieldDescribedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import type { SessionUser } from "@/lib/api-types";

type LoginResponse = { user: SessionUser; csrfToken: string };

function safeNext(value: string | undefined, role: SessionUser["role"]): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return role === "client" ? "/portal" : "/app";
}

export function LoginForm({
  next,
  showDemo = false,
}: {
  next?: string;
  showDemo?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const data = await apiMutate<LoginResponse>(
        "/auth/login",
        "POST",
        { email: email.trim(), password },
        { redirectOn401: false },
      );
      window.location.assign(safeNext(next, data.user.role));
    } catch (cause) {
      setError(
        cause instanceof ClientApiError
          ? cause.message
          : "Sign-in failed. Check the details and try again.",
      );
      setPending(false);
    }
  }

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("SantosDemo!23");
    setError(null);
  }

  return (
    <div>
      <div className="border-b border-ink px-6 py-5 sm:px-8">
        <p className="type-label text-muted">Workspace access</p>
        <h1 className="type-title mt-2 text-3xl sm:text-4xl">Sign in</h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
          The project record for the office, the field, and the client.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 py-6 sm:px-8" noValidate>
        <Field id="email" label="Email">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={fieldDescribedBy("email", { error: error ?? undefined })}
            placeholder="you@company.com"
          />
        </Field>

        <Field id="password" label="Password">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={fieldDescribedBy("password", { error: error ?? undefined })}
          />
        </Field>

        <div aria-live="polite" aria-atomic="true">
          {error ? (
            <p className="border border-revision bg-paper-raised px-3 py-2.5 text-sm leading-relaxed text-revision">
              {error}
            </p>
          ) : null}
        </div>

        <Button type="submit" size="lg" loading={pending} className="w-full">
          {pending ? "Opening the workspace" : "Sign in"}
        </Button>

        <p className="text-xs leading-relaxed text-muted">
          Client links open the project portal. Office and field accounts open the workspace.
        </p>
      </form>

      {showDemo ? (
        <div className="border-t border-dashed border-line-strong px-6 py-5 sm:px-8">
          <p className="type-label text-muted">Demo workspace</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">
            Password for every demo account: <span className="type-data">SantosDemo!23</span>
          </p>
          <ul className="mt-3 divide-y divide-dotted divide-line-strong border-y border-line">
            {[
              { email: "owner@santos.test", label: "Office / admin" },
              { email: "field@santos.test", label: "Field staff" },
              { email: "client@santos.test", label: "Client / Avery Chen" },
            ].map((account) => (
              <li key={account.email} className="flex items-center justify-between gap-3 py-1">
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink">{account.email}</p>
                  <p className="text-[11px] text-muted">{account.label}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 px-2"
                  onClick={() => fillDemo(account.email)}
                >
                  Use
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
