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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Company, CompanyListFilter, CompanyStatus, getCompanies, PaginatedCompanies, updateCompanyStatus } from "@/lib/company";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const STATUS_VARIANT: Record<
  CompanyStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  PENDING: "outline",
  ACTIVE: "default",
  SUSPENDED: "outline",
  REJECTED: "destructive",
  UPDATED: "secondary",
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

const PAGE_SIZE = 5;

const PendingFilter: CompanyListFilter = {
  status: 'PENDING',
};

const UpdateFilter: CompanyListFilter = {
  status: 'UPDATED',
};

export default function ApprovalPage() {
  const [newCompanies, setNewCompanies] = useState<PaginatedCompanies>();
  const [updatedCompanies, setUpdatedCompanies] = useState<PaginatedCompanies>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [newCompanyPage, setNewCompanyPage] = useState(1)

  const totalNewPages = Math.max(
    1,
    Math.ceil((newCompanies?.total ?? 1) / PAGE_SIZE)
  );
  // const totalUpdatePages = Math.max(
  //   1,
  //   Math.ceil((newCompanies?.total ?? 1) / PAGE_SIZE)
  // );
  const pages = useMemo(
    () => getPageNumbers(newCompanyPage, totalNewPages),
    [newCompanyPage, totalNewPages]
  );

  // const totalNewCompanyPages = Math.max(
  //   1,
  //   Math.ceil((userProfile?.TxCounter ?? 1) / PAGE_SIZE)
  // );
  // const totalUpdatedCompanyPages = Math.max(
  //   1,
  //   Math.ceil((userProfile?.TxCounter ?? 1) / PAGE_SIZE)
  // );

  const load = useCallback(
    async (pendingFilter: CompanyListFilter, updatedFilter: CompanyListFilter) => {
      setLoading(true);
      setLoadError(null);
      try {
        const dataNewCompany = await getCompanies(PAGE_SIZE, (newCompanyPage - 1) * PAGE_SIZE, pendingFilter);
        const dataUpdateCompany = await getCompanies(PAGE_SIZE, 0, updatedFilter);
        setNewCompanies(dataNewCompany);
        setUpdatedCompanies(dataUpdateCompany);
      } catch {
        setLoadError("Could not load companies. Make sure the backend is running on port 8080.");
      } finally {
        setLoading(false);
      }
    },[newCompanyPage]);

  useEffect(() => {
    load(PendingFilter, UpdateFilter);
  }, [load]);

  // const pending = useMemo(
  //   () => newc.filter((c) => c.Status === "PENDING"),
  //   [companies]
  // );

  // const updated = useMemo(
  //   () => companies.filter((c) => c.Status === "UPDATED"),
  //   [companies]
  // );

  const handleApprove = useCallback(
    async (company: Company) => {
      setBusyId(company.ID);
      setActionError(null);
      try {
        await updateCompanyStatus(company.ID,'ACTIVE')
        await load(PendingFilter, UpdateFilter)
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
    async (companies: Company) => {
      // if (!window.confirm(`Reject and delete "${companies.Name}"?`)) return;
      setBusyId(companies.ID);
      setActionError(null);
      try{
        await updateCompanyStatus(companies.ID,'REJECTED')
        await load(PendingFilter, UpdateFilter)
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

  const columns = useMemo<ColumnDef<Company>[]>(
    () => [
      {
        accessorKey: "Name",
        header: "Name",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.Name}</span>
        ),
      },
      {
        accessorKey: "Description",
        header: "Description",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.Description}</span>
        ),
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
          const company = row.original;
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
                      disabled={busyId === company.ID}
                      onClick={() => handleApprove(company)}
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
                      disabled={busyId === company.ID}
                      onClick={() => handleReject(company)}
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

  const tableNewCompany = useReactTable({
    data : newCompanies?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

    const tableUpdateCompany = useReactTable({
    data : updatedCompanies?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Approval</h1>
        <p className="text-sm text-muted-foreground">
          Review and approve pending company.
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
            Pending New Company
            {!!newCompanies?.total && newCompanies.total > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({newCompanies?.total})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading companies…
            </p>
          ) : loadError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {loadError}
            </p>
          ) : newCompanies?.total === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No campanies waiting for approval.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  {tableNewCompany.getHeaderGroups().map((headerGroup) => (
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
                  {tableNewCompany.getRowModel().rows.map((row) => (
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
              setNewCompanyPage((p) => Math.max(1, p - 1))
            }}
            className={newCompanyPage === 1 ? "pointer-events-none opacity-50" : undefined}
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
                isActive={p === newCompanyPage}
                onClick={(e) => {
                  e.preventDefault()
                  setNewCompanyPage(p)
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
              setNewCompanyPage((p) => Math.min(totalNewPages, p + 1))
            }}
            className={
              newCompanyPage === totalNewPages ? "pointer-events-none opacity-50" : undefined
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
      
      {/* <Card>
        <CardHeader>
          <CardTitle>
            Requested Update Company
            {!!updatedCompanies?.total && updatedCompanies?.total > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({updatedCompanies.total})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading companies…
            </p>
          ) : loadError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {loadError}
            </p>
          ) : updatedCompanies?.total === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No campanies waiting for approval.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  {tableUpdateCompany.getHeaderGroups().map((headerGroup) => (
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
                <TableBody>
                  {tableUpdateCompany.getRowModel().rows.map((row) => (
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
      </Card> */}
    </main>
  );
}
