"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign } from "lucide-react";
import { supabase, Store, AdAccount } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export function AddAdSpendDialog({ onAdSpendAdded }: { onAdSpendAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [formData, setFormData] = useState({
    ad_account_id: "",
    store_id: "",
    date: new Date().toISOString().split("T")[0],
    amount: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    const { data: accountsData } = await supabase
      .from("ad_accounts")
      .select("*")
      .order("name");
    const { data: storesData } = await supabase
      .from("stores")
      .select("*")
      .order("name");

    if (accountsData) setAdAccounts(accountsData);
    if (storesData) setStores(storesData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("ad_spend").insert({
        ad_account_id: formData.ad_account_id,
        store_id: formData.store_id || null,
        date: formData.date,
        amount: parseFloat(formData.amount),
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Ad spend added successfully!",
      });

      setFormData({
        ad_account_id: "",
        store_id: "",
        date: new Date().toISOString().split("T")[0],
        amount: "",
      });
      setOpen(false);
      onAdSpendAdded();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add ad spend. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <DollarSign className="mr-2 h-4 w-4" />
          Add Ad Spend
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Ad Spend</DialogTitle>
            <DialogDescription>
              Track advertising expenses per account and store.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="ad_account">Ad Account</Label>
              <Select
                value={formData.ad_account_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, ad_account_id: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select ad account" />
                </SelectTrigger>
                <SelectContent>
                  {adAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.platform})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="store">Store (Optional)</Label>
              <Select
                value={formData.store_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, store_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select store or leave blank" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Ad Spend"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
