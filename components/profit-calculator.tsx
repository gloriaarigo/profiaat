"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calculator } from "lucide-react";

export function ProfitCalculator() {
  const [revenue, setRevenue] = useState<string>("1000");
  const [cost, setCost] = useState<string>("300");
  const [adSpend, setAdSpend] = useState<string>("200");
  const [shippingCost, setShippingCost] = useState<string>("50");
  const [transactionFee, setTransactionFee] = useState<string>("3");

  const calculateMetrics = () => {
    const rev = parseFloat(revenue) || 0;
    const cst = parseFloat(cost) || 0;
    const ads = parseFloat(adSpend) || 0;
    const ship = parseFloat(shippingCost) || 0;
    const fee = (rev * (parseFloat(transactionFee) || 0)) / 100;

    const totalCosts = cst + ads + ship + fee;
    const grossProfit = rev - cst;
    const netProfit = rev - totalCosts;
    const profitMargin = rev > 0 ? (netProfit / rev) * 100 : 0;
    const roas = ads > 0 ? rev / ads : 0;
    const breakEven = totalCosts;

    return {
      grossProfit,
      netProfit,
      profitMargin,
      roas,
      breakEven,
      totalCosts,
      transactionFee: fee,
    };
  };

  const metrics = calculateMetrics();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Profit Calculator
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Input Values
            </h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="revenue">Revenue</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="revenue"
                    type="number"
                    value={revenue}
                    onChange={(e) => setRevenue(e.target.value)}
                    className="pl-7"
                    step="0.01"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="cost">Product Cost</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="cost"
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="pl-7"
                    step="0.01"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="adSpend">Ad Spend</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="adSpend"
                    type="number"
                    value={adSpend}
                    onChange={(e) => setAdSpend(e.target.value)}
                    className="pl-7"
                    step="0.01"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="shipping">Shipping Cost</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="shipping"
                    type="number"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(e.target.value)}
                    className="pl-7"
                    step="0.01"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="fee">Transaction Fee (%)</Label>
                <div className="relative">
                  <Input
                    id="fee"
                    type="number"
                    value={transactionFee}
                    onChange={(e) => setTransactionFee(e.target.value)}
                    className="pr-7"
                    step="0.1"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Calculated Results
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium">Gross Profit</span>
                <span className="text-lg font-bold text-blue-600">
                  ${metrics.grossProfit.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium">Total Costs</span>
                <span className="text-lg font-bold text-orange-600">
                  ${metrics.totalCosts.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border-2 border-green-200">
                <span className="text-sm font-medium">Net Profit</span>
                <span className="text-xl font-bold text-green-600">
                  ${metrics.netProfit.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium">Profit Margin</span>
                <span className="text-lg font-bold">
                  {metrics.profitMargin.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium">ROAS</span>
                <span className="text-lg font-bold">
                  {metrics.roas.toFixed(2)}x
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium">Break-Even Point</span>
                <span className="text-lg font-bold">
                  ${metrics.breakEven.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
