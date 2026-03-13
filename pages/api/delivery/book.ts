import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

type BookRequest = {
  order_id: number;
  pickup_address: string;
  delivery_address: string;
  items: Array<{
    name: string;
    quantity: number;
    price?: number;
  }>;
  customer_phone: string;
};

type BookResponse = {
  success: boolean;
  delivery_id?: string;
  rider_name?: string;
  rider_phone?: string;
  tracking_url?: string;
  error?: string;
};

/**
 * Chowdeck API - Create Delivery
 * POST /delivery
 * 
 * Request body:
 * - pickup_address: string
 * - delivery_address: string
 * - items: array of items
 * - customer_phone: string
 * - order_reference: string (optional)
 * 
 * Response:
 * - delivery_id: string
 * - rider_name: string
 * - rider_phone: string
 * - tracking_url: string
 * - status: string
 */
async function createChowdeckDelivery(
  pickupAddress: string,
  deliveryAddress: string,
  items: BookRequest['items'],
  customerPhone: string,
  orderReference: string
): Promise<{ 
  deliveryId: string; 
  riderName: string; 
  riderPhone: string; 
  trackingUrl: string;
  status: string;
} | null> {
  const chowdeckApiKey = process.env.CHOWDECK_API_KEY;
  const chowdeckBaseUrl = process.env.CHOWDECK_API_URL || 'https://api.chowdeck.com/v1';

  if (!chowdeckApiKey) {
    console.error('Chowdeck API key is missing');
    return null;
  }

  try {
    const response = await fetch(`${chowdeckBaseUrl}/delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${chowdeckApiKey}`,
      },
      body: JSON.stringify({
        pickup_address: pickupAddress,
        delivery_address: deliveryAddress,
        items: items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price || 0,
        })),
        customer_phone: customerPhone,
        order_reference: orderReference,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Chowdeck API error:', response.status, errorData);
      return null;
    }

    const data = await response.json();
    
    return {
      deliveryId: data.delivery_id || data.id || '',
      riderName: data.rider_name || data.rider?.name || 'Pending Assignment',
      riderPhone: data.rider_phone || data.rider?.phone || '',
      trackingUrl: data.tracking_url || data.tracking?.url || '',
      status: data.status || 'pending',
    };
  } catch (error) {
    console.error('Error calling Chowdeck API:', error);
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BookResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Verify admin key
  const adminKey = process.env.ORDER_ADMIN_KEY;
  const incomingAdminKey = (req.headers['x-admin-key'] as string) || '';

  if (!adminKey) {
    return res.status(500).json({ success: false, error: 'Missing ORDER_ADMIN_KEY' });
  }

  if (!incomingAdminKey || incomingAdminKey !== adminKey) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return res.status(500).json({
      success: false,
      error: 'Missing Supabase server config',
    });
  }

  const { order_id, pickup_address, delivery_address, items, customer_phone } = req.body as BookRequest;

  // Validate required fields
  if (!order_id || typeof order_id !== 'number' || order_id <= 0) {
    return res.status(400).json({ success: false, error: 'Valid order_id is required' });
  }

  if (!pickup_address || typeof pickup_address !== 'string' || pickup_address.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Pickup address is required' });
  }

  if (!delivery_address || typeof delivery_address !== 'string' || delivery_address.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Delivery address is required' });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, error: 'Items are required' });
  }

  if (!customer_phone || typeof customer_phone !== 'string' || customer_phone.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Customer phone is required' });
  }

  // Get order details to verify it exists and is paid
  const { data: order, error: orderError } = await supabaseAdmin
    .from('Orders')
    .select('id, payment_status, delivery_status, delivery_tracking')
    .eq('id', order_id)
    .single();

  if (orderError || !order) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }

  if (!order.payment_status) {
    return res.status(400).json({ success: false, error: 'Order must be paid before booking a rider' });
  }

  // Create delivery with Chowdeck
  const orderReference = `SK-${order_id}`;
  const result = await createChowdeckDelivery(
    pickup_address.trim(),
    delivery_address.trim(),
    items,
    customer_phone.trim(),
    orderReference
  );

  if (result === null) {
    return res.status(500).json({
      success: false,
      error: 'Could not book delivery with Chowdeck. Please try again later.',
    });
  }

  // Update order with delivery details
  const { error: updateError } = await supabaseAdmin
    .from('Orders')
    .update({
      delivery_id: result.deliveryId,
      rider_name: result.riderName,
      rider_phone: result.riderPhone,
      tracking_url: result.trackingUrl,
      delivery_tracking: 'rider_assigned',
    })
    .eq('id', order_id);

  if (updateError) {
    console.error('Failed to update order with delivery details:', updateError);
    // Return success but log the error - delivery was created but not saved
  }

  return res.status(200).json({
    success: true,
    delivery_id: result.deliveryId,
    rider_name: result.riderName,
    rider_phone: result.riderPhone,
    tracking_url: result.trackingUrl,
  });
}
