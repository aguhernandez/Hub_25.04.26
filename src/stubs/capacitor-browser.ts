// Web fallback: in native builds, Capacitor replaces this with the real
// @capacitor/browser plugin. In web/preview, we fall back to window.open.
export const Browser = {
  open: async (opts: { url: string; windowName?: string }) => {
    if (typeof window !== 'undefined') {
      window.open(opts.url, opts.windowName || '_blank');
    }
  },
  close: async () => {
    if (typeof window !== 'undefined') {
      window.close();
    }
  },
  addListener: async (_event: string, _cb: unknown) => ({ remove: () => {} }),
  removeAllListeners: async () => {},
};
