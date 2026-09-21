import { useEffect, useRef, useState, useCallback } from 'react';
import { YoutubePlayer } from '@capgo/capacitor-youtube-player';
import { isNativePlatform, getYouTubeVideoId } from '../../utils/youtubeNative';
import { X, AlertCircle } from 'lucide-react';

interface NativeYouTubePlayerProps {
  videoUrl: string;
  playerId: string;
  onClose?: () => void;
  language?: string;
  autoplay?: boolean;
}

export default function NativeYouTubePlayer({
  videoUrl,
  playerId,
  onClose,
  language = 'en',
  autoplay = false,
}: NativeYouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerReadyRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const videoId = getYouTubeVideoId(videoUrl);

  const initPlayer = useCallback(async () => {
    if (!videoId || !containerRef.current) return;

    try {
      const rect = containerRef.current.getBoundingClientRect();
      const width = Math.round(rect.width) || 400;
      const height = Math.round(rect.height) || 225;

      await YoutubePlayer.initialize({
        playerId,
        videoId,
        playerSize: { width, height },
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          controls: 1,
        },
      });
      playerReadyRef.current = true;
      setLoading(false);
    } catch (e) {
      console.error('[NativeYouTubePlayer] init error:', e);
      setError(language === 'es' ? 'No se pudo cargar el video' : 'Could not load video');
      setLoading(false);
    }
  }, [videoId, playerId, autoplay, language]);

  useEffect(() => {
    if (!isNativePlatform() || !videoId) return;

    let destroyed = false;

    const timer = setTimeout(() => {
      if (!destroyed) initPlayer();
    }, 100);

    return () => {
      destroyed = true;
      clearTimeout(timer);
      if (playerReadyRef.current) {
        YoutubePlayer.destroy(playerId).catch(() => {});
        playerReadyRef.current = false;
      }
    };
  }, [videoId, playerId, initPlayer]);

  if (!videoId) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 gap-3">
        <AlertCircle className="w-10 h-10 text-white/40" />
        <p className="text-white/60 text-sm">
          {language === 'es' ? 'Video no disponible' : 'Video unavailable'}
        </p>
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors"
          >
            {language === 'es' ? 'Cerrar' : 'Close'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black">
      {/* The plugin mounts the YouTube player into this div on native */}
      <div id={playerId} className="w-full h-full" />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <p className="text-white/60 text-xs">
              {language === 'es' ? 'Cargando video...' : 'Loading video...'}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 gap-3">
          <AlertCircle className="w-10 h-10 text-red-400/60" />
          <p className="text-white/60 text-sm">{error}</p>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors"
            >
              {language === 'es' ? 'Cerrar' : 'Close'}
            </button>
          )}
        </div>
      )}

      {onClose && !loading && !error && (
        <button
          onClick={() => {
            if (playerReadyRef.current) {
              YoutubePlayer.destroy(playerId).catch(() => {});
              playerReadyRef.current = false;
            }
            onClose();
          }}
          className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black/90 text-white rounded-full transition-colors z-10"
          title={language === 'es' ? 'Cerrar video' : 'Close video'}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
