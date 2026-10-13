const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export type CompanyStatus =
  | "PENDING"
  | "ACTIVE"
  | "REJECTED"
  | "SUSPENDED"
  | "UPDATED";

export interface Company {
  ID: number;
  Name: string;
  UserID: number;
  Description: string;
  CategoryID: number;
  Status: CompanyStatus;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface CompanyListFilter {
  search?: string;
  status?: string;
  category?: string;
}

export interface PaginatedCompanies {
  data: Company[];
  total: number;
}

export async function getCompanies(
  limit = 9,
  offset = 0,
  filter: CompanyListFilter = {}
): Promise<PaginatedCompanies> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (filter.search?.trim()) params.set("search", filter.search.trim());
  if (filter.status) params.set("status", filter.status);
  if (filter.category) params.set("category", filter.category);

  const res = await fetch(`${API_URL}/api/v1/company?${params.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch companies: ${res.status}`);
  }
  return res.json();
}


export async function getCompanyByUserId(userId: number): Promise<Company> {
  const res = await fetch(`${API_URL}/api/v1/company/user/${userId}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch company: ${res.status}`);
  }
  return res.json();
}

export async function getCompanyByCompanyId(companyId : number): Promise<Company> {
  const res = await fetch(`${API_URL}/api/v1/company/${companyId}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch company: ${res.status}`);
  }
  return res.json();
}

export interface CompanyFile {
  ID: number;
  UserID: number;
  CampaignID: number | null;
  CompanyID: number | null;
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

export async function getCompanyFiles(companyId: number): Promise<CompanyFile[]> {
  const res = await fetch(`${API_URL}/api/v1/storage/media?company_id=${companyId}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch company files: ${res.status}`);
  }
  return res.json();
}

export interface CreateCompanyInput {
  name: string;
  description: string;
  categoryId: string;
}

export async function updateCompany(
  companyId: number,
  input: CreateCompanyInput
): Promise<Company> {
  const res = await fetch(`${API_URL}/api/v1/company/${companyId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      name: input.name,
      description: input.description,
      categoryId: Number(input.categoryId) || 0,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Failed to update company: ${res.status}`);
  }
  return res.json();
}

export async function createCompany(
  input: CreateCompanyInput,
  files: File[] = []
): Promise<Company> {
  const body = new FormData();
  body.set("name", input.name);
  body.set("description", input.description);
  body.set("categoryId", String(input.categoryId));

  const [AKTA,SK,NIB,NPWP ] = files;
  if (AKTA) body.set("AKTA", AKTA);
  if (SK) body.set("SK", SK);
  if (NIB) body.set("NIB", NIB);
  if (NPWP) body.set("NPWP", NPWP);

  const res = await fetch(`${API_URL}/api/v1/company`, {
    method: "POST",
    credentials: "include",
    body,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Failed to create company: ${res.status}`);
  }
  return res.json();
}

export async function getFileUrl(objectKey: string): Promise<string> {
  const res = await fetch(
    `${API_URL}/api/v1/storage/url?key=${encodeURIComponent(objectKey)}`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch file URL: ${res.status}`);
  }
  const data: { url: string } = await res.json();
  return data.url;
}

export async function updateCompanyStatus(companyId : number,newStatus : CompanyStatus): Promise<Company> {
  const res = await fetch(`${API_URL}/api/v1/company/${companyId}`, {
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