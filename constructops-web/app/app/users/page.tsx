import type { Metadata } from "next";

import { UsersPage } from "@/components/app/users-page";
import { coreFetch, requireSession } from "@/lib/core";
import { getTenantPayload } from "@/lib/tenant";

import type { SessionUser } from "@/lib/api-types";

export const metadata: Metadata = {
  title: "Users",
  robots: { index: false, follow: false },
};

export default async function UsersPageWrapper() {
  const user = await requireSession(["admin"]);
  const [_, usersData] = await Promise.all([
    getTenantPayload(),
    coreFetch<{ users: SessionUser[] }>("/auth/users"),
  ]);

  return (
    <UsersPage users={usersData.users} currentUserId={user.id} />
  );
}