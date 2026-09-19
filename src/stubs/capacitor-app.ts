export const App = {
  addListener: async (event: string, cb: (data: any) => void) => {
    if (event === 'appStateChange' && typeof document !== 'undefined') {
      const handler = () => {
        const isVisible = !document.hidden;
        cb({ isActive: isVisible });
      };
      document.addEventListener('visibilitychange', handler);
      return { remove: () => document.removeEventListener('visibilitychange', handler) };
    }
    return { remove: () => {} };
  },
  removeAllListeners: async () => {},
};
