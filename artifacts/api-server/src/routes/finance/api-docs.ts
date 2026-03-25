import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/finance/docs", (_req, res): void => {
  res.json({
    name: "ProjectOS Finance API",
    version: "1.0.0",
    baseUrl: "/api/finance",
    authentication: {
      methods: [
        { type: "X-API-Key", header: "X-API-Key", description: "MotionOS API key in header" },
        { type: "Bearer", header: "Authorization", format: "Bearer <MOTIONOS_API_KEY>", description: "MotionOS API key as Bearer token" },
        { type: "Session", cookie: "pos_session", description: "ProjectOS session cookie from password/WebAuthn login" },
      ],
      webhook: "POST /api/finance/virtual-cards/webhook is unauthenticated (for Privacy.com callbacks)",
    },
    endpoints: {
      invoices: {
        "GET /finance/invoices": {
          description: "List all invoices",
          queryParams: { status: "Filter by status (draft|sent|partial|paid|cancelled)", email: "Filter by recipient email" },
          response: "Invoice[]",
        },
        "GET /finance/invoices/unpaid": {
          description: "List invoices awaiting payment (excludes draft, paid, cancelled)",
          response: "Invoice[]",
        },
        "GET /finance/invoices/:id": {
          description: "Get invoice with line items",
          response: "Invoice & { lineItems: LineItem[] }",
        },
        "POST /finance/invoices": {
          description: "Create a new invoice",
          body: {
            required: ["fromName", "fromEmail", "toName", "toEmail"],
            optional: ["toAddress", "currency", "notes", "terms", "taxRate", "discount", "dueAt", "issuedAt", "isRecurring", "recurringInterval", "nextRecurringDate", "lineItems"],
            lineItemFields: ["description (required)", "quantity", "unitPrice (required)", "amount"],
          },
          response: "Invoice & { lineItems: LineItem[] }",
          notes: "Auto-generates invoice number (INV-YYMM-XXXX). Auto-calculates subtotal, tax, total.",
        },
        "PATCH /finance/invoices/:id": {
          description: "Update invoice fields and/or line items",
          body: "Partial<Invoice> & { lineItems?: LineItem[] }",
          notes: "If lineItems provided, replaces all existing line items and recalculates totals.",
        },
        "POST /finance/invoices/:id/send": {
          description: "Send invoice to recipient via email (SendGrid)",
          response: "{ success, sentTo, invoiceNumber }",
          notes: "Changes status to 'sent'. Sets issuedAt if not already set.",
        },
        "POST /finance/invoices/:id/pay": {
          description: "Record a payment against an invoice",
          body: { amount: "Payment amount (defaults to full amountDue if omitted)" },
          response: "Updated Invoice",
          notes: "Supports partial payments. Status becomes 'partial' or 'paid'.",
        },
        "DELETE /finance/invoices/:id": {
          description: "Cancel an invoice (soft delete — sets status to 'cancelled')",
        },
      },
      portfolios: {
        "GET /finance/portfolios": {
          description: "List all portfolios",
          response: "Portfolio[]",
        },
        "GET /finance/portfolios/:id": {
          description: "Get portfolio with all holdings",
          response: "Portfolio & { holdings: Holding[] }",
        },
        "POST /finance/portfolios": {
          description: "Create a new portfolio",
          body: { required: ["name"], optional: ["description", "currency"] },
        },
        "PATCH /finance/portfolios/:id": {
          description: "Update portfolio details",
          body: "Partial<{ name, description, currency }>",
        },
        "DELETE /finance/portfolios/:id": {
          description: "Delete portfolio and all holdings",
        },
        "GET /finance/portfolios/:id/holdings": {
          description: "List holdings in a portfolio",
          response: "Holding[]",
        },
        "POST /finance/portfolios/:id/holdings": {
          description: "Add a holding to a portfolio",
          body: { required: ["symbol", "name", "quantity", "avgCost"], optional: ["assetType", "currentPrice"] },
          notes: "Auto-calculates totalCost, currentValue, gainLoss, gainLossPercent. Recalculates portfolio totals.",
        },
        "PATCH /finance/portfolios/:portfolioId/holdings/:holdingId": {
          description: "Update a holding",
          body: "Partial<{ symbol, name, assetType, quantity, avgCost, currentPrice }>",
          notes: "Recalculates P&L and portfolio totals. Validates holding belongs to portfolio.",
        },
        "DELETE /finance/portfolios/:portfolioId/holdings/:holdingId": {
          description: "Remove a holding from a portfolio",
          notes: "Validates ownership. Recalculates portfolio totals.",
        },
      },
      transactions: {
        "GET /finance/transactions": {
          description: "List all transactions",
          queryParams: { type: "income|expense", category: "Filter by category", status: "Filter by status", from: "ISO date (start)", to: "ISO date (end)", limit: "Max results" },
          response: "Transaction[]",
        },
        "GET /finance/transactions/summary": {
          description: "Get transaction summary with totals by category",
          response: "{ totalTransactions, totalIncome, totalExpenses, net, byCategory }",
        },
        "GET /finance/transactions/:id": {
          description: "Get a single transaction",
          response: "Transaction",
        },
        "POST /finance/transactions": {
          description: "Record a new transaction",
          body: {
            required: ["type", "description", "amount"],
            optional: ["category", "currency", "fromAccount", "toAccount", "reference", "status", "portfolioId", "invoiceId", "virtualCardId", "privacyTransactionToken", "metadata", "transactedAt"],
          },
        },
        "PATCH /finance/transactions/:id": {
          description: "Update a transaction",
          body: "Partial<Transaction>",
        },
        "DELETE /finance/transactions/:id": {
          description: "Delete a transaction",
        },
      },
      virtualCards: {
        "GET /finance/virtual-cards": {
          description: "List all virtual cards (local database)",
          response: "VirtualCard[]",
        },
        "GET /finance/virtual-cards/privacy": {
          description: "List cards directly from Privacy.com API",
          queryParams: { page: "Page number" },
          response: "{ data: PrivacyCard[], page, total_entries, total_pages }",
        },
        "POST /finance/virtual-cards": {
          description: "Create a new Privacy.com virtual card",
          body: {
            optional: ["memo", "spendLimit (in dollars)", "spendLimitDuration (TRANSACTION|MONTHLY|ANNUALLY|FOREVER)", "type (SINGLE_USE|MERCHANT_LOCKED|UNLOCKED)"],
          },
          response: "VirtualCard & { pan, cvv, expMonth, expYear }",
          notes: "Returns full card details (PAN, CVV) only on creation.",
        },
        "GET /finance/virtual-cards/:id": {
          description: "Get a virtual card from local database",
        },
        "PATCH /finance/virtual-cards/:id": {
          description: "Update card state/memo/spend limit (syncs to Privacy.com)",
          body: "Partial<{ state (OPEN|PAUSED|CLOSED), memo, cardName, spendLimit }>",
        },
        "POST /finance/virtual-cards/:id/sync-transactions": {
          description: "Sync transactions from Privacy.com for this card",
          response: "{ synced, totalTransactions, totalSpent }",
        },
        "GET /finance/virtual-cards/:id/transactions": {
          description: "List local transactions for a specific card",
          response: "Transaction[]",
        },
        "POST /finance/virtual-cards/webhook": {
          description: "Privacy.com webhook endpoint (unauthenticated)",
          notes: "Receives transaction events from Privacy.com. Auto-creates/updates transactions and card spend totals. Configure this URL in Privacy.com dashboard.",
          webhookUrl: "https://<your-domain>/api/finance/virtual-cards/webhook",
        },
      },
    },
    models: {
      Invoice: {
        id: "number",
        invoiceNumber: "string (auto-generated INV-YYMM-XXXX)",
        status: "draft | sent | partial | paid | cancelled",
        fromName: "string", fromEmail: "string",
        toName: "string", toEmail: "string", toAddress: "string?",
        currency: "string (default USD)",
        subtotal: "string (decimal)", taxRate: "string (decimal %)",
        taxAmount: "string (decimal)", discount: "string (decimal)",
        total: "string (decimal)", amountPaid: "string (decimal)", amountDue: "string (decimal)",
        issuedAt: "ISO date?", dueAt: "ISO date?", paidAt: "ISO date?",
        notes: "string?", terms: "string?",
        isRecurring: "boolean", recurringInterval: "string?", nextRecurringDate: "ISO date?",
      },
      LineItem: {
        id: "number", invoiceId: "number",
        description: "string", quantity: "string (decimal)",
        unitPrice: "string (decimal)", amount: "string (decimal)",
        sortOrder: "number",
      },
      Portfolio: {
        id: "number", name: "string", description: "string?",
        currency: "string", totalValue: "string (decimal)",
        totalCost: "string (decimal)", gainLoss: "string (decimal)",
        gainLossPercent: "string (decimal %)",
      },
      Holding: {
        id: "number", portfolioId: "number",
        symbol: "string", name: "string", assetType: "string",
        quantity: "string (decimal)", avgCost: "string (decimal)",
        currentPrice: "string (decimal)", totalCost: "string (decimal)",
        currentValue: "string (decimal)", gainLoss: "string (decimal)",
        gainLossPercent: "string (decimal %)",
      },
      Transaction: {
        id: "number", type: "string (income|expense)",
        category: "string?", description: "string",
        amount: "string (decimal)", currency: "string",
        fromAccount: "string?", toAccount: "string?",
        reference: "string?", status: "string",
        portfolioId: "number?", invoiceId: "number?",
        virtualCardId: "string?", privacyTransactionToken: "string?",
        metadata: "object?", transactedAt: "ISO date",
      },
      VirtualCard: {
        id: "number", privacyCardToken: "string",
        lastFour: "string?", cardName: "string?", memo: "string?",
        type: "SINGLE_USE | MERCHANT_LOCKED | UNLOCKED",
        state: "OPEN | PAUSED | CLOSED",
        spendLimit: "string (decimal)?", spendLimitDuration: "string?",
        totalSpent: "string (decimal)", hostname: "string?",
      },
    },
  });
});

export default router;
