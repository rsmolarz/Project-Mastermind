import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, flowchartsTable } from "@workspace/db";

const router: IRouter = Router();

const MAX_NODES = 100;
const MAX_EDGES = 200;
const ALLOWED_TYPES = ["flowchart", "process", "decision_tree", "org_chart", "sequence"];

function parseId(raw: string): number | null {
  const id = parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

router.get("/flowcharts", async (_req, res): Promise<void> => {
  try {
    const charts = await db.select().from(flowchartsTable).orderBy(desc(flowchartsTable.createdAt));
    res.json(charts);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch flowcharts" });
  }
});

router.get("/flowcharts/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid flowchart ID" }); return; }
  try {
    const [chart] = await db.select().from(flowchartsTable).where(eq(flowchartsTable.id, id));
    if (!chart) { res.status(404).json({ error: "Flowchart not found" }); return; }
    res.json(chart);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch flowchart" });
  }
});

router.post("/flowcharts", async (req, res): Promise<void> => {
  try {
    const { name, description, projectId, type, nodes, edges } = req.body;
    if (!name || typeof name !== "string" || name.length > 200) {
      res.status(400).json({ error: "name is required (max 200 chars)" }); return;
    }
    if (type && !ALLOWED_TYPES.includes(type)) {
      res.status(400).json({ error: `Invalid type. Allowed: ${ALLOWED_TYPES.join(", ")}` }); return;
    }
    if (nodes && (!Array.isArray(nodes) || nodes.length > MAX_NODES)) {
      res.status(400).json({ error: `Max ${MAX_NODES} nodes allowed` }); return;
    }
    if (edges && (!Array.isArray(edges) || edges.length > MAX_EDGES)) {
      res.status(400).json({ error: `Max ${MAX_EDGES} edges allowed` }); return;
    }

    const parsedProjectId = projectId ? parseId(String(projectId)) : null;
    const [chart] = await db.insert(flowchartsTable).values({
      name: name.substring(0, 200),
      description: typeof description === "string" ? description.substring(0, 1000) : "",
      projectId: parsedProjectId,
      type: type || "flowchart",
      nodes: Array.isArray(nodes) ? nodes.slice(0, MAX_NODES) : [],
      edges: Array.isArray(edges) ? edges.slice(0, MAX_EDGES) : [],
    }).returning();
    res.status(201).json(chart);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create flowchart" });
  }
});

router.patch("/flowcharts/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid flowchart ID" }); return; }
  try {
    if (req.body.nodes && (!Array.isArray(req.body.nodes) || req.body.nodes.length > MAX_NODES)) {
      res.status(400).json({ error: `Max ${MAX_NODES} nodes allowed` }); return;
    }
    if (req.body.edges && (!Array.isArray(req.body.edges) || req.body.edges.length > MAX_EDGES)) {
      res.status(400).json({ error: `Max ${MAX_EDGES} edges allowed` }); return;
    }
    const updates: any = { updatedAt: new Date() };
    const fields = ["name", "description", "projectId", "type", "nodes", "edges"];
    for (const f of fields) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }
    const [chart] = await db.update(flowchartsTable).set(updates).where(eq(flowchartsTable.id, id)).returning();
    if (!chart) { res.status(404).json({ error: "Flowchart not found" }); return; }
    res.json(chart);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update flowchart" });
  }
});

router.delete("/flowcharts/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid flowchart ID" }); return; }
  try {
    await db.delete(flowchartsTable).where(eq(flowchartsTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete flowchart" });
  }
});

router.post("/flowcharts/ai-generate", async (req, res): Promise<void> => {
  try {
    const { prompt, type } = req.body;
    if (!prompt || typeof prompt !== "string") { res.status(400).json({ error: "prompt is required" }); return; }
    if (prompt.length > 2000) { res.status(400).json({ error: "Prompt too long (max 2000 chars)" }); return; }

    const { createAnthropicClient } = await import("@workspace/integrations-anthropic-ai");
    const client = createAnthropicClient();

    const diagramType = (type && ALLOWED_TYPES.includes(type)) ? type : "flowchart";
    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: `Generate a ${diagramType} diagram as JSON for: "${prompt.substring(0, 2000)}"

Return ONLY valid JSON with this structure:
{
  "name": "Diagram title",
  "nodes": [
    { "id": "node1", "type": "start|process|decision|end", "label": "Label", "x": 400, "y": 50, "width": 160, "height": 60, "color": "#6366f1" }
  ],
  "edges": [
    { "id": "edge1", "from": "node1", "to": "node2", "label": "optional label" }
  ]
}

Use type "start" for entry points (green #10b981), "process" for actions (indigo #6366f1), "decision" for branches (amber #f59e0b), "end" for terminals (rose #f43f5e). Arrange nodes vertically with y spacing of ~100px. Return 5-10 nodes for a meaningful diagram.`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) { res.status(500).json({ error: "Failed to parse AI response" }); return; }

    const diagram = JSON.parse(jsonMatch[0]);
    if (diagram.nodes && Array.isArray(diagram.nodes)) diagram.nodes = diagram.nodes.slice(0, MAX_NODES);
    if (diagram.edges && Array.isArray(diagram.edges)) diagram.edges = diagram.edges.slice(0, MAX_EDGES);
    res.json(diagram);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to generate diagram" });
  }
});

export default router;
