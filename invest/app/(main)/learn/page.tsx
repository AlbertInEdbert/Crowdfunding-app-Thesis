import Link from "next/link";
import {
  ArrowRight,
  Coins,
  FileCheck2,
  HandCoins,
  Lock,
  PieChart,
  Scale,
  SearchCheck,
  TrendingUp,
  TriangleAlert,
  Users,
  Wallet,
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    icon: SearchCheck,
    title: "Explore and do your research",
    description:
      "Every campaign publishes its pitch, valuation, funding terms, and the company's legal documents. Read them carefully — especially the financials and use of funds.",
  },
  {
    icon: Wallet,
    title: "Choose your amount",
    description:
      "Each campaign sets a share price and a minimum investment. You decide how many shares to buy, starting from that minimum.",
  },
  {
    icon: Lock,
    title: "Funds are held in escrow",
    description:
      "Your money does not go directly to the company. It is held securely until the campaign reaches its funding target — otherwise it is refunded in full.",
  },
  {
    icon: FileCheck2,
    title: "Receive your shares",
    description:
      "Once a campaign succeeds, the escrow is released to the company and your share ownership is recorded in your portfolio.",
  },
  {
    icon: TrendingUp,
    title: "Follow and earn",
    description:
      "Track the company's progress through updates. Returns may come as dividends or capital gains, depending on the campaign's terms.",
  },
];

const CONCEPTS = [
  {
    icon: PieChart,
    title: "Equity",
    description:
      "The percentage of the company you own. If a company valued at Rp 10 billion offers 10% equity for Rp 1 billion, every rupiah you invest buys a slice of that 10%.",
  },
  {
    icon: Scale,
    title: "Valuation",
    description:
      "What the company is assessed to be worth before your investment (pre-money). The equity you receive is your investment divided by this valuation.",
  },
  {
    icon: Coins,
    title: "Dividends",
    description:
      "A share of the company's profits distributed to shareholders, usually annually. Not all companies pay dividends — check each campaign's terms.",
  },
  {
    icon: HandCoins,
    title: "Capital gain",
    description:
      "Profit from selling your shares at a higher price than you paid, for example if the company is acquired or a secondary sale is arranged.",
  },
  {
    icon: Users,
    title: "Crowdfunding",
    description:
      "Many investors each contributing a relatively small amount, together funding a business that would otherwise rely on banks or venture capital.",
  },
  {
    icon: TriangleAlert,
    title: "Diversification",
    description:
      "Spreading your money across several campaigns and sectors so that one underperforming business does not determine your whole result.",
  },
];

const FAQS = [
  {
    question: "What is equity crowdfunding?",
    answer:
      "Equity crowdfunding lets you buy real shares in a private company through an online platform, starting from a small amount. Unlike donation- or reward-based crowdfunding, you become a shareholder with ownership rights in the business.",
  },
  {
    question: "How much do I need to start investing?",
    answer:
      "Each campaign sets its own minimum investment, typically a multiple of its share price. You can see the minimum on every campaign page before you decide.",
  },
  {
    question: "Is my money safe?",
    answer:
      "Your payment is held in an escrow account, not transferred directly to the company. If the campaign fails to reach its funding target by the deadline, your money is refunded in full. If it succeeds, the funds are released to the company and your shares are recorded. Note that the investment itself still carries business risk — you can lose money if the company underperforms.",
  },
  {
    question: "How do I earn returns?",
    answer:
      "Two main ways: dividends (a share of profits, if the company distributes them) and capital gains (selling your shares later at a higher valuation, for example during an acquisition or buyback). Neither is guaranteed.",
  },
  {
    question: "Can I sell my shares?",
    answer:
      "Shares in private companies are not as liquid as stocks on an exchange. You generally hold them until a liquidity event — such as a buyback, acquisition, or secondary market arrangement. Treat this as a long-term investment.",
  },
  {
    question: "What are the risks?",
    answer:
      "The main risks are losing your entire investment if the business fails, dilution if the company issues more shares, and illiquidity since shares cannot be sold quickly. Only invest money you can afford to lose, and diversify across campaigns.",
  },
  {
    question: "How are companies screened?",
    answer:
      "Every company submits legal documents — deed of establishment, business licenses (NIB), tax registration (NPWP), and related filings — which are reviewed before a campaign is approved and published.",
  },
];

export default function LearnPage() {
  return (
    <main className="flex min-h-screen w-full flex-col">
      <section className="border-b bg-gradient-to-b from-zinc-50 to-white">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 px-4 py-16 text-center sm:px-6 sm:py-20">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Learn before you invest
          </h1>
          <p className="max-w-2xl text-base text-zinc-600">
            Everything you need to know about equity crowdfunding on First
            Step — how it works, the key concepts, and the risks you should
            understand before buying your first share.
          </p>
        </div>
      </section>

      <section className="border-b">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-14 sm:px-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              How investing works
            </h2>
            <p className="text-sm text-muted-foreground">
              Five steps from your first visit to becoming a shareholder.
            </p>
          </div>
          <ol className="flex flex-col gap-6">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
                    <step.icon className="h-5 w-5" />
                  </span>
                  {i < STEPS.length - 1 && (
                    <span className="mt-2 w-px flex-1 bg-zinc-200" />
                  )}
                </div>
                <div className="flex flex-col gap-1 pb-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Step {i + 1}
                  </p>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b bg-zinc-50">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-14 sm:px-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              Key concepts
            </h2>
            <p className="text-sm text-muted-foreground">
              The terms you will meet on every campaign page.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {CONCEPTS.map((concept) => (
              <div
                key={concept.title}
                className="flex flex-col gap-2 rounded-lg border bg-white p-5"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                  <concept.icon className="h-4 w-4" />
                </span>
                <h3 className="font-semibold">{concept.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {concept.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-14 sm:px-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              Frequently asked questions
            </h2>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="bg-zinc-50">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 px-4 py-14 text-center sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">
            Ready to take your first step?
          </h2>
          <p className="max-w-xl text-sm text-muted-foreground">
            Browse live campaigns, read their documents, and invest in the
            businesses you believe in.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/explore">
                Explore campaigns
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/sign-in">Create an account</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
