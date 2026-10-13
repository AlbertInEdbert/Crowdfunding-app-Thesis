const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export interface Session {
  ID: number;
  UserID: number;
  RoleID: number;
  ExpiresAt: string;
  CreatedAt: string;
}
export async function getCurrentSession(): Promise<Session | null> {
  const res = await fetch(`${API_URL}/api/v1/auth/me`, {
    credentials: "include",
    cache: "no-store",
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`Failed to fetch session: ${res.status}`);
  return res.json();
}

export async function getSignOut() {
  const res = await fetch(`${API_URL}/api/v1/auth/logout`, {
    method: "DELETE",
    credentials: "include",
  });
  if (res.status === 401 || res.status === 204) return null;
  if (!res.ok) throw new Error(`Failed to remove session: ${res.status}`);
  return res.json();
}

export interface UserProfile {
  ID: number;
  Email: string;
  Name: string;
  PhoneNumber: string;
  RoleID: number;
  TxCounter : number;
  CreatedAt: string;
  UpdatedAt: string;
}

export async function getUserProfile(userId: number): Promise<UserProfile> {
  const res = await fetch(`${API_URL}/api/v1/users/${userId}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch profile: ${res.status}`);
  }
  return res.json();
}

export async function updateProfile(
  name: string,
  phoneNumber: string
): Promise<UserProfile> {
  const res = await fetch(`${API_URL}/api/v1/users`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name, phone_number: phoneNumber }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Failed to update profile: ${res.status}`);
  }
  return res.json();
}

export async function setPassword(password: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/auth/password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Failed to set password: ${res.status}`);
  }
}
