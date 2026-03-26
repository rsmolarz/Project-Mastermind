import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, taskAttachmentsTable } from "@workspace/db";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const router: IRouter = Router();

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;

router.get("/tasks/:taskId/attachments", async (req, res): Promise<void> => {
  const taskId = parseInt(req.params.taskId);
  const attachments = await db.select().from(taskAttachmentsTable)
    .where(eq(taskAttachmentsTable.taskId, taskId))
    .orderBy(desc(taskAttachmentsTable.createdAt));
  res.json(attachments);
});

router.post("/tasks/:taskId/attachments", async (req, res): Promise<void> => {
  const taskId = parseInt(req.params.taskId);
  const contentType = req.headers["content-type"] || "";

  if (!contentType.includes("multipart/form-data") && !contentType.includes("application/json")) {
    res.status(400).json({ error: "Content-Type must be multipart/form-data or application/json" });
    return;
  }

  if (contentType.includes("application/json")) {
    const { filename, mimeType, data, uploadedBy } = req.body;
    if (!filename || !data) {
      res.status(400).json({ error: "filename and data (base64) required" });
      return;
    }
    const buffer = Buffer.from(data, "base64");
    if (buffer.length > MAX_FILE_SIZE) {
      res.status(413).json({ error: "File too large (max 10MB)" });
      return;
    }
    const ext = path.extname(filename);
    const storedName = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(UPLOAD_DIR, storedName);
    fs.writeFileSync(filePath, buffer);

    const [attachment] = await db.insert(taskAttachmentsTable).values({
      taskId,
      filename: storedName,
      originalName: filename,
      mimeType: mimeType || "application/octet-stream",
      size: buffer.length,
      url: `/uploads/${storedName}`,
      uploadedBy: uploadedBy || null,
    }).returning();
    res.status(201).json(attachment);
    return;
  }

  const chunks: Buffer[] = [];
  let totalSize = 0;
  req.on("data", (chunk: Buffer) => {
    totalSize += chunk.length;
    if (totalSize <= MAX_FILE_SIZE) {
      chunks.push(chunk);
    }
  });
  req.on("end", async () => {
    if (totalSize > MAX_FILE_SIZE) {
      res.status(413).json({ error: "File too large (max 10MB)" });
      return;
    }
    const body = Buffer.concat(chunks);
    const boundary = contentType.split("boundary=")[1];
    if (!boundary) {
      res.status(400).json({ error: "Missing boundary in multipart data" });
      return;
    }

    const parts = body.toString("binary").split(`--${boundary}`);
    const fileParts = parts.filter(p => p.includes("filename="));

    if (fileParts.length === 0) {
      res.status(400).json({ error: "No file found in upload" });
      return;
    }

    const saved = [];
    for (const part of fileParts) {
      const headerEnd = part.indexOf("\r\n\r\n");
      if (headerEnd === -1) continue;
      const headers = part.substring(0, headerEnd);
      const filenameMatch = headers.match(/filename="([^"]+)"/);
      const contentTypeMatch = headers.match(/Content-Type:\s*(.+)/i);
      if (!filenameMatch) continue;

      const originalName = filenameMatch[1];
      const fileMimeType = contentTypeMatch ? contentTypeMatch[1].trim() : "application/octet-stream";
      const ext = path.extname(originalName);
      const storedName = `${crypto.randomUUID()}${ext}`;
      const fileData = Buffer.from(part.substring(headerEnd + 4, part.length - 2), "binary");
      const filePath = path.join(UPLOAD_DIR, storedName);
      fs.writeFileSync(filePath, fileData);

      const [attachment] = await db.insert(taskAttachmentsTable).values({
        taskId,
        filename: storedName,
        originalName,
        mimeType: fileMimeType,
        size: fileData.length,
        url: `/uploads/${storedName}`,
        uploadedBy: null,
      }).returning();
      saved.push(attachment);
    }

    res.status(201).json(saved.length === 1 ? saved[0] : saved);
  });
});

router.delete("/task-attachments/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const [attachment] = await db.select().from(taskAttachmentsTable)
    .where(eq(taskAttachmentsTable.id, id));
  if (!attachment) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const filePath = path.join(UPLOAD_DIR, attachment.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  await db.delete(taskAttachmentsTable).where(eq(taskAttachmentsTable.id, id));
  res.json({ success: true });
});

export default router;
