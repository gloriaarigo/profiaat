export interface WooCommerceOrder {
  id: number;
  date_created: string;
  status: string;
  total: string;
  line_items: Array<{
    id: number;
    name: string;
    quantity: number;
    total: string;
    meta_data: Array<{
      key: string;
      value: string;
    }>;
  }>;
}

export async function fetchWooCommerceOrders(
  storeUrl: string,
  consumerKey: string,
  consumerSecret: string,
  page: number = 1,
  perPage: number = 100
): Promise<WooCommerceOrder[]> {
  const url = new URL(`${storeUrl}/wp-json/wc/v3/orders`);
  url.searchParams.append('page', page.toString());
  url.searchParams.append('per_page', perPage.toString());
  url.searchParams.append('consumer_key', consumerKey);
  url.searchParams.append('consumer_secret', consumerSecret);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Failed to fetch orders: ${response.statusText}`);
  }

  return response.json();
}

export async function testWooCommerceConnection(
  storeUrl: string,
  consumerKey: string,
  consumerSecret: string
): Promise<boolean> {
  try {
    const url = new URL(`${storeUrl}/wp-json/wc/v3/system_status`);
    url.searchParams.append('consumer_key', consumerKey);
    url.searchParams.append('consumer_secret', consumerSecret);

    const response = await fetch(url.toString());
    return response.ok;
  } catch (error) {
    return false;
  }
}

export function calculateProfit(orderTotal: number, productCost: number): number {
  return orderTotal - productCost;
}
