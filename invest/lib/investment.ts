const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export type InvestmentStatus =
  | "PENDING"
  | "PAID"
  | "REFUNDED"
  | "CANCELLED";

export interface InvestmentDetail {
  ID: number;
  InvestmentsHId: number;
  ShareCount: number;
  PricePerUnit: number;
  Subtotal: number;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface Investment {
  ID: number;
  TransactionNo: string;
  Amount: number;
  Status: InvestmentStatus;
  PaymentMethod: string;
  PaidAt: string | null;
  UserID: number;
  CampaignID: number;
  CreatedAt: string;
  UpdatedAt: string;
  Details: InvestmentDetail[];
}

export async function getUserInvestmentCount(userId: number): Promise<number> {
  const res = await fetch(`${API_URL}/api/v1/transaction/user/${userId}/count`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to count investments: ${res.status}`);
  }
  const data = await res.json();
  return data.count;
}

export async function getUserInvestments(
  userId: number,
  limit = 10,
  offset = 0,
): Promise<Investment[]> {
  const res = await fetch(`${API_URL}/api/v1/transaction/user/${userId}?limit=${limit}&offset=${offset}`, {
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch investments: ${res.status}`);
  }
  return res.json();
}


export async function createInvestment(
  campaignId: number,
  shareCount: number,
  paymentMethod : string,
): Promise<Investment> {
  const res = await fetch(`${API_URL}/api/v1/transaction/${campaignId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ 
      share_count: shareCount ,
      payment_method : paymentMethod
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Failed to create investment: ${res.status}`);
  }
  return res.json();
}

export async function payInvestment(
  transactionId: number,
  paymentMethod : string,
): Promise<Investment> {
  const res = await fetch(`${API_URL}/api/v1/transaction/pay/${transactionId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ payment_method: paymentMethod }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Failed to pay investment: ${res.status}`);
  }
  return res.json();
}

export async function cancelInvestment(id: number): Promise<Investment> {
  const res = await fetch(`${API_URL}/api/v1/transaction/cancel/${id}`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(
      data?.error ?? `Failed to cancel investment: ${res.status}`
    );
  }
  return res.json();
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
