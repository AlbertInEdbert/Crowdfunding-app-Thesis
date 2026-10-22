"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Campaign,
  CampaignStatus,
  daysRemaining,
  formatIDR,
  fundingProgress,
} from "@/lib/campaign";
import { getCurrentSession } from "@/lib/user";
import { getWatchlist, removeFromWatchlist } from "@/lib/watchlist";
import { Heart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

export default function WatchlistPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);

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

  const handleRemove = async (campaignId: number) => {
    setRemovingId(campaignId);
    try {
      await removeFromWatchlist(campaignId);
      setCampaigns((prev) => prev.filter((c) => c.ID !== campaignId));
    } catch (err) {
      console.error("Failed to remove from watchlist:", err);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          My Watchlist{" "}
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({campaigns.length})
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
      ) : campaigns.length === 0 ? (
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => {
            const daysLeft = daysRemaining(campaign.EndDate);
            return (
              <Card key={campaign.ID} className="w-full">
                <CardHeader>
                  <CardAction>
                    <Badge variant={STATUS_VARIANT[campaign.Status]}>
                      {campaign.Status}
                    </Badge>
                  </CardAction>
                  <CardTitle className="line-clamp-1">
                    {campaign.Title}
                  </CardTitle>
                  <CardDescription>
                    {campaign.TotalInvestor} investor
                    {campaign.TotalInvestor === 1 ? "" : "s"} &middot;{" "}
                    {daysLeft > 0 ? `${daysLeft} days left` : "Ended"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Fund raised</p>
                      <p className="font-medium">
                        {formatIDR(campaign.FundingAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Min. investment</p>
                      <p className="font-medium">
                        {formatIDR(campaign.MinInvestment)}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {fundingProgress(campaign.FundingGoal, campaign.FundingAmount)}
                    % of {formatIDR(campaign.FundingGoal)} raised
                  </p>
                </CardContent>
                <CardFooter className="gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => router.push(`/campaign/${campaign.ID}`)}
                  >
                    {campaign.Status === "ACTIVE" ? "Invest now" : "View details"}
                  </Button>
                  <Button
                    variant="outline"
                    aria-label="Remove from watchlist"
                    disabled={removingId === campaign.ID}
                    onClick={() => handleRemove(campaign.ID)}
                  >
                    <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
