export function haversineDistanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371;

  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);

  const aa =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
}
