import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  ArrowLeft, PlayCircle, CheckCircle, Clock, Lock,
  BookOpen, FileText, Download, ChevronDown, ChevronRight,
  Circle, User, Zap, Loader2, AlertCircle, Tag
} from 'lucide-react';
import type { AcademyCourseDetail, AcademyModule, AcademyLesson } from './types';
import LessonViewer from './LessonViewer';

interface CourseDetailProps {
  courseId: string;
  onBack: () => void;
}

export default function CourseDetail({ courseId, onBack }: CourseDetailProps) {
  const { language } = useLanguage();
  const [course, setCourse] = useState<AcademyCourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [activeLesson, setActiveLesson] = useState<AcademyLesson | null>(null);
  const [activeModule, setActiveModule] = useState<AcademyModule | null>(null);

  const loadCourse = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      console.log('[CourseDetail] Requesting course_id:', courseId, 'type:', typeof courseId);
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/academy-course-detail?course_id=${encodeURIComponent(courseId)}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (!data.success) throw new Error(data.error || 'Failed to load course');

      setCourse(data.course);
      const firstModule = (data.modules || [])[0];
      if (firstModule) {
        setExpandedModules(new Set([firstModule.id]));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { loadCourse(); }, [loadCourse]);

  const toggleModule = (id: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openLesson = (lesson: AcademyLesson, module: AcademyModule) => {
    setActiveLesson(lesson);
    setActiveModule(module);
  };

  const closeLesson = () => {
    setActiveLesson(null);
    setActiveModule(null);
  };

  const onLessonCompleted = () => {
    if (!course || !activeLesson || !activeModule) return;
    const updatedModules = course.modules.map(m => {
      if (m.id !== activeModule.id) return m;
      return {
        ...m,
        lessons: m.lessons.map(l =>
          l.id === activeLesson.id ? { ...l, is_completed: true, progress_percent: 100 } : l
        ),
      };
    });
    setCourse({ ...course, modules: updatedModules });
  };

  const getLessonName = (l: AcademyLesson) =>
    language === 'es' && l.title_es ? l.title_es : l.title;

  const getModuleName = (m: AcademyModule) =>
    language === 'es' && m.title_es ? m.title_es : m.title;

  const getCourseName = (c: AcademyCourseDetail) =>
    language === 'es' && c.title_es ? c.title_es : c.title;

  const getCourseDesc = (c: AcademyCourseDetail) =>
    language === 'es' && c.description_es ? c.description_es : c.description;

  const levelColors: Record<string, string> = {
    beginner: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    intermediate: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    advanced: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  const levelLabel = (level?: string) => {
    if (!level) return '';
    const labels: Record<string, { en: string; es: string }> = {
      beginner: { en: 'Beginner', es: 'Principiante' },
      intermediate: { en: 'Intermediate', es: 'Intermedio' },
      advanced: { en: 'Advanced', es: 'Avanzado' },
    };
    return labels[level]?.[language as 'en' | 'es'] || level;
  };

  const totalLessons = course?.modules.reduce((acc, m) => acc + m.lessons.length, 0) || 0;
  const completedLessons = course?.modules.reduce((acc, m) =>
    acc + m.lessons.filter(l => l.is_completed).length, 0) || 0;
  const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const findFirstUncompletedLesson = (): { lesson: AcademyLesson; module: AcademyModule } | null => {
    if (!course) return null;
    for (const m of course.modules) {
      for (const l of m.lessons) {
        if (!l.is_completed) return { lesson: l, module: m };
      }
    }
    return null;
  };

  const handleContinue = () => {
    const next = findFirstUncompletedLesson();
    if (next) openLesson(next.lesson, next.module);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#fdda36] animate-spin mx-auto" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {language === 'es' ? 'Cargando curso...' : 'Loading course...'}
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

  if (!course) return null;

  if (activeLesson && activeModule) {
    return (
      <LessonViewer
        lesson={activeLesson}
        module={activeModule}
        courseId={courseId}
        onBack={closeLesson}
        onCompleted={onLessonCompleted}
      />
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {language === 'es' ? 'Volver a Academia' : 'Back to Academy'}
      </button>

      {/* Course hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gray-900 min-h-[280px] sm:min-h-[340px] shadow-lg">
        {course.image_url || course.thumbnail_url ? (
          <img
            src={course.image_url || course.thumbnail_url || ''}
            alt={getCourseName(course)}
            className="absolute inset-0 w-full h-full object-cover opacity-50"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#514163] to-gray-900 flex items-center justify-center">
            <BookOpen className="w-20 h-20 text-[#fdda36]/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {course.category && (
              <span className="px-2.5 py-1 bg-[#fdda36] text-gray-900 text-xs font-bold rounded-md uppercase tracking-wide">
                {course.category}
              </span>
            )}
            {course.level && (
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-md ${levelColors[course.level] || 'bg-gray-700 text-gray-300'}`}>
                {levelLabel(course.level)}
              </span>
            )}
            <span className="flex items-center gap-1 px-2.5 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-md">
              <Zap className="w-3 h-3" /> Academy
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-2 max-w-2xl">
            {getCourseName(course)}
          </h1>
          {getCourseDesc(course) && (
            <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-4 max-w-xl line-clamp-2">
              {getCourseDesc(course)}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-4">
            {course.instructor_name && (
              <div className="flex items-center gap-1.5 text-gray-300 text-sm">
                <User className="w-4 h-4" />
                {course.instructor_name}
              </div>
            )}
            {totalLessons > 0 && (
              <div className="flex items-center gap-1.5 text-gray-300 text-sm">
                <BookOpen className="w-4 h-4" />
                {totalLessons} {language === 'es' ? 'lecciones' : 'lessons'}
              </div>
            )}
            {course.duration_hours && (
              <div className="flex items-center gap-1.5 text-gray-300 text-sm">
                <Clock className="w-4 h-4" />
                {course.duration_hours}h
              </div>
            )}
            {(course.price ?? 0) > 0 ? (
              <span className="text-lg font-bold text-white">
                {course.currency || '€'}{course.price}
              </span>
            ) : (
              <span className="text-lg font-bold text-emerald-400">
                {language === 'es' ? 'Gratis' : 'Free'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progress + Continue */}
      {totalLessons > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {language === 'es' ? 'Tu progreso' : 'Your progress'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {completedLessons}/{totalLessons} {language === 'es' ? 'lecciones completadas' : 'lessons completed'}
              </p>
            </div>
            <span className="text-2xl font-bold text-[#fdda36]">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-[#fdda36] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <button
            onClick={handleContinue}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#fdda36] text-gray-900 font-semibold rounded-lg hover:bg-[#ffd51a] transition-colors text-sm"
          >
            <PlayCircle className="w-5 h-5" />
            {progress > 0 && progress < 100
              ? (language === 'es' ? 'Continuar curso' : 'Continue course')
              : progress === 100
              ? (language === 'es' ? 'Repasar curso' : 'Review course')
              : (language === 'es' ? 'Empezar curso' : 'Start course')}
          </button>
        </div>
      )}

      {/* Modules & Lessons */}
      <div className="space-y-3">
        {course.modules.map((module, mIdx) => {
          const isExpanded = expandedModules.has(module.id);
          const moduleCompleted = module.lessons.length > 0 && module.lessons.every(l => l.is_completed);
          return (
            <div key={module.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button
                onClick={() => toggleModule(module.id)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                  moduleCompleted
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-[#fdda36]/20 text-[#514163] dark:text-[#fdda36]'
                }`}>
                  {moduleCompleted ? <CheckCircle className="w-5 h-5" /> : mIdx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                    {getModuleName(module)}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {module.lessons.length} {language === 'es' ? 'lecciones' : 'lessons'}
                  </p>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              {isExpanded && (
                <div className="border-t border-gray-100 dark:border-gray-700">
                  {module.lessons.map((lesson, lIdx) => {
                    const isLocked = !lesson.is_preview && !course.is_enrolled;
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => !isLocked && openLesson(lesson, module)}
                        disabled={isLocked}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          isLocked
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                        } ${lIdx > 0 ? 'border-t border-gray-50 dark:border-gray-700/50' : ''}`}
                      >
                        <div className="flex-shrink-0">
                          {lesson.is_completed ? (
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                          ) : isLocked ? (
                            <Lock className="w-5 h-5 text-gray-400" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${
                            lesson.is_completed
                              ? 'text-gray-500 dark:text-gray-400'
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            {getLessonName(lesson)}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {lesson.duration_minutes && (
                              <span className="text-xs text-gray-400 flex items-center gap-0.5">
                                <Clock className="w-3 h-3" />
                                {lesson.duration_minutes}min
                              </span>
                            )}
                            {lesson.has_video && (
                              <span className="text-xs text-blue-500 dark:text-blue-400 flex items-center gap-0.5">
                                <PlayCircle className="w-3 h-3" /> Video
                              </span>
                            )}
                            {lesson.has_text && (
                              <span className="text-xs text-gray-400 flex items-center gap-0.5">
                                <FileText className="w-3 h-3" /> Text
                              </span>
                            )}
                            {lesson.has_pdf && (
                              <span className="text-xs text-gray-400 flex items-center gap-0.5">
                                <Download className="w-3 h-3" /> PDF
                              </span>
                            )}
                            {lesson.is_preview && (
                              <span className="text-xs text-[#fdda36] font-medium">
                                {language === 'es' ? 'Vista previa' : 'Preview'}
                              </span>
                            )}
                          </div>
                        </div>
                        {!isLocked && !lesson.is_completed && (
                          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
