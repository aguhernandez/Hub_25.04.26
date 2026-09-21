import { Browser } from '../stubs/capacitor-browser';

export function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /youtube\.com\/watch\?v=([^&\n?#]+)/,
    /youtu\.be\/([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube-nocookie\.com\/embed\/([^&\n?#]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export function getYouTubeEmbedUrl(url: string): string | null {
  const id = getYouTubeVideoId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

export function getYouTubeThumbnail(url: string): string | null {
  const id = getYouTubeVideoId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

export function getYouTubeWatchUrl(url: string): string | null {
  const id = getYouTubeVideoId(url);
  return id ? `https://www.youtube.com/watch?v=${id}` : null;
}

// Returns true when running inside a Capacitor native app (iOS/Android)
export function isNativePlatform(): boolean {
  return typeof window !== 'undefined'
    && !!(window as any).capacitor
    && (window as any).capacitor.isNativePlatform?.() === true;
}

// Opens the YouTube video in the system browser / Chrome Custom Tab / SFSafariViewController
export function openYouTubeExternally(url: string): void {
  const watchUrl = getYouTubeWatchUrl(url);
  if (watchUrl) {
    Browser.open({ url: watchUrl });
  }
}
