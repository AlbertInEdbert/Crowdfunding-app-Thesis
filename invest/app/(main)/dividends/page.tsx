"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Clock, Info, Receipt, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatIDR } from "@/lib/campaign";
import { formatDate } from "@/lib/investment";

type DividendStatus = "PAID" | "PROCESSING" | "PENDING" | "FAILED";
type StatusFilter = "ALL" | DividendStatus;

interface DividendRecord {
  id: number;
  campaignId: number;
  campaignTitle: string;
  companyName: string;
  shares: number;
  amount: number;
  status: DividendStatus;
  paymentDate: string | null;
  reference: string | null;
}

const DIVIDEND_HISTORY: DividendRecord[] = [
  {
    id: 1,
    campaignId: 2,
    campaignTitle: "Solar Powered Cold Storage",
    companyName: "PT Sinar Pangan Indonesia",
    shares: 75,
    amount: 425000,
    status: "PROCESSING",
    paymentDate: "2026-02-21T08:00:00Z",
    reference: "SIM-DIV-000106",
  },
  {
    id: 2,
    campaignId: 1,
    campaignTitle: "Sustainable Coffee Expansion",
    companyName: "PT Kopi Nusantara",
    shares: 120,
    amount: 600000,
    status: "PENDING",
    paymentDate: null,
    reference: null,
  },
  {
    id: 3,
    campaignId: 1,
    campaignTitle: "Sustainable Coffee Expansion",
    companyName: "PT Kopi Nusantara",
    shares: 120,
    amount: 750000,
    status: "PAID",
    paymentDate: "2026-02-18T08:00:00Z",
    reference: "SIM-DIV-000104",
  },
  {
    id: 4,
    campaignId: 3,
    campaignTitle: "Artisan Bakery Growth",
    companyName: "PT Roti Bahagia",
    shares: 40,
    amount: 180000,
    status: "FAILED",
    paymentDate: null,
    reference: "SIM-DIV-000103",
  },
  {
    id: 5,
    campaignId: 2,
    campaignTitle: "Solar Powered Cold Storage",
    companyName: "PT Sinar Pangan Indonesia",
    shares: 75,
    amount: 350000,
    status: "PAID",
    paymentDate: "2025-11-12T08:00:00Z",
    reference: "SIM-DIV-000098",
  },
  {
    id: 6,
    campaignId: 4,
    campaignTitle: "Reusable Packaging Production",
    companyName: "PT Kemasan Lestari",
    shares: 200,
    amount: 900000,
    status: "PAID",
    paymentDate: "2025-08-05T08:00:00Z",
    reference: "SIM-DIV-000087",
  },
];

const STATUS_VARIANT: Record<
  DividendStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  PAID: "default",
  PROCESSING: "secondary",
  PENDING: "outline",
  FAILED: "destructive",
};

const STATUS_LABEL: Record<DividendStatus, string> = {
  PAID: "Paid",
  PROCESSING: "Processing",
  PENDING: "Pending",
  FAILED: "Failed",
};

export default function DividendHistoryPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const filteredDividends = useMemo(
    () =>
      statusFilter === "ALL"
        ? DIVIDEND_HISTORY
        : DIVIDEND_HISTORY.filter(
            (dividend) => dividend.status === statusFilter
          ),
    [statusFilter]
  );

  const totalReceived = DIVIDEND_HISTORY.filter(
    (dividend) => dividend.status === "PAID"
  ).reduce((sum, dividend) => sum + dividend.amount, 0);

  const totalPending = DIVIDEND_HISTORY.filter(
    (dividend) =>
      dividend.status === "PENDING" || dividend.status === "PROCESSING"
  ).reduce((sum, dividend) => sum + dividend.amount, 0);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            Dividend history
          </h1>
          <Badge variant="outline">UI preview</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Track dividend distributions and simulated bank payouts from your
          investments.
        </p>
      </div>

      <div
        role="note"
        className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900"
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <span className="font-medium">Simulation only.</span> This page uses
          sample data for the interface preview. No real money has been
          transferred.
        </p>
      </div>

      <section
        aria-label="Dividend summary"
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <SummaryCard
          icon={Wallet}
          label="Total received"
          value={formatIDR(totalReceived)}
        />
        <SummaryCard
          icon={Clock}
          label="Pending / processing"
          value={formatIDR(totalPending)}
        />
        <SummaryCard
          icon={Receipt}
          label="Total distributions"
          value={String(DIVIDEND_HISTORY.length)}
        />
      </section>

      <Card>
        <CardHeader className="gap-4 sm:flex sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Payment history</CardTitle>
            <CardDescription>
              {filteredDividends.length} of {DIVIDEND_HISTORY.length} simulated
              distributions
            </CardDescription>
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          >
            <SelectTrigger
              aria-label="Filter dividend status"
              className="w-full sm:w-44"
            >
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="PROCESSING">Processing</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {filteredDividends.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                No dividend records match this status.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatusFilter("ALL")}
              >
                Clear filter
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Shares</TableHead>
                  <TableHead>Payment date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Bank reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDividends.map((dividend) => (
                  <TableRow key={dividend.id}>
                    <TableCell className="min-w-56 whitespace-normal">
                      <Link
                        href={`/campaign/${dividend.campaignId}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {dividend.campaignTitle}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {dividend.companyName}
                      </p>
                    </TableCell>
                    <TableCell>
                      {dividend.shares.toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell>{formatDate(dividend.paymentDate)}</TableCell>
                    <TableCell className="font-semibold">
                      {formatIDR(dividend.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[dividend.status]}>
                        {STATUS_LABEL[dividend.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {dividend.reference ?? "—"}
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

function SummaryCard({
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
