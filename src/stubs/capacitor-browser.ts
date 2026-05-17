export const Browser = {
  open: async (_opts: { url: string; windowName?: string }) => {},
  close: async () => {},
  addListener: async (_event: string, _cb: unknown) => ({ remove: () => {} }),
  removeAllListeners: async () => {},
};
