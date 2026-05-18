export const Geolocation = {
  requestPermissions: async () => ({ location: 'unavailable' as const, coarseLocation: 'unavailable' as const }),
  checkPermissions: async () => ({ location: 'unavailable' as const, coarseLocation: 'unavailable' as const }),
  getCurrentPosition: async (_opts?: unknown) => { throw new Error('Geolocation unavailable'); },
  watchPosition: async (_opts: unknown, _cb: unknown) => 'unavailable',
  clearWatch: async (_opts?: unknown) => {},
};
