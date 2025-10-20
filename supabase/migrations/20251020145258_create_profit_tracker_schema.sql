/*
  # WooCommerce Profit Tracker Schema

  1. New Tables
    - `stores`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text) - Store name
      - `url` (text) - Store URL
      - `consumer_key` (text) - WooCommerce API key
      - `consumer_secret` (text) - WooCommerce API secret
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `orders`
      - `id` (uuid, primary key)
      - `store_id` (uuid, references stores)
      - `woo_order_id` (text) - WooCommerce order ID
      - `order_date` (timestamptz)
      - `total` (numeric) - Order total
      - `cost` (numeric) - Product cost
      - `profit` (numeric) - Calculated profit
      - `status` (text) - Order status
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `ad_accounts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text) - Ad account name
      - `platform` (text) - Ad platform (Facebook, Google, etc.)
      - `created_at` (timestamptz)
    
    - `ad_spend`
      - `id` (uuid, primary key)
      - `ad_account_id` (uuid, references ad_accounts)
      - `store_id` (uuid, references stores, nullable)
      - `date` (date)
      - `amount` (numeric)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  url text NOT NULL,
  consumer_key text NOT NULL,
  consumer_secret text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES stores ON DELETE CASCADE NOT NULL,
  woo_order_id text NOT NULL,
  order_date timestamptz NOT NULL,
  total numeric NOT NULL DEFAULT 0,
  cost numeric NOT NULL DEFAULT 0,
  profit numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(store_id, woo_order_id)
);

CREATE TABLE IF NOT EXISTS ad_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  platform text NOT NULL DEFAULT 'facebook',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ad_spend (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_account_id uuid REFERENCES ad_accounts ON DELETE CASCADE NOT NULL,
  store_id uuid REFERENCES stores ON DELETE SET NULL,
  date date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(ad_account_id, store_id, date)
);

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_spend ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stores"
  ON stores FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stores"
  ON stores FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stores"
  ON stores FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own stores"
  ON stores FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view orders from own stores"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = orders.store_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert orders for own stores"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = orders.store_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update orders from own stores"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = orders.store_id
      AND stores.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = orders.store_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete orders from own stores"
  ON orders FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = orders.store_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own ad accounts"
  ON ad_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ad accounts"
  ON ad_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ad accounts"
  ON ad_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ad accounts"
  ON ad_accounts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view ad spend from own accounts"
  ON ad_spend FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ad_accounts
      WHERE ad_accounts.id = ad_spend.ad_account_id
      AND ad_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert ad spend for own accounts"
  ON ad_spend FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ad_accounts
      WHERE ad_accounts.id = ad_spend.ad_account_id
      AND ad_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update ad spend from own accounts"
  ON ad_spend FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ad_accounts
      WHERE ad_accounts.id = ad_spend.ad_account_id
      AND ad_accounts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ad_accounts
      WHERE ad_accounts.id = ad_spend.ad_account_id
      AND ad_accounts.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_stores_user_id ON stores(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_ad_accounts_user_id ON ad_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_spend_account_id ON ad_spend(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_ad_spend_store_id ON ad_spend(store_id);
CREATE INDEX IF NOT EXISTS idx_ad_spend_date ON ad_spend(date);