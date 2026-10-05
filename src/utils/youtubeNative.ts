import { Browser } from '@capacitor/browser';

const NATIVE_YOUTUBE_PLAYER_URL = 'https://hub.asciende.pro/youtube-player.html';

export function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;

  try {
    const normalizedUrl = /^[a-z][a-z\d+.-]*:\/\//i.test(url) ? url : `https://${url}`;
    const parsed = new URL(normalizedUrl);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');

    let videoId: string | null = null;
    if (hostname === 'youtu.be') {
      videoId = parsed.pathname.split('/').filter(Boolean)[0] || null;
    } else if (
      hostname === 'youtube.com' ||
      hostname.endsWith('.youtube.com') ||
      hostname === 'youtube-nocookie.com' ||
      hostname.endsWith('.youtube-nocookie.com')
    ) {
      if (parsed.pathname === '/watch') {
        videoId = parsed.searchParams.get('v');
      } else {
        const match = parsed.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/);
        videoId = match?.[1] || null;
      }
    }

    return videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : null;
  } catch {
    return null;
  }
}

export function getYouTubeEmbedUrl(
  url: string,
  playerParams: Record<string, string | number | boolean> = {},
): string | null {
  const id = getYouTubeVideoId(url);
  if (!id) return null;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(playerParams)) {
    params.set(key, String(value));
  }

  if (isNativePlatform()) {
    params.set('videoId', id);
    return `${NATIVE_YOUTUBE_PLAYER_URL}?${params.toString()}`;
  }

  const query = params.toString();
  return `https://www.youtube.com/embed/${id}${query ? `?${query}` : ''}`;
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
  if (typeof window === 'undefined') return false;
  const cap = (window as any).Capacitor;
  if (!cap) return false;
  if (typeof cap.isNativePlatform === 'function') return cap.isNativePlatform();
  return cap.getPlatform?.() === 'ios' || cap.getPlatform?.() === 'android';
}

// Opens the standard YouTube watch page in the system browser.
export function openYouTubeExternally(url: string): void {
  const watchUrl = getYouTubeWatchUrl(url);
  if (watchUrl) {
    void Browser.open({ url: watchUrl });
  }
}
