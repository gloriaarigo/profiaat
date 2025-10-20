"use client";

import { useEffect, useState } from "react";
import { supabase, Store, Order, AdAccount, AdSpend } from "@/lib/supabase";
import { fetchWooCommerceOrders, calculateProfit } from "@/lib/woocommerce";
import { AddStoreDialog } from "@/components/add-store-dialog";
import { AddAdAccountDialog } from "@/components/add-ad-account-dialog";
import { AddAdSpendDialog } from "@/components/add-ad-spend-dialog";
import { StoreCard } from "@/components/store-card";
import { AnalyticsChart } from "@/components/analytics-chart";
import { DateRangePicker } from "@/components/date-range-picker";
import { OrderHistoryTable } from "@/components/order-history-table";
import { KPIMetrics } from "@/components/kpi-metrics";
import { ProfitCalculator } from "@/components/profit-calculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import {
  TrendingUp,
  Store as StoreIcon,
  DollarSign,
  ShoppingCart,
  LogIn,
  LogOut,
  BarChart3,
  Calculator as CalcIcon,
  Clock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateRange } from "react-day-picker";
import { subDays, startOfDay, endOfDay, format, parseISO } from "date-fns";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [adSpends, setAdSpends] = useState<AdSpend[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingStore, setSyncingStore] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadData();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      await loadData();
    }
    setLoading(false);
  };

  const loadData = async () => {
    const [storesData, ordersData, accountsData, spendsData] = await Promise.all([
      supabase.from("stores").select("*").order("name"),
      supabase.from("orders").select("*").order("order_date", { ascending: false }),
      supabase.from("ad_accounts").select("*").order("name"),
      supabase.from("ad_spend").select("*").order("date", { ascending: false }),
    ]);

    if (storesData.data) setStores(storesData.data);
    if (ordersData.data) setOrders(ordersData.data);
    if (accountsData.data) setAdAccounts(accountsData.data);
    if (spendsData.data) setAdSpends(spendsData.data);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Account created! You can now sign in." });
      setEmail("");
      setPassword("");
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Signed in successfully!" });
      setEmail("");
      setPassword("");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setStores([]);
    setOrders([]);
    setAdAccounts([]);
    setAdSpends([]);
    toast({ title: "Signed out", description: "You have been signed out successfully." });
  };

  const syncStore = async (storeId: string) => {
    setSyncingStore(storeId);
    const store = stores.find((s) => s.id === storeId);
    if (!store) return;

    const syncStartTime = new Date().toISOString();
    await supabase.from("sync_history").insert({
      store_id: storeId,
      sync_type: "orders",
      status: "pending",
      started_at: syncStartTime,
    });

    try {
      const wooOrders = await fetchWooCommerceOrders(
        store.url,
        store.consumer_key,
        store.consumer_secret
      );

      for (const wooOrder of wooOrders) {
        const total = parseFloat(wooOrder.total);
        const cost = total * 0.3;
        const profit = calculateProfit(total, cost);

        await supabase.from("orders").upsert(
          {
            store_id: storeId,
            woo_order_id: wooOrder.id.toString(),
            order_date: wooOrder.date_created,
            total,
            cost,
            profit,
            status: wooOrder.status,
            items_count: wooOrder.line_items.length,
          },
          { onConflict: "store_id,woo_order_id" }
        );
      }

      await supabase.from("stores").update({ last_sync_at: new Date().toISOString() }).eq("id", storeId);

      await supabase
        .from("sync_history")
        .update({
          status: "success",
          records_synced: wooOrders.length,
          completed_at: new Date().toISOString(),
        })
        .eq("store_id", storeId)
        .eq("started_at", syncStartTime);

      toast({
        title: "Success",
        description: `Synced ${wooOrders.length} orders from ${store.name}`,
      });
      await loadData();
    } catch (error) {
      await supabase
        .from("sync_history")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Unknown error",
          completed_at: new Date().toISOString(),
        })
        .eq("store_id", storeId)
        .eq("started_at", syncStartTime);

      toast({
        title: "Error",
        description: "Failed to sync store. Please check your connection.",
        variant: "destructive",
      });
    } finally {
      setSyncingStore(null);
    }
  };

  const deleteStore = async (storeId: string) => {
    const { error } = await supabase.from("stores").delete().eq("id", storeId);
    if (error) {
      toast({ title: "Error", description: "Failed to delete store.", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Store deleted successfully." });
      await loadData();
    }
  };

  const getFilteredOrders = () => {
    if (!dateRange?.from) return orders;

    const from = startOfDay(dateRange.from);
    const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(new Date());

    return orders.filter((order) => {
      const orderDate = new Date(order.order_date);
      return orderDate >= from && orderDate <= to;
    });
  };

  const filteredOrders = getFilteredOrders();

  const getStoreStats = (storeId: string) => {
    const storeOrders = filteredOrders.filter((o) => o.store_id === storeId);
    const profit = storeOrders.reduce((sum, o) => sum + Number(o.profit), 0);
    const revenue = storeOrders.reduce((sum, o) => sum + Number(o.total), 0);
    return { profit, orders: storeOrders.length, revenue };
  };

  const getTotalStats = () => {
    const totalProfit = filteredOrders.reduce((sum, o) => sum + Number(o.profit), 0);
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const totalCost = filteredOrders.reduce((sum, o) => sum + Number(o.cost), 0);

    const relevantAdSpends = adSpends.filter((spend) => {
      if (!dateRange?.from) return true;
      const spendDate = new Date(spend.date);
      const from = startOfDay(dateRange.from);
      const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(new Date());
      return spendDate >= from && spendDate <= to;
    });

    const totalAdSpend = relevantAdSpends.reduce((sum, s) => sum + Number(s.amount), 0);
    const netProfit = totalProfit - totalAdSpend;

    return {
      totalProfit,
      totalRevenue,
      totalCost,
      totalAdSpend,
      netProfit,
      totalOrders: filteredOrders.length
    };
  };

  const getChartData = () => {
    const dailyData = new Map<string, { revenue: number; profit: number; adSpend: number; cost: number }>();

    filteredOrders.forEach((order) => {
      const date = format(new Date(order.order_date), "MMM dd");
      const current = dailyData.get(date) || { revenue: 0, profit: 0, adSpend: 0, cost: 0 };
      dailyData.set(date, {
        revenue: current.revenue + Number(order.total),
        profit: current.profit + Number(order.profit),
        adSpend: current.adSpend,
        cost: current.cost + Number(order.cost),
      });
    });

    adSpends.forEach((spend) => {
      if (!dateRange?.from) return;
      const spendDate = new Date(spend.date);
      const from = startOfDay(dateRange.from);
      const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(new Date());

      if (spendDate >= from && spendDate <= to) {
        const date = format(spendDate, "MMM dd");
        const current = dailyData.get(date) || { revenue: 0, profit: 0, adSpend: 0, cost: 0 };
        dailyData.set(date, {
          ...current,
          adSpend: current.adSpend + Number(spend.amount),
        });
      }
    });

    return Array.from(dailyData.entries())
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        profit: data.profit,
        adSpend: data.adSpend,
        netProfit: data.profit - data.adSpend,
      }))
      .sort((a, b) => {
        const dateA = new Date(a.date + " " + new Date().getFullYear());
        const dateB = new Date(b.date + " " + new Date().getFullYear());
        return dateA.getTime() - dateB.getTime();
      });
  };

  const getKPIMetrics = () => {
    const stats = getTotalStats();
    const avgOrderValue = stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0;
    const profitMargin = stats.totalRevenue > 0 ? (stats.totalProfit / stats.totalRevenue) * 100 : 0;
    const conversionValue = avgOrderValue;
    const roas = stats.totalAdSpend > 0 ? stats.totalRevenue / stats.totalAdSpend : 0;

    const previousPeriodOrders = orders.filter((order) => {
      if (!dateRange?.from || !dateRange?.to) return false;
      const orderDate = new Date(order.order_date);
      const periodLength = dateRange.to.getTime() - dateRange.from.getTime();
      const previousFrom = new Date(dateRange.from.getTime() - periodLength);
      const previousTo = new Date(dateRange.from.getTime() - 1);
      return orderDate >= previousFrom && orderDate <= previousTo;
    });

    const previousRevenue = previousPeriodOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const previousProfit = previousPeriodOrders.reduce((sum, o) => sum + Number(o.profit), 0);
    const previousAvgOrder = previousPeriodOrders.length > 0 ? previousRevenue / previousPeriodOrders.length : 0;
    const previousMargin = previousRevenue > 0 ? (previousProfit / previousRevenue) * 100 : 0;

    return {
      avgOrderValue,
      avgOrderValueChange: previousAvgOrder > 0 ? ((avgOrderValue - previousAvgOrder) / previousAvgOrder) * 100 : 0,
      profitMargin,
      profitMarginChange: previousMargin > 0 ? ((profitMargin - previousMargin) / previousMargin) * 100 : 0,
      conversionValue,
      conversionValueChange: previousAvgOrder > 0 ? ((conversionValue - previousAvgOrder) / previousAvgOrder) * 100 : 0,
      roas,
      roasChange: 5.2,
    };
  };

  const getAdAccountSpend = (accountId: string) => {
    return adSpends
      .filter((s) => s.ad_account_id === accountId)
      .reduce((sum, s) => sum + Number(s.amount), 0);
  };

  const getStoreAdSpend = (storeId: string) => {
    return adSpends
      .filter((s) => s.store_id === storeId)
      .reduce((sum, s) => sum + Number(s.amount), 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg font-medium text-slate-700">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
        <Toaster />
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-center mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">WooCommerce Profit Tracker</CardTitle>
            <p className="text-center text-sm text-muted-foreground mt-2">
              Advanced analytics for your e-commerce business
            </p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Sign Up
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = getTotalStats();
  const chartData = getChartData();
  const kpiMetrics = getKPIMetrics();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <Toaster />
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              WooCommerce Profit Tracker
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Advanced analytics and insights for your e-commerce business
            </p>
          </div>
          <div className="flex items-center gap-3">
            <DateRangePicker date={dateRange} onDateChange={setDateRange} />
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              <TrendingUp className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${stats.netProfit.toFixed(2)}</div>
              <p className="text-xs opacity-90 mt-1">After ad spend</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
              <p className="text-xs opacity-90 mt-1">From all stores</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ad Spend</CardTitle>
              <DollarSign className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${stats.totalAdSpend.toFixed(2)}</div>
              <p className="text-xs opacity-90 mt-1">All accounts</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalOrders}</div>
              <p className="text-xs opacity-90 mt-1">In selected period</p>
            </CardContent>
          </Card>
        </div>

        <KPIMetrics metrics={kpiMetrics} />

        <AnalyticsChart data={chartData} type="line" />

        <Tabs defaultValue="stores" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="stores">
              <StoreIcon className="h-4 w-4 mr-2" />
              Stores
            </TabsTrigger>
            <TabsTrigger value="orders">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="ads">
              <BarChart3 className="h-4 w-4 mr-2" />
              Ad Spend
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <TrendingUp className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="calculator">
              <CalcIcon className="h-4 w-4 mr-2" />
              Calculator
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stores" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Your Stores</h2>
              <AddStoreDialog onStoreAdded={loadData} />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {stores.map((store) => {
                const storeStats = getStoreStats(store.id);
                return (
                  <StoreCard
                    key={store.id}
                    store={store}
                    profit={storeStats.profit}
                    orders={storeStats.orders}
                    onSync={syncStore}
                    onDelete={deleteStore}
                    syncing={syncingStore === store.id}
                  />
                );
              })}
            </div>

            {stores.length === 0 && (
              <Card className="shadow-lg">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <StoreIcon className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg text-muted-foreground mb-4">No stores added yet</p>
                  <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                    Connect your WooCommerce store to start tracking profits and analyzing performance
                  </p>
                  <AddStoreDialog onStoreAdded={loadData} />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <OrderHistoryTable orders={filteredOrders} />
          </TabsContent>

          <TabsContent value="ads" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Ad Spend Tracking</h2>
              <div className="flex gap-2">
                <AddAdAccountDialog onAccountAdded={loadData} />
                <AddAdSpendDialog onAdSpendAdded={loadData} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Ad Accounts</CardTitle>
                </CardHeader>
                <CardContent>
                  {adAccounts.length === 0 ? (
                    <p className="text-muted-foreground">No ad accounts yet</p>
                  ) : (
                    <div className="space-y-3">
                      {adAccounts.map((account) => (
                        <div
                          key={account.id}
                          className="flex justify-between items-center p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <div>
                            <div className="font-medium">{account.name}</div>
                            <div className="text-sm text-muted-foreground capitalize">
                              {account.platform}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-orange-600 text-lg">
                              ${getAdAccountSpend(account.id).toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground">Total Spend</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Ad Spend by Store</CardTitle>
                </CardHeader>
                <CardContent>
                  {stores.length === 0 ? (
                    <p className="text-muted-foreground">No stores yet</p>
                  ) : (
                    <div className="space-y-3">
                      {stores.map((store) => {
                        const spend = getStoreAdSpend(store.id);
                        const storeStats = getStoreStats(store.id);
                        const roi = spend > 0 ? ((storeStats.profit / spend) * 100).toFixed(1) : "N/A";
                        return (
                          <div
                            key={store.id}
                            className="flex justify-between items-center p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            <div>
                              <div className="font-medium">{store.name}</div>
                              <div className="text-sm text-muted-foreground">
                                ROI: <span className="font-semibold text-green-600">{roi}%</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-orange-600 text-lg">
                                ${spend.toFixed(2)}
                              </div>
                              <div className="text-xs text-muted-foreground">Ad Spend</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <h2 className="text-2xl font-semibold">Detailed Analytics</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Profit Margin</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-green-600">
                    {stats.totalRevenue > 0
                      ? ((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1)
                      : "0.0"}
                    %
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Average profit margin across all orders
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">ROAS</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-blue-600">
                    {stats.totalAdSpend > 0
                      ? (stats.totalRevenue / stats.totalAdSpend).toFixed(2)
                      : "0.00"}
                    x
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Return on ad spend
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Avg Order Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-violet-600">
                    $
                    {stats.totalOrders > 0
                      ? (stats.totalRevenue / stats.totalOrders).toFixed(2)
                      : "0.00"}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Average revenue per order
                  </p>
                </CardContent>
              </Card>
            </div>

            <AnalyticsChart data={chartData} type="bar" />
          </TabsContent>

          <TabsContent value="calculator" className="space-y-4">
            <ProfitCalculator />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
