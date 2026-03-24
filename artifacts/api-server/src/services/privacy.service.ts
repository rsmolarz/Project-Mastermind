const BASE_URL = "https://api.privacy.com/v1";

function getApiKey(): string {
  const key = process.env.PRIVACY_COM_API_KEY?.trim();
  if (!key) throw new Error("PRIVACY_COM_API_KEY not configured");
  return key;
}

async function privacyRequest(method: string, endpoint: string, body?: any): Promise<any> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: {
      "Authorization": `api-key ${getApiKey()}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Privacy.com API error ${res.status}: ${errorText}`);
  }

  return res.json();
}

export interface CreateCardParams {
  memo?: string;
  spend_limit?: number;
  spend_limit_duration?: "TRANSACTION" | "MONTHLY" | "ANNUALLY" | "FOREVER";
  type?: "SINGLE_USE" | "MERCHANT_LOCKED" | "UNLOCKED";
  state?: "OPEN" | "PAUSED";
}

export interface CardResponse {
  token: string;
  last_four: string;
  hostname: string;
  memo: string;
  type: string;
  state: string;
  spend_limit: number;
  spend_limit_duration: string;
  created: string;
  pan?: string;
  cvv?: string;
  exp_month?: string;
  exp_year?: string;
}

export async function listCards(params?: {
  page?: number;
  page_size?: number;
  begin?: string;
  end?: string;
  card_token?: string;
}): Promise<{ data: CardResponse[]; page: number; total_entries: number; total_pages: number }> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.page_size) query.set("page_size", String(params.page_size));
  if (params?.begin) query.set("begin", params.begin);
  if (params?.end) query.set("end", params.end);
  if (params?.card_token) query.set("card_token", params.card_token);
  const qs = query.toString();
  return privacyRequest("GET", `/card${qs ? `?${qs}` : ""}`);
}

export async function createCard(params: CreateCardParams): Promise<CardResponse> {
  return privacyRequest("POST", "/card", params);
}

export async function getCard(cardToken: string): Promise<CardResponse> {
  const result = await listCards({ card_token: cardToken });
  if (!result.data?.length) throw new Error("Card not found");
  return result.data[0];
}

export async function updateCard(cardToken: string, updates: {
  state?: "OPEN" | "PAUSED" | "CLOSED";
  memo?: string;
  spend_limit?: number;
  spend_limit_duration?: string;
}): Promise<CardResponse> {
  return privacyRequest("PUT", "/card", { card_token: cardToken, ...updates });
}

export interface PrivacyTransaction {
  token: string;
  amount: number;
  card: { token: string; last_four: string; memo: string };
  merchant: { descriptor: string; city: string; state: string; country: string };
  status: string;
  result: string;
  created: string;
  settled_amount?: number;
  events: any[];
}

export async function listTransactions(params?: {
  page?: number;
  page_size?: number;
  begin?: string;
  end?: string;
  card_token?: string;
  transaction_token?: string;
}): Promise<{ data: PrivacyTransaction[]; page: number; total_entries: number; total_pages: number }> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.page_size) query.set("page_size", String(params.page_size));
  if (params?.begin) query.set("begin", params.begin);
  if (params?.end) query.set("end", params.end);
  if (params?.card_token) query.set("card_token", params.card_token);
  if (params?.transaction_token) query.set("transaction_token", params.transaction_token);
  const qs = query.toString();
  return privacyRequest("GET", `/transaction${qs ? `?${qs}` : ""}`);
}

export async function simulateAuthorization(params: {
  descriptor: string;
  pan: string;
  amount: number;
}): Promise<{ token: string; debugging_request_id: string }> {
  return privacyRequest("POST", "/simulate/authorize", params);
}

export function isPrivacyConfigured(): boolean {
  return !!process.env.PRIVACY_COM_API_KEY?.trim();
}
