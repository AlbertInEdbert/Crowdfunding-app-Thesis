"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import Link from "next/link";
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
  CampaignListFilter,
  CampaignStatus,
  formatIDR,
  getCampaigns,
  PaginatedCampaigns,
  updateCampaignStatus,
} from "@/lib/campaign";
import { formatDate } from "@/lib/investment";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

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

const PAGE_SIZE = 10;

const PendingFilter: CampaignListFilter = {
  status: 'DRAFT',
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

export default function ApprovalPage() {
  const [campaigns, setCampaigns] = useState<PaginatedCampaigns>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [draftCampaignPage, setDraftCampaignPage] = useState(1)

  const totalDraftPages = Math.max(
    1,
    Math.ceil((campaigns?.total ?? 1) / PAGE_SIZE)
  );

  const pages = useMemo(
    () => getPageNumbers(draftCampaignPage, totalDraftPages),
    [draftCampaignPage, totalDraftPages]
  );

  const load = useCallback(
    async (pendingFilter: CampaignListFilter) => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getCampaigns(PAGE_SIZE, (draftCampaignPage - 1) * PAGE_SIZE,pendingFilter ?? undefined);
      setCampaigns(data ?? []);
    } catch {
      setLoadError(
        "Could not load campaigns. Make sure the backend is running on port 8080."
      );
    } finally {
      setLoading(false);
    }
  },[draftCampaignPage]);

  useEffect(() => {
    load(PendingFilter);
  }, [load]);

  const handleApprove = useCallback(
    async (campaign: Campaign) => {
      setBusyId(campaign.ID);
      setActionError(null);
      try {
        await updateCampaignStatus(campaign.ID,"PENDING")
        await load(PendingFilter);
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
      setBusyId(campaign.ID);
      setActionError(null);
      
      try {
        await updateCampaignStatus(campaign.ID,"REJECTED")
        await load(PendingFilter);
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
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/approval/campaign/${campaign.ID}`}>
                    Review
                  </Link>
                </Button>
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
    // data: pending,
    data : campaigns?.data ?? [],
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
            {!!campaigns?.total && campaigns.total > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({campaigns?.total})
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
          ) : campaigns?.total === 0 ? (
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
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    setDraftCampaignPage((p) => Math.max(1, p - 1))
                  }}
                  className={draftCampaignPage === 1 ? "pointer-events-none opacity-50" : undefined}
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
                      isActive={p === draftCampaignPage}
                      onClick={(e) => {
                        e.preventDefault()
                        setDraftCampaignPage(p)
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
                    setDraftCampaignPage((p) => Math.min(totalDraftPages, p + 1))
                  }}
                  className={
                    draftCampaignPage === totalDraftPages ? "pointer-events-none opacity-50" : undefined
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
    </main>
  );
}
