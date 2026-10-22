"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TrendingUp, Wallet, Clock, RotateCcw } from "lucide-react";

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
import { Campaign, CampaignStatus, formatIDR, getCampaigns } from "@/lib/campaign";
import {
  cancelInvestment,
  formatDate,
  getUserInvestmentCount,
  getUserInvestments,
  Investment,
  InvestmentStatus,
} from "@/lib/investment";
import { getCurrentSession } from "@/lib/user";
import { CampaignUpdate, getCampaignUpdatesByUser } from "@/lib/updates";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { getPortfolio, PortfolioItem } from "@/lib/portfolio";


const STATUS_VARIANT_CAMPAIGN: Record<
  CampaignStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  DRAFT: "outline",
  REQUESTDATE: "outline",
  PENDING: "outline",
  ACTIVE: "default",
  FUNDED: "secondary",
  COMPLETED: "outline",
  FAILED: "destructive",
  REJECTED: "destructive",
};

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

const PAGE_SIZE = 2;
const UPDATE_PAGE_SIZE = 5;

export default function DashboardPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [campaignTitles, setCampaignTitles] = useState<Record<number, string>>(
    {}
  );

  const [portfolios, setPortfolios] = useState<PortfolioItem[]>([]);
  const [loadingPortfolio, setLoadingPortfolio,] = useState(true);
  const [loadErrorPortfolio, setLoadErrorPortfolio,] = useState<string | null>(null);
  const [loadingInvestment, setLoadingInvestment] = useState(true);
  const [loadErrorInvestemnt, setLoadErrorInvestment] = useState<string | null>(null);
  const [loadErrorUpdate, setLoadErrorUpdate,] = useState<string | null>(null);
  const [loadingUpdate, setLoadingUpdate] = useState(true);
  const [unauthenticated, setUnauthenticated] = useState(false);
  
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [latestUpdates, setLatestUpdates] = useState<CampaignUpdate[]>([]);
  const [updateCursor, setUpdateCursor] = useState(0);
  const [hasMoreUpdates, setHasMoreUpdates] = useState(false);
  const [investmentPage, setInvestmentPage] = useState(1)
  const [portfolioPage, setPortfolioPage] = useState(1)
  const [investmentCount, setInvestmentCount] = useState(0);

  const totalPagesInvestment = Math.max(
    1,
    Math.ceil(investmentCount / PAGE_SIZE)
  );
  const pagesInvestment = useMemo(
    () => getPageNumbers(investmentPage, totalPagesInvestment),
    [investmentPage, totalPagesInvestment]
  );

  const totalPagesPortfolio = Math.max(
    1,
    Math.ceil(portfolios.length / PAGE_SIZE)
  );
  const pagesPortfolio = useMemo(
    () => getPageNumbers(portfolioPage, totalPagesPortfolio),
    [portfolioPage, totalPagesPortfolio]
  );

  const pagedPortfolios = useMemo(
    () =>
      portfolios.slice(
        (portfolioPage - 1) * PAGE_SIZE,
        portfolioPage * PAGE_SIZE
      ),
    [portfolios, portfolioPage]
  );

const getSession = async () => {
  const session = await getCurrentSession();
  if (!session) setUnauthenticated(true);
  return session;
};

const loadUpdate = useCallback(async (cursor = 0) => {
  setLoadingUpdate(true);
  setLoadErrorUpdate(null);
  try {
    const res = await getCampaignUpdatesByUser(UPDATE_PAGE_SIZE, cursor);
    const incoming = res.data ?? [];
    setLatestUpdates((prev) => {
      if (cursor === 0) return incoming;
      const seen = new Set(prev.map((u) => u.ID));
      return [...prev, ...incoming.filter((u) => !seen.has(u.ID))];
    });
    setUpdateCursor(res.next_cursor ?? 0);
    setHasMoreUpdates((res.next_cursor ?? 0) > 0);
  } catch {
    setLoadErrorUpdate(
      "Could not load updates. Make sure the backend is running on port 8080."
    );
  } finally {
    setLoadingUpdate(false);
  }
}, [])

const handleUpdatesScroll = (e: React.UIEvent<HTMLDivElement>) => {
  const el = e.currentTarget;
  if (
    el.scrollHeight - el.scrollTop - el.clientHeight < 32 &&
    hasMoreUpdates &&
    !loadingUpdate
  ) {
    loadUpdate(updateCursor);
  }
};

const loadInvestments = useCallback(async () => {
  setLoadingInvestment(true);
  setLoadErrorInvestment(null);
  try {
    const session = await getSession();
    if (!session) return;

    const txs = await getUserInvestments(
      session.UserID,
      PAGE_SIZE,
      (investmentPage - 1) * PAGE_SIZE
    );
    setInvestments(txs ?? []);
  } catch {
    setLoadErrorInvestment(
      "Could not load your investments. Make sure the backend is running on port 8080."
    );
  } finally {
    setLoadingInvestment(false);
  }
}, [investmentPage]);

const loadPortfolioData = useCallback(async () => {
  setLoadingPortfolio(true);
  setLoadErrorPortfolio(null);
  try {
    const session = await getSession();
    if (!session) return;

    const [count, portfolio] = await Promise.all([
      getUserInvestmentCount(session.UserID),
      getPortfolio(),
    ]);
    setInvestmentCount(count ?? 0);
    setPortfolios(portfolio ?? []);
  } catch {
    setLoadErrorPortfolio("Could not load portfolio data.");
  } finally {
    setLoadingPortfolio(false);
  }
}, [portfolioPage]);

const loadCampaignTitles = useCallback(async () => {
  try {
    const campaigns = await getCampaigns(100, 0).catch(() => ({
      data: [] as Campaign[],
      total: 0,
    }));
    setCampaignTitles(
      Object.fromEntries(campaigns.data.map((c) => [c.ID, c.Title]))
    );
  } catch {
    
  }
}, []);

useEffect(() => {
  loadInvestments();
  loadPortfolioData();
  loadCampaignTitles();
  loadUpdate();
}, []);

useEffect(() => {
  loadInvestments();
}, [loadInvestments]); 

useEffect(() => {
  loadPortfolioData();
}, [loadPortfolioData]);

  const stats = useMemo(() => {
    const allInvestments = portfolios.flatMap((p) => p.investments);
    return {
      totalInvested: portfolios.reduce((sum, p) => sum + p.total_invested, 0),
      active: allInvestments.filter((i) => i.status === "PAID").length,
      pending: allInvestments.filter((i) => i.status === "PENDING").length,
      refunded: allInvestments.filter(
        (i) => i.status === "REFUNDED" || i.status === "CANCELLED"
      ).length,
    };
  }, [portfolios]);

  async function handleCancel(id: number) {
    setBusyId(id);
    setActionError(null);
    try {
      await cancelInvestment(id);
      await loadInvestments();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setBusyId(null);
    }
  }

  if (unauthenticated) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center gap-4 px-4 sm:px-6">
        <p className="text-sm text-muted-foreground">
          You need to sign in to view your dashboard.
        </p>
        <Button asChild>
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Investor Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Track your investments, pending payments, and returns.
        </p>
      </div>
      <div className="flex">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 py-2">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Wallet}
            label="Total invested"
            value={formatIDR(stats.totalInvested)}
          />
          <StatCard
            icon={TrendingUp}
            label="Active investments"
            value={String(stats.active)}
          />
          <StatCard
            icon={Clock}
            label="Pending payments"
            value={String(stats.pending)}
          />
          <StatCard
            icon={RotateCcw}
            label="Refunded / cancelled"
            value={String(stats.refunded)}
          />
        </div>

        {actionError && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {actionError}
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle>My investments</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingInvestment ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Loading investments…
              </p>
            ) : loadErrorInvestemnt ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {loadErrorInvestemnt}
              </p>
            ) : investments.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No investments yet.{" "}
                <Link href="/campaign" className="underline underline-offset-4">
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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {investments.map((inv) => (
                    <TableRow key={inv.ID}>
                      <TableCell className="font-mono text-xs">
                        {inv.TransactionNo || `#${inv.ID}`}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/campaign/${inv.CampaignID}`}
                          className="text-blue-600 hover:underline"
                        >
                          {campaignTitles[inv.CampaignID] ?? `Campaign #${inv.CampaignID}`}
                        </Link>
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
                      <TableCell className="text-right">
                        {inv.Status === "PAID" && (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === inv.ID}
                              onClick={() => handleCancel(inv.ID)}
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                      </TableCell>
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
                setInvestmentPage((p) => Math.max(1, p - 1))
              }}
              className={investmentPage === 1 ? "pointer-events-none opacity-50" : undefined}
            />
          </PaginationItem>

          {pagesInvestment.map((p, i) =>
            p === "ellipsis" ? (
              <PaginationItem key={`ellipsis-${i}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={p}>
                <PaginationLink
                  href="#"
                  isActive={p === investmentPage}
                  onClick={(e) => {
                    e.preventDefault()
                    setInvestmentPage(p)
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
                setInvestmentPage((p) => Math.min(totalPagesInvestment, p + 1))
              }}
              className={
                investmentPage === totalPagesInvestment ? "pointer-events-none opacity-50" : undefined
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
        <Card>
          <CardHeader>
            <CardTitle>My Portfolio</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPortfolio ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Loading portfolios…
              </p>
            ) : loadErrorPortfolio ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {loadErrorPortfolio}
              </p>
            ) : portfolios.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No portfolios yet.{" "}
                <Link href="/campaign" className="underline underline-offset-4">
                  Browse campaigns
                </Link>
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedPortfolios.map((item) => (
                    <TableRow key={item.campaign_id}>
                      <TableCell className="font-mono text-xs">
                        {item.company_name}
                      </TableCell>
                      <TableCell className="font-medium ">
                        <div className="flex items-start gap-2.5">
                          <Badge variant={STATUS_VARIANT_CAMPAIGN[item.campaign_status]}>
                            {item.campaign_status.replace(/_/g, " ")}
                          </Badge>
                          <Link
                            href={`/campaign/${item.campaign_id}`}
                            className="hover:underline underline-offset-4"
                          >
                            {item.campaign_title}
                          </Link>
                        </div>

                      </TableCell>
                      <TableCell>{formatIDR(item.total_invested)}</TableCell>
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
                setPortfolioPage((p) => Math.max(1, p - 1))
              }}
              className={portfolioPage === 1 ? "pointer-events-none opacity-50" : undefined}
            />
          </PaginationItem>

          {pagesPortfolio.map((p, i) =>
            p === "ellipsis" ? (
              <PaginationItem key={`ellipsis-${i}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={p}>
                <PaginationLink
                  href="#"
                  isActive={p === portfolioPage}
                  onClick={(e) => {
                    e.preventDefault()
                    setPortfolioPage(p)
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
                setPortfolioPage((p) => Math.min(totalPagesPortfolio, p + 1))
              }}
              className={
                portfolioPage === totalPagesPortfolio ? "pointer-events-none opacity-50" : undefined
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
      </div>
      <div className="px-4 py-2 w-md">
        <Card>
          <CardHeader>
            <CardTitle>Latest updates</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingUpdate && latestUpdates.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Loading updates…
              </p>
            ): loadErrorUpdate ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {loadErrorUpdate}
              </p>
            ) : latestUpdates.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No updates yet from campaigns you invested in.
              </p>
            ) : (
              <div
                className="max-h-96 overflow-y-auto pr-2"
                onScroll={handleUpdatesScroll}
              >
                <ul className="divide-y divide-slate-100">
                  {latestUpdates.map((u) => (
                    <li key={u.ID} className="py-3">
                      <Link
                        href={`/campaign/${u.CampaignID}`}
                        className="text-sm font-medium text-blue-900 hover:underline"
                      >
                        {u.Title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {campaignTitles[u.CampaignID] ??
                          `Campaign #${u.CampaignID}`}{" "}
                        · {formatDate(u.CreatedAt)}
                      </p>
                    </li>
                  ))}
                </ul>
                {loadingUpdate && (
                  <p className="py-3 text-center text-xs text-muted-foreground">
                    Loading more…
                  </p>
                )}
                {!hasMoreUpdates && (
                  <p className="py-3 text-center text-xs text-muted-foreground">
                    You have seen all updates.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
      
    </main>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="truncate text-lg font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
