import type { NextApiRequest, NextApiResponse } from 'next';

type QuoteRequest = {
  pickup_address: string;
  delivery_address: string;
  items: Array<{
    name: string;
    quantity: number;
    price?: number;
  }>;
};

type QuoteResponse = {
  success: boolean;
  delivery_fee?: number;
  estimated_time?: string;
  available?: boolean;
  error?: string;
};

/**
 * Chowdeck API - Get Delivery Fee
 * POST /delivery/fee
 * 
 * Request body:
 * - pickup_address: string
 * - delivery_address: string
 * - items: array of items with name, quantity, price (optional)
 * 
 * Response:
 * - delivery_fee: number (in Naira)
 * - estimated_time: string (e.g., "30-45 mins")
 * - available: boolean
 */
async function getChowdeckDeliveryFee(
  pickupAddress: string,
  deliveryAddress: string,
  items: QuoteRequest['items']
): Promise<{ deliveryFee: number; estimatedTime: string; available: boolean } | null> {
  const chowdeckApiKey = process.env.CHOWDECK_API_KEY;
  const chowdeckBaseUrl = process.env.CHOWDECK_API_URL || 'https://api.chowdeck.com/v1';

  if (!chowdeckApiKey) {
    console.error('Chowdeck API key is missing');
    return null;
  }

  try {
    const response = await fetch(`${chowdeckBaseUrl}/delivery/fee`, {
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
      }),
    });

    if (!response.ok) {
      // If Chowdeck returns 400/404, it means delivery is not available to this location
      if (response.status === 400 || response.status === 404) {
        return {
          deliveryFee: 0,
          estimatedTime: '',
          available: false,
        };
      }
      
      const errorData = await response.json().catch(() => ({}));
      console.error('Chowdeck API error:', response.status, errorData);
      return null;
    }

    const data = await response.json();
    
    // Chowdeck returns fee in kobo, convert to Naira
    const feeInKobo = data.delivery_fee || data.fee || 0;
    
    return {
      deliveryFee: feeInKobo / 100,
      estimatedTime: data.estimated_time || data.eta || '30-45 mins',
      available: data.available !== false,
    };
  } catch (error) {
    console.error('Error calling Chowdeck API:', error);
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<QuoteResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { pickup_address, delivery_address, items } = req.body as QuoteRequest;

  // Validate required fields
  if (!pickup_address || typeof pickup_address !== 'string' || pickup_address.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Pickup address is required' });
  }

  if (!delivery_address || typeof delivery_address !== 'string' || delivery_address.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Delivery address is required' });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, error: 'Items are required' });
  }

  // Get delivery fee from Chowdeck
  const result = await getChowdeckDeliveryFee(
    pickup_address.trim(),
    delivery_address.trim(),
    items
  );

  if (result === null) {
    return res.status(500).json({
      success: false,
      error: 'Could not fetch delivery quote. Please try again later.',
    });
  }

  if (!result.available) {
    return res.status(200).json({
      success: true,
      available: false,
      delivery_fee: 0,
      estimated_time: '',
    });
  }

  return res.status(200).json({
    success: true,
    available: true,
    delivery_fee: result.deliveryFee,
    estimated_time: result.estimatedTime,
  });
}
