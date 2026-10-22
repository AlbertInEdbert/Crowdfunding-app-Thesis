"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CreditCard,
  Landmark,
  Loader2,
  Lock,
  Minus,
  Plus,
  QrCode,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Campaign,
  daysRemaining,
  formatIDR,
  fundingProgress,
  getCampaign,
} from "@/lib/campaign";
import { createInvestment, payInvestment } from "@/lib/investment";

const PLATFORM_FEE = 50000;

const PAYMENT_METHODS = [
  {
    value: "card",
    label: "Credit / Debit Card",
    description: "Visa, Mastercard, JCB",
    icon: CreditCard,
  },
  {
    value: "qris",
    label: "QRIS",
    description: "Scan with any e-wallet or m-banking",
    icon: QrCode,
  },
  {
    value: "bank_transfer",
    label: "Bank Transfer",
    description: "Virtual account (BCA, BNI, BRI, Mandiri)",
    icon: Landmark,
  },
  {
    value: "ewallet",
    label: "E-Wallet",
    description: "GoPay, OVO, DANA, ShopeePay",
    icon: Wallet,
  },
] as const;

export default function PaymentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const campaignId = Number(params.id);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [shareCount, setShareCount] = useState<number>(0);
  const [amountInput, setAmountInput] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const minShares = useMemo(() => {
    if (!campaign || campaign.SharePrice <= 0) return 1;
    return Math.max(1, Math.ceil(campaign.MinInvestment / campaign.SharePrice));
  }, [campaign]);

  const sharePrice = campaign?.SharePrice ?? 0;
  const subtotal = shareCount * sharePrice;
  const total = subtotal > 0 ? subtotal + PLATFORM_FEE : 0;
  const sharesValid = shareCount >= minShares;
  const canSubmit = sharesValid && paymentMethod !== "" && termsAccepted && !submitting;

  const setShares = (value: number) => {
    const next = Math.max(0, Math.floor(value));
    setShareCount(next);
    setAmountInput(next > 0 ? String(next * sharePrice) : "");
    setSubmitError(null);
  };

  const setAmount = (amount: number) => {
    setShares(Math.max(minShares, Math.floor(amount / sharePrice)));
  };

  const handleAmountChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    setAmountInput(digits);
    const amount = digits === "" ? 0 : Number(digits);
    setShareCount(sharePrice > 0 ? Math.floor(amount / sharePrice) : 0);
    setSubmitError(null);
  };

  const typedAmount = amountInput === "" ? 0 : Number(amountInput);

  const chipAmounts = useMemo(() => {
    if (!campaign) return [];
    const rounds = [1_000_000, 2_000_000, 5_000_000, 10_000_000, 25_000_000, 50_000_000]
      .filter((a) => a > campaign.MinInvestment);
    return [campaign.MinInvestment, ...rounds].slice(0, 4);
  }, [campaign]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getCampaign(campaignId);
        if (cancelled) return;
        setCampaign(data);
        const min =
          data.SharePrice > 0
            ? Math.max(1, Math.ceil(data.MinInvestment / data.SharePrice))
            : 1;
        setShareCount(min);
        setAmountInput(String(min * data.SharePrice));
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

  const handleSubmit = async () => {
    setTouched(true);
    if (!campaign) return;
    if (!sharesValid || paymentMethod === "" || !termsAccepted) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const investment = await createInvestment(campaign.ID, shareCount,paymentMethod);
      await payInvestment(investment.ID,paymentMethod)
      router.push("/dashboard");
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Could not create the investment. Please try again."
      );
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Preparing secure checkout…
        </div>
      </main>
    );
  }

  if (loadError || !campaign) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="size-5 text-destructive" />
              Checkout unavailable
            </CardTitle>
            <CardDescription>
              {loadError ?? "This campaign could not be found."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild className="w-full">
              <Link href="/explore">Browse other campaigns</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const progress = fundingProgress(campaign.FundingGoal, campaign.FundingAmount);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <Link
        href={`/campaign/${campaign.ID}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to campaign
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Complete your investment
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You are investing in{" "}
          <span className="font-medium text-foreground">{campaign.Title}</span>
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Left column — steps */}
        <div className="flex flex-col gap-6">
          {/* Step 1 — Amount */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2.5">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  1
                </span>
                Investment amount
              </CardTitle>
              <CardDescription>
                Enter an amount — it is converted to whole shares at{" "}
                {formatIDR(sharePrice)} per share. Minimum{" "}
                {formatIDR(campaign.MinInvestment)}.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-base font-medium text-muted-foreground">
                  Rp
                </span>
                <Input
                  inputMode="numeric"
                  placeholder="0"
                  value={
                    amountInput === ""
                      ? ""
                      : Number(amountInput).toLocaleString("id-ID")
                  }
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className={cn(
                    "h-14 pl-12 text-2xl font-semibold tracking-tight",
                    touched && !sharesValid && "border-destructive"
                  )}
                />
              </div>

              <p className="text-sm text-muted-foreground">
                ={" "}
                <span className="font-medium text-foreground">
                  {shareCount.toLocaleString("id-ID")} shares
                </span>{" "}
                at {formatIDR(sharePrice)} per share
                {typedAmount > subtotal && subtotal > 0 && (
                  <>
                    {" "}· rounded down to whole shares, you will be charged{" "}
                    <span className="font-medium text-foreground">
                      {formatIDR(subtotal)}
                    </span>
                  </>
                )}
              </p>

              <div className="flex flex-wrap gap-2">
                {chipAmounts.map((amount, i) => (
                  <Button
                    key={amount}
                    type="button"
                    variant={subtotal === Math.floor(amount / sharePrice) * sharePrice && shareCount > 0 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAmount(amount)}
                  >
                    {i === 0 ? `Min · ${formatIDR(amount)}` : formatIDR(amount)}
                  </Button>
                ))}
              </div>

              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <span className="text-sm text-muted-foreground">
                  Adjust shares
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => setShares(shareCount - 1)}
                    disabled={shareCount <= minShares}
                    aria-label="Decrease shares"
                  >
                    <Minus className="size-3.5" />
                  </Button>
                  <span className="w-16 text-center text-sm font-semibold">
                    {shareCount.toLocaleString("id-ID")}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => setShares(shareCount + 1)}
                    aria-label="Increase shares"
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </div>
              </div>

              {touched && !sharesValid && (
                <p className="flex items-center gap-1.5 text-sm text-destructive">
                  <AlertCircle className="size-4" />
                  Minimum investment is {formatIDR(campaign.MinInvestment)} (
                  {minShares.toLocaleString("id-ID")} shares).
                </p>
              )}
            </CardContent>
          </Card>

          {/* Step 2 — Payment method */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2.5">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  2
                </span>
                Payment method
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon;
                  const selected = paymentMethod === method.value;
                  return (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(method.value);
                        setSubmitError(null);
                      }}
                      className={cn(
                        "flex items-start gap-3 rounded-lg border p-4 text-left transition-colors",
                        selected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-foreground/30"
                      )}
                    >
                      <Icon
                        className={cn(
                          "mt-0.5 size-5 shrink-0",
                          selected ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                      <span className="flex flex-col">
                        <span className="text-sm font-medium">
                          {method.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {method.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {touched && paymentMethod === "" && (
                <p className="flex items-center gap-1.5 text-sm text-destructive">
                  <AlertCircle className="size-4" />
                  Please select a payment method.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Step 3 — Terms */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2.5">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  3
                </span>
                Terms &amp; conditions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Label
                htmlFor="terms"
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
                  termsAccepted
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-foreground/30"
                )}
              >
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(v) => setTermsAccepted(v === true)}
                  className="mt-0.5"
                />
                <span className="flex flex-col gap-1">
                  <span className="text-sm font-medium">
                    I agree to the terms and conditions
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    I understand that investing in equity crowdfunding carries
                    risk, including the possible loss of my entire investment,
                    and that funds are held in escrow until the campaign closes.
                  </span>
                </span>
              </Label>
              {touched && !termsAccepted && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-destructive">
                  <AlertCircle className="size-4" />
                  You must accept the terms to continue.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column — summary */}
        <div className="lg:sticky lg:top-8 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Order summary</CardTitle>
              <CardDescription className="line-clamp-1">
                {campaign.Title}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {formatIDR(campaign.FundingAmount)} raised of{" "}
                    {formatIDR(campaign.FundingGoal)}
                  </span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {daysRemaining(campaign.EndDate)} days remaining ·{" "}
                  {campaign.TotalInvestor} investors
                </p>
              </div>

              <Separator />

              <div className="flex flex-col gap-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price per share</span>
                  <span className="font-medium">{formatIDR(sharePrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shares</span>
                  <span className="font-medium">
                    ×{shareCount.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatIDR(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform fee</span>
                  <span className="font-medium">
                    {subtotal > 0 ? formatIDR(PLATFORM_FEE) : "—"}
                  </span>
                </div>
              </div>

              <Separator />

              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">Total</span>
                <span className="text-xl font-semibold tracking-tight">
                  {formatIDR(total)}
                </span>
              </div>

              {submitError && (
                <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  {submitError}
                </p>
              )}

              <Button
                size="lg"
                className="w-full"
                disabled={!canSubmit}
                onClick={handleSubmit}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    <Lock className="size-4" />
                    Confirm investment{total > 0 ? ` · ${formatIDR(total)}` : ""}
                  </>
                )}
              </Button>

              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5" />
                Payments are secured and held in escrow
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
