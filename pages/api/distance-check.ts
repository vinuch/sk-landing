import type { NextApiRequest, NextApiResponse } from 'next';
import { checkDeliveryRadius, Coordinates } from '@/lib/distance';

type DistanceCheckRequest = {
  address: string;
};

type DistanceCheckResponse = {
  success: boolean;
  distance?: number;
  isWithinRadius?: boolean;
  error?: string;
};

/**
 * Geocode an address using Google Maps Geocoding API
 * Returns lat/lng coordinates
 */
async function geocodeAddress(address: string): Promise<Coordinates | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.error('Google Maps API key is missing');
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

    console.error('Geocoding failed:', data.status, data.error_message);
    return null;
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DistanceCheckResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { address } = req.body as DistanceCheckRequest;

  if (!address || typeof address !== 'string' || address.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Address is required' });
  }

  // Geocode the address to get coordinates
  const coordinates = await geocodeAddress(address.trim());

  if (!coordinates) {
    return res.status(400).json({ 
      success: false, 
      error: 'Could not geocode address. Please check the address and try again.' 
    });
  }

  // Check if within delivery radius (50km)
  const { distance, isWithinRadius } = checkDeliveryRadius(coordinates, 50);

  return res.status(200).json({
    success: true,
    distance,
    isWithinRadius,
  });
}
