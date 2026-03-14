import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import type { Coordinates } from '@/lib/distance';

type BookRequest = {
  order_id: number;
  pickup_address: string;
  delivery_address: string;
  pickup_coordinates?: Coordinates;
  delivery_coordinates?: Coordinates;
  items: Array<{
    name: string;
    quantity: number;
    price?: number;
  }>;
  customer_phone: string;
};

type ContactPayload = {
  name?: string;
  phone: string;
  email: string;
  country_code: 'NG';
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
async function geocodeAddress(address: string): Promise<Coordinates | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error('Google Maps API key is missing for Chowdeck booking geocoding');
    return null;
  }

  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}&region=ng`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng };
    }

    console.error('Geocoding failed for Chowdeck booking:', data.status, data.error_message, address);
    return null;
  } catch (error) {
    console.error('Error geocoding address for Chowdeck booking:', error);
    return null;
  }
}

async function getDeliveryFeeId(
  chowdeckBaseUrl: string,
  merchantReference: string,
  chowdeckApiKey: string,
  pickupAddress: string,
  deliveryAddress: string,
  pickupCoordinates: Coordinates | null,
  deliveryCoordinates: Coordinates | null
): Promise<string | null> {
  const [sourceCoordinates, destinationCoordinates] = await Promise.all([
    pickupCoordinates ? Promise.resolve(pickupCoordinates) : geocodeAddress(pickupAddress),
    deliveryCoordinates ? Promise.resolve(deliveryCoordinates) : geocodeAddress(deliveryAddress),
  ]);

  if (!sourceCoordinates || !destinationCoordinates) {
    return null;
  }

  const response = await fetch(`${chowdeckBaseUrl}/merchant/${merchantReference}/delivery/fee`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${chowdeckApiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      source_address: {
        latitude: String(sourceCoordinates.lat),
        longitude: String(sourceCoordinates.lng),
      },
      destination_address: {
        latitude: String(destinationCoordinates.lat),
        longitude: String(destinationCoordinates.lng),
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Chowdeck fee lookup error:', response.status, errorData);
    return null;
  }

  const data = await response.json();
  const feeId = data?.data?.id || data?.id;
  return typeof feeId === 'string' || typeof feeId === 'number' ? String(feeId) : null;
}

async function createChowdeckDelivery(
  pickupAddress: string,
  deliveryAddress: string,
  pickupCoordinates: Coordinates | null,
  deliveryCoordinates: Coordinates | null,
  items: BookRequest['items'],
  customerPhone: string,
  orderReference: string,
  destinationContact: ContactPayload,
  sourceContact: ContactPayload
): Promise<{ 
  deliveryId: string; 
  riderName: string; 
  riderPhone: string; 
  trackingUrl: string;
  status: string;
} | { error: 'missing_api_key' | 'missing_merchant_reference' | 'missing_fee_id' } | null> {
  const chowdeckApiKey = process.env.CHOWDECK_API_KEY?.trim();
  const merchantReference = process.env.CHOWDECK_MERCHANT_REFERENCE?.trim();
  const chowdeckBaseUrl = process.env.CHOWDECK_API_URL?.trim() || 'https://api.chowdeck.com';

  if (!chowdeckApiKey) {
    console.error('Missing CHOWDECK_API_KEY env var for Chowdeck delivery booking');
    return { error: 'missing_api_key' };
  }

  if (!merchantReference) {
    console.error('Missing CHOWDECK_MERCHANT_REFERENCE env var for Chowdeck delivery booking');
    return { error: 'missing_merchant_reference' };
  }

  try {
    const feeId = await getDeliveryFeeId(
      chowdeckBaseUrl,
      merchantReference,
      chowdeckApiKey,
      pickupAddress,
      deliveryAddress,
      pickupCoordinates,
      deliveryCoordinates
    );

    if (!feeId) {
      console.error('Missing fee_id for Chowdeck delivery booking');
      return { error: 'missing_fee_id' };
    }

    const response = await fetch(`${chowdeckBaseUrl}/merchant/${merchantReference}/delivery`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${chowdeckApiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        destination_contact: destinationContact,
        source_contact: sourceContact,
        fee_id: feeId,
        item_type: 'food',
        user_action: 'sending',
        order_reference: orderReference,
        metadata: {
          pickup_address: pickupAddress,
          delivery_address: deliveryAddress,
          customer_phone: customerPhone,
          items: items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price || 0,
          })),
        },
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

  const {
    order_id,
    pickup_address,
    delivery_address,
    pickup_coordinates,
    delivery_coordinates,
    items,
    customer_phone,
  } = req.body as BookRequest;

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
    .select('id, user_id, payment_status, delivery_status, delivery_tracking')
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
  const merchantPhone = process.env.CHOWDECK_SOURCE_PHONE?.trim() || customer_phone.trim();
  const merchantEmail = process.env.CHOWDECK_SOURCE_EMAIL?.trim() || 'orders@satellitekitchen.app';
  const merchantName = process.env.CHOWDECK_SOURCE_NAME?.trim() || 'Satellite Kitchen';
  const customerEmail = order.user_id
    ? (await supabaseAdmin.auth.admin.getUserById(order.user_id)).data?.user?.email || `customer-${order_id}@satellitekitchen.app`
    : `customer-${order_id}@satellitekitchen.app`;

  const result = await createChowdeckDelivery(
    pickup_address.trim(),
    delivery_address.trim(),
    pickup_coordinates ?? null,
    delivery_coordinates ?? null,
    items,
    customer_phone.trim(),
    orderReference,
    {
      name: `Customer ${order_id}`,
      phone: customer_phone.trim(),
      email: customerEmail,
      country_code: 'NG',
    },
    {
      name: merchantName,
      phone: merchantPhone,
      email: merchantEmail,
      country_code: 'NG',
    }
  );

  if (result === null) {
    return res.status(500).json({
      success: false,
      error: 'Could not book delivery with Chowdeck. Please try again later.',
    });
  }

  if ('error' in result && result.error === 'missing_api_key') {
    return res.status(500).json({
      success: false,
      error: 'Missing CHOWDECK_API_KEY server env var. Add it to .env or .env.local and restart Next.js.',
    });
  }

  if ('error' in result && result.error === 'missing_merchant_reference') {
    return res.status(500).json({
      success: false,
      error: 'Missing CHOWDECK_MERCHANT_REFERENCE server env var. Add it to .env or .env.local and restart Next.js.',
    });
  }

  if ('error' in result && result.error === 'missing_fee_id') {
    return res.status(500).json({
      success: false,
      error: 'Could not get a Chowdeck fee_id for this delivery booking.',
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
      delivery_tracking: 'ready',
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
