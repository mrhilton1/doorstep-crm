// 19828 E Raven Dr, Queen Creek, AZ 85142; Census address-range geocoder.
export const DEFAULT_MAP_CENTER: [number, number] = [33.267966041792, -111.655196485262];
export const DEFAULT_MAP_ZOOM = 17;

export type DevicePosition = [number, number];
export function requestDeviceLocation(geo: Geolocation | undefined): Promise<DevicePosition> {
  if (!geo) return Promise.reject(new Error('This browser does not support device location.'));
  return new Promise((resolve, reject) => geo.getCurrentPosition(
    position => resolve([position.coords.latitude, position.coords.longitude]),
    error => reject(new Error(error.code === 1
      ? 'Location is blocked. Allow location for this site in your browser settings, then try again.'
      : error.code === 3 ? 'Location timed out. Check device Location Services and try again.'
      : 'Your device could not determine its location. Check Location Services and try again.')),
    {enableHighAccuracy:true, timeout:10000, maximumAge:60000}
  ));
}
export async function grantedDeviceLocation(nav: Pick<Navigator, 'permissions' | 'geolocation'>): Promise<DevicePosition | null> {
  try {
    if (!nav.permissions || !nav.geolocation) return null;
    const permission = await nav.permissions.query({name:'geolocation'});
    if (permission.state !== 'granted') return null;
    return await requestDeviceLocation(nav.geolocation);
  } catch { return null; }
}
