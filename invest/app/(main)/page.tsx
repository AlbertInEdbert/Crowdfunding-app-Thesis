"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  LineChart,
  SearchCheck,
  ShieldCheck,
  TriangleAlert,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { CampaignCard } from "@/components/share/CampaignCard";
import { Campaign, CampaignSummary, formatIDR, getCampaigns, getCampaignsAndCover } from "@/lib/campaign";

const INVESTOR_STEPS = [
  {
    icon: SearchCheck,
    title: "Explore campaigns",
    description:
      "Browse vetted businesses raising capital. Review their pitch, financials, legal documents, and funding terms before you commit.",
  },
  {
    icon: Wallet,
    title: "Invest from the minimum",
    description:
      "Buy shares starting from each campaign's minimum investment. Your money is held securely in escrow until the funding target is met.",
  },
  {
    icon: LineChart,
    title: "Own and earn",
    description:
      "Receive your share ownership and follow the company's progress. Earn potential dividends and capital gains as the business grows.",
  },
];

export default function LandingPage() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [campaignsCount, setCampaignsCount] = useState<number>(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getCampaignsAndCover(100, 0);
        if (!cancelled){
          setCampaigns(data.data ?? []);
          setCampaignsCount(data.total)
        } 
      } catch {
        
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const featured = useMemo(
    () => campaigns.filter((c) => c.status === "ACTIVE").slice(0, 3),
    [campaigns]
  );

  const stats = useMemo(() => {
    const raised = campaigns.reduce((sum, c) => sum + c.funding_amount, 0);
    const investors = campaigns.reduce((sum, c) => sum + c.total_investor, 0);
    const funded = campaigns.filter(
      (c) =>
        c.status === "FUNDED" || c.status === "COMPLETED" || c.status === "ACTIVE"
    ).length;
    return { raised, investors, funded };
  }, [campaigns]);

  return (
    <main className="flex min-h-screen w-full flex-col">
      <section className="border-b bg-linear-to-b from-zinc-50 to-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 py-20 text-center sm:px-6 sm:py-28">
          <span className="rounded-full border bg-white px-3 py-1 text-xs font-medium text-zinc-600">
            Equity crowdfunding for everyone
          </span>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
            Own a piece of businesses you believe in
          </h1>
          <p className="max-w-2xl text-base text-zinc-600 sm:text-lg">
            First Step connects everyday investors with growing companies.
            Start with a small amount, become a shareholder, and grow together
            with the businesses you support.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/explore">
                Explore campaigns
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/learn">Learn how it works</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-b">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-4 py-10 sm:grid-cols-3 sm:px-6">
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-2xl font-bold tracking-tight sm:text-3xl">
              {formatIDR(stats.raised)}
            </p>
            <p className="text-sm text-muted-foreground">
              Raised through the platform
            </p>
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-2xl font-bold tracking-tight sm:text-3xl">
              {stats.investors.toLocaleString("id-ID")}
            </p>
            <p className="text-sm text-muted-foreground">
              Investments made by backers
            </p>
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-2xl font-bold tracking-tight sm:text-3xl">
              {stats.funded}
            </p>
            <p className="text-sm text-muted-foreground">
              Campaigns open or funded
            </p>
          </div>
        </div>
      </section>

      <section className="border-b">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              Featured campaigns
            </h2>
            <p className="text-sm text-muted-foreground">
              Businesses currently open for investment.
            </p>
          </div>
          {featured.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {loaded
                ? "No campaigns are open right now — check back soon."
                : "Loading campaigns…"}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          )}
          <div>
            <Button variant="outline" asChild>
              <Link href="/explore">
                View all campaigns
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-b bg-zinc-50">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              How it works
            </h2>
            <p className="text-sm text-muted-foreground">
              From browsing to becoming a shareholder in three steps.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {INVESTOR_STEPS.map((step, i) => (
              <div
                key={step.title}
                className="flex flex-col gap-3 rounded-lg border bg-white p-6"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-white">
                    <step.icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-semibold text-zinc-400">
                    Step {i + 1}
                  </span>
                </div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
          <div>
            <Button variant="outline" asChild>
              <Link href="/learn">Read the full guide</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-b">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex max-w-xl flex-col gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-white">
              <Building2 className="h-5 w-5" />
            </span>
            <h2 className="text-2xl font-semibold tracking-tight">
              Raise capital for your business
            </h2>
            <p className="text-sm text-muted-foreground">
              Register your company, submit your legal documents, and open a
              funding campaign. Reach investors who believe in your vision —
              while your funds stay protected in escrow until the target is
              met.
            </p>
          </div>
          <Button size="lg" asChild>
            <Link href="/company/create">
              Register your company
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="bg-zinc-50">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-10 sm:px-6">
          <div className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-4">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <p className="text-sm leading-relaxed text-amber-800">
              Investing in equity crowdfunding carries risk, including the loss
              of your entire investment and limited liquidity. Never invest
              more than you can afford to lose, and read each campaign's
              documents carefully before deciding.
            </p>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            All investments are held in escrow and refunded in full if a
            campaign does not reach its funding target.
          </p>
        </div>
      </section>
    </main>
  );
}
