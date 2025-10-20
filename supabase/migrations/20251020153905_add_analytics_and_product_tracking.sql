/*
  # Enhanced Analytics and Product Tracking Schema

  1. New Tables
    - `products`
      - `id` (uuid, primary key)
      - `store_id` (uuid, references stores)
      - `woo_product_id` (text) - WooCommerce product ID
      - `name` (text) - Product name
      - `sku` (text) - Product SKU
      - `cost` (numeric) - Product cost
      - `price` (numeric) - Selling price
      - `category` (text) - Product category
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `order_items`
      - `id` (uuid, primary key)
      - `order_id` (uuid, references orders)
      - `product_id` (uuid, references products, nullable)
      - `woo_product_id` (text)
      - `name` (text)
      - `quantity` (integer)
      - `price` (numeric)
      - `cost` (numeric)
      - `profit` (numeric)
      - `created_at` (timestamptz)
    
    - `sync_history`
      - `id` (uuid, primary key)
      - `store_id` (uuid, references stores)
      - `sync_type` (text) - orders, products, etc.
      - `status` (text) - success, failed
      - `records_synced` (integer)
      - `error_message` (text, nullable)
      - `started_at` (timestamptz)
      - `completed_at` (timestamptz)
    
    - `daily_metrics`
      - `id` (uuid, primary key)
      - `store_id` (uuid, references stores)
      - `date` (date)
      - `revenue` (numeric)
      - `cost` (numeric)
      - `profit` (numeric)
      - `orders_count` (integer)
      - `ad_spend` (numeric)
      - `net_profit` (numeric)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. New Columns for Existing Tables
    - `stores` table
      - `last_sync_at` (timestamptz)
      - `auto_sync_enabled` (boolean)
      - `sync_frequency_hours` (integer)
    
    - `orders` table
      - `shipping_cost` (numeric)
      - `tax` (numeric)
      - `discount` (numeric)
      - `customer_email` (text)
      - `items_count` (integer)

  3. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to manage their own data

  4. Indexes
    - Add indexes for performance optimization on frequently queried columns
*/

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES stores ON DELETE CASCADE NOT NULL,
  woo_product_id text NOT NULL,
  name text NOT NULL,
  sku text,
  cost numeric DEFAULT 0,
  price numeric DEFAULT 0,
  category text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(store_id, woo_product_id)
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products ON DELETE SET NULL,
  woo_product_id text,
  name text NOT NULL,
  quantity integer DEFAULT 1,
  price numeric DEFAULT 0,
  cost numeric DEFAULT 0,
  profit numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create sync_history table
CREATE TABLE IF NOT EXISTS sync_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES stores ON DELETE CASCADE NOT NULL,
  sync_type text NOT NULL DEFAULT 'orders',
  status text NOT NULL DEFAULT 'pending',
  records_synced integer DEFAULT 0,
  error_message text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create daily_metrics table
CREATE TABLE IF NOT EXISTS daily_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES stores ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  revenue numeric DEFAULT 0,
  cost numeric DEFAULT 0,
  profit numeric DEFAULT 0,
  orders_count integer DEFAULT 0,
  ad_spend numeric DEFAULT 0,
  net_profit numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(store_id, date)
);

-- Add new columns to stores table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'last_sync_at'
  ) THEN
    ALTER TABLE stores ADD COLUMN last_sync_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'auto_sync_enabled'
  ) THEN
    ALTER TABLE stores ADD COLUMN auto_sync_enabled boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'sync_frequency_hours'
  ) THEN
    ALTER TABLE stores ADD COLUMN sync_frequency_hours integer DEFAULT 24;
  END IF;
END $$;

-- Add new columns to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'shipping_cost'
  ) THEN
    ALTER TABLE orders ADD COLUMN shipping_cost numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'tax'
  ) THEN
    ALTER TABLE orders ADD COLUMN tax numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'discount'
  ) THEN
    ALTER TABLE orders ADD COLUMN discount numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'customer_email'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'items_count'
  ) THEN
    ALTER TABLE orders ADD COLUMN items_count integer DEFAULT 0;
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for products table
CREATE POLICY "Users can view products from own stores"
  ON products FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = products.store_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert products for own stores"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = products.store_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update products from own stores"
  ON products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = products.store_id
      AND stores.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = products.store_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete products from own stores"
  ON products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = products.store_id
      AND stores.user_id = auth.uid()
    )
  );

-- RLS Policies for order_items table
CREATE POLICY "Users can view order items from own stores"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      JOIN stores ON stores.id = orders.store_id
      WHERE orders.id = order_items.order_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert order items for own stores"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      JOIN stores ON stores.id = orders.store_id
      WHERE orders.id = order_items.order_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update order items from own stores"
  ON order_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      JOIN stores ON stores.id = orders.store_id
      WHERE orders.id = order_items.order_id
      AND stores.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      JOIN stores ON stores.id = orders.store_id
      WHERE orders.id = order_items.order_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete order items from own stores"
  ON order_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      JOIN stores ON stores.id = orders.store_id
      WHERE orders.id = order_items.order_id
      AND stores.user_id = auth.uid()
    )
  );

-- RLS Policies for sync_history table
CREATE POLICY "Users can view sync history from own stores"
  ON sync_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = sync_history.store_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert sync history for own stores"
  ON sync_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = sync_history.store_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sync history from own stores"
  ON sync_history FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = sync_history.store_id
      AND stores.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = sync_history.store_id
      AND stores.user_id = auth.uid()
    )
  );

-- RLS Policies for daily_metrics table
CREATE POLICY "Users can view daily metrics from own stores"
  ON daily_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = daily_metrics.store_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert daily metrics for own stores"
  ON daily_metrics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = daily_metrics.store_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update daily metrics from own stores"
  ON daily_metrics FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = daily_metrics.store_id
      AND stores.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = daily_metrics.store_id
      AND stores.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_woo_product_id ON products(woo_product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_store_id ON sync_history(store_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_started_at ON sync_history(started_at);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_store_id ON daily_metrics(store_id);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(date);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_store_date ON daily_metrics(store_id, date);