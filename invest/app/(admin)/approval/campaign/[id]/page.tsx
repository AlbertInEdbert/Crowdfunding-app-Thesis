"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Check,
  Download,
  FileText,
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
  Campaign,
  CampaignMedia,
  CampaignStatus,
  formatIDR,
  getCampaign,
  getCampaignMedia,
} from "@/lib/campaign";
import {
  Company,
  CompanyFile,
  CompanyStatus,
  getCompanyByCompanyId,
  getCompanyFiles,
} from "@/lib/company";
import { formatDate } from "@/lib/investment";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

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
  REJECTED : "destructive",
};

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

export default function ApprovalCampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const campaignId = Number(params.id);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [media, setMedia] = useState<CampaignMedia[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [companyFiles, setCompanyFiles] = useState<CompanyFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const campaignData = await getCampaign(campaignId);
        if (cancelled) return;
        setCampaign(campaignData);

        try {
          const mediaData = await getCampaignMedia(campaignId);
          if (!cancelled) setMedia(mediaData ?? []);
        } catch {
          
        }

        try {
          const companyData = await getCompanyByCompanyId(
            campaignData.CompanyID
          );
          if (cancelled) return;
          setCompany(companyData);
          const files = await getCompanyFiles(companyData.ID);
          if (!cancelled) setCompanyFiles(files ?? []);
        } catch {
          
        }
      } catch {
        if (!cancelled) setLoadError("Could not load this campaign.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  const handleApprove = useCallback(async () => {
    if (!campaign) return;
    setBusy(true);
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
      router.push("/approval");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Approve failed");
      setBusy(false);
    }
  }, [campaign, router]);

  const handleReject = useCallback(async () => {
    if (!campaign) return;
    setBusy(true);
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
      router.push("/approval");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Reject failed");
      setBusy(false);
    }
  }, [campaign, router]);

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
        <p className="py-8 text-center text-sm text-muted-foreground">
          Loading campaign…
        </p>
      </main>
    );
  }

  if (loadError || !campaign) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError ?? "Campaign not found."}
        </p>
        <Button variant="outline" asChild className="self-start">
          <Link href="/approval">Back to approvals</Link>
        </Button>
      </main>
    );
  }

  const equityOffered =
    campaign.Valuation > 0
      ? (campaign.FundingGoal / campaign.Valuation) * 100
      : 0;
  const images = media.filter(
    (m) => m.MediaCode === "COVER" || m.MediaCode === "GALLERY" || m.Category === "image"
  );
  const videos = media.filter((m) => m.MediaCode === "VIDEO" || m.Category === "video");
  const terms: { label: string; value: string }[] = [
    { label: "Pre-money valuation", value: formatIDR(campaign.Valuation) },
    { label: "Funding goal", value: formatIDR(campaign.FundingGoal) },
    { label: "Share price", value: formatIDR(campaign.SharePrice) },
    {
      label: "Equity offered",
      value:
        equityOffered > 0
          ? `${equityOffered.toFixed(2).replace(/\.?0+$/, "")}%`
          : "—",
    },
    { label: "Minimum investment", value: formatIDR(campaign.MinInvestment) },
    {
      label: "Offering period",
      value: `${formatDate(campaign.StartDate)} – ${formatDate(campaign.EndDate)}`,
    },
  ];

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
            <Link href="/approval/campaign">
              <ArrowLeft className="h-4 w-4" />
              Back to approvals
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {campaign.Title}
            </h1>
            <Badge variant={CAMPAIGN_STATUS_VARIANT[campaign.Status]}>
              {campaign.Status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Submitted {formatDate(campaign.CreatedAt)}
            {company ? ` by ${company.Name}` : ""}
          </p>
        </div>

        {campaign.Status === "DRAFT" && (
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
                  Approve and publish this campaign?
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
                  Reject and delete this campaign?
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
                {campaign.Description || "No description provided."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Media</CardTitle>
              <CardDescription>
                Cover, gallery, thumbnail, and video submitted with the
                campaign.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {media.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No media uploaded.
                </p>
              ) : (
                <>
                  {images.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {images.map((item) => (
                        <a
                          key={item.ID}
                          href={item.URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative aspect-video overflow-hidden rounded-md border bg-muted"
                        >
                          <img
                            src={item.URL}
                            alt={item.FileName}
                            className="h-full w-full object-cover transition group-hover:opacity-90"
                          />
                          {item.MediaCode && (
                            <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
                              {item.MediaCode}
                            </span>
                          )}
                        </a>
                      ))}
                    </div>
                  )}
                  {videos.map((item) => (
                    <video
                      key={item.ID}
                      src={item.URL}
                      controls
                      className="aspect-video w-full rounded-md border bg-black"
                    />
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Funding terms</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="flex flex-col gap-3 text-sm">
                {terms.map((term) => (
                  <div
                    key={term.label}
                    className="flex items-center justify-between gap-4"
                  >
                    <dt className="text-muted-foreground">{term.label}</dt>
                    <dd className="text-right font-medium">{term.value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <CardTitle>Company</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {company ? (
                <>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{company.Name}</p>
                    {company.Status && (
                      <Badge
                        variant={COMPANY_STATUS_VARIANT[company.Status]}
                      >
                        {company.Status}
                      </Badge>
                    )}
                  </div>
                  {company.Description && (
                    <p className="text-sm text-muted-foreground">
                      {company.Description}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Registered {formatDate(company.CreatedAt)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Company details unavailable.
                </p>
              )}

              <Separator />

              <div className="flex flex-col gap-2">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Legal documents
                </p>
                {companyFiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No documents uploaded.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {companyFiles.map((file) => (
                      <li
                        key={file.ID}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <span className="truncate text-muted-foreground">
                          {file.FileName}
                          <span className="ml-1 text-xs">
                            ({formatFileSize(file.Size)})
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
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
