"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  Download,
  FileText,
  User,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Company,
  CompanyFile,
  CompanyStatus,
  getCompanyByCompanyId,
  getCompanyFiles,
  updateCompanyStatus,
} from "@/lib/company";
import { getUserProfile, UserProfile } from "@/lib/user";
import { formatDate } from "@/lib/investment";

const COMPANY_STATUS_VARIANT: Record<
  CompanyStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  PENDING: "secondary",
  ACTIVE: "default",
  REJECTED: "destructive",
  SUSPENDED: "outline",
  UPDATED: "outline",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ApprovalCompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const companyId = Number(params.id);

  const [company, setCompany] = useState<Company | null>(null);
  const [owner, setOwner] = useState<UserProfile | null>(null);
  const [files, setFiles] = useState<CompanyFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const companyData = await getCompanyByCompanyId(companyId);
        if (cancelled) return;
        setCompany(companyData);

        try {
          const fileData = await getCompanyFiles(companyData.ID);
          if (!cancelled) setFiles(fileData ?? []);
        } catch {
        }

        try {
          const ownerData = await getUserProfile(companyData.UserID);
          if (!cancelled) setOwner(ownerData);
        } catch {
        }
      } catch {
        if (!cancelled) setLoadError("Could not load this company.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const handleApprove = useCallback(async () => {
    if (!company) return;
    setBusy(true);
    setActionError(null);
    try {
      await updateCompanyStatus(company.ID, "ACTIVE");
      router.push("/approval/company");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Approve failed");
      setBusy(false);
    }
  }, [company, router]);

  const handleReject = useCallback(async () => {
    if (!company) return;
    setBusy(true);
    setActionError(null);
    try {
      await updateCompanyStatus(company.ID, "REJECTED");
      router.push("/approval/company");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Reject failed");
      setBusy(false);
    }
  }, [company, router]);

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
        <p className="py-8 text-center text-sm text-muted-foreground">
          Loading company…
        </p>
      </main>
    );
  }

  if (loadError || !company) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError ?? "Company not found."}
        </p>
        <Button variant="outline" asChild className="self-start">
          <Link href="/approval/company">Back to approvals</Link>
        </Button>
      </main>
    );
  }

  const reviewable = company.Status === "PENDING" || company.Status === "UPDATED";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="-ml-2 self-start"
          >
            <Link href="/approval/company">
              <ArrowLeft className="h-4 w-4" />
              Back to approvals
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {company.Name}
            </h1>
            <Badge variant={COMPANY_STATUS_VARIANT[company.Status]}>
              {company.Status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Registered {formatDate(company.CreatedAt)}
            {owner ? ` by ${owner.Name}` : ""}
          </p>
        </div>

        {reviewable && (
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button disabled={busy}>
                  <Check className="h-4 w-4" />
                  Approve
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-48">
                <p className="mb-2 text-sm">
                  Approve and activate this company?
                </p>
                <Button size="sm" disabled={busy} onClick={handleApprove}>
                  Confirm approve
                </Button>
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="destructive" disabled={busy}>
                  <X className="h-4 w-4" />
                  Reject
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-48">
                <p className="mb-2 text-sm">
                  Reject this company?
                </p>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busy}
                  onClick={handleReject}
                >
                  Confirm reject
                </Button>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {actionError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {actionError}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {company.Description || "No description provided."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Legal documents</CardTitle>
              <CardDescription>
                AKTA, SK, NIB, and NPWP submitted with the registration.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {files.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No documents uploaded.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {files.map((file) => (
                    <li
                      key={file.ID}
                      className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        {file.MediaCode && (
                          <Badge variant="outline" className="uppercase">
                            {file.MediaCode}
                          </Badge>
                        )}
                        <span className="truncate text-muted-foreground">
                          {file.FileName}
                          <span className="ml-1 text-xs">
                            ({formatFileSize(file.Size)})
                          </span>
                        </span>
                      </span>
                      {file.URL && (
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={file.URL}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="h-3.5 w-3.5" />
                            View
                          </a>
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <CardTitle>Owner</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {owner ? (
                <>
                  <p className="font-medium">{owner.Name}</p>
                  <dl className="flex flex-col gap-2 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground">Email</dt>
                      <dd className="text-right font-medium">{owner.Email}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground">Phone</dt>
                      <dd className="text-right font-medium">
                        {owner.PhoneNumber || "—"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground">Joined</dt>
                      <dd className="text-right font-medium">
                        {formatDate(owner.CreatedAt)}
                      </dd>
                    </div>
                  </dl>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Owner details unavailable.
                </p>
              )}

              <Separator />

              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Company ID</dt>
                  <dd className="text-right font-medium">{company.ID}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Category</dt>
                  <dd className="text-right font-medium">
                    {company.CategoryID || "—"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Last updated</dt>
                  <dd className="text-right font-medium">
                    {formatDate(company.UpdatedAt)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
