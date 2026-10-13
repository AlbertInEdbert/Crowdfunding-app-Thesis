"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Building2,
  CalendarDays,
  Download,
  Eye,
  FileText,
  Pencil,
  Plus,
  SquarePen,
  X,
} from "lucide-react";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Category, getCategory } from "@/lib/category";
import {
  Campaign,
  CampaignStatus,
  formatIDR,
  fundingProgress,
  getCampaignsByCompany,
} from "@/lib/campaign";
import {
  Company,
  CompanyFile,
  CompanyStatus,
  getCompanyByUserId,
  getCompanyFiles,
} from "@/lib/company";
import { formatDate } from "@/lib/investment";
import { getCurrentSession } from "@/lib/user";
import { Input } from "@/components/ui/input";

const COMPANY_STATUS_VARIANT: Record<
  CompanyStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  PENDING: "secondary",
  ACTIVE: "default",
  REJECTED: "destructive",
  SUSPENDED: "outline",
  UPDATED : "secondary",
};

const CAMPAIGN_STATUS_VARIANT: Record<
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CompanyPage() {
  const [company, setCompany] = useState<Company | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [files, setFiles] = useState<CompanyFile[]>([]);
  const [pendingEdits, setPendingEdits] = useState<
    Record<number, { file: File; url: string }>
  >({});
  const [unauthenticated, setUnauthenticated] = useState(false);
  const [hasCompany, setHasCompany] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const session = await getCurrentSession();
        if (!session) {
          if (!cancelled) setUnauthenticated(true);
          return;
        }

        let data: Company;
        try {
          data = await getCompanyByUserId(session.UserID);
        } catch {
          return;
        }
        if (cancelled) return;
        setCompany(data);
        setHasCompany(true);

        try {
          const cats = await getCategory(100, 0);
          if (!cancelled) {
            setCategory(
              (cats ?? []).find((c) => c.CategoryID === data.CategoryID) ?? null
            );
          }
        } catch {
          
        }

        try {
          const list = await getCampaignsByCompany(10,0,data.ID);
          if (!cancelled) setCampaigns(list);
        } catch {
          
        }

        try {
          const docs = await getCompanyFiles(data.ID);
          if (!cancelled) setFiles(docs ?? []);
        } catch {
          
        }
      } catch {
        if (!cancelled) {
          setLoadError(
            "Could not reach the backend. Make sure it is running on port 8080."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const pendingEditsRef = useRef(pendingEdits);
  pendingEditsRef.current = pendingEdits;

  useEffect(() => {
    return () => {
      Object.values(pendingEditsRef.current).forEach((entry) =>
        URL.revokeObjectURL(entry.url)
      );
    };
  }, []);

  function stageEdit(fileId: number, e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    e.target.value = "";
    if (!selected) return;
    setPendingEdits((prev) => {
      const current = prev[fileId];
      if (current) URL.revokeObjectURL(current.url);
      return { ...prev, [fileId]: { file: selected, url: URL.createObjectURL(selected) } };
    });
  }

  function viewPendingEdit(fileId: number) {
    const pending = pendingEdits[fileId];
    if (!pending) return;
    window.open(pending.url, "_blank", "noopener,noreferrer");
  }

  function clearPendingEdit(fileId: number) {
    setPendingEdits((prev) => {
      const current = prev[fileId];
      if (current) URL.revokeObjectURL(current.url);
      const next = { ...prev };
      delete next[fileId];
      return next;
    });
  }

  if (unauthenticated) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 sm:px-6">
        <p className="text-sm text-muted-foreground">
          You need to sign in to manage your company.
        </p>
        <Button asChild>
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
        <p className="py-8 text-center text-sm text-muted-foreground">
          Loading…
        </p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </p>
      </main>
    );
  }

  if (!hasCompany || !company) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 sm:px-6">
        <Building2 className="h-10 w-10 text-muted-foreground" />
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            No company yet
          </h1>
          <p className="text-sm text-muted-foreground">
            Register your company before you can create a campaign.
          </p>
        </div>
        <Button asChild>
          <Link href="/company/create">Register company</Link>
        </Button>
      </main>
    );
  }

  const activeCampaigns = campaigns.filter((c) => c.Status === "ACTIVE");
  const totalRaised = campaigns.reduce((sum, c) => sum + c.FundingAmount, 0);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-muted">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-2xl">{company.Name}</CardTitle>
                {company.Status && (
                  <Badge variant={COMPANY_STATUS_VARIANT[company.Status]}>
                    {company.Status}
                  </Badge>
                )}
              </div>
              <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {category && <span>{category.Name}</span>}
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Registered since {formatDate(company.CreatedAt)}
                </span>
              </CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/company/edit">
              <Pencil className="h-4 w-4" />
              Edit profile
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {company.Description && (
            <p className="text-sm text-muted-foreground">
              {company.Description}
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-md border p-4">
              <p className="text-sm text-muted-foreground">Campaigns</p>
              <p className="text-xl font-semibold">{campaigns.length}</p>
            </div>
            <div className="rounded-md border p-4">
              <p className="text-sm text-muted-foreground">Active campaigns</p>
              <p className="text-xl font-semibold">{activeCampaigns.length}</p>
            </div>
            <div className="rounded-md border p-4">
              <p className="text-sm text-muted-foreground">Total raised</p>
              <p className="text-xl font-semibold">{formatIDR(totalRaised)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Campaigns</CardTitle>
            <CardDescription>
              Campaigns run by {company.Name}
            </CardDescription>
          </div>
            {company.Status === "ACTIVE" ? (
              <Button size="sm" asChild>
                <Link href="/campaign/new">
                  <Plus className="h-4 w-4" />
                  New campaign
                </Link>
              </Button>
            ) : (
              <Button size="sm" disabled>
                <Plus className="h-4 w-4" />
                New campaign
              </Button>
            )}
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No campaigns yet. Create your first one to start raising funds.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Raised</TableHead>
                    <TableHead>Goal</TableHead>
                    {/* <TableHead>Progress</TableHead> */}
                    <TableHead>Ends</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.ID}>
                      <TableCell className="font-medium">
                        {campaign.Title}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={CAMPAIGN_STATUS_VARIANT[campaign.Status]}
                        >
                          {campaign.Status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatIDR(campaign.FundingAmount)}</TableCell>
                      <TableCell>{formatIDR(campaign.FundingGoal)}</TableCell>
                      {/* <TableCell>{fundingProgress(campaign)}%</TableCell> */}
                      <TableCell>{formatDate(campaign.EndDate)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {campaign.Status === "DRAFT" && (
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/campaign/${campaign.ID}/edit`}>
                                Edit
                              </Link>
                            </Button>
                          )}
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/campaign/${campaign.ID}`}>View</Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>
            Legal documents uploaded during registration
          </CardDescription>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No documents uploaded.
            </p>
          ) : (
            <ul className="flex flex-col divide-y rounded-md border">
              {files.map((file) => (
                <li
                  key={file.ID}
                  className="flex-col"
                >
                  <div className="px-4 pt-2 pb-1 ">
                    <p>{file.MediaCode}</p>
                  </div>
                  <div className="flex items-center justify-between gap-4 px-4 pb-3 pt-1">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex flex-col overflow-hidden">
                        <span className="truncate text-sm font-medium">
                          {file.FileName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {file.Category} &middot; {formatFileSize(file.Size)}{" "}
                          &middot; {formatDate(file.CreatedAt)}
                        </span>
                        {pendingEdits[file.ID] && (
                          <span className="truncate text-xs text-amber-600">
                            Pending replacement:{" "}
                            {pendingEdits[file.ID].file.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      {pendingEdits[file.ID] && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => viewPendingEdit(file.ID)}
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            onClick={() => clearPendingEdit(file.ID)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button variant="outline" size="sm" asChild>
                        <label
                          htmlFor={`doc-edit-${file.ID}`}
                          className="cursor-pointer"
                        >
                          <SquarePen className="h-4 w-4" />
                          Edit
                          <input
                            id={`doc-edit-${file.ID}`}
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            className="hidden"
                            onChange={(e) => stageEdit(file.ID, e)}
                          />
                        </label>
                      </Button>
                      {file.URL && (
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={file.URL}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>

                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
