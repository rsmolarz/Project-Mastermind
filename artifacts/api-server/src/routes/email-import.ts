import { Router, type IRouter } from "express";
import { db, emailConfigTable, emailLogsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

const router: IRouter = Router();

interface ImportedEmail {
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  messageId: string;
}

function getImapHost(smtpHost: string): string {
  const map: Record<string, string> = {
    "smtp.gmail.com": "imap.gmail.com",
    "smtp.outlook.com": "outlook.office365.com",
    "smtp.office365.com": "outlook.office365.com",
    "smtp.yahoo.com": "imap.mail.yahoo.com",
    "smtp.mail.yahoo.com": "imap.mail.yahoo.com",
    "smtp.zoho.com": "imap.zoho.com",
    "smtp.aol.com": "imap.aol.com",
    "smtp.fastmail.com": "imap.fastmail.com",
    "smtp.protonmail.ch": "",
    "smtp.mailgun.org": "",
    "smtp.sendgrid.net": "",
  };
  if (map[smtpHost] !== undefined) return map[smtpHost];
  return smtpHost.replace(/^smtp\./, "imap.");
}

function getImapPort(encryption: string): number {
  return encryption === "ssl" ? 993 : 993;
}

router.get("/email-import/status", async (_req, res): Promise<void> => {
  const configs = await db.select().from(emailConfigTable);
  if (configs.length === 0 || !configs[0].active) {
    res.json({ configured: false, message: "Email system not configured or not active" });
    return;
  }
  const config = configs[0];
  const imapHost = getImapHost(config.host);
  if (!imapHost) {
    res.json({ configured: false, message: `IMAP not available for provider: ${config.host}` });
    return;
  }

  const totalImported = await db.select({ count: sql<number>`count(*)` }).from(emailLogsTable)
    .where(eq(emailLogsTable.provider, "imap-import"));
  
  res.json({
    configured: true,
    provider: config.provider,
    smtpHost: config.host,
    imapHost,
    username: config.username,
    fromEmail: config.fromEmail,
    totalImported: Number(totalImported[0]?.count || 0),
  });
});

router.post("/email-import/scan", async (req, res): Promise<void> => {
  const configs = await db.select().from(emailConfigTable);
  if (configs.length === 0 || !configs[0].active) {
    res.status(400).json({ error: "Email system not configured or not active" });
    return;
  }

  const config = configs[0];
  const imapHost = getImapHost(config.host);
  if (!imapHost) {
    res.status(400).json({ error: `IMAP not supported for ${config.host}. Use SMTP providers like Gmail, Outlook, or Yahoo.` });
    return;
  }

  const folder = (req.body.folder as string) || "INBOX";
  const maxEmails = Math.min(parseInt(req.body.limit as string) || 100, 500);
  const skipExisting = req.body.skipExisting !== false;

  let client: ImapFlow | null = null;
  const imported: ImportedEmail[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  try {
    client = new ImapFlow({
      host: imapHost,
      port: getImapPort(config.encryption),
      secure: true,
      auth: {
        user: config.username,
        pass: config.password,
      },
      logger: false,
    });

    await client.connect();

    const lock = await client.getMailboxLock(folder);
    try {
      const mailbox = client.mailbox;
      if (!mailbox) {
        res.status(400).json({ error: "Could not open mailbox" });
        return;
      }

      const totalMessages = mailbox.exists || 0;
      const startSeq = Math.max(1, totalMessages - maxEmails + 1);

      for await (const message of client.fetch(`${startSeq}:*`, {
        envelope: true,
        source: true,
        uid: true,
      })) {
        try {
          const messageId = message.envelope?.messageId || `uid-${message.uid}`;

          if (skipExisting) {
            const existing = await db.select({ id: emailLogsTable.id }).from(emailLogsTable)
              .where(eq(emailLogsTable.gmailMessageId, messageId))
              .limit(1);
            if (existing.length > 0) {
              skipped.push(messageId);
              continue;
            }
          }

          const parsed = await simpleParser(message.source);
          const fromAddr = parsed.from?.value?.[0]?.address || message.envelope?.from?.[0]?.address || "unknown";
          const toAddr = parsed.to
            ? (Array.isArray(parsed.to) ? parsed.to[0]?.value?.[0]?.address : parsed.to.value?.[0]?.address)
            : message.envelope?.to?.[0]?.address || "";
          const subject = parsed.subject || message.envelope?.subject || "(no subject)";
          const bodyText = parsed.text || "";
          const bodyHtml = parsed.html || "";
          const date = parsed.date || message.envelope?.date || new Date();

          const attachmentsList = (parsed.attachments || []).map(a => ({
            filename: a.filename || "unnamed",
            contentType: a.contentType || "application/octet-stream",
            size: a.size || 0,
          }));

          await db.insert(emailLogsTable).values({
            projectId: null,
            fromAddress: fromAddr,
            toAddress: toAddr || "",
            subject,
            bodyText: bodyText.substring(0, 50000),
            bodyHtml: bodyHtml.substring(0, 100000),
            provider: "imap-import",
            direction: fromAddr.toLowerCase() === config.fromEmail?.toLowerCase() ? "outbound" : "inbound",
            gmailMessageId: messageId,
            attachments: attachmentsList.length > 0 ? attachmentsList : null,
            receivedAt: new Date(date),
          });

          imported.push({
            subject,
            from: fromAddr,
            to: toAddr || "",
            date: new Date(date).toISOString(),
            snippet: bodyText.substring(0, 150),
            messageId,
          });
        } catch (parseErr: any) {
          errors.push(`Failed to parse message uid ${message.uid}: ${parseErr.message}`);
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err: any) {
    if (client) {
      try { await client.logout(); } catch {}
    }

    if (err.message?.includes("AUTHENTICATIONFAILED") || err.message?.includes("Invalid credentials")) {
      res.status(401).json({
        error: "Authentication failed. For Gmail, use an App Password (not your regular password). Go to Google Account > Security > 2-Step Verification > App passwords.",
        details: err.message,
      });
      return;
    }

    res.status(500).json({
      error: `IMAP connection failed: ${err.message}`,
      hint: imapHost === "imap.gmail.com"
        ? "For Gmail: Enable IMAP in Gmail settings, use an App Password, and ensure 'Less secure app access' or 2FA + App Password is configured."
        : "Check your email credentials and ensure IMAP access is enabled.",
    });
    return;
  }

  res.json({
    success: true,
    folder,
    imported: imported.length,
    skipped: skipped.length,
    errors: errors.length,
    errorDetails: errors.slice(0, 10),
    emails: imported,
  });
});

router.get("/email-import/folders", async (_req, res): Promise<void> => {
  const configs = await db.select().from(emailConfigTable);
  if (configs.length === 0 || !configs[0].active) {
    res.status(400).json({ error: "Email system not configured or not active" });
    return;
  }

  const config = configs[0];
  const imapHost = getImapHost(config.host);
  if (!imapHost) {
    res.status(400).json({ error: `IMAP not supported for ${config.host}` });
    return;
  }

  let client: ImapFlow | null = null;
  try {
    client = new ImapFlow({
      host: imapHost,
      port: getImapPort(config.encryption),
      secure: true,
      auth: { user: config.username, pass: config.password },
      logger: false,
    });

    await client.connect();
    const folders: { name: string; path: string; specialUse?: string }[] = [];
    const tree = await client.list();
    for (const item of tree) {
      folders.push({
        name: item.name,
        path: item.path,
        specialUse: item.specialUse || undefined,
      });
    }

    await client.logout();
    res.json({ folders });
  } catch (err: any) {
    if (client) { try { await client.logout(); } catch {} }
    res.status(500).json({ error: `Failed to list folders: ${err.message}` });
  }
});

router.post("/email-import/analyze", async (_req, res): Promise<void> => {
  const emails = await db.select().from(emailLogsTable);

  if (emails.length === 0) {
    res.json({
      totalEmails: 0,
      suggestedHeadings: [],
      message: "No emails to analyze. Import emails first using the scan endpoint.",
    });
    return;
  }

  const categoryKeywords: Record<string, RegExp> = {
    "billing": /invoice|payment|billing|receipt|due|pay|amount|charge|subscription/i,
    "proposals": /proposal|quote|estimate|bid|scope|rfp|rfq|pricing/i,
    "contracts": /contract|agreement|terms|sign|nda|sow|legal.*agreement/i,
    "support": /bug|issue|error|fix|broken|crash|ticket|help|support|problem/i,
    "feature-requests": /feature|request|enhancement|improvement|wishlist|idea|suggest/i,
    "meetings": /meeting|schedule|call|zoom|agenda|standup|sync|calendar|appointment/i,
    "reports": /report|analytics|metrics|kpi|dashboard|summary|weekly.*report|monthly/i,
    "design": /design|mockup|wireframe|prototype|figma|ui|ux|creative|brand/i,
    "devops": /deploy|release|launch|production|staging|ci|cd|server|infrastructure/i,
    "onboarding": /onboard|welcome|setup|getting started|intro|new.*hire|orientation/i,
    "reviews": /review|feedback|approval|sign.?off|evaluate|assess/i,
    "updates": /update|progress|status|weekly|daily|changelog|release.*notes/i,
    "marketing": /marketing|campaign|newsletter|promo|social|ads|seo|content/i,
    "hiring": /hiring|candidate|interview|resume|application|recruit|job/i,
    "legal": /legal|compliance|audit|regulation|policy|gdpr|privacy/i,
    "sales": /sales|lead|prospect|deal|pipeline|opportunity|close|revenue/i,
    "client-comms": /client|customer|account.*manager|relationship|feedback.*client/i,
    "internal": /team|internal|company|org|department|hr|all.?hands/i,
    "shipping": /shipping|delivery|tracking|order|fulfillment|logistics|warehouse/i,
    "finance": /budget|forecast|expense|cost|profit|loss|accounting|tax/i,
  };

  const categorized: Record<string, {
    count: number;
    sampleSubjects: string[];
    senders: Set<string>;
    dateRange: { earliest: Date; latest: Date };
  }> = {};

  const senderDomains: Record<string, number> = {};
  const subjectPatterns: Record<string, number> = {};

  for (const email of emails) {
    const text = `${email.subject} ${(email.bodyText || "").substring(0, 500)}`;
    let matched = false;

    for (const [category, regex] of Object.entries(categoryKeywords)) {
      if (regex.test(text)) {
        if (!categorized[category]) {
          categorized[category] = {
            count: 0,
            sampleSubjects: [],
            senders: new Set(),
            dateRange: { earliest: email.receivedAt, latest: email.receivedAt },
          };
        }
        categorized[category].count++;
        if (categorized[category].sampleSubjects.length < 5) {
          categorized[category].sampleSubjects.push(email.subject);
        }
        categorized[category].senders.add(email.fromAddress);
        if (email.receivedAt < categorized[category].dateRange.earliest) {
          categorized[category].dateRange.earliest = email.receivedAt;
        }
        if (email.receivedAt > categorized[category].dateRange.latest) {
          categorized[category].dateRange.latest = email.receivedAt;
        }
        matched = true;
        break;
      }
    }

    if (!matched) {
      if (!categorized["general"]) {
        categorized["general"] = { count: 0, sampleSubjects: [], senders: new Set(), dateRange: { earliest: email.receivedAt, latest: email.receivedAt } };
      }
      categorized["general"].count++;
      if (categorized["general"].sampleSubjects.length < 5) {
        categorized["general"].sampleSubjects.push(email.subject);
      }
    }

    const domain = email.fromAddress.split("@")[1] || "unknown";
    senderDomains[domain] = (senderDomains[domain] || 0) + 1;

    const tagMatch = email.subject.match(/^\[([^\]]+)\]/);
    if (tagMatch) {
      const tag = tagMatch[1];
      subjectPatterns[tag] = (subjectPatterns[tag] || 0) + 1;
    }
  }

  const suggestedHeadings = Object.entries(categorized)
    .filter(([_, data]) => data.count >= 1)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([category, data]) => ({
      category,
      displayName: category.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      emailCount: data.count,
      sampleSubjects: data.sampleSubjects,
      uniqueSenders: data.senders.size,
      topSenders: Array.from(data.senders).slice(0, 5),
      dateRange: {
        earliest: data.dateRange.earliest.toISOString(),
        latest: data.dateRange.latest.toISOString(),
      },
      suggestedIcon: getCategoryIcon(category),
      suggestedColor: getCategoryColor(category),
    }));

  const topDomains = Object.entries(senderDomains)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([domain, count]) => ({ domain, count }));

  const existingTags = Object.entries(subjectPatterns)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }));

  res.json({
    totalEmails: emails.length,
    totalCategories: suggestedHeadings.length,
    suggestedHeadings,
    topSenderDomains: topDomains,
    existingSubjectTags: existingTags,
  });
});

router.post("/email-import/create-headings", async (req, res): Promise<void> => {
  const { headings } = req.body;
  if (!Array.isArray(headings) || headings.length === 0) {
    res.status(400).json({ error: "headings array is required: [{category, projectName, icon?, color?}]" });
    return;
  }

  const results: Array<{ category: string; projectId: number; projectName: string; assignedEmails: number }> = [];

  const categoryKeywords: Record<string, RegExp> = {
    "billing": /invoice|payment|billing|receipt|due|pay|amount|charge|subscription/i,
    "proposals": /proposal|quote|estimate|bid|scope|rfp|rfq|pricing/i,
    "contracts": /contract|agreement|terms|sign|nda|sow|legal.*agreement/i,
    "support": /bug|issue|error|fix|broken|crash|ticket|help|support|problem/i,
    "feature-requests": /feature|request|enhancement|improvement|wishlist|idea|suggest/i,
    "meetings": /meeting|schedule|call|zoom|agenda|standup|sync|calendar|appointment/i,
    "reports": /report|analytics|metrics|kpi|dashboard|summary|weekly.*report|monthly/i,
    "design": /design|mockup|wireframe|prototype|figma|ui|ux|creative|brand/i,
    "devops": /deploy|release|launch|production|staging|ci|cd|server|infrastructure/i,
    "onboarding": /onboard|welcome|setup|getting started|intro|new.*hire|orientation/i,
    "reviews": /review|feedback|approval|sign.?off|evaluate|assess/i,
    "updates": /update|progress|status|weekly|daily|changelog|release.*notes/i,
    "marketing": /marketing|campaign|newsletter|promo|social|ads|seo|content/i,
    "hiring": /hiring|candidate|interview|resume|application|recruit|job/i,
    "legal": /legal|compliance|audit|regulation|policy|gdpr|privacy/i,
    "sales": /sales|lead|prospect|deal|pipeline|opportunity|close|revenue/i,
    "client-comms": /client|customer|account.*manager|relationship|feedback.*client/i,
    "internal": /team|internal|company|org|department|hr|all.?hands/i,
    "shipping": /shipping|delivery|tracking|order|fulfillment|logistics|warehouse/i,
    "finance": /budget|forecast|expense|cost|profit|loss|accounting|tax/i,
    "general": /.*/,
  };

  const { projectsTable } = await import("@workspace/db");

  for (const heading of headings) {
    const { category, projectName, icon, color } = heading;
    if (!category || !projectName) continue;

    const [project] = await db.insert(projectsTable).values({
      name: projectName,
      icon: icon || getCategoryIcon(category),
      color: color || getCategoryColor(category),
      tag: category.toUpperCase().replace(/-/g, "_"),
    }).returning();

    const regex = categoryKeywords[category];
    if (!regex) continue;

    const unassigned = await db.select().from(emailLogsTable)
      .where(sql`${emailLogsTable.projectId} IS NULL`);

    let assigned = 0;
    for (const email of unassigned) {
      const text = `${email.subject} ${(email.bodyText || "").substring(0, 500)}`;
      if (regex.test(text)) {
        await db.update(emailLogsTable)
          .set({ projectId: project.id })
          .where(eq(emailLogsTable.id, email.id));
        assigned++;
      }
    }

    results.push({
      category,
      projectId: project.id,
      projectName: project.name,
      assignedEmails: assigned,
    });
  }

  res.json({ success: true, created: results });
});

router.post("/email-import/deep-scan", async (req, res): Promise<void> => {
  const configs = await db.select().from(emailConfigTable);
  if (configs.length === 0 || !configs[0].active) {
    res.status(400).json({ error: "Email system not configured or not active" });
    return;
  }

  const config = configs[0];
  const imapHost = getImapHost(config.host);
  if (!imapHost) {
    res.status(400).json({ error: `IMAP not supported for ${config.host}` });
    return;
  }

  const folder = (req.body.folder as string) || "[Gmail]/All Mail";
  const sinceDate = req.body.since || "2017-01-01";
  const beforeDate = req.body.before || null;

  let client: ImapFlow | null = null;

  try {
    client = new ImapFlow({
      host: imapHost,
      port: 993,
      secure: true,
      auth: { user: config.username, pass: config.password },
      logger: false,
      emitLogs: false,
    });

    await client.connect();
    const lock = await client.getMailboxLock(folder);

    const senderMap: Record<string, { count: number; name: string; latestSubject: string; latestDate: string; subjects: string[] }> = {};
    let total = 0;

    try {
      const searchCriteria: any = { since: new Date(sinceDate) };
      if (beforeDate) searchCriteria.before = new Date(beforeDate);

      const uids = await client.search(searchCriteria, { uid: true });
      const totalToScan = uids.length;

      if (totalToScan === 0) {
        lock.release();
        await client.logout();
        res.json({ success: true, folder, since: sinceDate, totalEmailsScanned: 0, uniqueSenders: 0, uniqueDomains: 0, topSenders: [], topDomains: [], allDomains: [] });
        return;
      }

      const BATCH = 500;
      for (let i = 0; i < uids.length; i += BATCH) {
        const batch = uids.slice(i, i + BATCH);
        const uidRange = batch.join(",");

        for await (const message of client.fetch(uidRange, { envelope: true }, { uid: true })) {
          total++;
          const fromAddr = message.envelope?.from?.[0]?.address?.toLowerCase() || "unknown";
          const fromName = message.envelope?.from?.[0]?.name || "";
          const subject = message.envelope?.subject || "(no subject)";
          const rawDate = message.envelope?.date;
          const date = rawDate instanceof Date ? rawDate.toISOString() : (rawDate ? String(rawDate) : "");

          if (!senderMap[fromAddr]) {
            senderMap[fromAddr] = { count: 0, name: fromName, latestSubject: subject, latestDate: date, subjects: [] };
          }
          senderMap[fromAddr].count++;
          if (senderMap[fromAddr].subjects.length < 5) {
            senderMap[fromAddr].subjects.push(subject);
          }
          if (date > senderMap[fromAddr].latestDate) {
            senderMap[fromAddr].latestDate = date;
            senderMap[fromAddr].latestSubject = subject;
          }
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();

    const senders = Object.entries(senderMap)
      .map(([email, info]) => ({
        email,
        domain: email.split("@")[1] || "unknown",
        name: info.name,
        count: info.count,
        latestSubject: info.latestSubject,
        latestDate: info.latestDate,
        sampleSubjects: info.subjects,
      }))
      .sort((a, b) => b.count - a.count);

    const domainMap: Record<string, { count: number; senders: string[]; sampleSubjects: string[] }> = {};
    for (const s of senders) {
      if (!domainMap[s.domain]) domainMap[s.domain] = { count: 0, senders: [], sampleSubjects: [] };
      domainMap[s.domain].count += s.count;
      if (domainMap[s.domain].senders.length < 5) domainMap[s.domain].senders.push(s.email);
      if (domainMap[s.domain].sampleSubjects.length < 3) domainMap[s.domain].sampleSubjects.push(...s.sampleSubjects.slice(0, 2));
    }

    const domains = Object.entries(domainMap)
      .map(([domain, info]) => ({
        domain,
        totalEmails: info.count,
        senders: info.senders,
        sampleSubjects: info.sampleSubjects.slice(0, 3),
      }))
      .sort((a, b) => b.totalEmails - a.totalEmails);

    res.json({
      success: true,
      folder,
      since: sinceDate,
      totalEmailsScanned: total,
      uniqueSenders: senders.length,
      uniqueDomains: domains.length,
      topSenders: senders.slice(0, 150),
      topDomains: domains.slice(0, 150),
      allDomains: domains,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  } finally {
    if (client) try { await client.logout(); } catch {}
  }
});

router.post("/email-import/reset-assignments", async (_req, res): Promise<void> => {
  const result = await db.update(emailLogsTable)
    .set({ projectId: null })
    .where(sql`${emailLogsTable.projectId} IS NOT NULL`);
  res.json({ success: true, message: "All email project assignments cleared" });
});

router.post("/email-import/create-business-headings", async (req, res): Promise<void> => {
  const { businesses } = req.body;
  if (!Array.isArray(businesses) || businesses.length === 0) {
    res.status(400).json({ error: "businesses array required: [{name, tag, icon?, color?, domains:[], keywords:[]}]" });
    return;
  }

  const { projectsTable } = await import("@workspace/db");
  const results: Array<{ name: string; projectId: number; assignedEmails: number }> = [];

  for (const biz of businesses) {
    const { name, tag, icon, color, domains, keywords } = biz;
    if (!name) continue;

    const [project] = await db.insert(projectsTable).values({
      name,
      icon: icon || "📧",
      color: color || "#6366f1",
      tag: tag || name.toUpperCase().replace(/[^A-Z0-9]/g, "_").substring(0, 20),
    }).returning();

    const allEmails = await db.select().from(emailLogsTable)
      .where(sql`${emailLogsTable.projectId} IS NULL`);

    let assigned = 0;
    for (const email of allEmails) {
      const from = email.fromAddress.toLowerCase();
      const domain = from.split("@")[1] || "";
      const text = `${email.subject} ${(email.bodyText || "").substring(0, 1000)}`.toLowerCase();

      let match = false;

      if (Array.isArray(domains)) {
        for (const d of domains) {
          if (domain.includes(d.toLowerCase())) { match = true; break; }
        }
      }

      if (!match && Array.isArray(keywords)) {
        for (const kw of keywords) {
          if (text.includes(kw.toLowerCase())) { match = true; break; }
        }
      }

      if (match) {
        await db.update(emailLogsTable)
          .set({ projectId: project.id })
          .where(eq(emailLogsTable.id, email.id));
        assigned++;
      }
    }

    results.push({ name, projectId: project.id, assignedEmails: assigned });
  }

  res.json({ success: true, created: results });
});

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    "billing": "💰", "proposals": "📋", "contracts": "📝", "support": "🛠️",
    "feature-requests": "✨", "meetings": "📅", "reports": "📊", "design": "🎨",
    "devops": "🚀", "onboarding": "👋", "reviews": "👀", "updates": "📢",
    "marketing": "📣", "hiring": "👥", "legal": "⚖️", "sales": "💼",
    "client-comms": "🤝", "internal": "🏢", "shipping": "📦", "finance": "💳",
    "general": "📧",
  };
  return icons[category] || "📧";
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    "billing": "#f59e0b", "proposals": "#8b5cf6", "contracts": "#64748b", "support": "#ef4444",
    "feature-requests": "#06b6d4", "meetings": "#3b82f6", "reports": "#10b981", "design": "#ec4899",
    "devops": "#f97316", "onboarding": "#22c55e", "reviews": "#a855f7", "updates": "#0ea5e9",
    "marketing": "#e11d48", "hiring": "#6366f1", "legal": "#78716c", "sales": "#059669",
    "client-comms": "#14b8a6", "internal": "#6b7280", "shipping": "#d97706", "finance": "#0d9488",
    "general": "#6366f1",
  };
  return colors[category] || "#6366f1";
}

export default router;
