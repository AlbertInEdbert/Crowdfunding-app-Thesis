const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export interface CampaignUpdate {
  ID: number;
  CampaignID: number;
  Title: string;
  Content: string;
  CreatedAt: string;
  UpdateAt: string;
}

export async function getCampaignUpdates(
  campaignId: number,
  limit = 24,
  offset = 0
): Promise<CampaignUpdate[]> {
  const res = await fetch(
    `${API_URL}/api/v1/updates/campaign/${campaignId}?limit=${limit}&offset=${offset}`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch updates: ${res.status}`);
  }
  return res.json();
}

export async function getCampaignUpdatesByUser(
  limit = 24,
  offset = 0
): Promise<CampaignUpdate[]> {
  const res = await fetch(
    `${API_URL}/api/v1/updates?limit=${limit}&offset=${offset}`,
    { 
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store", 
      credentials: "include",
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch updates: ${res.status}`);
  }
  return res.json();
}


export async function createUpdate(
  campaignId: number,
  title: string,
  content: string
): Promise<CampaignUpdate> {
  const res = await fetch(`${API_URL}/api/v1/updates/campaign/${campaignId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ title, content }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Failed to create update: ${res.status}`);
  }
  return res.json();
}

export async function updateUpdate(
  id: number,
  title: string,
  content: string
): Promise<CampaignUpdate> {
  const res = await fetch(`${API_URL}/api/v1/updates/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ title, content }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Failed to edit update: ${res.status}`);
  }
  return res.json();
}

export async function deleteUpdate(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/updates/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Failed to delete update: ${res.status}`);
  }
}
