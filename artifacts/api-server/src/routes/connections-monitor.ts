import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

interface ConnectionStatus {
  id: string;
  name: string;
  category: string;
  status: "connected" | "degraded" | "disconnected" | "not_configured";
  message: string;
  latencyMs?: number;
  lastChecked: string;
  details?: Record<string, any>;
}

async function checkDatabase(): Promise<ConnectionStatus> {
  const start = Date.now();
  try {
    const result = await db.execute(sql`SELECT 1 as ok, version() as version, current_database() as db_name, pg_size_pretty(pg_database_size(current_database())) as db_size`);
    const row = result.rows?.[0] as any;
    return {
      id: "postgresql",
      name: "PostgreSQL Database",
      category: "Database",
      status: "connected",
      message: "Database is healthy and responding",
      latencyMs: Date.now() - start,
      lastChecked: new Date().toISOString(),
      details: {
        version: row?.version?.split(" ").slice(0, 2).join(" ") || "Unknown",
        database: row?.db_name || "Unknown",
        size: row?.db_size || "Unknown",
      },
    };
  } catch (err: any) {
    return {
      id: "postgresql",
      name: "PostgreSQL Database",
      category: "Database",
      status: "disconnected",
      message: err.message || "Failed to connect to database",
      latencyMs: Date.now() - start,
      lastChecked: new Date().toISOString(),
    };
  }
}

async function checkPostal(): Promise<ConnectionStatus> {
  const url = process.env.POSTAL_URL?.trim();
  const apiKey = process.env.POSTAL_API_KEY?.trim();

  if (!url || !apiKey) {
    return {
      id: "postal",
      name: "Postal Email Server",
      category: "Email",
      status: "not_configured",
      message: "POSTAL_URL and/or POSTAL_API_KEY not set",
      lastChecked: new Date().toISOString(),
    };
  }

  const start = Date.now();
  try {
    const response = await fetch(`${url.replace(/\/+$/, "")}/api/v1/send/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Server-API-Key": apiKey,
      },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(10000),
    });
    const latency = Date.now() - start;
    if (response.status === 200 || response.status === 400 || response.status === 422) {
      return {
        id: "postal",
        name: "Postal Email Server",
        category: "Email",
        status: "connected",
        message: "Postal server is reachable and API key is valid",
        latencyMs: latency,
        lastChecked: new Date().toISOString(),
        details: { server: url.replace(/https?:\/\//, "").split("/")[0] },
      };
    } else if (response.status === 401 || response.status === 403) {
      return {
        id: "postal",
        name: "Postal Email Server",
        category: "Email",
        status: "degraded",
        message: "Server reachable but API key may be invalid",
        latencyMs: latency,
        lastChecked: new Date().toISOString(),
        details: { httpStatus: response.status },
      };
    }
    return {
      id: "postal",
      name: "Postal Email Server",
      category: "Email",
      status: "degraded",
      message: `Unexpected response status: ${response.status}`,
      latencyMs: latency,
      lastChecked: new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      id: "postal",
      name: "Postal Email Server",
      category: "Email",
      status: "disconnected",
      message: err.message || "Cannot reach Postal server",
      latencyMs: Date.now() - start,
      lastChecked: new Date().toISOString(),
    };
  }
}

function checkTwilio(): ConnectionStatus {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const phone = process.env.TWILIO_PHONE_NUMBER;

  if (!sid || !token) {
    return {
      id: "twilio",
      name: "Twilio (SMS/Voice)",
      category: "Communication",
      status: "not_configured",
      message: "TWILIO_ACCOUNT_SID and/or TWILIO_AUTH_TOKEN not set",
      lastChecked: new Date().toISOString(),
    };
  }

  return {
    id: "twilio",
    name: "Twilio (SMS/Voice)",
    category: "Communication",
    status: "connected",
    message: "Twilio credentials configured",
    lastChecked: new Date().toISOString(),
    details: {
      phoneNumber: phone || "Not set",
      hasApiKeys: !!(process.env.TWILIO_API_KEY_SID && process.env.TWILIO_API_KEY_SECRET),
    },
  };
}

function checkGitHub(): ConnectionStatus {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

  if (!token) {
    return {
      id: "github",
      name: "GitHub",
      category: "Version Control",
      status: "not_configured",
      message: "No GITHUB_TOKEN configured — pushes from Replit will require manual auth",
      lastChecked: new Date().toISOString(),
    };
  }

  return {
    id: "github",
    name: "GitHub",
    category: "Version Control",
    status: "connected",
    message: "GitHub token is configured",
    lastChecked: new Date().toISOString(),
  };
}

function checkAiIntegration(): ConnectionStatus {
  const url = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
  const key = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;

  if (!url || !key) {
    return {
      id: "ai-anthropic",
      name: "AI (Anthropic)",
      category: "AI",
      status: "not_configured",
      message: "AI_INTEGRATIONS_ANTHROPIC credentials not set",
      lastChecked: new Date().toISOString(),
    };
  }

  return {
    id: "ai-anthropic",
    name: "AI (Anthropic)",
    category: "AI",
    status: "connected",
    message: "Anthropic AI integration is configured",
    lastChecked: new Date().toISOString(),
  };
}

function checkPrivacyCom(): ConnectionStatus {
  const key = process.env.PRIVACY_COM_API_KEY;

  if (!key) {
    return {
      id: "privacy-com",
      name: "Privacy.com (Virtual Cards)",
      category: "Finance",
      status: "not_configured",
      message: "PRIVACY_COM_API_KEY not set",
      lastChecked: new Date().toISOString(),
    };
  }

  return {
    id: "privacy-com",
    name: "Privacy.com (Virtual Cards)",
    category: "Finance",
    status: "connected",
    message: "Virtual cards API key configured",
    lastChecked: new Date().toISOString(),
  };
}

function checkSessionSecurity(): ConnectionStatus {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    return {
      id: "session",
      name: "Session Security",
      category: "Security",
      status: "not_configured",
      message: "SESSION_SECRET not set — sessions may be insecure",
      lastChecked: new Date().toISOString(),
    };
  }

  return {
    id: "session",
    name: "Session Security",
    category: "Security",
    status: "connected",
    message: "Session secret is configured",
    lastChecked: new Date().toISOString(),
  };
}

function checkFastmail(): ConnectionStatus {
  const token = process.env.FASTMAIL_API_TOKEN;

  if (!token) {
    return {
      id: "fastmail",
      name: "Fastmail (JMAP)",
      category: "Email",
      status: "not_configured",
      message: "FASTMAIL_API_TOKEN not set",
      lastChecked: new Date().toISOString(),
    };
  }

  return {
    id: "fastmail",
    name: "Fastmail (JMAP)",
    category: "Email",
    status: "connected",
    message: "Fastmail API token configured",
    lastChecked: new Date().toISOString(),
  };
}

function checkGoogleCalendar(): ConnectionStatus {
  return {
    id: "google-calendar",
    name: "Google Calendar",
    category: "Productivity",
    status: "connected",
    message: "Google Calendar integration installed via Replit",
    lastChecked: new Date().toISOString(),
  };
}

router.get("/connections/status", async (_req, res): Promise<void> => {
  try {
    const [dbStatus, postalStatus] = await Promise.all([
      checkDatabase(),
      checkPostal(),
    ]);

    const connections: ConnectionStatus[] = [
      dbStatus,
      postalStatus,
      checkTwilio(),
      checkGitHub(),
      checkAiIntegration(),
      checkPrivacyCom(),
      checkSessionSecurity(),
      checkFastmail(),
      checkGoogleCalendar(),
    ];

    const summary = {
      total: connections.length,
      connected: connections.filter(c => c.status === "connected").length,
      degraded: connections.filter(c => c.status === "degraded").length,
      disconnected: connections.filter(c => c.status === "disconnected").length,
      notConfigured: connections.filter(c => c.status === "not_configured").length,
    };

    res.json({ connections, summary, checkedAt: new Date().toISOString() });
  } catch (err: any) {
    console.error("[connections-monitor] status check error:", err.message);
    res.status(500).json({ error: "Failed to check connections" });
  }
});

router.post("/connections/check/:id", async (req, res): Promise<void> => {
  const { id } = req.params;
  try {
    let result: ConnectionStatus | null = null;

    switch (id) {
      case "postgresql": result = await checkDatabase(); break;
      case "postal": result = await checkPostal(); break;
      case "twilio": result = checkTwilio(); break;
      case "github": result = checkGitHub(); break;
      case "ai-anthropic": result = checkAiIntegration(); break;
      case "privacy-com": result = checkPrivacyCom(); break;
      case "session": result = checkSessionSecurity(); break;
      case "fastmail": result = checkFastmail(); break;
      case "google-calendar": result = checkGoogleCalendar(); break;
      default:
        res.status(404).json({ error: "Unknown connection" });
        return;
    }

    res.json(result);
  } catch (err: any) {
    console.error(`[connections-monitor] check ${id} error:`, err.message);
    res.status(500).json({ error: "Failed to check connection" });
  }
});

export default router;
