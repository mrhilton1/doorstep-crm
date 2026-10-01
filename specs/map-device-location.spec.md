# Map device location

Behavior: startup centers on device location when already permitted, otherwise the user-selected default address.

Acceptance:
- Opening map automatically requests a position only if Permissions API reports geolocation granted.
- Prompt/denied/unsupported permission query does not trigger automatic browser prompts. Explicit location button can request permission.
- Device fix is preferred over the default address and updates current location marker.
- Workspace loading finishes before the device lookup. Ignore stale asynchronous initialization results.
- Initial map and permission/fix failures use 19828 E Raven Dr, Queen Creek, AZ 85142 at zoom17; never represent fallback as device position. Coordinates are the Census geocoder street-range match, not a surveyed rooftop.
- Explicit location control shows progress, prevents duplicate requests, handles unsupported/denied/timeout errors.
- Leaflet applies zoom changes even when center is unchanged; default address zoom17.
- No localStorage, sessionStorage or Supabase writes of device coordinates.
