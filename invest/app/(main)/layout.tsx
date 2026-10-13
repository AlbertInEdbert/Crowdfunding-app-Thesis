import { cookies } from "next/headers";
import Navbar from "@/components/share/Navbar";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

async function getSession(): Promise<{ roleId: number | null; userId: number | null }> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  try {
    const res = await fetch(`${API_URL}/api/v1/auth/me`, {
      headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
      cache: "no-store",
    });

    if (!res.ok) {
      return { roleId: null, userId: null };
    }

    const session = await res.json();
    return {
      roleId: typeof session.RoleID === "number" ? session.RoleID : null,
      userId: typeof session.UserID === "number" ? session.UserID : null,
    };
  } catch {
    return { roleId: null, userId: null };
  }
}

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { roleId, userId } = await getSession();

  return (
    <>
      <Navbar roleId={roleId} isLoggedIn={userId !== null} />
      {children}
    </>
  );
}
