import { Router, type IRouter } from "express";
import { db, emailRoutesTable, emailLogsTable, projectsTable, domainProjectMappingsTable } from "@workspace/db";
import { eq, and, desc, sql, isNull, inArray } from "drizzle-orm";

const router: IRouter = Router();

const JMAP_SESSION_URL = "https://api.fastmail.com/jmap/session";
const JMAP_API_URL = "https://api.fastmail.com/jmap/api/";

function getToken(): string {
  const token = process.env.FASTMAIL_API_TOKEN;
  if (!token) throw new Error("FASTMAIL_API_TOKEN not configured");
  return token;
}

async function jmapSession() {
  const res = await fetch(JMAP_SESSION_URL, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error(`Session failed: ${res.status}`);
  return res.json();
}

async function jmapCall(using: string[], methodCalls: any[]) {
  const res = await fetch(JMAP_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ using, methodCalls }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`JMAP call failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function getAccountId(): Promise<string> {
  const session = await jmapSession();
  return Object.keys(session.accounts)[0];
}

router.get("/fastmail/session", async (_req, res): Promise<void> => {
  try {
    const session = await jmapSession();
    const accountId = Object.keys(session.accounts)[0];
    const account = session.accounts[accountId];
    res.json({
      connected: true,
      username: session.username,
      accountId,
      accountName: account.name,
      capabilities: Object.keys(session.capabilities),
      accountCapabilities: Object.keys(account.accountCapabilities),
    });
  } catch (e: any) {
    res.json({ connected: false, error: e.message });
  }
});

router.get("/fastmail/mailboxes", async (_req, res): Promise<void> => {
  try {
    const accountId = await getAccountId();
    const result = await jmapCall(
      ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
      [["Mailbox/get", {
        accountId,
        properties: ["name", "role", "totalEmails", "unreadEmails", "totalThreads", "parentId", "sortOrder"],
      }, "0"]]
    );
    const mailboxes = result.methodResponses[0][1].list;
    res.json({ mailboxes });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/fastmail/emails", async (req, res): Promise<void> => {
  try {
    const accountId = await getAccountId();
    const limit = Math.max(1, Math.min(parseInt(req.query.limit as string) || 50, 100));
    const position = Math.max(0, parseInt(req.query.position as string) || 0);
    const mailboxId = req.query.mailboxId as string;
    const search = req.query.search as string;

    const filter: any = {};
    if (mailboxId) filter.inMailbox = mailboxId;
    if (search) filter.text = search;

    const sort = [{ property: "receivedAt", isAscending: false }];

    const result = await jmapCall(
      ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
      [
        ["Email/query", { accountId, filter, sort, limit, position, calculateTotal: true }, "q"],
        ["Email/get", {
          accountId,
          "#ids": { resultOf: "q", name: "Email/query", path: "/ids" },
          properties: [
            "subject", "from", "to", "cc", "replyTo", "sender",
            "receivedAt", "sentAt", "size", "preview",
            "keywords", "mailboxIds", "hasAttachment",
          ],
        }, "g"],
      ]
    );

    const queryResult = result.methodResponses[0][1];
    const emails = result.methodResponses[1][1].list;

    res.json({
      emails,
      total: queryResult.total,
      position: queryResult.position,
      hasMore: position + emails.length < (queryResult.total || 0),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/fastmail/email/:id", async (req, res): Promise<void> => {
  try {
    const accountId = await getAccountId();
    const result = await jmapCall(
      ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
      [["Email/get", {
        accountId,
        ids: [req.params.id],
        properties: [
          "subject", "from", "to", "cc", "bcc", "replyTo", "sender",
          "receivedAt", "sentAt", "size", "preview",
          "textBody", "htmlBody", "bodyValues",
          "keywords", "mailboxIds", "hasAttachment", "attachments",
          "messageId", "inReplyTo", "references", "headers",
        ],
        fetchAllBodyValues: true,
      }, "0"]]
    );
    const email = result.methodResponses[0][1].list[0];
    if (!email) {
      res.status(404).json({ error: "Email not found" });
      return;
    }
    res.json({ email });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/fastmail/send", async (req, res): Promise<void> => {
  try {
    const accountId = await getAccountId();
    const { to, cc, bcc, subject, textBody, htmlBody, inReplyTo, references } = req.body;

    const session = await jmapSession();
    const identityResult = await jmapCall(
      ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:submission"],
      [["Identity/get", { accountId }, "0"]]
    );
    const identity = identityResult.methodResponses[0][1].list[0];
    if (!identity) {
      res.status(400).json({ error: "No sending identity found" });
      return;
    }

    const mailboxResult = await jmapCall(
      ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
      [["Mailbox/get", { accountId, properties: ["name", "role"] }, "0"]]
    );
    const draftsMailbox = mailboxResult.methodResponses[0][1].list.find(
      (m: any) => m.role === "drafts"
    );

    const emailBody: any = {};
    if (htmlBody) {
      emailBody.htmlBody = [{ partId: "html", type: "text/html" }];
      emailBody.bodyValues = { html: { value: htmlBody } };
    } else {
      emailBody.textBody = [{ partId: "text", type: "text/plain" }];
      emailBody.bodyValues = { text: { value: textBody || "" } };
    }

    const emailCreate: any = {
      from: [{ name: identity.name, email: identity.email }],
      to: Array.isArray(to) ? to : [{ email: to }],
      subject: subject || "",
      mailboxIds: draftsMailbox ? { [draftsMailbox.id]: true } : {},
      keywords: { $draft: true },
      ...emailBody,
    };

    if (cc) emailCreate.cc = Array.isArray(cc) ? cc : [{ email: cc }];
    if (bcc) emailCreate.bcc = Array.isArray(bcc) ? bcc : [{ email: bcc }];
    if (inReplyTo) emailCreate.inReplyTo = [inReplyTo];
    if (references) emailCreate.references = Array.isArray(references) ? references : [references];

    const sendResult = await jmapCall(
      ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail", "urn:ietf:params:jmap:submission"],
      [
        ["Email/set", {
          accountId,
          create: { draft: emailCreate },
        }, "c"],
        ["EmailSubmission/set", {
          accountId,
          create: {
            send: {
              identityId: identity.id,
              emailId: "#draft",
            },
          },
          onSuccessUpdateEmail: draftsMailbox ? {
            "#send": {
              [`mailboxIds/${draftsMailbox.id}`]: null,
              "keywords/$draft": null,
            },
          } : {
            "#send": {
              "keywords/$draft": null,
            },
          },
        }, "s"],
      ]
    );

    const emailSetResult = sendResult.methodResponses[0][1];
    const submissionResult = sendResult.methodResponses[1][1];

    if (emailSetResult.notCreated?.draft) {
      res.status(400).json({ error: "Failed to create email", details: emailSetResult.notCreated.draft });
      return;
    }
    if (submissionResult.notCreated?.send) {
      res.status(400).json({ error: "Failed to send email", details: submissionResult.notCreated.send });
      return;
    }

    res.json({
      success: true,
      emailId: emailSetResult.created?.draft?.id,
      from: identity.email,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/fastmail/contacts", async (req, res): Promise<void> => {
  try {
    const accountId = await getAccountId();
    const result = await jmapCall(
      ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:contacts"],
      [["ContactCard/get", { accountId }, "0"]]
    );
    const contacts = result.methodResponses[0][1].list || [];

    const formatted = contacts.map((c: any) => {
      const emails: string[] = [];
      if (c.emails) {
        for (const key of Object.keys(c.emails)) {
          if (c.emails[key]?.address) emails.push(c.emails[key].address);
        }
      }
      const phones: string[] = [];
      if (c.phones) {
        for (const key of Object.keys(c.phones)) {
          if (c.phones[key]?.number) phones.push(c.phones[key].number);
        }
      }
      let company = "";
      if (c.organizations) {
        for (const key of Object.keys(c.organizations)) {
          if (c.organizations[key]?.name) { company = c.organizations[key].name; break; }
        }
      }
      return {
        id: c.id,
        name: c.name?.full || "",
        emails,
        phones,
        company,
        updated: c.updated,
      };
    });

    formatted.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
    res.json({ contacts: formatted, total: formatted.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/fastmail/masked-emails", async (_req, res): Promise<void> => {
  try {
    const accountId = await getAccountId();
    const result = await jmapCall(
      ["urn:ietf:params:jmap:core", "https://www.fastmail.com/dev/maskedemail"],
      [["MaskedEmail/get", { accountId }, "0"]]
    );
    const maskedEmails = result.methodResponses[0][1].list || [];
    res.json({ maskedEmails, total: maskedEmails.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/fastmail/masked-emails", async (req, res): Promise<void> => {
  try {
    const accountId = await getAccountId();
    const { forDomain, description, emailPrefix } = req.body;

    const create: any = {
      state: "enabled",
      forDomain: forDomain || "",
      description: description || "",
    };
    if (emailPrefix) create.emailPrefix = emailPrefix;

    const result = await jmapCall(
      ["urn:ietf:params:jmap:core", "https://www.fastmail.com/dev/maskedemail"],
      [["MaskedEmail/set", {
        accountId,
        create: { newMask: create },
      }, "0"]]
    );

    const setResult = result.methodResponses[0][1];
    if (setResult.notCreated?.newMask) {
      res.status(400).json({ error: "Failed to create masked email", details: setResult.notCreated.newMask });
      return;
    }
    res.json({ success: true, maskedEmail: setResult.created?.newMask });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.patch("/fastmail/masked-emails/:id", async (req, res): Promise<void> => {
  try {
    const accountId = await getAccountId();
    const { state, forDomain, description } = req.body;

    const update: any = {};
    if (state) update.state = state;
    if (forDomain !== undefined) update.forDomain = forDomain;
    if (description !== undefined) update.description = description;

    const result = await jmapCall(
      ["urn:ietf:params:jmap:core", "https://www.fastmail.com/dev/maskedemail"],
      [["MaskedEmail/set", {
        accountId,
        update: { [req.params.id]: update },
      }, "0"]]
    );

    const setResult = result.methodResponses[0][1];
    if (setResult.notUpdated?.[req.params.id]) {
      res.status(400).json({ error: "Failed to update", details: setResult.notUpdated[req.params.id] });
      return;
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/fastmail/masked-emails/:id", async (req, res): Promise<void> => {
  try {
    const accountId = await getAccountId();
    const result = await jmapCall(
      ["urn:ietf:params:jmap:core", "https://www.fastmail.com/dev/maskedemail"],
      [["MaskedEmail/set", {
        accountId,
        update: { [req.params.id]: { state: "deleted" } },
      }, "0"]]
    );
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/fastmail/search", async (req, res): Promise<void> => {
  try {
    const accountId = await getAccountId();
    const { query, limit = 20 } = req.body;

    const filter: any = { text: query };

    const result = await jmapCall(
      ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
      [
        ["Email/query", {
          accountId,
          filter,
          sort: [{ property: "receivedAt", isAscending: false }],
          limit: Math.min(limit, 50),
          calculateTotal: true,
        }, "q"],
        ["Email/get", {
          accountId,
          "#ids": { resultOf: "q", name: "Email/query", path: "/ids" },
          properties: ["subject", "from", "to", "receivedAt", "preview", "hasAttachment", "keywords"],
        }, "g"],
      ]
    );

    res.json({
      emails: result.methodResponses[1][1].list,
      total: result.methodResponses[0][1].total,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/fastmail/email/:id/move", async (req, res): Promise<void> => {
  try {
    const accountId = await getAccountId();
    const { mailboxId } = req.body;

    const currentEmail = await jmapCall(
      ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
      [["Email/get", { accountId, ids: [req.params.id], properties: ["mailboxIds"] }, "0"]]
    );
    const email = currentEmail.methodResponses[0][1].list[0];
    if (!email) {
      res.status(404).json({ error: "Email not found" });
      return;
    }

    const update: any = { [`mailboxIds/${mailboxId}`]: true };
    for (const existingId of Object.keys(email.mailboxIds)) {
      if (existingId !== mailboxId) {
        update[`mailboxIds/${existingId}`] = null;
      }
    }

    await jmapCall(
      ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
      [["Email/set", { accountId, update: { [req.params.id]: update } }, "0"]]
    );
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/fastmail/email/:id/keywords", async (req, res): Promise<void> => {
  try {
    const accountId = await getAccountId();
    const { keywords } = req.body;

    await jmapCall(
      ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
      [["Email/set", {
        accountId,
        update: { [req.params.id]: { keywords } },
      }, "0"]]
    );
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/fastmail/project-email", async (req, res): Promise<void> => {
  try {
    const { projectId } = req.body;
    if (!projectId) {
      res.status(400).json({ error: "projectId is required" });
      return;
    }

    const [project] = await db.select().from(projectsTable)
      .where(eq(projectsTable.id, parseInt(projectId)));
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const existingRoute = await db.select().from(emailRoutesTable)
      .where(eq(emailRoutesTable.projectId, parseInt(projectId)));
    if (existingRoute.length > 0) {
      res.status(409).json({
        error: "Project already has an email address",
        route: existingRoute[0],
      });
      return;
    }

    const accountId = await getAccountId();
    const customPrefix = req.body.emailPrefix;
    const slug = customPrefix || project.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .substring(0, 20);

    const result = await jmapCall(
      ["urn:ietf:params:jmap:core", "https://www.fastmail.com/dev/maskedemail"],
      [["MaskedEmail/set", {
        accountId,
        create: {
          newMask: {
            state: "enabled",
            forDomain: "projectos.app",
            description: `ProjectOS: ${project.name}`,
            emailPrefix: slug,
          },
        },
      }, "0"]]
    );

    const setResult = result.methodResponses[0][1];
    if (setResult.notCreated?.newMask) {
      res.status(400).json({
        error: "Failed to create masked email",
        details: setResult.notCreated.newMask,
      });
      return;
    }

    const maskedEmail = setResult.created?.newMask;
    if (!maskedEmail?.email) {
      res.status(500).json({ error: "No email returned from Fastmail" });
      return;
    }

    const [route] = await db.insert(emailRoutesTable).values({
      projectId: parseInt(projectId),
      assignedEmail: maskedEmail.email.toLowerCase(),
    }).returning();

    res.status(201).json({
      success: true,
      email: maskedEmail.email,
      maskedEmailId: maskedEmail.id,
      route,
      project: { id: project.id, name: project.name },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/fastmail/project-emails", async (_req, res): Promise<void> => {
  try {
    const routes = await db.select({
      id: emailRoutesTable.id,
      projectId: emailRoutesTable.projectId,
      assignedEmail: emailRoutesTable.assignedEmail,
      isActive: emailRoutesTable.isActive,
      createdAt: emailRoutesTable.createdAt,
      projectName: projectsTable.name,
      projectIcon: projectsTable.icon,
      projectColor: projectsTable.color,
    })
      .from(emailRoutesTable)
      .leftJoin(projectsTable, eq(emailRoutesTable.projectId, projectsTable.id))
      .orderBy(desc(emailRoutesTable.createdAt));

    res.json({ routes });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/fastmail/project-email/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    const [route] = await db.select().from(emailRoutesTable)
      .where(eq(emailRoutesTable.id, id));
    if (!route) { res.status(404).json({ error: "Route not found" }); return; }

    const accountId = await getAccountId();
    const maskedResult = await jmapCall(
      ["urn:ietf:params:jmap:core", "https://www.fastmail.com/dev/maskedemail"],
      [["MaskedEmail/get", { accountId }, "0"]]
    );
    const maskedEmails = maskedResult.methodResponses[0][1].list || [];
    const match = maskedEmails.find((m: any) =>
      m.email.toLowerCase() === route.assignedEmail.toLowerCase()
    );

    if (match) {
      await jmapCall(
        ["urn:ietf:params:jmap:core", "https://www.fastmail.com/dev/maskedemail"],
        [["MaskedEmail/set", {
          accountId,
          update: { [match.id]: { state: "disabled" } },
        }, "0"]]
      );
    }

    await db.delete(emailRoutesTable).where(eq(emailRoutesTable.id, id));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export async function syncProjectEmails() {
  const routes = await db.select().from(emailRoutesTable)
    .where(eq(emailRoutesTable.isActive, true));

  if (routes.length === 0) return { synced: 0, routes: 0, details: [] };

  const domainMappings = await db.select().from(domainProjectMappingsTable)
    .where(eq(domainProjectMappingsTable.isActive, true));
  const domainMap = new Map<string, number>();
  for (const dm of domainMappings) {
    domainMap.set(dm.domain.toLowerCase(), dm.projectId);
  }

  const emailToProject = new Map<string, number>();
  for (const route of routes) {
    if (route.assignedEmail.includes("@fastmail.com")) {
      emailToProject.set(route.assignedEmail.toLowerCase(), route.projectId);
    }
  }

  const accountId = await getAccountId();
  let totalSynced = 0;
  const syncDetails: any[] = [];

  for (const [maskedEmail, projectId] of emailToProject) {
    const queryResult = await jmapCall(
      ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
      [
        ["Email/query", {
          accountId,
          filter: { to: maskedEmail },
          sort: [{ property: "receivedAt", isAscending: false }],
          limit: 100,
          calculateTotal: true,
        }, "q"],
        ["Email/get", {
          accountId,
          "#ids": { resultOf: "q", name: "Email/query", path: "/ids" },
          properties: [
            "subject", "from", "to", "cc", "receivedAt", "size",
            "preview", "hasAttachment", "messageId",
          ],
        }, "g"],
      ]
    );

    const emails = queryResult.methodResponses[1][1].list || [];
    let newCount = 0;

    for (const email of emails) {
      const messageId = email.messageId?.[0] || email.id;
      const dedupKey = `fastmail:${messageId}:${projectId}`;

      const existing = await db.select({ id: emailLogsTable.id })
        .from(emailLogsTable)
        .where(eq(emailLogsTable.gmailMessageId, dedupKey))
        .limit(1);

      if (existing.length > 0) continue;

      const from = email.from?.[0];
      const to = email.to?.map((t: any) => t.email).join(", ") || maskedEmail;

      await db.insert(emailLogsTable).values({
        projectId,
        fromAddress: from?.email || "unknown",
        toAddress: to,
        subject: email.subject || "(no subject)",
        bodyText: email.preview || "",
        provider: "fastmail",
        direction: "inbound",
        gmailMessageId: dedupKey,
        metadata: {
          fastmailId: email.id,
          hasAttachment: email.hasAttachment,
          size: email.size,
          maskedEmail,
          fromName: from?.name,
          autoRouted: true,
        },
        receivedAt: new Date(email.receivedAt),
      });

      newCount++;
      totalSynced++;

      const senderDomain = (from?.email || "").split("@")[1]?.toLowerCase();
      if (senderDomain && domainMap.has(senderDomain)) {
        const domainProjectId = domainMap.get(senderDomain)!;
        if (domainProjectId !== projectId) {
          const domainDedupKey = `fastmail:${messageId}:${domainProjectId}`;
          const domainExisting = await db.select({ id: emailLogsTable.id })
            .from(emailLogsTable)
            .where(eq(emailLogsTable.gmailMessageId, domainDedupKey))
            .limit(1);
          if (domainExisting.length === 0) {
            await db.insert(emailLogsTable).values({
              projectId: domainProjectId,
              fromAddress: from?.email || "unknown",
              toAddress: to,
              subject: email.subject || "(no subject)",
              bodyText: email.preview || "",
              provider: "fastmail",
              direction: "inbound",
              gmailMessageId: domainDedupKey,
              metadata: {
                fastmailId: email.id,
                hasAttachment: email.hasAttachment,
                size: email.size,
                maskedEmail,
                fromName: from?.name,
                autoRouted: true,
                domainRouted: true,
                originalProjectId: projectId,
              },
              receivedAt: new Date(email.receivedAt),
            });
            totalSynced++;
          }
        }
      }
    }

    if (newCount > 0) {
      const [project] = await db.select({ name: projectsTable.name })
        .from(projectsTable)
        .where(eq(projectsTable.id, projectId));
      syncDetails.push({
        project: project?.name || `ID ${projectId}`,
        email: maskedEmail,
        newEmails: newCount,
        totalMatched: emails.length,
      });
    }
  }

  return { synced: totalSynced, routes: routes.length, details: syncDetails };
}

router.post("/fastmail/sync-to-projects", async (_req, res): Promise<void> => {
  try {
    const result = await syncProjectEmails();
    res.json({ success: true, ...result });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/fastmail/file-to-project", async (req, res): Promise<void> => {
  try {
    const { emailLogId, projectId } = req.body;
    if (!emailLogId || !projectId) {
      res.status(400).json({ error: "emailLogId and projectId required" });
      return;
    }

    const [original] = await db.select().from(emailLogsTable)
      .where(eq(emailLogsTable.id, emailLogId));
    if (!original) { res.status(404).json({ error: "Email not found" }); return; }

    const origMessageId = original.gmailMessageId?.split(":").slice(0, 2).join(":") || `manual:${emailLogId}`;
    const dedupKey = `${origMessageId}:${projectId}`;

    const existing = await db.select({ id: emailLogsTable.id })
      .from(emailLogsTable)
      .where(eq(emailLogsTable.gmailMessageId, dedupKey))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "Email already filed to this project" });
      return;
    }

    const [filed] = await db.insert(emailLogsTable).values({
      projectId,
      fromAddress: original.fromAddress,
      toAddress: original.toAddress,
      subject: original.subject,
      bodyText: original.bodyText,
      bodyHtml: original.bodyHtml,
      provider: original.provider,
      direction: original.direction,
      gmailMessageId: dedupKey,
      rawHeaders: original.rawHeaders,
      attachments: original.attachments,
      metadata: {
        ...((original.metadata as Record<string, any>) || {}),
        filedFrom: original.id,
        filedFromProject: original.projectId,
        manuallyFiled: true,
      },
      receivedAt: original.receivedAt,
    }).returning();

    const [project] = await db.select({ name: projectsTable.name })
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId));

    res.json({ success: true, filed, project: project?.name });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/fastmail/domain-mappings", async (_req, res): Promise<void> => {
  try {
    const mappings = await db.select().from(domainProjectMappingsTable);
    const projectIds = [...new Set(mappings.map(m => m.projectId))];
    let projects: any[] = [];
    if (projectIds.length > 0) {
      projects = await db.select({ id: projectsTable.id, name: projectsTable.name, icon: projectsTable.icon })
        .from(projectsTable)
        .where(inArray(projectsTable.id, projectIds));
    }
    const projectMap = new Map(projects.map(p => [p.id, p]));
    res.json({
      mappings: mappings.map(m => ({
        ...m,
        projectName: projectMap.get(m.projectId)?.name || `Project ${m.projectId}`,
        projectIcon: projectMap.get(m.projectId)?.icon || "◈",
      })),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/fastmail/domain-mappings", async (req, res): Promise<void> => {
  try {
    const { domain, projectId } = req.body;
    if (!domain || !projectId) {
      res.status(400).json({ error: "domain and projectId required" });
      return;
    }
    const cleanDomain = domain.toLowerCase().replace(/^@/, "").trim();
    const existing = await db.select().from(domainProjectMappingsTable)
      .where(eq(domainProjectMappingsTable.domain, cleanDomain));
    if (existing.length > 0) {
      res.status(409).json({ error: "Domain already mapped", existing: existing[0] });
      return;
    }
    const [mapping] = await db.insert(domainProjectMappingsTable).values({
      domain: cleanDomain,
      projectId,
    }).returning();
    res.json({ success: true, mapping });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/fastmail/domain-mappings/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(domainProjectMappingsTable).where(eq(domainProjectMappingsTable.id, id));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/fastmail/project-email-stats", async (_req, res): Promise<void> => {
  try {
    const routes = await db.select().from(emailRoutesTable)
      .where(eq(emailRoutesTable.isActive, true));

    const routedEmailCount = await db.select({
      count: sql<number>`count(*)::int`,
    })
      .from(emailLogsTable)
      .where(eq(emailLogsTable.provider, "fastmail"));

    res.json({
      activeRoutes: routes.length,
      totalRoutedEmails: routedEmailCount[0]?.count || 0,
      routes: routes.map(r => ({
        projectId: r.projectId,
        email: r.assignedEmail,
      })),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
