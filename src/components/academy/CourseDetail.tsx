import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { ArrowLeft, Loader2, AlertCircle, ExternalLink, GraduationCap } from 'lucide-react';

interface CourseDetailProps {
  courseId: string;
  onBack: () => void;
}

export default function CourseDetail({ courseId, onBack }: CourseDetailProps) {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [academyUrl, setAcademyUrl] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No session');

        // Get satellite token so Academy recognizes the Hub session
        const tokenRes = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-session-token`,
          {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        let satelliteToken: string | null = null;
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          if (tokenData.success && tokenData.token) {
            satelliteToken = tokenData.token;
          }
        }

        const params = new URLSearchParams();
        if (satelliteToken) {
          params.set('token', satelliteToken);
        }

        const url = `https://academy.asciende.pro/course/${encodeURIComponent(courseId)}${params.toString() ? `?${params.toString()}` : ''}`;
        if (cancelled) return;
        setAcademyUrl(url);

        // Open in a new tab immediately — Stripe Checkout requires top-level navigation
        // and cannot run inside an iframe.
        const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
        if (cancelled) return;
        setOpened(!!newWindow);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [courseId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#fdda36] animate-spin mx-auto" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {language === 'es' ? 'Abriendo curso en Academy...' : 'Opening course in Academy...'}
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

  return (
    <div className="space-y-6 pb-4">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {language === 'es' ? 'Volver' : 'Back'}
      </button>

      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6 text-center px-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[#fdda36]/20 border border-[#fdda36]/30">
          <GraduationCap className="w-8 h-8 text-[#514163] dark:text-[#fdda36]" />
        </div>

        <div className="space-y-2 max-w-md">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {language === 'es' ? 'Curso abierto en Academy' : 'Course opened in Academy'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            {language === 'es'
              ? opened
                ? 'El curso se ha abierto en una nueva pestaña. Desde ahí podrás completar la compra con Stripe sin problemas.'
                : 'Tu navegador bloqueó la apertura automática. Haz clic en el botón para abrir el curso en Academy.'
              : opened
                ? 'The course has opened in a new tab. From there you can complete the Stripe checkout without issues.'
                : 'Your browser blocked the automatic popup. Click the button below to open the course in Academy.'}
          </p>
        </div>

        {academyUrl && (
          <a
            href={academyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#fdda36] text-gray-900 rounded-xl text-sm font-bold hover:bg-[#f5ce20] transition-colors shadow-sm"
          >
            <ExternalLink className="w-4 h-4" />
            {language === 'es' ? 'Abrir en Academy' : 'Open in Academy'}
          </a>
        )}
      </div>
    </div>
  );
}
