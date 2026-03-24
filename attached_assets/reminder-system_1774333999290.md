# ProjectOS — Reminder System (Complete Code)

## 1. Install dependencies

```bash
npm install twilio @sendgrid/mail bullmq ioredis node-cron zod
npm install -D @types/node-cron
```

---

## 2. Environment variables (add to `.env`)

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=reminders@yourdomain.com
REDIS_URL=redis://localhost:6379
TOKEN_ENCRYPTION_KEY=64_char_hex_string_run_openssl_rand_hex_32
```

---

## 3. Database schema addition

Add this to your existing `src/server/db/schema.ts`:

```typescript
import {
  pgTable, pgEnum, serial, text, varchar,
  integer, timestamp, index,
} from 'drizzle-orm/pg-core';

export const notificationTypeEnum = pgEnum('notification_type', [
  'sms', 'call', 'email', 'in_app',
]);

export const reminderStatusEnum = pgEnum('reminder_status', [
  'pending', 'sent', 'failed', 'cancelled',
]);

export const reminders = pgTable('reminders', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  scheduledAt: timestamp('scheduled_at').notNull(),
  notificationType: notificationTypeEnum('notification_type').notNull(),
  target: varchar('target', { length: 255 }).notNull(), // phone number or email
  status: reminderStatusEnum('status').default('pending').notNull(),
  jobId: varchar('job_id', { length: 255 }),
  calendarEventId: varchar('calendar_event_id', { length: 255 }),
  errorMessage: text('error_message'),
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ([
  index('reminders_scheduled_idx').on(table.scheduledAt),
  index('reminders_status_idx').on(table.status),
  index('reminders_user_idx').on(table.userId),
]));

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  read: boolean('read').default(false).notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ([
  index('notifications_user_read_idx').on(table.userId, table.read),
]));

export type Reminder = typeof reminders.$inferSelect;
export type InsertReminder = typeof reminders.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
```

Then run:
```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

---

## 4. `src/server/services/twilio.service.ts`

```typescript
import Twilio from 'twilio';
import { env } from '../env';

const client = new Twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

export async function sendSMS(to: string, body: string): Promise<string> {
  const message = await client.messages.create({
    to,
    from: env.TWILIO_PHONE_NUMBER,
    body,
  });
  return message.sid;
}

export async function makeVoiceCall(to: string, message: string): Promise<string> {
  const twiml = `<Response><Say voice="alice" language="en-US">${escapeXml(message)}</Say></Response>`;
  const call = await client.calls.create({
    to,
    from: env.TWILIO_PHONE_NUMBER,
    twiml,
  });
  return call.sid;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
```

---

## 5. `src/server/services/sendgrid.service.ts`

```typescript
import sgMail from '@sendgrid/mail';
import { env } from '../env';

sgMail.setApiKey(env.SENDGRID_API_KEY);

export async function sendEmailViaSendGrid(
  to: string,
  subject: string,
  body: string
): Promise<void> {
  await sgMail.send({
    to,
    from: env.SENDGRID_FROM_EMAIL,
    subject,
    text: body,
    html: `<p>${body.replace(/\n/g, '<br>')}</p>`,
  });
}
```

---

## 6. `src/server/services/notification.service.ts`

```typescript
import { db } from '../db';
import { notifications } from '../db/schema';
import { broadcastToUser } from '../websocket';

export async function createInAppNotification(
  userId: number,
  title: string,
  message: string
) {
  const [notification] = await db
    .insert(notifications)
    .values({ userId, title, message })
    .returning();

  // Broadcast in real time if user has an open WebSocket connection
  broadcastToUser(userId, { type: 'notification', notification });
  return notification;
}
```

---

## 7. `src/server/jobs/queue.ts`

```typescript
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../env';

export const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export interface ReminderJobData {
  reminderId: number;
  userId: number;
  notificationType: 'sms' | 'call' | 'email' | 'in_app';
  target: string;
  title: string;
  message: string;
}

export const reminderQueue = new Queue<ReminderJobData>('reminders', {
  connection,
});

export async function scheduleReminderJob(
  data: ReminderJobData,
  scheduledAt: Date
): Promise<string> {
  const delay = Math.max(scheduledAt.getTime() - Date.now(), 0);
  const job = await reminderQueue.add('send-reminder', data, {
    delay,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  });
  return job.id!;
}
```

---

## 8. `src/server/jobs/reminderWorker.ts`

```typescript
import { Worker, Job } from 'bullmq';
import { connection, ReminderJobData } from './queue';
import { sendSMS, makeVoiceCall } from '../services/twilio.service';
import { sendEmailViaSendGrid } from '../services/sendgrid.service';
import { createInAppNotification } from '../services/notification.service';
import { db } from '../db';
import { reminders } from '../db/schema';
import { eq } from 'drizzle-orm';

const worker = new Worker<ReminderJobData>(
  'reminders',
  async (job: Job<ReminderJobData>) => {
    const { reminderId, notificationType, target, title, message, userId } = job.data;

    try {
      switch (notificationType) {
        case 'sms':
          await sendSMS(target, `${title}: ${message}`);
          break;
        case 'call':
          await makeVoiceCall(target, `${title}. ${message}`);
          break;
        case 'email':
          await sendEmailViaSendGrid(target, title, message);
          break;
        case 'in_app':
          await createInAppNotification(userId, title, message);
          break;
      }

      await db
        .update(reminders)
        .set({ status: 'sent', sentAt: new Date() })
        .where(eq(reminders.id, reminderId));

    } catch (error: any) {
      await db
        .update(reminders)
        .set({ status: 'failed', errorMessage: error.message })
        .where(eq(reminders.id, reminderId));

      throw error; // BullMQ will retry based on attempts config
    }
  },
  { connection, concurrency: 10 }
);

worker.on('failed', (job, err) => {
  console.error(`[ReminderWorker] Job ${job?.id} failed after all retries: ${err.message}`);
});

worker.on('completed', (job) => {
  console.log(`[ReminderWorker] Job ${job.id} completed successfully`);
});

export { worker };
```

---

## 9. `src/server/middleware/verifyTwilio.ts`

```typescript
import twilio from 'twilio';
import { Request, Response, NextFunction } from 'express';
import { env } from '../env';

export function verifyTwilioSignature(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const signature = req.headers['x-twilio-signature'] as string;
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const url = `${protocol}://${req.get('host')}${req.originalUrl}`;

  if (!twilio.validateRequest(env.TWILIO_AUTH_TOKEN, signature, url, req.body)) {
    return res.status(403).json({ error: 'Invalid Twilio signature' });
  }
  next();
}
```

---

## 10. `src/server/routes/reminders.ts`

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { db } from '../db';
import { reminders, notifications } from '../db/schema';
import { scheduleReminderJob } from '../jobs/queue';
import { eq, and, lte, desc } from 'drizzle-orm';

const router = Router();

// ── Validation schemas ─────────────────────────────────────
const createReminderSchema = z.object({
  title: z.string().min(1).max(255),
  message: z.string().min(1),
  scheduledAt: z.string().datetime(),
  notificationType: z.enum(['sms', 'call', 'email', 'in_app']),
  // phone number for sms/call, email address for email, userId string for in_app
  target: z.string().min(1),
});

const updateReminderSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  message: z.string().min(1).optional(),
  scheduledAt: z.string().datetime().optional(),
});

// ── POST /api/reminders — create a new reminder ────────────
router.post('/', asyncHandler(async (req, res) => {
  const body = createReminderSchema.parse(req.body);
  const userId = (req as any).userId; // from your auth middleware

  const [reminder] = await db
    .insert(reminders)
    .values({
      userId,
      title: body.title,
      message: body.message,
      scheduledAt: new Date(body.scheduledAt),
      notificationType: body.notificationType,
      target: body.target,
    })
    .returning();

  const jobId = await scheduleReminderJob(
    {
      reminderId: reminder.id,
      userId,
      notificationType: body.notificationType,
      target: body.target,
      title: body.title,
      message: body.message,
    },
    new Date(body.scheduledAt)
  );

  await db
    .update(reminders)
    .set({ jobId })
    .where(eq(reminders.id, reminder.id));

  res.status(201).json({ reminder: { ...reminder, jobId } });
}));

// ── GET /api/reminders — list all reminders for current user
router.get('/', asyncHandler(async (req, res) => {
  const userId = (req as any).userId;
  const result = await db
    .select()
    .from(reminders)
    .where(eq(reminders.userId, userId))
    .orderBy(desc(reminders.scheduledAt));
  res.json({ reminders: result });
}));

// ── GET /api/reminders/:id — get a single reminder ─────────
router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const userId = (req as any).userId;
  const [reminder] = await db
    .select()
    .from(reminders)
    .where(and(eq(reminders.id, id), eq(reminders.userId, userId)));
  if (!reminder) return res.status(404).json({ error: 'Reminder not found' });
  res.json({ reminder });
}));

// ── DELETE /api/reminders/:id — cancel a reminder ──────────
router.delete('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const userId = (req as any).userId;
  await db
    .update(reminders)
    .set({ status: 'cancelled' })
    .where(and(eq(reminders.id, id), eq(reminders.userId, userId)));
  res.json({ success: true });
}));

// ── GET /api/reminders/notifications/unread ─────────────────
router.get('/notifications/unread', asyncHandler(async (req, res) => {
  const userId = (req as any).userId;
  const result = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))
    .orderBy(desc(notifications.createdAt));
  res.json({ notifications: result });
}));

// ── PATCH /api/reminders/notifications/:id/read — mark read ─
router.patch('/notifications/:id/read', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.id, id));
  res.json({ success: true });
}));

export default router;
```

---

## 11. `src/server/websocket.ts` — real-time in-app delivery

```typescript
import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

// userId -> set of open WebSocket connections
const clients = new Map<number, Set<WebSocket>>();

export function initWebSocket(server: HttpServer) {
  const wss = new WebSocketServer({
    server,
    path: '/ws/notifications',
  });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const userId = parseInt(url.searchParams.get('userId') || '0');

    if (!userId) {
      ws.close(1008, 'Missing userId');
      return;
    }

    if (!clients.has(userId)) clients.set(userId, new Set());
    clients.get(userId)!.add(ws);
    console.log(`[WS] User ${userId} connected (${clients.get(userId)!.size} connections)`);

    ws.on('close', () => {
      clients.get(userId)?.delete(ws);
      if (clients.get(userId)?.size === 0) clients.delete(userId);
    });

    ws.on('error', (err) => console.error(`[WS] Error for user ${userId}:`, err));
  });
}

export function broadcastToUser(userId: number, payload: object) {
  const sockets = clients.get(userId);
  if (!sockets) return;
  const message = JSON.stringify(payload);
  for (const ws of sockets) {
    if (ws.readyState === WebSocket.OPEN) ws.send(message);
  }
}
```

---

## 12. node-cron fallback sweep — add to `src/server/index.ts`

```typescript
import cron from 'node-cron';
import { reminders } from './db/schema';
import { scheduleReminderJob } from './jobs/queue';
import { and, eq, lte } from 'drizzle-orm';

// Runs every minute — catches any reminders BullMQ missed (e.g. after Redis restart)
cron.schedule('* * * * *', async () => {
  try {
    const dueReminders = await db
      .select()
      .from(reminders)
      .where(
        and(
          eq(reminders.status, 'pending'),
          lte(reminders.scheduledAt, new Date())
        )
      );

    for (const r of dueReminders) {
      await scheduleReminderJob(
        {
          reminderId: r.id,
          userId: r.userId,
          notificationType: r.notificationType,
          target: r.target,
          title: r.title,
          message: r.message,
        },
        new Date() // delay = 0, fire immediately
      );
    }

    if (dueReminders.length > 0) {
      console.log(`[Cron] Swept ${dueReminders.length} overdue reminders into queue`);
    }
  } catch (err) {
    console.error('[Cron] Reminder sweep error:', err);
  }
});
```

---

## 13. Wire up in `src/server/index.ts`

```typescript
import express from 'express';
import { createServer } from 'http';
import { initWebSocket } from './websocket';
import reminderRouter from './routes/reminders';
import { errorHandler } from './middleware/errorHandler';
import './jobs/reminderWorker'; // starts the BullMQ worker process

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api/reminders', reminderRouter);

// ... your other routes

app.use(errorHandler);

const server = createServer(app);
initWebSocket(server);

server.listen(process.env.PORT || 3000, () => {
  console.log('ProjectOS running');
});
```

---

## API reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/reminders` | Create + schedule a reminder |
| `GET` | `/api/reminders` | List all reminders for user |
| `GET` | `/api/reminders/:id` | Get single reminder |
| `DELETE` | `/api/reminders/:id` | Cancel a reminder |
| `GET` | `/api/reminders/notifications/unread` | Unread in-app notifications |
| `PATCH` | `/api/reminders/notifications/:id/read` | Mark notification as read |

### Example POST body
```json
{
  "title": "Call with Sarah",
  "message": "Discuss Q2 budget review",
  "scheduledAt": "2026-04-01T14:00:00Z",
  "notificationType": "sms",
  "target": "+19045551234"
}
```

For `in_app` type, set `target` to the user's ID as a string. For `email`, set `target` to the email address. For `sms` and `call`, set `target` to an E.164 phone number.
