import { CampaignStatus } from "./campaign";
import { InvestmentStatus } from "./investment";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export interface PortfolioInvestment {
  id: number;
  transaction_no: string;
  amount: number;
  status: string;
  share_count: number;
  created_at: string;
}

export interface PortfolioItem {
  campaign_id: number;
  campaign_title: string;
  campaign_status: CampaignStatus;
  campaign_end_date: string;
  company_id: number;
  company_name: string;
  total_shares: number;
  total_invested: number;
  pending_amount: number;
  investments: PortfolioInvestment[];
}

export async function getPortfolio(): Promise<PortfolioItem[]> {
  const res = await fetch(`${API_URL}/api/v1/portfolio`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch portfolio: ${res.status}`);
  }
  return res.json();
}
