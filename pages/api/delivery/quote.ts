import type { NextApiRequest, NextApiResponse } from 'next';
import type { Coordinates } from '@/lib/distance';

type QuoteRequest = {
  pickup_address: string;
  delivery_address: string;
  pickup_coordinates?: Coordinates;
  delivery_coordinates?: Coordinates;
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
  unavailable_reason?: string;
  error?: string;
};

function getNumericValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

async function geocodeAddress(address: string): Promise<Coordinates | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error('Google Maps API key is missing for Chowdeck quote geocoding');
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

    console.error('Geocoding failed for Chowdeck quote:', data.status, data.error_message, address);
    return null;
  } catch (error) {
    console.error('Error geocoding address for Chowdeck quote:', error);
    return null;
  }
}

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
  pickupCoordinates: Coordinates | null,
  deliveryCoordinates: Coordinates | null
): Promise<{
  deliveryFee: number;
  estimatedTime: string;
  available: boolean;
  unavailableReason?: string;
} | { error: 'missing_api_key' | 'missing_merchant_reference' | 'geocoding_failed' } | null> {
  const chowdeckApiKey = process.env.CHOWDECK_API_KEY?.trim();
  const merchantReference = process.env.CHOWDECK_MERCHANT_REFERENCE?.trim();
  const chowdeckBaseUrl = process.env.CHOWDECK_API_URL?.trim() || 'https://api.chowdeck.com';

  if (!chowdeckApiKey) {
    console.error('Missing CHOWDECK_API_KEY env var for Chowdeck delivery quote');
    return { error: 'missing_api_key' };
  }

  if (!merchantReference) {
    console.error('Missing CHOWDECK_MERCHANT_REFERENCE env var for Chowdeck delivery quote');
    return { error: 'missing_merchant_reference' };
  }

  const [sourceCoordinates, destinationCoordinates] = await Promise.all([
    pickupCoordinates ? Promise.resolve(pickupCoordinates) : geocodeAddress(pickupAddress),
    deliveryCoordinates ? Promise.resolve(deliveryCoordinates) : geocodeAddress(deliveryAddress),
  ]);

  if (!sourceCoordinates || !destinationCoordinates) {
    return { error: 'geocoding_failed' };
  }

  try {
    const quotePayload = {
      source_address: {
        latitude: String(sourceCoordinates.lat),
        longitude: String(sourceCoordinates.lng),
      },
      destination_address: {
        latitude: String(destinationCoordinates.lat),
        longitude: String(destinationCoordinates.lng),
      },
    };

    console.log('Chowdeck quote payload:', quotePayload);

    const response = await fetch(`${chowdeckBaseUrl}/merchant/${merchantReference}/delivery/fee`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${chowdeckApiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(quotePayload),
    });

    if (!response.ok) {
      if (response.status === 400 || response.status === 404) {
        const errorText = await response.text();
        let errorData: Record<string, unknown> = {};
        try {
          errorData = JSON.parse(errorText || '{}') as Record<string, unknown>;
        } catch {
          errorData = { raw: errorText };
        }

        const unavailableReason =
          typeof errorData.message === 'string' ? errorData.message :
          typeof errorData.error === 'string' ? errorData.error :
          typeof errorData.detail === 'string' ? errorData.detail :
          undefined;

        console.warn('Chowdeck delivery unavailable:', {
          status: response.status,
          errorBody: errorData,
          unavailableReason,
          pickupAddress,
          deliveryAddress,
          sourceCoordinates,
          destinationCoordinates,
        });

        return {
          deliveryFee: 0,
          estimatedTime: '',
          available: false,
          unavailableReason,
        };
      }
      
      const errorText = await response.text();
      let errorData: Record<string, unknown> = {};
      try {
        errorData = JSON.parse(errorText || '{}') as Record<string, unknown>;
      } catch {
        errorData = { raw: errorText };
      }
      console.error('Chowdeck API error:', response.status, errorData);
      return null;
    }

    const data = await response.json();

    const deliveryFeeKobo =
      getNumericValue(data.delivery_fee) ??
      getNumericValue(data.fee) ??
      getNumericValue(data.amount) ??
      getNumericValue(data.delivery_amount) ??
      getNumericValue(data.total_fee) ??
      getNumericValue(data.totalFee) ??
      getNumericValue(data.data?.delivery_fee) ??
      getNumericValue(data.data?.fee) ??
      getNumericValue(data.data?.amount) ??
      getNumericValue(data.data?.delivery_amount) ??
      getNumericValue(data.data?.total_fee) ??
      getNumericValue(data.data?.totalFee) ??
      getNumericValue(data.delivery?.fee) ??
      getNumericValue(data.delivery?.amount) ??
      getNumericValue(data.pricing?.fee) ??
      getNumericValue(data.pricing?.amount) ??
      0;

    const deliveryFee = deliveryFeeKobo / 100;

    const estimatedTime =
      (typeof data.estimated_time === 'string' && data.estimated_time) ||
      (typeof data.eta === 'string' && data.eta) ||
      (typeof data.data?.estimated_time === 'string' && data.data.estimated_time) ||
      (typeof data.data?.eta === 'string' && data.data.eta) ||
      '';
    
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

  const {
    pickup_address,
    delivery_address,
    pickup_coordinates,
    delivery_coordinates,
    items,
  } = req.body as QuoteRequest;

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
    pickup_coordinates ?? null,
    delivery_coordinates ?? null
  );

  if (result === null) {
    return res.status(500).json({
      success: false,
      error: 'Could not fetch delivery quote. Please try again later.',
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

  if ('error' in result && result.error === 'geocoding_failed') {
    return res.status(400).json({
      success: false,
      error: 'Could not geocode one or both addresses for Chowdeck delivery quote.',
    });
  }

  if ('error' in result) {
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
      unavailable_reason: result.unavailableReason,
    });
  }

  return res.status(200).json({
    success: true,
    available: true,
    delivery_fee: result.deliveryFee,
    estimated_time: result.estimatedTime,
  });
}
