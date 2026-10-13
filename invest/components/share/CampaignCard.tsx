import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Campaign,
  CampaignStatus,
  CampaignSummary,
  daysRemaining,
  formatIDR,
  fundingProgress,
  PaginatedCampaignSummary,
} from "@/lib/campaign";
import { useRouter } from "next/navigation";

const STATUS_VARIANT: Record<
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

export function CampaignCard({ campaign }: { campaign: CampaignSummary }) {

  const router = useRouter()
  const progress = fundingProgress(campaign.funding_goal,campaign.funding_amount);
  const daysLeft = daysRemaining(campaign.end_date);
  const handleRedirectCampaign = (campaignId : number) => {
    router.push(`/campaign/${campaignId}`)
  }

  return (
    <Card className="w-full">
      <img
        src={campaign.cover_url || undefined}
        alt="Event cover"
        className="relative z-20 aspect-video w-full object-cover dark:brightness-40"
      />
      <CardHeader>
        <CardAction>
          <Badge variant={STATUS_VARIANT[campaign.status]}>
            {campaign.status}
          </Badge>
        </CardAction>
        <CardTitle className="line-clamp-1">{campaign.title}</CardTitle>
        <CardDescription>
          {campaign.total_investor} investor
          {campaign.total_investor === 1 ? "" : "s"} &middot;{" "}
          {daysLeft > 0 ? `${daysLeft} days left` : "Ended"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground">Fund raised</p>
            <p className="font-medium">{formatIDR(campaign.funding_amount)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Min. investment</p>
            <p className="font-medium">{formatIDR(campaign.min_investment)}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" disabled={campaign.status !== "ACTIVE"} onClick={() => handleRedirectCampaign(campaign.id)}>
          {campaign.status === "ACTIVE" ? "Invest now" : "View details"}
        </Button>
      </CardFooter>
    </Card>
  );
}
