import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import Navbar from "@/components/share/Navbar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "First Step",
  description: "First Step Crowdfunding Investment",
};

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { roleId, userId } = await getSession();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Navbar roleId={roleId} isLoggedIn={userId !== null} />
        {children}
      </body>
    </html>
  );
}
