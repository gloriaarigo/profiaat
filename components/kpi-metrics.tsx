"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  DollarSign,
  Percent,
  Target,
} from "lucide-react";

interface KPIMetricsProps {
  metrics: {
    avgOrderValue: number;
    avgOrderValueChange: number;
    profitMargin: number;
    profitMarginChange: number;
    conversionValue: number;
    conversionValueChange: number;
    roas: number;
    roasChange: number;
  };
}

export function KPIMetrics({ metrics }: KPIMetricsProps) {
  const MetricCard = ({
    title,
    value,
    change,
    icon: Icon,
    prefix = "",
    suffix = "",
    format = "number",
  }: {
    title: string;
    value: number;
    change: number;
    icon: any;
    prefix?: string;
    suffix?: string;
    format?: "number" | "currency" | "percent";
  }) => {
    const isPositive = change >= 0;
    const formattedValue =
      format === "currency"
        ? `${prefix}${value.toFixed(2)}${suffix}`
        : format === "percent"
        ? `${value.toFixed(1)}${suffix}`
        : `${prefix}${value.toFixed(0)}${suffix}`;

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formattedValue}</div>
          <div className="flex items-center gap-1 text-xs mt-1">
            {isPositive ? (
              <TrendingUp className="h-3 w-3 text-green-600" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600" />
            )}
            <span className={isPositive ? "text-green-600" : "text-red-600"}>
              {isPositive ? "+" : ""}
              {change.toFixed(1)}%
            </span>
            <span className="text-muted-foreground ml-1">vs last period</span>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Avg Order Value"
        value={metrics.avgOrderValue}
        change={metrics.avgOrderValueChange}
        icon={ShoppingCart}
        prefix="$"
        format="currency"
      />
      <MetricCard
        title="Profit Margin"
        value={metrics.profitMargin}
        change={metrics.profitMarginChange}
        icon={Percent}
        suffix="%"
        format="percent"
      />
      <MetricCard
        title="Conversion Value"
        value={metrics.conversionValue}
        change={metrics.conversionValueChange}
        icon={DollarSign}
        prefix="$"
        format="currency"
      />
      <MetricCard
        title="ROAS"
        value={metrics.roas}
        change={metrics.roasChange}
        icon={Target}
        suffix="x"
        format="number"
      />
    </div>
  );
}
