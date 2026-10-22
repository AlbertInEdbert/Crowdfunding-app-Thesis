"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FileText, Wallet } from "lucide-react";
import { useForm } from "@tanstack/react-form";
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
import { createCampaign, Highlight } from "@/lib/campaign";
import { Company, getCompanyByUserId } from "@/lib/company";
import { FileDropzone } from "@/components/FileDropzone";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentSession } from "@/lib/user";
import { NumericFormat } from "react-number-format";
import HighlightsInput, {   
  createHighlight,
 } from "@/components/HighlightInput";

interface CampaignFormValues {
  title: string;
  description : string;
  valuation: string;
  fundingGoal: string;
  minInvestment: string;
  sharePrice: string;
  startDate: string;
  endDate: string;
}

export default function newCompanyPage() {
  const router = useRouter();

  const [company, setCompany] = useState<Company | null>(null);
  const [unauthenticated, setUnauthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([createHighlight()]);
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const session = await getCurrentSession();
        if (!session) {
          if (!cancelled) setUnauthenticated(true);
          return;
        }
        const data = await getCompanyByUserId(session.UserID);
        if (!cancelled) setCompany(data);
      } catch {
        if (!cancelled) {
          setLoadError(
            "Could not load your company. You need a registered company to create a campaign."
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

  const form = useForm({
    defaultValues: {
      title: "",
      description : "",
      overview : "",
      valuation: "",
      fundingGoal: "",
      minInvestment: "",
      sharePrice: "",
      startDate: "",
      endDate: "",
    },
    onSubmit: async ({ value }) => {
      if (!company) return;
      setSubmitError(null);

      highlights.forEach(element => {
        console.log(element.SeqNo)
        console.log(element.Title)
        console.log(element.Description)
      });

      try {
        const created = await createCampaign(
          company.ID,
          {
            title: value.title.trim(),
            description: value.description.trim(),
            overview : value.description.trim(),
            valuation: Number(value.valuation),
            funding_goal: Number(value.fundingGoal),
            min_investment: Number(value.minInvestment),
            share_price: Number(value.sharePrice),
            start_date: new Date(value.startDate).toISOString(),
            end_date: new Date(value.endDate).toISOString(),
            highlight : highlights
          },
          files,
          thumbnail,
          video
        );
        router.push(`/campaign/${created.ID}`);
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : "Could not create campaign."
        );
      }
    },
  });

  if (unauthenticated) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 sm:px-6">
        <p className="text-sm text-muted-foreground">
          You need to sign in to create a campaign.
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

  if (loadError || !company) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError ?? "Company not found."}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">New Campaign</h1>
        <p className="text-sm text-muted-foreground">
          Create a fundraising campaign for {company.Name}. It starts as a draft
          until approved.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="flex flex-col gap-6"
      >
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
            <form.Field
              name="title"
              validators={{
                onChange: ({ value }) =>
                  !value.trim() ? "Title is required" : undefined,
              }}
              children={(field) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={field.name}>Title</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="e.g. Expanding our coffee roastery"
                    required
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-xs text-destructive">
                      {field.state.meta.errors.join(", ")}
                    </p>
                  )}
                </div>
              )}
            />

            <form.Field
              name="description"
              children={(field) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={field.name}>Description</Label>
                  <Textarea
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Describe your campaign"
                  />
                </div>
              )}
            />
            
            <form.Field
              name="overview"
              children={(field) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={field.name}>Description</Label>
                  <Textarea
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Overview of your campaign"
                  />
                </div>
              )}
            />
            <div className="flex flex-col gap-2">
              <Label>Campaign Cover</Label>
              <FileDropzone accept="image/*" onFilesChange={setFiles} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Campaign Video Thumbnail</Label>
              <FileDropzone
                accept="image/*"
                multiple={false}
                onFilesChange={(picked) => setThumbnail(picked[0] ?? null)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Campaign Video</Label>
              <FileDropzone
                accept="video/*"
                multiple={false}
                onFilesChange={(picked) => setVideo(picked[0] ?? null)}
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
            <form.Field
              name="valuation"
              validators={{
                onChange: ({ value }) =>
                  !value || Number(value) < 1
                      ? "Valuation must be greater than 0"
                      : undefined,
              }}
              children={(field) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={field.name}>Valuation</Label>
                  <NumericFormat
                    customInput={Input}
                    id="valuation"
                    name={field.name}
                    thousandSeparator="."
                    decimalSeparator=","
                    prefix="Rp "
                    allowNegative={false}
                    decimalScale={0}
                    value={field.state.value}
                    onValueChange={(values) =>
                      field.handleChange(values.value)
                    }
                    required
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-xs text-destructive">
                      {field.state.meta.errors.join(", ")}
                    </p>
                  )}
                </div>
              )}
            />

            <form.Field
              name="fundingGoal"
              validators={{
                onChange: ({ value }) =>
                  !value || Number(value) < 1
                    ? "Funding goal must be greater than 0"
                    : Number(value) > 10000000000
                    ? "Funding goal cannot be more than Rp 10.000.000.000"
                    :undefined,
              }}
              children={(field) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={field.name}>Funding goal</Label>
                  <NumericFormat
                    customInput={Input}
                    id={field.name}
                    name={field.name}
                    thousandSeparator="."
                    decimalSeparator=","
                    prefix="Rp "
                    allowNegative={false}
                    decimalScale={0}
                    value={field.state.value}
                    onValueChange={(values) =>
                      field.handleChange(values.value)
                    }
                    required
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-xs text-destructive">
                      {field.state.meta.errors.join(", ")}
                    </p>
                  )}
                </div>
              )}
            />

            <form.Field
              name="minInvestment"
              validators={{
                onChange: ({ value }) =>
                  !value || Number(value) < 1
                    ? "Minimum investment must be greater than 0"
                    : undefined,
              }}
              children={(field) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={field.name}>Minimum investment</Label>
                  <NumericFormat
                    customInput={Input}
                    id={field.name}
                    name={field.name}
                    thousandSeparator="."
                    decimalSeparator=","
                    prefix="Rp "
                    allowNegative={false}
                    decimalScale={0}
                    value={field.state.value}
                    onValueChange={(values) =>
                      field.handleChange(values.value)
                    }
                    required
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-xs text-destructive">
                      {field.state.meta.errors.join(", ")}
                    </p>
                  )}
                </div>
              )}
            />

            <form.Field
              name="sharePrice"
              validators={{
                onChange: ({ value }) =>
                  !value || Number(value) < 1
                    ? "Share price must be greater than 0"
                    : undefined,
              }}
              children={(field) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={field.name}>Share price</Label>
                  <NumericFormat
                    customInput={Input}
                    id={field.name}
                    name={field.name}
                    thousandSeparator="."
                    decimalSeparator=","
                    prefix="Rp "
                    allowNegative={false}
                    decimalScale={0}
                    value={field.state.value}
                    onValueChange={(values) =>
                      field.handleChange(values.value)
                    }
                    required
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-xs text-destructive">
                      {field.state.meta.errors.join(", ")}
                    </p>
                  )}
                </div>
              )}
            />

            <form.Field
              name="startDate"
              validators={{
                onChange: ({ value }) => {
                  !value ? "Start date is required" : undefined;
                  const diffDays = (new Date(value).getTime() - new Date().getTime()) /(1000 * 60 * 60 * 24);
                  if (diffDays < 14) return "Start date must be 2 week or more from first campaign request";
                }
                  
                
                
              }}
              children={(field) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={field.name}>Start date</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="date"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    required
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-xs text-destructive">
                      {field.state.meta.errors.join(", ")}
                    </p>
                  )}
                </div>
              )}
            />

            <form.Field
              name="endDate"
              validators={{
                onChange: ({ value, fieldApi }) => {
                  if (!value) return "End date is required";

                  const startDate = fieldApi.form.getFieldValue("startDate");
                  if (startDate) {
                    const diffDays = (new Date(value).getTime() - new Date(startDate).getTime()) /(1000 * 60 * 60 * 24);

                    if (diffDays < 0) return "End date must be after start date";
                    if (diffDays > 45) return "End date must not be more than 45 days after start date";
                  }

                  return undefined;
                },
              }}
              children={(field) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={field.name}>End date</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="date"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    required
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-xs text-destructive">
                      {field.state.meta.errors.join(", ")}
                    </p>
                  )}
                </div>
              )}
            />
          </CardContent>
        </Card>
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Campgign Highlight</CardTitle>
            </div>
            <CardDescription>What make your product standout</CardDescription>
          </CardHeader>
          <CardContent className="w-full grid grid-cols-1 gap-4 sm:grid-cols-2">
              <HighlightsInput value={highlights} onChange={setHighlights} max={10} className="sm:col-span-2" />
          </CardContent>
        </Card>
        {submitError && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {submitError}
          </p>
        )}

        <div className="flex items-center gap-3">
          <form.Subscribe
            selector={(state) => [state.isSubmitting, state.canSubmit]}
            children={([isSubmitting, canSubmit]) => (
              <Button type="submit" disabled={isSubmitting || !canSubmit}>
                {isSubmitting ? "Creating…" : "Create campaign"}
              </Button>
            )}
          />
          <Button type="button" variant="outline" asChild>
            <Link href="/campaign">Cancel</Link>
          </Button>
        </div>
      </form>
    </main>
  );
}