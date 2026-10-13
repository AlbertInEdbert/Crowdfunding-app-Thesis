const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export interface Category {
  CategoryID: number;
  Name: string;
  CreatedAt: string;
  UpdatedAt: string;
}

export async function getCategory(
  limit = 24,
  offset = 0
): Promise<Category[]> {
  const res = await fetch(
    `${API_URL}/api/v1/category?limit=${limit}&offset=${offset}`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch category: ${res.status}`);
  }
  return res.json();
}
