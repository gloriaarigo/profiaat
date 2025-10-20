import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Store = {
  id: string;
  user_id: string;
  name: string;
  url: string;
  consumer_key: string;
  consumer_secret: string;
  last_sync_at: string | null;
  auto_sync_enabled: boolean;
  sync_frequency_hours: number;
  created_at: string;
  updated_at: string;
};

export type Order = {
  id: string;
  store_id: string;
  woo_order_id: string;
  order_date: string;
  total: number;
  cost: number;
  profit: number;
  status: string;
  shipping_cost: number;
  tax: number;
  discount: number;
  customer_email: string | null;
  items_count: number;
  created_at: string;
  updated_at: string;
};

export type AdAccount = {
  id: string;
  user_id: string;
  name: string;
  platform: string;
  created_at: string;
};

export type AdSpend = {
  id: string;
  ad_account_id: string;
  store_id: string | null;
  date: string;
  amount: number;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  store_id: string;
  woo_product_id: string;
  name: string;
  sku: string | null;
  cost: number;
  price: number;
  category: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  woo_product_id: string | null;
  name: string;
  quantity: number;
  price: number;
  cost: number;
  profit: number;
  created_at: string;
};

export type SyncHistory = {
  id: string;
  store_id: string;
  sync_type: string;
  status: string;
  records_synced: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
};

export type DailyMetric = {
  id: string;
  store_id: string;
  date: string;
  revenue: number;
  cost: number;
  profit: number;
  orders_count: number;
  ad_spend: number;
  net_profit: number;
  created_at: string;
  updated_at: string;
};
