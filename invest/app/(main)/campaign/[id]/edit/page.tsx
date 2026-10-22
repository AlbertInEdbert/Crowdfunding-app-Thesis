"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FileText, Wallet } from "lucide-react";
import { NumericFormat } from "react-number-format";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Campaign, getCampaign, updateCampaign } from "@/lib/campaign";
import { getCompanyByUserId } from "@/lib/company";
import { getCurrentSession } from "@/lib/user";

interface CampaignFormValues {
  title: string;
  description: string;
  overview : string;
  valuation: string;
  fundingGoal: string;
  minInvestment: string;
  sharePrice: string;
  startDate: string;
  endDate: string;
}

function toDateInput(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export default function EditCampaignPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const campaignId = Number(params.id);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [unauthenticated, setUnauthenticated] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState<CampaignFormValues>({
    title: "",
    description: "",
    overview: "",
    valuation: "",
    fundingGoal: "",
    minInvestment: "",
    sharePrice: "",
    startDate: "",
    endDate: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const updateField = <K extends keyof CampaignFormValues>(
    key: K,
    value: CampaignFormValues[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const session = await getCurrentSession();
        if (!session) {
          if (!cancelled) setUnauthenticated(true);
          return;
        }

        const data = await getCampaign(campaignId);
        if (cancelled) return;
        setCampaign(data);


        try {
          const company = await getCompanyByUserId(session.UserID);
          if (!cancelled && company.ID !== data.CompanyID) {
            setForbidden(true);
            return;
          }
        } catch {
          if (!cancelled) {
            setForbidden(true);
            return;
          }
        }

        if (!cancelled) {
          setForm({
            title: data.Title,
            description: data.Description,
            overview: data.Overview,
            valuation: String(data.Valuation),
            fundingGoal: String(data.FundingGoal),
            minInvestment: String(data.MinInvestment),
            sharePrice: String(data.SharePrice),
            startDate: toDateInput(data.StartDate),
            endDate: toDateInput(data.EndDate),
          });
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!campaign) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const updated = await updateCampaign(campaign.ID, {
        title: form.title.trim(),
        description: form.description.trim(),
        overview: form.description.trim(),
        valuation: Number(form.valuation),
        funding_goal: Number(form.fundingGoal),
        min_investment: Number(form.minInvestment),
        share_price: Number(form.sharePrice),
        start_date: new Date(form.startDate).toISOString(),
        end_date: new Date(form.endDate).toISOString(),
        highlight : []
      });
      router.push(`/campaign/${updated.ID}`);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Could not update campaign."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (unauthenticated) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 sm:px-6">
        <p className="text-sm text-muted-foreground">
          You need to sign in to edit a campaign.
        </p>
        <Button asChild>
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
        <p className="py-8 text-center text-sm text-muted-foreground">
          Loading…
        </p>
      </main>
    );
  }

  if (loadError || !campaign) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError ?? "Campaign not found."}
        </p>
      </main>
    );
  }

  if (forbidden) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 sm:px-6">
        <p className="text-sm text-muted-foreground">
          This campaign does not belong to your company.
        </p>
        <Button variant="outline" asChild>
          <Link href="/company">Back to company</Link>
        </Button>
      </main>
    );
  }

  if (campaign.Status !== "DRAFT") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 sm:px-6">
        <p className="text-sm text-muted-foreground">
          Only draft campaigns can be edited. This campaign is{" "}
          {campaign.Status}.
        </p>
        <Button variant="outline" asChild>
          <Link href={`/campaign/${campaign.ID}`}>View campaign</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Edit Campaign
        </h1>
        <p className="text-sm text-muted-foreground">
          Update the details of your draft campaign. Media files stay as they
          are.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Campaign details</CardTitle>
            </div>
            <CardDescription>
              The story investors will read on the campaign page.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="e.g. Expanding our coffee roastery"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Describe your campaign"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="overview">Overview</Label>
              <Textarea
                id="overview"
                value={form.description}
                onChange={(e) => updateField("overview", e.target.value)}
                placeholder="Overview of your campaign"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Funding terms</CardTitle>
            </div>
            <CardDescription>All amounts are in IDR.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="valuation">Valuation</Label>
              <NumericFormat
                customInput={Input}
                id="valuation"
                thousandSeparator="."
                decimalSeparator=","
                prefix="Rp "
                allowNegative={false}
                decimalScale={2}
                value={form.valuation}
                onValueChange={(values) => updateField("valuation", values.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="fundingGoal">Funding goal</Label>
              <NumericFormat
                customInput={Input}
                id="fundingGoal"
                thousandSeparator="."
                decimalSeparator=","
                prefix="Rp "
                allowNegative={false}
                decimalScale={2}
                value={form.valuation}
                onValueChange={(values) => updateField("fundingGoal", values.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="minInvestment">Minimum investment</Label>
              <NumericFormat
                customInput={Input}
                id="minInvestment"
                thousandSeparator="."
                decimalSeparator=","
                prefix="Rp "
                allowNegative={false}
                decimalScale={2}
                value={form.valuation}
                onValueChange={(values) => updateField("minInvestment", values.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sharePrice">Share price</Label>
              <NumericFormat
                customInput={Input}
                id="sharePrice"
                thousandSeparator="."
                decimalSeparator=","
                prefix="Rp "
                allowNegative={false}
                decimalScale={2}
                value={form.valuation}
                onValueChange={(values) => updateField("sharePrice", values.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="startDate">Start date</Label>
              <Input
                id="startDate"
                type="date"
                value={form.startDate}
                onChange={(e) => updateField("startDate", e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="endDate">End date</Label>
              <Input
                id="endDate"
                type="date"
                value={form.endDate}
                onChange={(e) => updateField("endDate", e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        {submitError && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {submitError}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={
              submitting ||
              !form.title.trim() ||
              !form.valuation ||
              !form.fundingGoal ||
              !form.minInvestment ||
              !form.sharePrice ||
              !form.startDate ||
              !form.endDate
            }
          >
            {submitting ? "Saving…" : "Save changes"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={`/campaign/${campaign.ID}`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </main>
  );
}
