"use client";

import { CampaignCard } from "@/components/share/CampaignCard";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Campaign, CampaignSummary, getCampaigns, getCampaignsAndCover, PaginatedCampaigns, PaginatedCampaignSummary } from "@/lib/campaign";
import { Category, getCategory } from "@/lib/category";
import { ChevronDown, Search } from "lucide-react";
import { useEffect, useState } from "react";

const STATUSES = ["DRAFT", "ACTIVE", "FUNDED", "COMPLETED", "FAILED", "REJECTED"];

export default function CampaignPage() {
  const [query, setQuery] = useState("");
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>();
  const [campaignCount, setCampaignCount] = useState<number>(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currCategory, setCurrCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<string | null>("ACTIVE");
  
  useEffect(() => {
    let cancelled = false;
    getCategory()
      .then((data) => {
        if (!cancelled) setCategories(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    const timer = setTimeout(async () => {
      try {
        const data = await getCampaignsAndCover(9, 0, {
          search: query,
          status: status ?? undefined,
          category: currCategory ?? undefined,
        });
        console.log("total : " + data.total)
        console.log("total : " + data.data)
        if (!cancelled){
          setCampaignCount(data.total)
          setCampaigns(data.data)
        } 
          
      } catch {
        if (!cancelled) setLoadError("Could not load data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, status, currCategory]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex gap-3 sm:flex-row sm:items-center">
        <div className="relative flex w-full items-center">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search campaigns…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9" />
          </div>
        <div className="flex">
          <div className="m-5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="justify-between">
              <button className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 min-w-36">
                {currCategory ?? "Category"}
                <ChevronDown className="h-4 w-4 text-slate-500" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setCurrCategory(null)}>
                All
              </DropdownMenuItem>
              {categories.map((item) => (
                <DropdownMenuItem key={item.CategoryID} onClick={() => setCurrCategory(item.Name)}>
                  {item.Name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
          <div className="m-5">
          {/* <DropdownMenu>
            <DropdownMenuTrigger asChild className="justify-between">
              <button className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 min-w-36">
                {status ?? "Status"}
                <ChevronDown className="h-4 w-4 text-slate-500" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setStatus(null)}>
                All
              </DropdownMenuItem>
              {STATUSES.map((item) => (
                <DropdownMenuItem key={item} onClick={() => setStatus(item)}>
                  {item}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu> */}
          </div>
    
        </div>    
        </div>

        {/* <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Sector" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select> */}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1 center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Investment Campaigns 
          </h1>
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({campaignCount})
          </span>
        </div>

        <p className="text-sm text-muted-foreground">
          Browse active fundraising campaigns and invest directly.
        </p>
      </div>

      {loading ? (
        <p className="rounded-md border px-4 py-8 text-center text-sm text-muted-foreground">
          Loading campaigns…
        </p>
      ) : loadError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </p>
      ) : campaignCount === 0 ? (
        <p className="rounded-md border px-4 py-8 text-center text-sm text-muted-foreground">
          No campaigns match your search.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns?.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign}/>
          ))}
        </div>
      )}
    </main>
  );
}