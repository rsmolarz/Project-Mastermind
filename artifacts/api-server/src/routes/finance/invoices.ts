import { Router, type IRouter } from "express";
import { db, invoicesTable, invoiceLineItemsTable } from "@workspace/db";
import { eq, desc, and, lte, ne } from "drizzle-orm";
import { sendEmailViaSendGrid, isSendGridConfigured } from "../../services/sendgrid.service";

const router: IRouter = Router();

function generateInvoiceNumber(): string {
  const prefix = "INV";
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `${prefix}-${y}${m}-${rand}`;
}

function recalcTotals(lineItems: { amount: string | number }[], taxRate: number, discount: number) {
  const subtotal = lineItems.reduce((sum, li) => sum + Number(li.amount), 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount - discount;
  const amountDue = total;
  return {
    subtotal: subtotal.toFixed(2),
    taxAmount: taxAmount.toFixed(2),
    total: total.toFixed(2),
    amountDue: amountDue.toFixed(2),
  };
}

router.get("/finance/invoices", async (req, res): Promise<void> => {
  const { status, email } = req.query;
  let query = db.select().from(invoicesTable).orderBy(desc(invoicesTable.createdAt));
  const invoices = await query;
  let filtered = invoices;
  if (status) filtered = filtered.filter(i => i.status === status);
  if (email) filtered = filtered.filter(i => i.toEmail === email);
  res.json(filtered);
});

router.get("/finance/invoices/unpaid", async (_req, res): Promise<void> => {
  const invoices = await db.select().from(invoicesTable)
    .where(and(
      ne(invoicesTable.status, "paid"),
      ne(invoicesTable.status, "cancelled"),
      ne(invoicesTable.status, "draft"),
    ))
    .orderBy(desc(invoicesTable.dueAt));
  res.json(invoices);
});

router.get("/finance/invoices/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id));
  if (!invoice) { res.status(404).json({ error: "Invoice not found" }); return; }
  const lineItems = await db.select().from(invoiceLineItemsTable)
    .where(eq(invoiceLineItemsTable.invoiceId, id));
  res.json({ ...invoice, lineItems });
});

router.post("/finance/invoices", async (req, res): Promise<void> => {
  const {
    fromName, fromEmail, toName, toEmail, toAddress,
    currency, notes, terms, taxRate, discount,
    isRecurring, recurringInterval, nextRecurringDate,
    lineItems, issuedAt, dueAt,
  } = req.body;

  if (!fromName || !fromEmail || !toName || !toEmail) {
    res.status(400).json({ error: "fromName, fromEmail, toName, toEmail are required" });
    return;
  }

  const items = lineItems || [];
  const totals = recalcTotals(items, Number(taxRate || 0), Number(discount || 0));

  const [invoice] = await db.insert(invoicesTable).values({
    invoiceNumber: generateInvoiceNumber(),
    status: "draft",
    fromName, fromEmail, toName, toEmail,
    toAddress: toAddress || null,
    currency: currency || "USD",
    subtotal: totals.subtotal,
    taxRate: String(taxRate || 0),
    taxAmount: totals.taxAmount,
    discount: String(discount || 0),
    total: totals.total,
    amountPaid: "0",
    amountDue: totals.amountDue,
    issuedAt: issuedAt ? new Date(issuedAt) : null,
    dueAt: dueAt ? new Date(dueAt) : null,
    notes: notes || null,
    terms: terms || null,
    isRecurring: isRecurring || false,
    recurringInterval: recurringInterval || null,
    nextRecurringDate: nextRecurringDate ? new Date(nextRecurringDate) : null,
    metadata: null,
  }).returning();

  if (items.length > 0) {
    await db.insert(invoiceLineItemsTable).values(
      items.map((li: any, idx: number) => ({
        invoiceId: invoice.id,
        description: li.description,
        quantity: String(li.quantity || 1),
        unitPrice: String(li.unitPrice),
        amount: String(li.amount || Number(li.quantity || 1) * Number(li.unitPrice)),
        sortOrder: idx,
      }))
    );
  }

  const createdLineItems = await db.select().from(invoiceLineItemsTable)
    .where(eq(invoiceLineItemsTable.invoiceId, invoice.id));
  res.status(201).json({ ...invoice, lineItems: createdLineItems });
});

router.patch("/finance/invoices/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const updates: any = { updatedAt: new Date() };
  const fields = ["fromName", "fromEmail", "toName", "toEmail", "toAddress",
    "currency", "notes", "terms", "status", "issuedAt", "dueAt",
    "taxRate", "discount", "isRecurring", "recurringInterval", "nextRecurringDate"];

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      if (f === "issuedAt" || f === "dueAt" || f === "nextRecurringDate") {
        updates[f] = req.body[f] ? new Date(req.body[f]) : null;
      } else {
        updates[f] = req.body[f];
      }
    }
  }

  if (req.body.lineItems) {
    await db.delete(invoiceLineItemsTable).where(eq(invoiceLineItemsTable.invoiceId, id));
    const items = req.body.lineItems;
    if (items.length > 0) {
      await db.insert(invoiceLineItemsTable).values(
        items.map((li: any, idx: number) => ({
          invoiceId: id,
          description: li.description,
          quantity: String(li.quantity || 1),
          unitPrice: String(li.unitPrice),
          amount: String(li.amount || Number(li.quantity || 1) * Number(li.unitPrice)),
          sortOrder: idx,
        }))
      );
    }
    const totals = recalcTotals(items, Number(req.body.taxRate || updates.taxRate || 0), Number(req.body.discount || updates.discount || 0));
    Object.assign(updates, totals);
  }

  const [invoice] = await db.update(invoicesTable).set(updates)
    .where(eq(invoicesTable.id, id)).returning();
  const lineItems = await db.select().from(invoiceLineItemsTable)
    .where(eq(invoiceLineItemsTable.invoiceId, id));
  res.json({ ...invoice, lineItems });
});

router.post("/finance/invoices/:id/send", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id));
  if (!invoice) { res.status(404).json({ error: "Invoice not found" }); return; }

  const lineItems = await db.select().from(invoiceLineItemsTable)
    .where(eq(invoiceLineItemsTable.invoiceId, id));

  const lineItemsHtml = lineItems.map(li =>
    `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${li.description}</td>
     <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${li.quantity}</td>
     <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">$${Number(li.unitPrice).toFixed(2)}</td>
     <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">$${Number(li.amount).toFixed(2)}</td></tr>`
  ).join("");

  const subject = `Invoice ${invoice.invoiceNumber} from ${invoice.fromName}`;
  const body = `You have a new invoice from ${invoice.fromName}.\n\nInvoice: ${invoice.invoiceNumber}\nAmount Due: $${Number(invoice.amountDue).toFixed(2)}\nDue Date: ${invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString() : "Upon receipt"}\n\n${invoice.notes || ""}`;

  if (isSendGridConfigured()) {
    try {
      await sendEmailViaSendGrid(invoice.toEmail, subject, body);
    } catch (e: any) {
      res.status(500).json({ error: `Failed to send: ${e.message}` });
      return;
    }
  }

  await db.update(invoicesTable).set({
    status: "sent",
    issuedAt: invoice.issuedAt || new Date(),
    updatedAt: new Date(),
  }).where(eq(invoicesTable.id, id));

  res.json({ success: true, sentTo: invoice.toEmail, invoiceNumber: invoice.invoiceNumber });
});

router.post("/finance/invoices/:id/pay", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id));
  if (!invoice) { res.status(404).json({ error: "Invoice not found" }); return; }

  const paymentAmount = Number(req.body.amount || invoice.amountDue);
  const newPaid = Number(invoice.amountPaid) + paymentAmount;
  const newDue = Number(invoice.total) - newPaid;
  const fullyPaid = newDue <= 0;

  await db.update(invoicesTable).set({
    amountPaid: newPaid.toFixed(2),
    amountDue: Math.max(0, newDue).toFixed(2),
    status: fullyPaid ? "paid" : "partial",
    paidAt: fullyPaid ? new Date() : null,
    updatedAt: new Date(),
  }).where(eq(invoicesTable.id, id));

  const [updated] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id));
  res.json(updated);
});

router.delete("/finance/invoices/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.update(invoicesTable).set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(invoicesTable.id, id));
  res.json({ success: true });
});

export default router;
