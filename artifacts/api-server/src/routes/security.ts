import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db, securityCredentialsTable, securitySessionsTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";
import bcryptjs from "bcryptjs";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/server/script/deps";

const router: IRouter = Router();

const challenges = new Map<string, { challenge: string; expires: number }>();

function getRpInfo(req: Request) {
  const host = req.get("host") || "localhost";
  const rpID = host.split(":")[0];
  const origin = `${req.protocol}://${host}`;
  return { rpID, rpName: "ProjectOS", origin };
}

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

async function isSecurityConfigured(): Promise<boolean> {
  const creds = await db.select().from(securityCredentialsTable).where(eq(securityCredentialsTable.enabled, true));
  return creds.length > 0;
}

async function hasValidSession(req: Request): Promise<boolean> {
  const sessionCookie = req.cookies?.pos_session;
  if (sessionCookie) {
    const sessions = await db.select().from(securitySessionsTable)
      .where(and(eq(securitySessionsTable.token, sessionCookie), gt(securitySessionsTable.expiresAt, new Date())));
    if (sessions.length > 0) return true;
  }
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const sessions = await db.select().from(securitySessionsTable)
      .where(and(eq(securitySessionsTable.token, token), gt(securitySessionsTable.expiresAt, new Date())));
    if (sessions.length > 0) return true;
  }
  return false;
}

async function requireAuthIfConfigured(req: Request, res: Response, next: NextFunction): Promise<void> {
  const configured = await isSecurityConfigured();
  if (!configured) { next(); return; }
  const valid = await hasValidSession(req);
  if (!valid) {
    res.status(401).json({ error: "Authentication required to modify security settings" });
    return;
  }
  next();
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (
    req.path.startsWith("/security/") ||
    req.path === "/health" ||
    req.path.startsWith("/messaging/webhook/") ||
    req.path === "/email-routing/inbound" ||
    req.path === "/finance/virtual-cards/webhook"
  ) {
    next();
    return;
  }

  const configured = await isSecurityConfigured();
  if (!configured) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const sessions = await db.select().from(securitySessionsTable)
      .where(and(eq(securitySessionsTable.token, token), gt(securitySessionsTable.expiresAt, new Date())));
    if (sessions.length > 0) {
      next();
      return;
    }
  }

  const sessionCookie = req.cookies?.pos_session;
  if (sessionCookie) {
    const sessions = await db.select().from(securitySessionsTable)
      .where(and(eq(securitySessionsTable.token, sessionCookie), gt(securitySessionsTable.expiresAt, new Date())));
    if (sessions.length > 0) {
      next();
      return;
    }
  }

  res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
}

router.get("/security/status", async (_req, res): Promise<void> => {
  const creds = await db.select().from(securityCredentialsTable).where(eq(securityCredentialsTable.enabled, true));
  const hasPassword = creds.some(c => c.type === "password");
  const webauthnKeys = creds.filter(c => c.type === "webauthn");

  const sessionCookie = _req.cookies?.pos_session;
  let authenticated = false;
  if (sessionCookie) {
    const sessions = await db.select().from(securitySessionsTable)
      .where(and(eq(securitySessionsTable.token, sessionCookie), gt(securitySessionsTable.expiresAt, new Date())));
    authenticated = sessions.length > 0;
  }

  res.json({
    configured: creds.length > 0,
    hasPassword,
    webauthnKeys: webauthnKeys.map(k => ({ id: k.id, deviceName: k.deviceName, createdAt: k.createdAt })),
    authenticated,
  });
});

router.post("/security/password/setup", requireAuthIfConfigured, async (req, res): Promise<void> => {
  const { password } = req.body;
  if (!password || typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const hash = await bcryptjs.hash(password, 12);

  const existing = await db.select().from(securityCredentialsTable).where(eq(securityCredentialsTable.type, "password"));
  if (existing.length > 0) {
    await db.update(securityCredentialsTable)
      .set({ passwordHash: hash })
      .where(eq(securityCredentialsTable.id, existing[0].id));
  } else {
    await db.insert(securityCredentialsTable).values({
      type: "password",
      passwordHash: hash,
      deviceName: "Admin Password",
      enabled: true,
    });
  }

  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await db.insert(securitySessionsTable).values({ token, method: "password", expiresAt });

  res.cookie("pos_session", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000,
    path: "/",
  });

  res.json({ success: true, message: "Password configured" });
});

router.post("/security/password/login", async (req, res): Promise<void> => {
  const { password } = req.body;
  if (!password) {
    res.status(400).json({ error: "Password is required" });
    return;
  }

  const creds = await db.select().from(securityCredentialsTable)
    .where(and(eq(securityCredentialsTable.type, "password"), eq(securityCredentialsTable.enabled, true)));

  if (creds.length === 0 || !creds[0].passwordHash) {
    res.status(401).json({ error: "No password configured" });
    return;
  }

  const valid = await bcryptjs.compare(password, creds[0].passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }

  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await db.insert(securitySessionsTable).values({ token, method: "password", expiresAt });

  res.cookie("pos_session", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000,
    path: "/",
  });

  res.json({ success: true, method: "password" });
});

router.get("/security/webauthn/register-options", requireAuthIfConfigured, async (req, res): Promise<void> => {
  const { rpID, rpName } = getRpInfo(req);

  const existingKeys = await db.select().from(securityCredentialsTable)
    .where(and(eq(securityCredentialsTable.type, "webauthn"), eq(securityCredentialsTable.enabled, true)));

  const excludeCredentials = existingKeys
    .filter(k => k.credentialId)
    .map(k => ({
      id: k.credentialId!,
      type: "public-key" as const,
      transports: (k.transports as any[]) || [],
    }));

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: "admin",
    userDisplayName: "ProjectOS Admin",
    attestationType: "none",
    excludeCredentials,
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  challenges.set("register", { challenge: options.challenge, expires: Date.now() + 5 * 60 * 1000 });

  res.json(options);
});

router.post("/security/webauthn/register", requireAuthIfConfigured, async (req, res): Promise<void> => {
  try {
    const { rpID, rpName, origin } = getRpInfo(req);
    const { credential, deviceName } = req.body;

    const stored = challenges.get("register");
    if (!stored || stored.expires < Date.now()) {
      res.status(400).json({ error: "Challenge expired" });
      return;
    }

    const verification = await verifyRegistrationResponse({
      response: credential as RegistrationResponseJSON,
      expectedChallenge: stored.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      res.status(400).json({ error: "Verification failed" });
      return;
    }

    const { credential: regCred, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    await db.insert(securityCredentialsTable).values({
      type: "webauthn",
      credentialId: Buffer.from(regCred.id).toString("base64url"),
      credentialPublicKey: Buffer.from(regCred.publicKey).toString("base64url"),
      counter: regCred.counter.toString(),
      deviceName: deviceName || "YubiKey",
      transports: (credential as any).response?.transports || [],
      enabled: true,
    });

    challenges.delete("register");

    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.insert(securitySessionsTable).values({ token, method: "webauthn", expiresAt });

    res.cookie("pos_session", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.json({ success: true, message: "YubiKey registered" });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Registration failed" });
  }
});

router.get("/security/webauthn/auth-options", async (req, res): Promise<void> => {
  const { rpID } = getRpInfo(req);

  const keys = await db.select().from(securityCredentialsTable)
    .where(and(eq(securityCredentialsTable.type, "webauthn"), eq(securityCredentialsTable.enabled, true)));

  const allowCredentials = keys
    .filter(k => k.credentialId)
    .map(k => ({
      id: k.credentialId!,
      type: "public-key" as const,
      transports: (k.transports as any[]) || [],
    }));

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials,
    userVerification: "preferred",
  });

  challenges.set("auth", { challenge: options.challenge, expires: Date.now() + 5 * 60 * 1000 });

  res.json(options);
});

router.post("/security/webauthn/authenticate", async (req, res): Promise<void> => {
  try {
    const { rpID, origin } = getRpInfo(req);
    const { credential } = req.body;

    const stored = challenges.get("auth");
    if (!stored || stored.expires < Date.now()) {
      res.status(400).json({ error: "Challenge expired" });
      return;
    }

    const credentialIdFromResponse = (credential as AuthenticationResponseJSON).id;
    const keys = await db.select().from(securityCredentialsTable)
      .where(and(eq(securityCredentialsTable.type, "webauthn"), eq(securityCredentialsTable.enabled, true)));

    const matchedKey = keys.find(k => k.credentialId === credentialIdFromResponse);
    if (!matchedKey || !matchedKey.credentialPublicKey) {
      res.status(401).json({ error: "Unknown credential" });
      return;
    }

    const verification = await verifyAuthenticationResponse({
      response: credential as AuthenticationResponseJSON,
      expectedChallenge: stored.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: matchedKey.credentialId!,
        publicKey: Buffer.from(matchedKey.credentialPublicKey, "base64url"),
        counter: parseInt(matchedKey.counter || "0"),
        transports: (matchedKey.transports as any[]) || [],
      },
    });

    if (!verification.verified) {
      res.status(401).json({ error: "Authentication failed" });
      return;
    }

    await db.update(securityCredentialsTable)
      .set({ counter: verification.authenticationInfo.newCounter.toString() })
      .where(eq(securityCredentialsTable.id, matchedKey.id));

    challenges.delete("auth");

    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.insert(securitySessionsTable).values({ token, method: "webauthn", expiresAt });

    res.cookie("pos_session", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.json({ success: true, method: "webauthn", deviceName: matchedKey.deviceName });
  } catch (err: any) {
    res.status(401).json({ error: err.message || "Authentication failed" });
  }
});

router.post("/security/logout", async (req, res): Promise<void> => {
  const sessionCookie = req.cookies?.pos_session;
  if (sessionCookie) {
    await db.delete(securitySessionsTable).where(eq(securitySessionsTable.token, sessionCookie));
  }
  res.clearCookie("pos_session", { path: "/" });
  res.json({ success: true });
});

router.delete("/security/webauthn/:id", requireAuthIfConfigured, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.delete(securityCredentialsTable)
    .where(and(eq(securityCredentialsTable.id, id), eq(securityCredentialsTable.type, "webauthn")));
  res.json({ success: true });
});

router.post("/security/password/remove", requireAuthIfConfigured, async (_req, res): Promise<void> => {
  await db.delete(securityCredentialsTable).where(eq(securityCredentialsTable.type, "password"));
  res.json({ success: true });
});

export default router;
