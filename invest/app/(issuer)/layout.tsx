import { getRole, getSession } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const ISSUER_ROLE_ID = 7;

export default async function IssuerLayout({ children }: { children: React.ReactNode }) {
const cookieStore = await cookies();
const cookieHeader = cookieStore.toString();

const session = await getSession(cookieHeader).catch(() => null);

if (!session) redirect("/sign-in");

const role = await getRole(session.RoleID).catch(() => null);

if (role?.Name !== "ISSUER") redirect("/explore");
  return <>{children}</>;
}