export const Camera = {
  requestPermissions: async (_opts?: unknown) => ({ camera: 'unavailable' as const, photos: 'unavailable' as const }),
  getPhoto: async (_opts?: unknown) => { throw new Error('Camera unavailable'); },
  checkPermissions: async () => ({ camera: 'unavailable' as const, photos: 'unavailable' as const }),
};

export const CameraResultType = { Uri: 'uri', Base64: 'base64', DataUrl: 'dataUrl' };
export const CameraSource = { Camera: 'CAMERA', Photos: 'PHOTOS', Prompt: 'PROMPT' };
