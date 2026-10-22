const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export interface Session {
  UserID: number;
  RoleID: number;
  ExpiresAt: string;
  CreatedAt: string;
}

export async function getSession(
  cookieHeader?: string
): Promise<Session | null> {
  const res = await fetch(`${API_URL}/api/v1/auth/me`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    cache: "no-store",
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`Failed to fetch session: ${res.status}`);
  return res.json();
}

export interface Role {
  Name: string;
}


export async function getRole(roleId : number): Promise<Role> {
  const res = await fetch(`${API_URL}/api/v1/role/${roleId}`, {
    credentials: "include",
    cache: "no-store",
  });
  return res.json();
}
