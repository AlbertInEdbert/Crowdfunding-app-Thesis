"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"; 
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
import {
  Campaign,
  CampaignStatus,
  formatIDR,
  getCampaigns,
} from "@/lib/campaign";
import { formatDate } from "@/lib/investment";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const STATUS_VARIANT: Record<
  CampaignStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  DRAFT: "outline",
  ACTIVE: "default",
  FUNDED: "secondary",
  COMPLETED: "outline",
  FAILED: "destructive",
};

export default function ApprovalPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
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

  const pending = useMemo(
    () => campaigns.filter((c) => c.Status === "DRAFT"),
    [campaigns]
  );

  const handleApprove = useCallback(
    async (campaign: Campaign) => {
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
        setActionError(
          err instanceof Error ? err.message : "Approve failed"
        );
      } finally {
        setBusyId(null);
      }
    },
    [load]
  );

  const handleReject = useCallback(
    async (campaign: Campaign) => {
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
        setActionError(
          err instanceof Error ? err.message : "Reject failed"
        );
      } finally {
        setBusyId(null);
      }
    },
    [load]
  );

  const columns = useMemo<ColumnDef<Campaign>[]>(
    () => [
      {
        accessorKey: "Title",
        header: "Title",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.Title}</span>
        ),
      },
      {
        accessorKey: "FundingGoal",
        header: "Funding goal",
        cell: ({ row }) => formatIDR(row.original.FundingGoal),
      },
      {
        accessorKey: "SharePrice",
        header: "Share price",
        cell: ({ row }) => formatIDR(row.original.SharePrice),
      },
      {
        accessorKey: "MinInvestment",
        header: "Min. investment",
        cell: ({ row }) => formatIDR(row.original.MinInvestment),
      },
      {
        accessorKey: "EndDate",
        header: "Ends",
        cell: ({ row }) => formatDate(row.original.EndDate),
      },
      {
        accessorKey: "Status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={STATUS_VARIANT[row.original.Status]}>
            {row.original.Status}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const campaign = row.original;
          return (
            <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Check className="h-4 w-4" />
                      Approve
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-40">
                    <p className="text-sm mb-2">Confirm approval?</p>
                    <Button
                      size="sm"
                      disabled={busyId === campaign.ID}
                      onClick={() => handleApprove(campaign)}
                    >
                      Approve
                    </Button>
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Check className="h-4 w-4" />
                      <X className="h-4 w-4" />
                      Reject
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-40">
                    <p className="text-sm mb-2">Confirm approval?</p>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busyId === campaign.ID}
                      onClick={() => handleReject(campaign)}
                    >
                      Reject
                    </Button>
                  </PopoverContent>
                </Popover>
            </div>
          );
        },
      },
    ],
    [busyId, handleApprove, handleReject]
  );

  const table = useReactTable({
    data: pending,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Approval</h1>
        <p className="text-sm text-muted-foreground">
          Review and approve pending campaigns.
        </p>
      </div>

      {actionError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {actionError}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            Pending campaigns
            {pending.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({pending.length})
              </span>
            )}
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
          ) : pending.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No campaigns waiting for approval.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                {/* <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell colSpan={row.getVisibleCells().length} className="p-0">
                        <Accordion type="single" collapsible>
                          <AccordionItem value={row.id} className="border-b-0">
                            <AccordionTrigger className="px-4">
                              <div className="grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] w-full gap-2">
                                {row.getVisibleCells().map((cell) => (
                                  <span key={cell.id}>
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                  </span>
                                ))}
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4">
                              <p>asdasd</p>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody> */}
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
