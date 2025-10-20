"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Store as StoreIcon, RefreshCw, Trash2 } from "lucide-react";
import { Store } from "@/lib/supabase";

interface StoreCardProps {
  store: Store;
  profit: number;
  orders: number;
  onSync: (storeId: string) => void;
  onDelete: (storeId: string) => void;
  syncing?: boolean;
}

export function StoreCard({
  store,
  profit,
  orders,
  onSync,
  onDelete,
  syncing = false,
}: StoreCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <StoreIcon className="h-5 w-5 text-blue-600" />
          {store.name}
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSync(store.id)}
            disabled={syncing}
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(store.id)}
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground mb-3">{store.url}</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl font-bold text-green-600">
              ${profit.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">Total Profit</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{orders}</div>
            <div className="text-xs text-muted-foreground">Orders</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
