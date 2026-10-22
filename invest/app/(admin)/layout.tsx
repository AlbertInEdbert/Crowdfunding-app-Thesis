import { getRole, getSession, Role } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
// const ADMIN_ROLE_ID = 7;

export default async function ApprovalLayout({ children }: { children: React.ReactNode }) {
const cookieStore = await cookies();
const cookieHeader = cookieStore.toString();

const session = await getSession(cookieHeader).catch(() => null);

if (!session) redirect("/sign-in");

const role = await getRole(session.RoleID).catch(() => null);
console.log(role?.Name)
if (role?.Name !== "ADMIN") redirect("/explore");
  return <>{children}</>;
}