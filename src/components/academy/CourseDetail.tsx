import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

interface CourseDetailProps {
  courseId: string;
  onBack: () => void;
}

export default function CourseDetail({ courseId, onBack }: CourseDetailProps) {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

        const params = new URLSearchParams({ embedded: 'true' });
        if (satelliteToken) {
          params.set('token', satelliteToken);
        }

        const url = `https://academy.asciende.pro/course/${encodeURIComponent(courseId)}?${params.toString()}`;
        if (cancelled) return;
        setIframeSrc(url);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [courseId]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const data = event.data;
      if (!data || data.type !== 'ASCIENDE_STRIPE_CHECKOUT') return;
      const checkoutUrl = typeof data.checkoutUrl === 'string' ? data.checkoutUrl : '';
      if (!checkoutUrl) {
        console.warn('[Hub] ASCIENDE_STRIPE_CHECKOUT received without checkoutUrl');
        return;
      }
      try {
        const parsed = new URL(checkoutUrl);
        if (parsed.hostname !== 'checkout.stripe.com') {
          console.warn('[Hub] checkoutUrl is not a Stripe URL:', checkoutUrl);
          return;
        }
      } catch {
        console.warn('[Hub] checkoutUrl is not a valid URL:', checkoutUrl);
        return;
      }
      window.open(checkoutUrl, '_blank');
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

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

  return (
    <div className="space-y-4 pb-4">
      <div className="flex flex-col gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-sky-900/70 dark:bg-sky-950/40">
        <p className="text-sm font-medium leading-6 text-sky-950 dark:text-sky-100">
          {language === 'es'
            ? 'Para una mejor experiencia, visita Academy.'
            : 'For the best experience, visit Academy.'}
        </p>
        <a
          href="https://academy.asciende.pro"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center justify-center rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:bg-sky-500 dark:text-sky-950 dark:hover:bg-sky-400 dark:focus:ring-offset-sky-950"
        >
          Academy
        </a>
      </div>

      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {language === 'es' ? 'Volver' : 'Back'}
      </button>

      <div
        ref={containerRef}
        className="relative w-full rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-700"
        style={{ height: 'calc(100vh - 120px)', minHeight: '500px' }}
      >
        {iframeSrc && (
          <iframe
            src={iframeSrc}
            title="Academy Course"
            className="absolute inset-0 w-full h-full"
            style={{ border: 'none' }}
            allow="accelerometer; autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            onLoad={() => setLoading(false)}
          />
        )}
      </div>
    </div>
  );
}
