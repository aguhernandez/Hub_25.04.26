export const PushNotifications = {
  requestPermissions: async () => ({ receive: 'unavailable' as const }),
  register: async () => {},
  addListener: async (_event: string, _handler: unknown) => ({ remove: async () => {} }),
  removeAllListeners: async () => {},
};
