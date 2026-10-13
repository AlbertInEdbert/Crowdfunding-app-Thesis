const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export interface ReviewItem{
    ID : number,
    CampaignID : number,
    Comment : string,
    CreatedAt : string,
    UpdatedAt : string,
    User: { ID: number; Name: string } | null;
}

export async function getReview(
  campaignId : number,
  limit = 24,
  offset = 0,
): Promise<ReviewItem[]> {
  const res = await fetch(
    `${API_URL}/api/v1/review/${campaignId}?limit=${limit}&offset=${offset}`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch review: ${res.status}`);
  }
  return res.json();
}

export async function postReview(
    campaignId: number,
    comment: string,
): Promise<ReviewItem> {
  const res = await fetch(`${API_URL}/api/v1/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ 
        campaign_id: campaignId,
        comment: comment,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Failed to create review: ${res.status}`);
  }
  return res.json();
}