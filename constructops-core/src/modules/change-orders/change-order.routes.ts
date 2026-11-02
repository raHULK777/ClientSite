import { createHash } from "node:crypto";

import { Router } from "express";

import {
  changeOrderApprovalSchema,
  changeOrderRejectSchema,
  changeOrderUpdateSchema,
  idParamSchema,
} from "@constructops/shared";

import type { Database } from "../../config/database";
import { asyncHandler } from "../../lib/asyncHandler";
import { badRequest, conflict, notFound } from "../../lib/errors";
import { ok } from "../../lib/http";
import { authenticate, requireRole } from "../../middleware/auth";
import { featureGate } from "../../middleware/feature-gate";
import { validateBody, validateParams } from "../../middleware/validate";
import { recordAudit } from "../audit/audit.repository";
import { ProjectRepository } from "../projects/project.repository";
import { requireProject } from "../projects/project.service";
import { mapChangeOrder } from "./change-order.mapper";
import { ChangeOrderRepository } from "./change-order.repository";

const CONSENT_TEXT = "I approve this change order and the revised contract amount.";

function signatureHash(input: {
  changeOrderId: string;
  tenantId: string;
  projectId: string;
  userId: string;
  signerName: string;
  costImpact: number;
  signedAt: string;
}): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function clientIp(value: string | undefined): string | null {
  return value ? value.slice(0, 45) : null;
}

async function loadOrder(
  orders: ChangeOrderRepository,
  projects: ProjectRepository,
  tenantId: string,
  id: string,
  actor: { id: string; role: "admin" | "field_staff" | "client" },
) {
  const order = await orders.findById(tenantId, id);
  if (!order) throw notFound("Change order not found.");
  const project = await requireProject(projects, tenantId, actor, order.project_id);
  return { order, project };
}

export function changeOrderRouter(db: Database): Router {
  const router = Router();
  const orders = new ChangeOrderRepository(db);
  const projects = new ProjectRepository(db);

  router.use(authenticate(db));

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const user = req.user!;
      const rows = await orders.listAccessible(req.tenant!.id, user.role === "client" ? user.id : null);
      ok(res, { changeOrders: rows.map(mapChangeOrder) });
    }),
  );

  router.patch(
    "/:id",
    requireRole("admin"),
    validateParams(idParamSchema),
    validateBody(changeOrderUpdateSchema),
    asyncHandler(async (req, res) => {
      const tenantId = req.tenant!.id;
      const { order } = await loadOrder(orders, projects, tenantId, req.params.id!, req.user!);
      if (order.status !== "pending") throw conflict("Only pending change orders can be edited.");

      const updated = await orders.update(tenantId, order.id, req.body);
      if (!updated) throw conflict("Only pending change orders can be edited.");
      await recordAudit(db, {
        tenantId,
        actorId: req.user!.id,
        action: "change_order.updated",
        entityType: "change_order",
        entityId: order.id,
        metadata: { fields: Object.keys(req.body as object) },
        ip: req.ip ?? null,
      });
      ok(res, { changeOrder: mapChangeOrder(updated) });
    }),
  );

  router.patch(
    "/:id/approve",
    requireRole("client"),
    featureGate("changeOrders"),
    validateParams(idParamSchema),
    validateBody(changeOrderApprovalSchema),
    asyncHandler(async (req, res) => {
      const tenantId = req.tenant!.id;
      const { order, project } = await loadOrder(orders, projects, tenantId, req.params.id!, req.user!);
      if (project.client_id !== req.user!.id) throw notFound("Change order not found.");
      if (order.status !== "pending") throw conflict("This change order is no longer awaiting approval.");

      const input = req.body as { signerName: string };
      const signedAt = new Date().toISOString();
      const ip = clientIp(req.ip);

      const approved = await orders.approve({
        tenantId,
        changeOrderId: order.id,
        userId: req.user!.id,
        signerName: input.signerName,
        signatureHash: signatureHash({
          changeOrderId: order.id,
          tenantId,
          projectId: order.project_id,
          userId: req.user!.id,
          signerName: input.signerName,
          costImpact: Number(order.cost_impact),
          signedAt,
        }),
        consentText: CONSENT_TEXT,
        signedAt,
        ip,
        userAgent: req.header("user-agent")?.slice(0, 500) ?? null,
      });
      if (!approved) throw conflict("This change order is no longer awaiting approval.");
      ok(res, { changeOrder: mapChangeOrder(approved) });
    }),
  );

  router.patch(
    "/:id/reject",
    requireRole("client"),
    featureGate("changeOrders"),
    validateParams(idParamSchema),
    validateBody(changeOrderRejectSchema),
    asyncHandler(async (req, res) => {
      const tenantId = req.tenant!.id;
      const { order, project } = await loadOrder(orders, projects, tenantId, req.params.id!, req.user!);
      if (project.client_id !== req.user!.id) throw notFound("Change order not found.");
      if (order.status !== "pending") throw conflict("This change order is no longer awaiting approval.");

      const input = req.body as { reason?: string };
      if (input.reason === undefined && Object.keys(req.body as object).length) {
        throw badRequest("Provide a rejection reason as text.");
      }

      const rejected = await orders.reject({
        tenantId,
        changeOrderId: order.id,
        userId: req.user!.id,
        reason: input.reason,
        ip: clientIp(req.ip),
      });
      if (!rejected) throw conflict("This change order is no longer awaiting approval.");
      ok(res, { changeOrder: mapChangeOrder(rejected) });
    }),
  );

  return router;
}
