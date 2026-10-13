const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export interface CommentItem{
    ID : number,
    CampaignID : number,
    ParentID : number,
    UserID : number,
    Content : string,
    Like : number,
    CreatedAt : string,
    UpdatedAt : string,
    User: { ID: number; Name: string } | null;
}

export async function getComment(
  campaignId : number,
  limit = 24,
  offset = 0,
): Promise<CommentItem[]> {
  const res = await fetch(
    `${API_URL}/api/v1/discussion/${campaignId}?limit=${limit}&offset=${offset}`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch comment: ${res.status}`);
  }
  return res.json();
}

export async function postComment(
    campaignId: number,
    discussionId: number,
    comment: string,
): Promise<CommentItem> {
  const res = await fetch(`${API_URL}/api/v1/discussion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
        campaign_id: campaignId,
        discussion_id: discussionId,
        comment: comment,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Failed to create comment: ${res.status}`);
  }
  return res.json();
}

export async function likeComment(
    discussionId: number,
): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/discussion/${discussionId}/like`, {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok && res.status !== 409) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Failed to like comment: ${res.status}`);
  }
}

export async function checkLikeComment(
    discussionId: number,
): Promise<boolean> {
  const res = await fetch(`${API_URL}/api/v1/discussion/${discussionId}/like`, {
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Failed to check like comment: ${res.status}`);
  }
  const data = await res.json();
  return data.liked === true;
}
