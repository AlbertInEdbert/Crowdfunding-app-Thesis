"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";

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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Campaign,
  CampaignStatus,
  formatIDR,
  getCampaigns,
} from "@/lib/campaign";
import { formatDate } from "@/lib/investment";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

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

type Filter = "PENDING" | "ALL";

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filter, setFilter] = useState<Filter>("PENDING");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getCampaigns(100, 0);
      setCampaigns(data ?? []);
    } catch {
      setLoadError(
        "Could not load campaigns. Make sure the backend is running on port 8080."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(
    () =>
      filter === "PENDING"
        ? campaigns.filter((c) => c.Status === "DRAFT")
        : campaigns,
    [campaigns, filter]
  );

  const pendingCount = useMemo(
    () => campaigns.filter((c) => c.Status === "DRAFT").length,
    [campaigns]
  );

  async function handleApprove(campaign: Campaign) {
    setBusyId(campaign.ID);
    setActionError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/campaign/${campaign.ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...campaign, Status: "ACTIVE" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Approve failed: ${res.status}`);
      }
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(campaign: Campaign) {
    if (!window.confirm(`Reject and delete "${campaign.Title}"?`)) return;
    setBusyId(campaign.ID);
    setActionError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/campaign/${campaign.ID}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Reject failed: ${res.status}`);
      }
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Campaign Approval
        </h1>
        <p className="text-sm text-muted-foreground">
          Review submitted campaigns and approve or reject them.
        </p>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList>
          <TabsTrigger value="PENDING">
            Pending ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="ALL">All campaigns</TabsTrigger>
        </TabsList>
      </Tabs>

      {actionError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {actionError}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {filter === "PENDING" ? "Campaigns awaiting approval" : "All campaigns"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading campaigns…
            </p>
          ) : loadError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {loadError}
            </p>
          ) : visible.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {filter === "PENDING"
                ? "No campaigns waiting for approval."
                : "No campaigns found."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Funding goal</TableHead>
                  <TableHead>Share price</TableHead>
                  <TableHead>Min. investment</TableHead>
                  <TableHead>Ends</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((campaign) => (
                  <TableRow key={campaign.ID}>
                    <TableCell className="font-medium">
                      {campaign.Title}
                    </TableCell>
                    <TableCell>{formatIDR(campaign.FundingGoal)}</TableCell>
                    <TableCell>{formatIDR(campaign.SharePrice)}</TableCell>
                    <TableCell>{formatIDR(campaign.MinInvestment)}</TableCell>
                    <TableCell>{formatDate(campaign.EndDate)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[campaign.Status]}>
                        {campaign.Status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {campaign.Status === "DRAFT" && (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            disabled={busyId === campaign.ID}
                            onClick={() => handleApprove(campaign)}
                          >
                            <Check className="h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={busyId === campaign.ID}
                            onClick={() => handleReject(campaign)}
                          >
                            <X className="h-4 w-4" />
                            Reject
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
    </main>
  );
}
