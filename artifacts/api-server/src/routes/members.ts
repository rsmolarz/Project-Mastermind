import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, membersTable } from "@workspace/db";
import {
  ListMembersResponse,
  CreateMemberBody,
  UpdateMemberParams,
  UpdateMemberBody,
  UpdateMemberResponse,
} from "@workspace/api-zod";
import { requireRole } from "./security";

const router: IRouter = Router();

router.get("/members", async (_req, res): Promise<void> => {
  const members = await db.select().from(membersTable).orderBy(membersTable.id);
  res.json(ListMembersResponse.parse(members));
});

router.get("/members/roles", async (_req, res): Promise<void> => {
  const members = await db.select({
    id: membersTable.id,
    name: membersTable.name,
    permissionRole: membersTable.permissionRole,
  }).from(membersTable).orderBy(membersTable.id);
  res.json({
    roles: ["admin", "member", "viewer"],
    members: members,
  });
});

router.post("/members", async (req, res): Promise<void> => {
  const parsed = CreateMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [member] = await db.insert(membersTable).values(parsed.data).returning();
  res.status(201).json(UpdateMemberResponse.parse(member));
});

router.patch("/members/:id", async (req, res): Promise<void> => {
  const params = UpdateMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [member] = await db.update(membersTable).set(parsed.data).where(eq(membersTable.id, params.data.id)).returning();
  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }
  res.json(UpdateMemberResponse.parse(member));
});

router.patch("/members/:id/role", requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { permissionRole } = req.body;
  if (!["admin", "member", "viewer"].includes(permissionRole)) {
    res.status(400).json({ error: "Invalid role. Must be admin, member, or viewer" });
    return;
  }
  const [member] = await db.update(membersTable).set({ permissionRole }).where(eq(membersTable.id, id)).returning();
  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }
  res.json({ id: member.id, name: member.name, permissionRole: member.permissionRole });
});

export default router;
