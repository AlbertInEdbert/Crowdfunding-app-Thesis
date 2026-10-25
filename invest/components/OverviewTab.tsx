"use client";

import { Sparkle, TriangleAlert } from "lucide-react";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { Campaign, formatIDR, getCampaignHighlights, Highlight } from "@/lib/campaign";
import { formatDate } from "@/lib/investment";
import { useEffect, useState } from "react";

function formatPercent(value: number): string {
  return `${value.toFixed(2).replace(/\.?0+$/, "")}%`;
}

export function OverviewTab({
  campaign,
}: {
  campaign: Campaign;
  highlights?: Highlight[];
}) {
    const [highlights,setHighlights] = useState<Highlight[]>([])

    useEffect(() => {
      let cancelled = false;
      (async () => {
        try {
          const result = await getCampaignHighlights(campaign.ID);
          if (!cancelled) setHighlights(result ?? []);
          console.log(result)
          console.log("title " +  result[0].Title)
        } catch {
          
        }
      })();
      return () => {
        cancelled = true;
      };
    },[campaign.ID]);

  const equityOffered =
    campaign.Valuation > 0
      ? (campaign.FundingGoal / campaign.Valuation) * 100
      : 0;
  const totalShares =
    campaign.SharePrice > 0
      ? Math.floor(campaign.FundingGoal / campaign.SharePrice)
      : 0;
  const minShares =
    campaign.SharePrice > 0
      ? Math.max(1, Math.ceil(campaign.MinInvestment / campaign.SharePrice))
      : 0;

  const terms: { label: string; value: string }[] = [
    { label: "Pre-money valuation", value: formatIDR(campaign.Valuation) },
    { label: "Share price", value: formatIDR(campaign.SharePrice) },
    {
      label: "Equity offered",
      value: equityOffered > 0 ? formatPercent(equityOffered) : "—",
    },
    {
      label: "Total shares offered",
      value: totalShares > 0 ? totalShares.toLocaleString("id-ID") : "—",
    },
    {
      label: "Minimum investment",
      value:
        minShares > 0
          ? `${formatIDR(campaign.MinInvestment)} (${minShares} share${minShares === 1 ? "" : "s"})`
          : formatIDR(campaign.MinInvestment),
    },
    {
      label: "Offering period",
      value: `${formatDate(campaign.StartDate)} – ${formatDate(campaign.EndDate)}`,
    },
  ];

  return (
    <div className="flex w-full flex-col gap-8">
      <section>
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Highlights
        </h2>
        <ItemGroup>
          {highlights.map((highlight, i) => (
            <Item key={i} variant="outline">
              <ItemMedia
                variant="icon"
                className="rounded-full bg-blue-50 p-2 text-blue-600"
              >
                <Sparkle />
              </ItemMedia>
              <ItemContent>
                <ItemTitle className="text-slate-900">
                  {highlight.Title}
                </ItemTitle>
                <ItemDescription className="line-clamp-none text-slate-600">
                  {highlight.Description}
                </ItemDescription>
              </ItemContent>
            </Item>
          ))}
        </ItemGroup>
      </section>

      <Separator />

      <section>
        <h2 className="mb-4 text-base font-semibold text-foreground">
          About this campaign
        </h2>
        <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {campaign.Description}
        </p>
      </section>

      <Separator />

      <section>
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Investment terms
        </h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {terms.map((term) => (
            <div key={term.label} className="rounded-md border p-4">
              <dt className="text-sm text-muted-foreground">{term.label}</dt>
              <dd className="mt-1 font-medium">{term.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <Separator />

      <section className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-4">
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-amber-900">
            Risk disclosure
          </h2>
          <p className="text-sm leading-relaxed text-amber-800">
            Investing in equity crowdfunding carries a high level of risk,
            including the loss of your entire investment, illiquidity, and
            dilution. Returns are not guaranteed. Past performance does not
            indicate future results. Only invest money you can afford to lose
            and read the prospectus carefully before investing.
          </p>
        </div>
      </section>
    </div>
  );
}
