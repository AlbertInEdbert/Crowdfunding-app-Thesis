"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Megaphone, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Campaign, formatIDR, getCampaigns, PaginatedCampaigns } from "@/lib/campaign";
import {
  formatDate,
  getUserInvestmentCount,
  getUserInvestments,
  Investment,
  InvestmentStatus,
} from "@/lib/investment";
import { getCurrentSession, getUserProfile, Session, UserProfile } from "@/lib/user";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

const STATUS_VARIANT: Record<
  InvestmentStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  PENDING: "secondary",
  PAID: "default",
  REFUNDED: "outline",
  CANCELLED: "destructive",
};

function getPageNumbers(current: number, totalPages: number, siblings = 1) {
  const range: (number | "ellipsis")[] = []
  const start = Math.max(2, current - siblings)
  const end = Math.min(totalPages - 1, current + siblings)

  range.push(1)
  if (start > 2) range.push("ellipsis")
  for (let i = start; i <= end; i++) range.push(i)
  if (end < totalPages - 1) range.push("ellipsis")
  if (totalPages > 1) range.push(totalPages)

  return range
}

const PAGE_SIZE = 10;

export default function PortfolioPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [campaignTitles, setCampaignTitles] = useState<Record<number, string>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [unauthenticated, setUnauthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1)
  const [totalInvestment, setTotalInvestment] = useState(1)
  const totalPages = Math.max(
    1,
    Math.ceil((userProfile?.TxCounter ?? 1) / PAGE_SIZE)
  );
  const pages = useMemo(
    () => getPageNumbers(page, totalPages),
    [page, totalPages]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const session = await getCurrentSession();
      if (!session) {
        setUnauthenticated(true);
        return;
      }
      const [txs, txsAmount,campaigns,user] = await Promise.all([
        getUserInvestments(session.UserID, PAGE_SIZE, (page - 1) * PAGE_SIZE),
        getUserInvestmentCount(session.UserID),
        getCampaigns(100, 0).catch(
          () => ({ data: [], total: 0 }) as PaginatedCampaigns
        ),
        getUserProfile(session.UserID)
      ]);
      setUserProfile(user)
      setInvestments(txs ?? []);
      setTotalInvestment(txsAmount)
      setCampaignTitles(
        Object.fromEntries(campaigns.data.map((c) => [c.ID, c.Title]))
      );
    } catch {
      setLoadError(
        "Could not load your portfolio. Make sure the backend is running on port 8080."
      );
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  if (unauthenticated) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center gap-4 px-4 sm:px-6">
        <p className="text-sm text-muted-foreground">
          You need to sign in to view your portfolio.
        </p>
        <Button asChild>
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
        <p className="text-sm text-muted-foreground">
          An overview of all investments you have ever made.
        </p>
      </div>
      <div className="flex gap-3">
            <Card className="flex-1">
              <CardContent className="flex-1 items-center gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
                  <Wallet className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm text-muted-foreground">
                    Total investment
                  </p>
                  <p className="truncate text-lg font-semibold">
                    {loading ? "…" : formatIDR(totalInvestment)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="flex-1">
              <CardContent className="flex-1 items-center gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
                  <Megaphone className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm text-muted-foreground">
                    Total Campaign
                  </p>
                  <p className="truncate text-lg font-semibold">
                    {loading ? "…" : userProfile?.TxCounter}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="flex-1">
              <CardContent className="flex-1 items-center gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
                  <Wallet className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm text-muted-foreground">
                    Total investment
                  </p>
                  <p className="truncate text-lg font-semibold">
                    {loading ? "…" : formatIDR(totalInvestment)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="flex-1">
              <CardContent className="flex-1 items-center gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
                  <Wallet className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm text-muted-foreground">
                    Total investment
                  </p>
                  <p className="truncate text-lg font-semibold">
                    {loading ? "…" : formatIDR(totalInvestment)}
                  </p>
                </div>
              </CardContent>
            </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Investment history</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading investments…
            </p>
          ) : loadError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {loadError}
            </p>
          ) : investments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No investments yet.{" "}
              <Link href="/explore" className="underline underline-offset-4">
                Browse campaigns
              </Link>
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investments.map((inv) => (
                  <TableRow key={inv.ID}>
                    <TableCell className="font-mono text-xs">
                      {inv.TransactionNo || `#${inv.ID}`}
                    </TableCell>
                    <TableCell>
                      {campaignTitles[inv.CampaignID] ??
                        `Campaign #${inv.CampaignID}`}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatIDR(inv.Amount)}
                    </TableCell>
                    <TableCell>{inv.PaymentMethod || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[inv.Status]}>
                        {inv.Status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(inv.PaidAt ?? inv.CreatedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault()
              setPage((p) => Math.max(1, p - 1))
            }}
            className={page === 1 ? "pointer-events-none opacity-50" : undefined}
          />
        </PaginationItem>

        {pages.map((p, i) =>
          p === "ellipsis" ? (
            <PaginationItem key={`ellipsis-${i}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={p}>
              <PaginationLink
                href="#"
                isActive={p === page}
                onClick={(e) => {
                  e.preventDefault()
                  setPage(p)
                }}
              >
                {p}
              </PaginationLink>
            </PaginationItem>
          )
        )}

        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault()
              setPage((p) => Math.min(totalPages, p + 1))
            }}
            className={
              page === totalPages ? "pointer-events-none opacity-50" : undefined
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
    </main>
  );
}
