"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { Stamp } from "@/components/ui/stamp";
import { apiMutate, ClientApiError } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { fullName } from "@/lib/format";

import type { SessionUser } from "@/lib/api-types";
import type { Role } from "@constructops/shared";

const ROLE_LABEL: Record<Role, string> = {
  admin: "Office admin",
  field_staff: "Field staff",
  client: "Client",
};

const ROLE_DESC: Record<Role, string> = {
  admin: "Full workspace access: projects, change orders, settings, users.",
  field_staff: "Field board only: update phase and progress on assigned jobs.",
  client: "Portal only: view own projects and sign change orders.",
};

function UserRow({
  user,
  currentUserId,
}: {
  user: SessionUser;
  currentUserId: string;
}) {
  const name = fullName(user);
  return (
    <tr className="border-b border-line">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink">{name}</span>
          <span className="type-label text-[9px] text-muted">{user.email}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <Stamp className={cn("px-1.5 py-0.5 text-[9px]", user.role === "admin" && "bg-ink text-paper")}>
          {ROLE_LABEL[user.role]}
        </Stamp>
      </td>
      <td className="px-4 py-3 text-right">
        {user.id !== currentUserId ? (
          <Button variant="ghost" size="sm" className="text-revision hover:bg-paper">
            Remove
          </Button>
        ) : (
          <span className="type-label text-[9px] text-muted">You</span>
        )}
      </td>
    </tr>
  );
}

export function UsersList({ users, currentUserId }: { users: SessionUser[]; currentUserId: string }) {
  return (
    <Sheet className="bg-paper-raised">
      <div className="overflow-x-auto">
        <table className="w-full" role="table">
          <thead>
            <tr className="border-b-2 border-ink bg-paper-sunk">
              <th className="px-4 py-2 text-left type-label text-[9px] text-ink">Name</th>
              <th className="px-4 py-2 text-left type-label text-[9px] text-ink">Role</th>
              <th className="px-4 py-2 text-right type-label text-[9px] text-ink">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <UserRow key={user.id} user={user} currentUserId={currentUserId} />
            ))}
          </tbody>
        </table>
      </div>
    </Sheet>
  );
}

function UserCreateForm({ onClose }: { onClose: () => void }) {
  const [role, setRole] = useState<Role>("client");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState<{ user: SessionUser; plainPassword: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await apiMutate<{ user: SessionUser; plainPassword: string }>(
        "/auth/users",
        "POST",
        { email: email.trim(), password, role, firstName: firstName.trim() || undefined, lastName: lastName.trim() || undefined },
      );
      setCreated({ user: res.user, plainPassword: res.plainPassword! });
      setPending(false);
    } catch (cause) {
      setError(cause instanceof ClientApiError ? cause.message : "Could not create user.");
      setPending(false);
    }
  }

  if (created) {
    return (
      <div className="flex flex-col gap-4 border border-ink bg-paper p-4">
        <p className="type-heading text-lg">Account created</p>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-soft">Name</dt>
            <dd className="font-semibold text-ink">{fullName(created.user)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-soft">Email</dt>
            <dd className="font-mono text-ink">{created.user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-soft">Role</dt>
            <dd className="font-semibold text-ink">{ROLE_LABEL[created.user.role]}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-soft">Temporary password</dt>
            <dd className="font-mono text-revision">{created.plainPassword}</dd>
          </div>
        </dl>
        <p className="text-xs leading-relaxed text-revision">
          Share these details securely. The user should sign in and change their password immediately.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => { setCreated(null); setEmail(""); setPassword(""); setFirstName(""); setLastName(""); }}>
            Create another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="user-email" label="Email" error={error?.includes("email") ? error : undefined}>
          <Input
            id="user-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            autoComplete="email"
            disabled={pending}
          />
        </Field>
        <Field id="user-role" label="Role">
          <select
            id="user-role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            disabled={pending}
            className="h-12 border border-ink bg-paper-raised px-3 text-sm"
          >
            <option value="client">Client</option>
            <option value="field_staff">Field staff</option>
          </select>
        </Field>
      </div>
      <Field id="user-password" label="Password" hint="Minimum 8 characters.">
        <Input
          id="user-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          disabled={pending}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="user-first" label="First name (optional)">
          <Input
            id="user-first"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={pending}
          />
        </Field>
        <Field id="user-last" label="Last name (optional)">
          <Input
            id="user-last"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={pending}
          />
        </Field>
      </div>
      <div aria-live="polite" aria-atomic="true">
        {error ? (
          <p className="border border-revision bg-paper px-3 py-2.5 text-sm leading-relaxed text-revision">
            {error}
          </p>
        ) : null}
      </div>
      <div className="flex gap-3">
        <Button type="submit" loading={pending} disabled={pending}>
          Create account
        </Button>
        <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
      </div>
      <p className="text-[11px] leading-relaxed text-muted">
        {ROLE_DESC[role]}
      </p>
    </form>
  );
}

export function UsersPage({ users, currentUserId }: { users: SessionUser[]; currentUserId: string }) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="type-label text-muted">Directory</p>
          <h1 className="type-title mt-1 text-[clamp(2rem,4vw,3.25rem)]">Users</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
            Manage field staff and client accounts for this workspace.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>Add user</Button>
      </header>

      <UsersList users={users} currentUserId={currentUserId} />

      {showCreate ? (
        <Sheet className="bg-paper-raised p-5 max-w-md">
          <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
            <h2 className="type-heading text-lg">New account</h2>
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
              ✕
            </Button>
          </div>
          <UserCreateForm onClose={() => setShowCreate(false)} />
        </Sheet>
      ) : null}
    </div>
  );
}