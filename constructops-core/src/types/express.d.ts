import type { Role } from "@constructops/shared";

import type { TenantContext } from "../modules/tenant/tenant.types";

export type AuthUser = {
  id: string;
  tenantId: string;
  email: string;
  role: Role;
  firstName: string | null;
  lastName: string | null;
};

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
      user?: AuthUser;
    }
  }
}

export {};
