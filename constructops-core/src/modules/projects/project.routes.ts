import { Router } from "express";

import {
  changeOrderCreateSchema,
  dailyLogCreateSchema,
  fieldStaffProjectUpdateSchema,
  idParamSchema,
  messageSendSchema,
  projectCreateSchema,
  projectUpdateSchema,
  stageIdParamSchema,
  stagePlanSchema,
  stageStatusUpdateSchema,
  type DailyLogCreateInput,
  type MessageSendInput,
  type ProjectCreateInput,
  type ProjectStatus,
  type StagePlanInput,
  type StageStatusUpdateInput,
} from "@constructops/shared";

import type { Database } from "../../config/database";
import { asyncHandler } from "../../lib/asyncHandler";
import { badRequest, conflict, forbidden, notFound } from "../../lib/errors";
import { ok } from "../../lib/http";
import { authenticate, requireRole } from "../../middleware/auth";
import { validateBody, validateParams } from "../../middleware/validate";
import { recordAudit } from "../audit/audit.repository";
import { UserRepository } from "../auth/user.repository";
import { ChangeOrderRepository } from "../change-orders/change-order.repository";
import { mapChangeOrder } from "../change-orders/change-order.mapper";
import { mapProject } from "./project.mapper";
import { ProjectRepository } from "./project.repository";
import { requireProject } from "./project.service";
import { mapStage, mapStageUpdate } from "./stage.mapper";
import { StageRepository } from "./stage.repository";
import { DailyLogRepository } from "./daily-log.repository";
import { mapDailyLog } from "./daily-log.mapper";
import { MessageRepository } from "./message.repository";
import { mapMessage } from "./message.mapper";

function projectUpdate(req: { body: unknown; user?: { role: string } }) {
  const schema =
    req.user?.role === "field_staff" ? fieldStaffProjectUpdateSchema : projectUpdateSchema;
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    throw badRequest(
      "Check the submitted fields.",
      parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    );
  }
  return parsed.data;
}

export function projectRouter(db: Database): Router {
  const router = Router();
  const projects = new ProjectRepository(db);
  const orders = new ChangeOrderRepository(db);
  const users = new UserRepository(db);
  const stages = new StageRepository(db);
  const dailyLogs = new DailyLogRepository(db);
  const messages = new MessageRepository(db);

  router.use(authenticate(db));

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const user = req.user!;
      const status =
        typeof req.query.status === "string" ? (req.query.status as ProjectStatus) : undefined;
      if (status && !["planning", "active", "completed"].includes(status)) {
        throw badRequest("Unknown project status.");
      }
      const rows = await projects.listAccessible(
        req.tenant!.id,
        { id: user.id, role: user.role },
        status,
      );
      ok(res, { projects: rows.map(mapProject) });
    }),
  );

  router.post(
    "/",
    requireRole("admin"),
    validateBody(projectCreateSchema),
    asyncHandler(async (req, res) => {
      const tenantId = req.tenant!.id;
      const input = req.body as ProjectCreateInput;

      if (input.clientId) {
        const client = await users.findClient(tenantId, input.clientId);
        if (!client) throw badRequest("Choose a client from this workspace.");
      }

      const row = await projects.create(tenantId, input);
      const stageRows = input.stages?.length
        ? await stages.replacePlan(tenantId, row.id, input.stages)
        : [];
      const created = stageRows.length ? await projects.findById(tenantId, row.id) : row;

      await recordAudit(db, {
        tenantId,
        actorId: req.user!.id,
        action: "project.created",
        entityType: "project",
        entityId: row.id,
        metadata: { projectName: row.project_name, stageCount: stageRows.length },
        ip: req.ip ?? null,
      });
      ok(res, { project: mapProject(created ?? row), stages: stageRows.map(mapStage) }, 201);
    }),
  );

  router.get(
    "/:id",
    validateParams(idParamSchema),
    asyncHandler(async (req, res) => {
      const user = req.user!;
      const project = await requireProject(
        projects,
        req.tenant!.id,
        { id: user.id, role: user.role },
        req.params.id!,
      );
      const rows = await orders.listByProject(req.tenant!.id, project.id);
      const [stageRows, updateRows, logRows, clientRows] = await Promise.all([
        stages.listByProject(req.tenant!.id, project.id),
        stages.listUpdates(req.tenant!.id, project.id),
        dailyLogs.listByProject(req.tenant!.id, project.id),
        users.listClients(req.tenant!.id),
      ]);
      const summary = rows.reduce(
        (acc, row) => {
          acc[row.status] += 1;
          if (row.status === "pending") acc.pendingValue += Number(row.cost_impact);
          return acc;
        },
        { pending: 0, approved: 0, rejected: 0, pendingValue: 0 },
      );

      ok(res, {
        project: mapProject(project),
        changeOrders: rows.map(mapChangeOrder),
        changeOrderSummary: summary,
        stages: stageRows.map(mapStage),
        stageUpdates: updateRows.map(mapStageUpdate),
        dailyLogs: logRows.map(mapDailyLog),
        clients: clientRows.map((row) => ({
          id: row.id,
          name: [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || row.email,
          email: row.email,
          projects: [],
        })),
      });
    }),
  );

  router.patch(
    "/:id",
    requireRole("admin", "field_staff"),
    validateParams(idParamSchema),
    asyncHandler(async (req, res) => {
      const tenantId = req.tenant!.id;
      const user = req.user!;
      const input = projectUpdate(req);
      const existing = await requireProject(
        projects,
        tenantId,
        { id: user.id, role: user.role },
        req.params.id!,
      );

      if (user.role === "field_staff") {
        if (existing.status === "completed") throw forbidden("Completed projects are read-only.");
      }

      const updated = await projects.update(tenantId, existing.id, input);
      if (!updated) throw notFound("Project not found.");

      await recordAudit(db, {
        tenantId,
        actorId: user.id,
        action: "project.updated",
        entityType: "project",
        entityId: existing.id,
        metadata: { fields: Object.keys(input) },
        ip: req.ip ?? null,
      });
      ok(res, { project: mapProject(updated) });
    }),
  );

  router.get(
    "/:id/stages",
    validateParams(idParamSchema),
    asyncHandler(async (req, res) => {
      const user = req.user!;
      const project = await requireProject(
        projects,
        req.tenant!.id,
        { id: user.id, role: user.role },
        req.params.id!,
      );
      const [stageRows, updateRows] = await Promise.all([
        stages.listByProject(req.tenant!.id, project.id),
        stages.listUpdates(req.tenant!.id, project.id),
      ]);
      ok(res, { stages: stageRows.map(mapStage), stageUpdates: updateRows.map(mapStageUpdate) });
    }),
  );

  router.put(
    "/:id/stages",
    requireRole("admin"),
    validateParams(idParamSchema),
    validateBody(stagePlanSchema),
    asyncHandler(async (req, res) => {
      const tenantId = req.tenant!.id;
      const project = await projects.findById(tenantId, req.params.id!);
      if (!project) throw notFound("Project not found.");

      const input = req.body as StagePlanInput;
      const rows = await stages.replacePlan(tenantId, project.id, input.stages);
      const synced = await projects.findById(tenantId, project.id);
      if (!synced) throw notFound("Project not found.");

      await recordAudit(db, {
        tenantId,
        actorId: req.user!.id,
        action: "project.stages_replaced",
        entityType: "project",
        entityId: project.id,
        metadata: { stageCount: rows.length },
        ip: req.ip ?? null,
      });
      ok(res, { project: mapProject(synced), stages: rows.map(mapStage) });
    }),
  );

  router.post(
    "/:id/stages/:stageId/status",
    requireRole("admin", "field_staff"),
    validateParams(stageIdParamSchema),
    validateBody(stageStatusUpdateSchema),
    asyncHandler(async (req, res) => {
      const tenantId = req.tenant!.id;
      const user = req.user!;
      const project = await requireProject(
        projects,
        tenantId,
        { id: user.id, role: user.role },
        req.params.id!,
      );

      if (user.role === "field_staff" && project.status === "completed") {
        throw forbidden("Completed projects are read-only.");
      }

      const input = req.body as StageStatusUpdateInput;
      const result = await stages.updateStatus(tenantId, project.id, req.params.stageId!, {
        status: input.status,
        comment: input.comment,
        actorId: user.id,
        actorRole: user.role,
      });
      if (!result) throw notFound("Stage not found.");

      const synced = await projects.findById(tenantId, project.id);
      if (!synced) throw notFound("Project not found.");

      await recordAudit(db, {
        tenantId,
        actorId: user.id,
        action: "project.stage_updated",
        entityType: "project",
        entityId: project.id,
        metadata: {
          stageId: req.params.stageId,
          stageName: result.update.stage_name,
          status: input.status,
          progressPercentage: result.update.progress_percentage,
        },
        ip: req.ip ?? null,
      });

      ok(res, {
        project: mapProject(synced),
        stages: result.stages.map(mapStage),
        update: mapStageUpdate(result.update),
      });
    }),
  );

  router.get(
    "/:id/change-orders",
    validateParams(idParamSchema),
    asyncHandler(async (req, res) => {
      const user = req.user!;
      const project = await requireProject(
        projects,
        req.tenant!.id,
        { id: user.id, role: user.role },
        req.params.id!,
      );
      const rows = await orders.listByProject(req.tenant!.id, project.id);
      ok(res, { changeOrders: rows.map(mapChangeOrder) });
    }),
  );

  router.post(
    "/:id/change-orders",
    requireRole("admin"),
    validateParams(idParamSchema),
    validateBody(changeOrderCreateSchema),
    asyncHandler(async (req, res) => {
      const tenantId = req.tenant!.id;
      const project = await projects.findById(tenantId, req.params.id!);
      if (!project) throw notFound("Project not found.");
      if (!req.tenant!.features.changeOrders) {
        throw conflict("Change orders are not enabled for this workspace.");
      }

      const input = req.body as {
        title: string;
        description?: string;
        costImpact: number;
      };
      const row = await orders.create(tenantId, project.id, input);
      if (!row) throw notFound("Project not found.");

      await recordAudit(db, {
        tenantId,
        actorId: req.user!.id,
        action: "change_order.created",
        entityType: "change_order",
        entityId: row.id,
        metadata: { projectId: project.id, costImpact: input.costImpact },
        ip: req.ip ?? null,
      });
      ok(res, { changeOrder: mapChangeOrder(row) }, 201);
    }),
  );

  router.get(
    "/:id/daily-logs",
    validateParams(idParamSchema),
    asyncHandler(async (req, res) => {
      const user = req.user!;
      const project = await requireProject(
        projects,
        req.tenant!.id,
        { id: user.id, role: user.role },
        req.params.id!,
      );
      const rows = await dailyLogs.listByProject(req.tenant!.id, project.id);
      ok(res, { dailyLogs: rows.map(mapDailyLog) });
    }),
  );

  router.post(
    "/:id/daily-logs",
    requireRole("admin", "field_staff"),
    validateParams(idParamSchema),
    validateBody(dailyLogCreateSchema),
    asyncHandler(async (req, res) => {
      const tenantId = req.tenant!.id;
      const user = req.user!;
      const input = req.body as DailyLogCreateInput;
      const project = await projects.findById(tenantId, req.params.id!);
      if (!project) throw notFound("Project not found.");

      const row = await dailyLogs.create(tenantId, { ...input, projectId: req.params.id! }, user.id);
      if (!row) throw notFound("Project not found.");

      await recordAudit(db, {
        tenantId,
        actorId: user.id,
        action: "project.daily_log_created",
        entityType: "project",
        entityId: project.id,
        metadata: { logId: row.id, logDate: input.logDate },
        ip: req.ip ?? null,
      });
      ok(res, { dailyLog: mapDailyLog(row) }, 201);
    }),
  );

  router.get(
    "/:id/messages",
    validateParams(idParamSchema),
    asyncHandler(async (req, res) => {
      const user = req.user!;
      const project = await requireProject(
        projects,
        req.tenant!.id,
        { id: user.id, role: user.role },
        req.params.id!,
      );
      if (!req.tenant!.features.projectChat) {
        throw forbidden("Project chat is not enabled for this workspace.");
      }
      const rows = await messages.listByProject(req.tenant!.id, project.id);
      await messages.markRead(req.tenant!.id, project.id, user.id);
      ok(res, { messages: rows.map(mapMessage) });
    }),
  );

  router.post(
    "/:id/messages",
    requireRole("admin", "field_staff", "client"),
    validateParams(idParamSchema),
    validateBody(messageSendSchema),
    asyncHandler(async (req, res) => {
      const tenantId = req.tenant!.id;
      const user = req.user!;
      const input = req.body as MessageSendInput;
      const project = await projects.findById(tenantId, req.params.id!);
      if (!project) throw notFound("Project not found.");
      if (!req.tenant!.features.projectChat) {
        throw forbidden("Project chat is not enabled for this workspace.");
      }

      const row = await messages.create(tenantId, project.id, user.id, input.body);
      if (!row) throw notFound("Project not found.");

      await recordAudit(db, {
        tenantId,
        actorId: user.id,
        action: "project.message_sent",
        entityType: "project",
        entityId: project.id,
        metadata: { messageId: row.id },
        ip: req.ip ?? null,
      });
      ok(res, { message: mapMessage(row) }, 201);
    }),
  );

  router.get(
    "/clients",
    authenticate(db),
    requireRole("admin", "field_staff"),
    asyncHandler(async (req, res) => {
      const tenantId = req.tenant!.id;
      const rows = await users.listClients(tenantId);
      ok(res, {
        clients: rows.map((row) => ({
          id: row.id,
          name: [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || row.email,
          email: row.email,
          projects: [],
        })),
      });
    }),
  );

  return router;
}
