"use client";

import { useState } from "react";
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
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { testWooCommerceConnection } from "@/lib/woocommerce";
import { useToast } from "@/hooks/use-toast";

export function AddStoreDialog({ onStoreAdded }: { onStoreAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    consumer_key: "",
    consumer_secret: "",
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const isValid = await testWooCommerceConnection(
        formData.url,
        formData.consumer_key,
        formData.consumer_secret
      );

      if (!isValid) {
        toast({
          title: "Connection Failed",
          description: "Could not connect to WooCommerce store. Please check your credentials.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        toast({
          title: "Error",
          description: "You must be logged in to add a store.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("stores").insert({
        user_id: userData.user.id,
        ...formData,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Store added successfully!",
      });

      setFormData({ name: "", url: "", consumer_key: "", consumer_secret: "" });
      setOpen(false);
      onStoreAdded();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add store. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Store
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add WooCommerce Store</DialogTitle>
            <DialogDescription>
              Enter your WooCommerce store details to connect and track profits.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Store Name</Label>
              <Input
                id="name"
                placeholder="My Store"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="url">Store URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://mystore.com"
                value={formData.url}
                onChange={(e) =>
                  setFormData({ ...formData, url: e.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="consumer_key">Consumer Key</Label>
              <Input
                id="consumer_key"
                placeholder="ck_..."
                value={formData.consumer_key}
                onChange={(e) =>
                  setFormData({ ...formData, consumer_key: e.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="consumer_secret">Consumer Secret</Label>
              <Input
                id="consumer_secret"
                type="password"
                placeholder="cs_..."
                value={formData.consumer_secret}
                onChange={(e) =>
                  setFormData({ ...formData, consumer_secret: e.target.value })
                }
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Store"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
