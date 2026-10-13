import { Campaign } from "./campaign";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export async function getWatchlist(): Promise<Campaign[]> {
  const res = await fetch(`${API_URL}/api/v1/watchlist`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch watchlist: ${res.status}`);
  }
  return res.json();
}

export async function addToWatchlist(campaignId: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/watchlist/${campaignId}`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Failed to add to watchlist: ${res.status}`);
  }
}

export async function removeFromWatchlist(campaignId: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/watchlist/${campaignId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(
      data?.error ?? `Failed to remove from watchlist: ${res.status}`
    );
  }
}

export async function checkWatchlist(campaignId: number): Promise<boolean> {
  const res = await fetch(`${API_URL}/api/v1/watchlist/check/${campaignId}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to check watchlist: ${res.status}`);
  }
  const data = await res.json();
  return data.watchlisted === true;
}
