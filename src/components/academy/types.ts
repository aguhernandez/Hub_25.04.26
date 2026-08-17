export interface AcademyModule {
  id: string;
  title: string;
  title_es?: string | null;
  order?: number;
  lessons: AcademyLesson[];
}

export interface AcademyLesson {
  id: string;
  title: string;
  title_es?: string | null;
  description?: string | null;
  description_es?: string | null;
  order?: number;
  duration_minutes?: number | null;
  is_preview?: boolean;
  has_video?: boolean;
  has_text?: boolean;
  has_pdf?: boolean;
  has_quiz?: boolean;
  content_types?: string[];
  is_completed?: boolean;
  progress_percent?: number | null;
  lesson_type?: string;
}

export interface AcademyCourseDetail {
  id: string;
  title: string;
  title_es?: string | null;
  description?: string | null;
  description_es?: string | null;
  short_description?: string | null;
  short_description_es?: string | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  instructor_name?: string | null;
  category?: string;
  level?: string;
  price?: number | null;
  currency?: string | null;
  duration_hours?: number | null;
  language?: string;
  is_enrolled?: boolean;
  progress_percent?: number | null;
  is_completed?: boolean;
  modules: AcademyModule[];
}

export interface AcademyVideo {
  id: string;
  playback_id: string;
  playback_token: string | null;
  is_public: boolean;
}

declare global {
  interface Window {
    MuxPlayerElement?: any;
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'mux-player': any;
    }
  }
}
