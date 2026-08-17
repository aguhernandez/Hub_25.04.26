export const Filesystem = {
  writeFile: async (_opts?: unknown) => ({ uri: '' }),
  readFile: async (_opts?: unknown) => ({ data: '' }),
  deleteFile: async (_opts?: unknown) => {},
  mkdir: async (_opts?: unknown) => {},
  readdir: async (_opts?: unknown) => ({ files: [] }),
  stat: async (_opts?: unknown) => ({ type: 'file', size: 0, ctime: 0, mtime: 0, uri: '' }),
};

export const Directory = {
  Documents: 'DOCUMENTS',
  Data: 'DATA',
  Library: 'LIBRARY',
  Cache: 'CACHE',
  External: 'EXTERNAL',
  ExternalStorage: 'EXTERNAL_STORAGE',
};

export const Encoding = {
  UTF8: 'utf8',
  ASCII: 'ascii',
  UTF16: 'utf16',
};
