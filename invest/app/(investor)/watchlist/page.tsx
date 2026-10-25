"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Campaign,
  CampaignStatus,
  daysRemaining,
  formatIDR,
  fundingProgress,
} from "@/lib/campaign";
import { getCurrentSession } from "@/lib/user";
import { CampaignWatchlist, getWatchlist, PaginatedWatchlist, removeFromWatchlist } from "@/lib/watchlist";
import { Heart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const STATUS_VARIANT: Record<
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

const PAGE_SIZE = 5;

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

export default function WatchlistPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<PaginatedWatchlist>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [watchlistCampaignPage, setWatchlistCampaignPage] = useState(1)

  const totalWatchlistPages = Math.max(
    1,
    Math.ceil((campaigns?.total ?? 1) / PAGE_SIZE)
  );

  const pages = useMemo(
    () => getPageNumbers(watchlistCampaignPage, totalWatchlistPages),
    [watchlistCampaignPage, totalWatchlistPages]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await getCurrentSession().catch(() => null);
      if (!session) {
        router.push("/sign-in");
        return;
      }
      try {
        const data = await getWatchlist();
        console.log(data)
        if (!cancelled) setCampaigns(data);
      } catch {
        if (!cancelled) setLoadError("Could not load your watchlist.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // const handleRemove = async (campaignId: number) => {
  //   setRemovingId(campaignId);
  //   try {
  //     await removeFromWatchlist(campaignId);
  //     setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
  //   } catch (err) {
  //     console.error("Failed to remove from watchlist:", err);
  //   } finally {
  //     setRemovingId(null);
  //   }
  // };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          My Watchlist{" "}
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({campaigns?.total})
          </span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Campaigns you are keeping an eye on.
        </p>
      </div>

      {loading ? (
        <p className="rounded-md border px-4 py-8 text-center text-sm text-muted-foreground">
          Loading watchlist…
        </p>
      ) : loadError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </p>
      ) : campaigns?.total === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No campaigns in your watchlist yet.
          </p>
          <Link
            href="/explore"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Browse campaigns
          </Link>
        </div>
      ) : (
        // <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Funding Amount</TableHead>
                <TableHead>Funding Goal</TableHead>
                {/* <TableHead>Progress</TableHead> */}
                <TableHead>Valuation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns?.data.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-mono text-xs">
                    {campaign.companyName}
                  </TableCell>
                  <TableCell className="font-medium ">
                    <div className="flex items-start gap-2.5">
                      <Link
                        href={`/campaign/${campaign.id}`}
                        className="hover:underline underline-offset-4"
                      >
                        {campaign.title}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {campaign.categoryName}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                      <Badge variant={STATUS_VARIANT[campaign.status]}>
                        {campaign.status}
                      </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {formatIDR(campaign.fundingAmount)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {formatIDR(campaign.fundingGoal)}
                  </TableCell>
                  {/* <TableCell className="font-mono text-xs">
                    {campaign.FundingAmount / campaign.FundingGoal + "%"}
                  </TableCell> */}
                  <TableCell className="font-mono text-xs">
                    {formatIDR(campaign.valuation)}
                  </TableCell>
                </TableRow>

              ))} 
            </TableBody>
          </Table>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    setWatchlistCampaignPage((p) => Math.max(1, p - 1))
                  }}
                  className={watchlistCampaignPage === 1 ? "pointer-events-none opacity-50" : undefined}
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
                      isActive={p === watchlistCampaignPage}
                      onClick={(e) => {
                        e.preventDefault()
                        setWatchlistCampaignPage(p)
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
                    setWatchlistCampaignPage((p) => Math.min(totalWatchlistPages, p + 1))
                  }}
                  className={
                    watchlistCampaignPage === totalWatchlistPages ? "pointer-events-none opacity-50" : undefined
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
            

              )}
    </main>
  );
}
