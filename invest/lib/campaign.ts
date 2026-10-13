const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export type CampaignStatus =
  | "DRAFT"
  | "PENDING"
  | "REQUESTDATE"
  | "ACTIVE"
  | "FUNDED"
  | "COMPLETED"
  | "FAILED"
  | "REJECTED"
export interface Campaign {
  ID: number;
  Title: string;
  Description : string;
  Valuation: number;
  FundingAmount: number;
  FundingGoal: number;
  MinInvestment: number;
  SharePrice: number;
  Status: CampaignStatus;
  StartDate: string;
  EndDate: string;
  TotalInvestor: number;
  CompanyID: number;
  CreatedAt: string;
  UpdatedAt: string;
}

export type Highlight = {
  uid: string;
  seqNo: number;
  title: string;
  description: string;
};

export interface CampaignListFilter {
  search?: string;
  status?: string;
  category?: string;
}

export interface PaginatedCampaigns {
  data: Campaign[];
  total: number;
}

export async function getCampaigns(
  limit = 9,
  offset = 0,
  filter: CampaignListFilter = {}
): Promise<PaginatedCampaigns> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (filter.search?.trim()) params.set("search", filter.search.trim());
  if (filter.status) params.set("status", filter.status);
  if (filter.category) params.set("category", filter.category);

  const res = await fetch(`${API_URL}/api/v1/campaign?${params.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch campaigns: ${res.status}`);
  }
  return res.json();
}

export interface CampaignSummary {
  id: number;
  title: string;
  valuation: number;
  funding_amount: number;
  funding_goal: number;
  min_investment: number;
  share_price: number;
  status: CampaignStatus;
  start_date: string;
  end_date: string;
  total_investor: number;
  company_id: number;
  cover_url: string;
}

export interface PaginatedCampaignSummary {
  data: CampaignSummary[];
  total: number;
}


export async function getCampaignsAndCover(
  limit = 9,
  offset = 0,
  filter: CampaignListFilter = {}
): Promise<PaginatedCampaignSummary> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (filter.search?.trim()) params.set("search", filter.search.trim());
  if (filter.status) params.set("status", filter.status);
  if (filter.category) params.set("category", filter.category);
  const res = await fetch(`${API_URL}/api/v1/campaign/explore?${params.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch campaign: ${res.status}`);
  }
  return res.json();
}


export async function getCampaign(id: number): Promise<Campaign> {
  const res = await fetch(`${API_URL}/api/v1/campaign/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch campaign: ${res.status}`);
  }
  return res.json();
}

export async function getCampaignsByCompany(
  limit = 9,
  offset = 0,
  companyId: number
): Promise<Campaign[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  const res = await fetch(`${API_URL}/api/v1/campaign/company/${companyId}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch campaigns: ${res.status}`);
  }

  return res.json();
}

export interface CreateCampaignInput {
  title: string;
  description: string;
  valuation: number;
  funding_goal: number;
  min_investment: number;
  share_price: number;
  start_date: string;
  end_date: string;
  highlight : Highlight[]
}

export async function updateCampaign(
  id: number,
  input: CreateCampaignInput
): Promise<Campaign> {
  const res = await fetch(`${API_URL}/api/v1/campaign/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Failed to update campaign: ${res.status}`);
  }
  return res.json();
}

export async function createCampaign(
  companyId: number,
  input: CreateCampaignInput,
  files: File[] = [],
  thumbnail: File | null = null,
  video: File | null = null
): Promise<Campaign> {
  const body = new FormData();
  body.set("title", input.title);
  body.set("description", input.description);
  body.set("valuation", String(input.valuation));
  body.set("funding_goal", String(input.funding_goal));
  body.set("min_investment", String(input.min_investment));
  body.set("share_price", String(input.share_price));
  body.set("highlights", String(input.highlight));
  body.set("start_date", input.start_date);
  body.set("end_date", input.end_date);

  const [cover, ...rest] = files;
  if (cover) body.set("COVER", cover);
  for (const file of rest) body.append("files", file);
  if (thumbnail) body.set("THUMBNAIL", thumbnail);
  if (video) body.set("VIDEO", video);

  const res = await fetch(`${API_URL}/api/v1/campaign/${companyId}`, {
    method: "POST",
    credentials: "include",
    body,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Failed to create campaign: ${res.status}`);
  }
  return res.json();
}

export interface CampaignMedia {
  ID: number;
  UserID: number;
  CampaignID: number;
  MediaCode: string;
  Category: string;
  ObjectKey: string;
  FileName: string;
  ContentType: string;
  Size: number;
  CreatedAt: string;
  UpdatedAt: string;
  URL: string;
}

export async function getCampaignMedia(id: number): Promise<CampaignMedia[]> {
  const res = await fetch(`${API_URL}/api/v1/storage/media?campaign_id=${id}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch campaign media: ${res.status}`);
  }
  return res.json();
}

export async function getCampaignCover(id: number): Promise<CampaignMedia[]> {
  const res = await fetch(`${API_URL}/api/v1/storage/media?campaign_id=${id}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch campaign media: ${res.status}`);
  }
  return res.json();
}

export function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function fundingProgress(FundingGoal: number,FundingAmount: number): number {

  if (FundingGoal <= 0) return 0;
  return Math.min(
    100,
    Math.round((FundingAmount / FundingGoal) * 100)
  );
}

export function daysRemaining(endDate: string): number {
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export async function updateCampaignStatus(campaignId : number,newStatus : CampaignStatus): Promise<Campaign> {
  const res = await fetch(`${API_URL}/api/v1/campaign/${campaignId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ status: newStatus }),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch campaign: ${res.status}`);
  }
  return res.json();
}

export async function updateCampaignDate(campaignId : number,newStatus : CampaignStatus): Promise<Campaign> {
  const res = await fetch(`${API_URL}/api/v1/campaign/date/${campaignId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ status: newStatus }),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch campaign: ${res.status}`);
  }
  return res.json();
}