export const Geolocation = {
  requestPermissions: async () => ({ geolocation: 'unavailable' as const }),
  checkPermissions: async () => ({ geolocation: 'unavailable' as const }),
  getCurrentPosition: async (_opts?: unknown) => { throw new Error('Geolocation unavailable'); },
  watchPosition: async (_opts: unknown, _cb: unknown) => 'unavailable',
  clearWatch: async (_opts?: unknown) => {},
};
