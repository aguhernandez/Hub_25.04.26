export const Media = {
  getAlbums: async () => ({ albums: [] }),
  createAlbum: async (_opts?: unknown) => ({ identifier: '', id: '' }),
  savePhoto: async (_opts?: unknown) => {},
  saveVideo: async (_opts?: unknown) => {},
  saveGif: async (_opts?: unknown) => {},
  getMedias: async (_opts?: unknown) => ({ medias: [] }),
};
