import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  ArrowLeft, PlayCircle, CheckCircle, Clock, FileText,
  Download, Loader2, AlertCircle, ChevronRight, ChevronLeft,
  BookOpen, Lock
} from 'lucide-react';
import type { AcademyLesson, AcademyModule, AcademyVideo } from './types';

interface LessonViewerProps {
  lesson: AcademyLesson;
  module: AcademyModule;
  courseId: string;
  onBack: () => void;
  onCompleted: () => void;
}

export default function LessonViewer({ lesson, module, courseId, onBack, onCompleted }: LessonViewerProps) {
  const { language } = useLanguage();
  const [videos, setVideos] = useState<AcademyVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingComplete, setMarkingComplete] = useState(false);
  const [watchTime, setWatchTime] = useState(0);
  const [lastPosition, setLastPosition] = useState(0);
  const watchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressSentRef = useRef(false);

  const getLessonName = (l: AcademyLesson) =>
    language === 'es' && l.title_es ? l.title_es : l.title;

  const getLessonDesc = (l: AcademyLesson) =>
    language === 'es' && l.description_es ? l.description_es : l.description;

  const loadVideos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/academy-lesson-token?lesson_id=${encodeURIComponent(lesson.id)}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (!data.success) throw new Error(data.error || 'Failed to load video');

      setVideos(data.videos || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [lesson.id]);

  useEffect(() => { loadVideos(); }, [loadVideos]);

  useEffect(() => {
    return () => {
      if (watchTimerRef.current) clearInterval(watchTimerRef.current);
    };
  }, []);

  const updateProgress = useCallback(async (completed: boolean, watchTimeSec: number, lastPos: number) => {
    if (progressSentRef.current && completed) return;
    if (completed) progressSentRef.current = true;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/academy-update-progress`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lesson_id: lesson.id,
            completed,
            watch_time_seconds: Math.round(watchTimeSec),
            last_position_seconds: Math.round(lastPos),
          }),
        }
      );

      if (completed) {
        onCompleted();
      }
    } catch {
      // silently fail - progress is best-effort
    }
  }, [lesson.id, onCompleted]);

  const handleVideoTimeUpdate = useCallback((e: React.SyntheticEvent) => {
    const target = e.target as HTMLMediaElement;
    if (target && target.currentTime) {
      setLastPosition(target.currentTime);
    }
  }, []);

  const handleVideoPlay = useCallback(() => {
    if (watchTimerRef.current) clearInterval(watchTimerRef.current);
    watchTimerRef.current = setInterval(() => {
      setWatchTime(prev => prev + 1);
    }, 1000);
  }, []);

  const handleVideoPause = useCallback(() => {
    if (watchTimerRef.current) {
      clearInterval(watchTimerRef.current);
      watchTimerRef.current = null;
    }
  }, []);

  const handleVideoEnded = useCallback(() => {
    if (watchTimerRef.current) {
      clearInterval(watchTimerRef.current);
      watchTimerRef.current = null;
    }
    updateProgress(true, watchTime, lastPosition);
  }, [watchTime, lastPosition, updateProgress]);

  const handleMarkComplete = useCallback(async () => {
    setMarkingComplete(true);
    await updateProgress(true, watchTime, lastPosition);
    setMarkingComplete(false);
  }, [watchTime, lastPosition, updateProgress]);

  // Navigation: find next/prev lesson within the module
  const lessonIndex = module.lessons.findIndex(l => l.id === lesson.id);
  const prevLesson = lessonIndex > 0 ? module.lessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex < module.lessons.length - 1 ? module.lessons[lessonIndex + 1] : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#fdda36] animate-spin mx-auto" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {language === 'es' ? 'Cargando lección...' : 'Loading lesson...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <div className="text-center space-y-3 max-w-md">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
          <button onClick={onBack} className="text-sm text-[#fdda36] font-semibold hover:underline">
            {language === 'es' ? 'Volver' : 'Go back'}
          </button>
        </div>
      </div>
    );
  }

  const hasVideo = videos.length > 0;
  const hasText = lesson.has_text || !hasVideo;

  return (
    <div className="space-y-4 pb-8">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {language === 'es' ? 'Volver al curso' : 'Back to course'}
      </button>

      {/* Lesson title */}
      <div>
        <p className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide mb-1">
          {language === 'es' && module.title_es ? module.title_es : module.title}
        </p>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight">
          {getLessonName(lesson)}
        </h1>
      </div>

      {/* Video player */}
      {hasVideo && (
        <div className="rounded-xl overflow-hidden bg-black shadow-lg">
          {videos.map((video, idx) => {
            const muxProps: Record<string, string | boolean> = {
              'stream-type': 'on-demand',
              'metadata-video-title': getLessonName(lesson),
            };
            if (video.playback_token) {
              muxProps['playback-id'] = video.playback_id;
              muxProps['tokens'] = JSON.stringify({ playback: video.playback_token });
            } else {
              muxProps['playback-id'] = video.playback_id;
            }
            return (
              <mux-player
                key={video.id || idx}
                {...muxProps}
                style={{ width: '100%', maxWidth: '100%', aspectRatio: '16 / 9' }}
                onTimeUpdate={handleVideoTimeUpdate}
                onPlay={handleVideoPlay}
                onPause={handleVideoPause}
                onEnded={handleVideoEnded}
              />
            );
          })}
        </div>
      )}

      {/* Text content */}
      {hasText && getLessonDesc(lesson) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-[#fdda36]" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {language === 'es' ? 'Contenido de la lección' : 'Lesson content'}
            </h2>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {getLessonDesc(lesson)}
            </p>
          </div>
        </div>
      )}

      {/* Lesson metadata */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {lesson.duration_minutes && (
          <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            {lesson.duration_minutes} {language === 'es' ? 'min' : 'min'}
          </span>
        )}
        {lesson.is_completed && (
          <span className="flex items-center gap-1 text-emerald-500 font-medium">
            <CheckCircle className="w-4 h-4" />
            {language === 'es' ? 'Completada' : 'Completed'}
          </span>
        )}
      </div>

      {/* Mark complete button */}
      {!lesson.is_completed && (
        <button
          onClick={handleMarkComplete}
          disabled={markingComplete}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 text-white font-semibold rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors text-sm w-full sm:w-auto"
        >
          {markingComplete ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <CheckCircle className="w-5 h-5" />
          )}
          {language === 'es' ? 'Marcar como completada' : 'Mark as completed'}
        </button>
      )}

      {/* Prev / Next navigation */}
      <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        {prevLesson ? (
          <button
            onClick={() => {
              progressSentRef.current = false;
              onBack();
              setTimeout(() => {
                // Navigate to prev lesson - parent handles this
              }, 0);
            }}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="truncate max-w-[150px] sm:max-w-[250px]">
              {language === 'es' && prevLesson.title_es ? prevLesson.title_es : prevLesson.title}
            </span>
          </button>
        ) : (
          <div />
        )}
        {nextLesson ? (
          <button
            onClick={() => {
              progressSentRef.current = false;
              onBack();
              setTimeout(() => {
                // Navigate to next lesson - parent handles this
              }, 0);
            }}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <span className="truncate max-w-[150px] sm:max-w-[250px]">
              {language === 'es' && nextLesson.title_es ? nextLesson.title_es : nextLesson.title}
            </span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
