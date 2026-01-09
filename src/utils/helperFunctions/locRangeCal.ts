import { type IProvider } from "../../models/Providers.js";

export const isProviderInRange = (
  providers: IProvider[],
  userLat: number,
  userLng: number,
  radiusKm: number,
): boolean => {
  for (const provider of providers) {
    const coords = provider.serviceLocation?.coordinates;
    if (!coords || coords.length !== 2) continue;

    const providerLng = coords[0];
    const providerLat = coords[1];

    const distanceKm = getDistanceFromLatLonInKm(userLat, userLng, providerLat, providerLng);
    if (distanceKm <= radiusKm) {
      return true;
    }
  }
  return false;
};

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}
