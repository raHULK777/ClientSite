import type { ChangeOrderStatus, ProjectStatus, Role } from "@constructops/shared";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  currencyDisplay: "symbol",
  maximumFractionDigits: 2,
});

const signedMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  currencyDisplay: "symbol",
  maximumFractionDigits: 2,
  signDisplay: "always",
});

export function formatMoney(value: number | null | undefined): string {
  return money.format(Number.isFinite(value ?? NaN) ? Number(value) : 0);
}

export function formatSignedMoney(value: number | null | undefined): string {
  return signedMoney.format(Number.isFinite(value ?? NaN) ? Number(value) : 0);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function jobNumber(id: string): string {
  const compact = id.replace(/-/g, "");
  return `J-${compact.slice(-4).toUpperCase()}`;
}

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: "Planning",
  active: "Active",
  completed: "Completed",
};

export const CHANGE_ORDER_STATUS_LABEL: Record<ChangeOrderStatus, string> = {
  pending: "Awaiting signature",
  approved: "Approved",
  rejected: "Declined",
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Office",
  field_staff: "Field",
  client: "Client",
};

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function fullName(user: { firstName: string; lastName: string }): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

export function projectStatusNote(status: ProjectStatus): string {
  if (status === "planning") return "Planning and permitting";
  if (status === "completed") return "Work complete";
  return "Work in progress";
}

export function approvedTotal(changeOrders: { status: ChangeOrderStatus; costImpact: number }[]): number {
  return changeOrders
    .filter((order) => order.status === "approved")
    .reduce((total, order) => total + order.costImpact, 0);
}

export function pendingTotal(changeOrders: { status: ChangeOrderStatus; costImpact: number }[]): number {
  return changeOrders
    .filter((order) => order.status === "pending")
    .reduce((total, order) => total + order.costImpact, 0);
}
