"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Campaign,
  CampaignMedia,
  daysRemaining,
  formatIDR,
  fundingProgress,
  getCampaign,
  getCampaignMedia,
} from "@/lib/campaign";
import { createInvestment } from "@/lib/investment";
import {
  addToWatchlist,
  checkWatchlist,
  removeFromWatchlist,
} from "@/lib/watchlist";
import { getCurrentSession } from "@/lib/user";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ChevronRight, Download, FileText, Heart, Info, Play } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CommentTab } from "@/components/CommentTab";
import { OverviewTab } from "@/components/OverviewTab";
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item";
import { CompanyFile, getCompanyFiles, getFileUrl } from "@/lib/company";
import { Card, CardContent } from "@/components/ui/card";
import { ReviewTab } from "@/components/ReviewTab";
import { UpdatesTab } from "@/components/UpdatesTab";

function galleryImages(media: CampaignMedia[] | null): string[] {
  if (!media) return [];
  return media
    .map((m) => m.URL);
}

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const campaignId = Number(params.id);

  const [activeTab, setActiveTab] = useState<string>("overview");
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [legelFile,setLegelFile] = useState<CompanyFile[] | null>(null);
  const [campaignMedia, setCampaignMedia] = useState<CampaignMedia[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [shareCount, setShareCount] = useState(1);
  const [investing, setInvesting] = useState(false);
  const [investError, setInvestError] = useState<string | null>(null);
  const [watchlisted, setWatchlisted] = useState(false);
  const [watchlistBusy, setWatchlistBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await getCurrentSession().catch(() => null);
      if (!session || cancelled) return;
      try {
        const result = await checkWatchlist(campaignId);
        if (!cancelled) setWatchlisted(result);
      } catch {
        
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const campaignData = await getCampaign(campaignId);
        const companyLegalFiles = await getCompanyFiles(campaignData.CompanyID);
        
        if (!cancelled) {
          setCampaign(campaignData);
          setLegelFile(companyLegalFiles);
        }
          console.log(campaignData.CompanyID)
          console.log(campaignData)

      } catch {
        if (!cancelled) setLoadError("Could not load this campaign.");
      } finally {
        if (!cancelled) setLoading(false);
      }

      try {
        const data = await getCampaignMedia(campaignId);
        if (!cancelled) {
          setCampaignMedia(data);
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

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Loading campaign…</p>
      </main>
    );
  }

  if (loadError || !campaign) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4">
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError ?? "Campaign not found."}
        </p>
      </main>
    );
  }

  const images = galleryImages(campaignMedia);
  const progress = fundingProgress(campaign.FundingGoal,campaign.FundingAmount);
  const daysLeft = daysRemaining(campaign.EndDate);
  const minShares = Math.max(
    1,
    Math.ceil(campaign.MinInvestment / campaign.SharePrice)
  );
  const canInvest = campaign.Status === "ACTIVE" && daysLeft > 0;

  const handleDownload = async (item: CompanyFile) => {
    try {
      const url = await getFileUrl(item.ObjectKey);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch file: ${res.status}`);

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = item.FileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  const handleInvest = async () => {
    setInvesting(true);
    setInvestError(null);
    try {
      router.push(`/payment/${campaign.ID}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create investment.";
      if (message.includes("401") || message.toLowerCase().includes("unauthorized")) {
        router.push("/sign-in");
        return;
      }
      setInvestError(message);
      setInvesting(false);
    }
  };

  const handleToggleWatchlist = async () => {
    setWatchlistBusy(true);
    try {
      const session = await getCurrentSession().catch(() => null);
      if (!session) {
        router.push("/sign-in");
        return;
      }
      if (watchlisted) {
        await removeFromWatchlist(campaignId);
        setWatchlisted(false);
      } else {
        await addToWatchlist(campaignId);
        setWatchlisted(true);
      }
    } catch (err) {
      console.error("Watchlist toggle failed:", err);
    } finally {
      setWatchlistBusy(false);
    }
  };

  return (
    <main className="light mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex-col items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {campaign.Title}
          </h1>
        </div>
        <p>
          {campaign.Description}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-3">
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
            <img
              // src={images[selectedImage]}
              src={images[selectedImage]}
              alt={campaign.Title}
              className="h-full w-full object-cover"
            />
            {/* <button
              type="button"
              aria-label="Play video"
              className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-4 border-white/90 bg-black/20 text-white transition hover:bg-black/40"
            >
              <Play className="h-8 w-8 fill-current" />
              <span className="text-[10px] font-semibold tracking-widest">
                PLAY
              </span>
            </button> */}
            {/* <button
              type="button"
              aria-label="Next image"
              onClick={() =>
                setSelectedImage((i) => (i + 1) % images.length)
              }
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow transition hover:bg-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button> */}
          </div>

          {/* <div className="relative">
            <div className="flex gap-3 overflow-hidden">
              {images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setSelectedImage(i)}
                  className={cn(
                    "relative aspect-video w-24 shrink-0 overflow-hidden rounded-md sm:w-28",
                    i === selectedImage &&
                      "ring-2 ring-blue-600 ring-offset-2"
                  )}
                >
                  <img
                    src={src}
                    alt={`${campaign.Title} thumbnail ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                  {i === 0 && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="h-5 w-5 fill-white text-white" />
                    </span>
                  )}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-label="Scroll thumbnails"
              onClick={() =>
                setSelectedImage((i) => (i + 1) % images.length)
              }
              className="absolute -right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-700 shadow-md transition hover:bg-slate-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div> */}
        </div>

        <aside className="flex flex-col gap-5">
          <div>
            <p className="text-3xl font-bold tracking-tight">
              {formatIDR(campaign.FundingAmount)}
            </p>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              {progress}% raised of {formatIDR(campaign.FundingGoal)} min
              {/* <Info className="h-3.5 w-3.5" /> */}
            </p>
          </div>

          <Separator />

          <div>
            <p className="text-2xl font-semibold">{campaign.TotalInvestor}</p>
            <p className="text-sm text-muted-foreground">Investors</p>
          </div>

          <Separator />

          <div>
            <p className="text-2xl font-semibold">
              {daysLeft} {daysLeft === 1 ? "day" : "days"}
            </p>
            <p className="text-sm text-muted-foreground">Left to invest</p>
          </div>

          <div className="mt-2 flex flex-col items-stretch gap-2">
            {/* <div className="flex items-center gap-2">
              <Input
                type="number"
                min={minShares}
                value={shareCount}
                onChange={(e) => setShareCount(Number(e.target.value))}
                className="w-24"
                aria-label="Number of shares"
              />
              <span className="text-sm text-muted-foreground">
                shares &times; {formatIDR(campaign.SharePrice)} ={" "}
                {formatIDR(
                  Math.max(shareCount, minShares) * campaign.SharePrice
                )}
              </span>
            </div> */}
            <div className="flex items-stretch gap-2">
              <Button
                size="lg"
                className="flex-1 bg-blue-600 font-semibold hover:bg-blue-700"
                disabled={!canInvest || investing}
                onClick={handleInvest}
              >
                {investing ? "Processing…" : `Invest in ${campaign.Title}`}
              </Button>
              <Button
                size="lg"
                variant="outline"
                aria-label={watchlisted ? "Remove from watchlist" : "Add to watchlist"}
                aria-pressed={watchlisted}
                disabled={watchlistBusy}
                onClick={handleToggleWatchlist}
              >
                <Heart
                  className={cn(
                    "h-5 w-5",
                    watchlisted && "fill-red-500 text-red-500"
                  )}
                />
              </Button>
            </div>
            {investError && (
              <p className="text-center text-sm text-destructive">
                {investError}
              </p>
            )}
            <p className="text-center text-sm text-muted-foreground">
              {formatIDR(campaign.MinInvestment)} minimum investment
            </p>
          </div>
        </aside>
      </div>
      <Tabs defaultValue="overview" value={activeTab} onValueChange={(value) => setActiveTab(value)}>
        <TabsList variant="line">
          <TabsTrigger 
            value="overview"
            className="relative rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none focus-visible:ring-0 data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none "
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="review"
            className="relative rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none focus-visible:ring-0 data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none "
          >
            Review
          </TabsTrigger>
          <TabsTrigger 
            value="comment"
            className="relative rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none focus-visible:ring-0 data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none "
          >
            Comment
          </TabsTrigger>
          <TabsTrigger 
            value="updates"
            className="relative rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none focus-visible:ring-0 data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none "
          >
            Updates
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="flex flex-col">
        <div className="flex">
            {activeTab === "overview" && (
              <OverviewTab campaign={campaign} />
            )}
            {activeTab === "comment" && (
              <CommentTab campaignId={campaign.ID} companyId={campaign.CompanyID}/>
            )} : { activeTab === "review" &&
              <ReviewTab campaignId={campaign.ID} />
            }
            {activeTab === "updates" && (
              <UpdatesTab campaignId={campaign.ID} companyId={campaign.CompanyID} />
            )}
        <div>
        <div className="min-h-screen bg-white flex items-start justify-center p-6">
          <Card className="w-full max-w-sm rounded-2xl border-neutral-200 shadow-sm">
            <CardContent className="p-5">
              <h1 className="text-2xl font-semibold text-[#8a7a6c] mb-4">
                Documents
              </h1>

              {/* <p className="text-[13px] text-neutral-400 mb-1">
                Company documents
              </p> */}
              <ul>
                {(legelFile ?? []).map((item, i) => (
                  <li
                    key={item.ID}
                    className={
                      "flex items-center gap-3 py-3" +
                      (i !== (legelFile?.length ?? 0) - 1
                        ? " border-b border-neutral-100"
                        : "")
                    }
                  >
                    <FileText className="h-5 w-5 shrink-0 text-neutral-800" />
                    
                      <a href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleDownload(item);
                      }}
                      className="text-[15px] leading-snug text-blue-900 hover:underline"
                    >
                      {item.FileName}
                    </a>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
        </div>
        </div>
      </div>

    </main>
  );
}
