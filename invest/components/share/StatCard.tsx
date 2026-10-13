import { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  iconClassName,
  barClassName,
  ratio = 1,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  iconClassName?: string;
  barClassName?: string;
  ratio?: number;
}) {
  const width = `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%`;

  return (
    <Card>
      <CardContent className="flex flex-col gap-1.5 p-4">
        <Icon className={cn("h-5 w-5", iconClassName)} />
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <div className="mt-1 h-1 w-full rounded-full bg-muted">
          <div
            className={cn("h-1 rounded-full", barClassName)}
            style={{ width }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
