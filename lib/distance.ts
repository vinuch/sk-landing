// Haversine formula to calculate distance between two coordinates
// Returns distance in kilometers

export interface Coordinates {
  lat: number;
  lng: number;
}

// Satellite Kitchen store coordinates (Satellite Town, Lagos)
// F725+8X6, Satellite Town, Lagos, Nigeria
export const STORE_COORDINATES: Coordinates = {
  lat: 6.450811091174003,
  lng: 3.259897122764782,
};

// Earth's radius in kilometers
const EARTH_RADIUS_KM = 6371;

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param coord1 First coordinate (store location)
 * @param coord2 Second coordinate (delivery address)
 * @returns Distance in kilometers
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

  const dLat = toRadians(coord2.lat - coord1.lat);
  const dLng = toRadians(coord2.lng - coord1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.lat)) *
      Math.cos(toRadians(coord2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Check if a delivery address is within the store's delivery radius
 * @param customerCoord Customer's delivery address coordinates
 * @param radiusKm Delivery radius in kilometers (default: 60)
 * @returns Object with distance and whether it's within radius
 */
export function checkDeliveryRadius(
  customerCoord: Coordinates,
  radiusKm: number = 60
): { distance: number; isWithinRadius: boolean } {
  const distance = calculateDistance(STORE_COORDINATES, customerCoord);
  return {
    distance: Math.round(distance * 10) / 10, // Round to 1 decimal place
    isWithinRadius: distance <= radiusKm,
  };
}
