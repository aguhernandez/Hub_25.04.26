import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import {
  Satellite,
  Activity,
  FlaskConical,
  Apple,
  GraduationCap,
  Scan,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Shield,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface SatelliteData {
  satellite_name: string;
  satellite_display_name: string;
  satellite_category: string;
  satellite_is_development?: boolean;
  has_explicit_permission: boolean | null;
  has_access: boolean;
  total_accesses: number;
  last_access_at: string | null;
  first_access_at: string | null;
  is_in_development?: boolean;
  order?: number;
}

const SATELLITE_ICONS: Record<string, React.ComponentType<any>> = {
  endurance:   Activity,
  nutrition:   Apple,
  academy:     GraduationCap,
  lab:         FlaskConical,
  biomechanic: Scan,
  performance: TrendingUp,
};

const SATELLITE_DESCRIPTIONS: Record<string, { es: string; en: string }> = {
  endurance: {
    es: 'Planificación y análisis de entrenamientos de endurance (ciclismo, triatlón, carrera, natación)',
    en: 'Training planning and analysis for endurance sports (cycling, triathlon, running, swimming)',
  },
  nutrition: {
    es: 'Planificación nutricional, seguimiento de dietas y estrategia de nutrición en carrera',
    en: 'Nutritional planning, diet tracking and race day nutrition strategy',
  },
  academy: {
    es: 'Centro de aprendizaje del ecosistema Asciende y metodologías de mejora del rendimiento',
    en: 'Learning center for the Asciende ecosystem and performance improvement methodologies',
  },
  lab: {
    es: 'Tests fisiológicos, análisis metabólico e interpretación de resultados de laboratorio',
    en: 'Physiological testing, metabolic analysis and lab result interpretation',
  },
  biomechanic: {
    es: 'Análisis biomecánico, bike fitting, análisis de la marcha y análisis de video de movimiento',
    en: 'Biomechanics analysis, bike fitting, gait analysis and video movement analysis',
  },
  performance: {
    es: 'Modelado matemático y predicción fisiológica del rendimiento (similar a WKO5)',
    en: 'Mathematical modelling and physiological performance prediction (similar to WKO5)',
  },
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  training: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
  },
  nutrition: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  education: {
    bg: 'bg-sky-50 dark:bg-sky-900/20',
    text: 'text-sky-600 dark:text-sky-400',
    border: 'border-sky-200 dark:border-sky-800',
  },
  medical: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
  },
  analysis: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
  },
};

const SATELLITE_URLS: Record<string, string> = {
  endurance:   'https://endurance.asciende.pro',
  nutrition:   'https://nutrition.asciende.pro',
  academy:     'https://academy.asciende.pro',
  lab:         'https://lab.asciende.pro',
  biomechanic: 'https://motion.asciende.pro',
  performance: 'https://performance.asciende.pro',
};

const SATELLITE_DOMAINS: Record<string, string> = {
  endurance:   'endurance.asciende.pro',
  nutrition:   'nutrition.asciende.pro',
  academy:     'academy.asciende.pro',
  lab:         'lab.asciende.pro',
  biomechanic: 'motion.asciende.pro',
  performance: 'performance.asciende.pro',
};

const SATELLITE_ORDER: Record<string, number> = {
  endurance:   1,
  nutrition:   2,
  academy:     3,
  lab:         4,
  biomechanic: 5,
  performance: 6,
};

export default function SatellitesSection() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const [satellites, setSatellites] = useState<SatelliteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [launchingId, setLaunchingId] = useState<string | null>(null);

  const fetchSatellitesFallback = async () => {
    const { data, error } = await supabase
      .from('satellites')
      .select('name, display_name, category, is_active, is_development')
      .eq('is_active', true);

    if (error || !data) throw new Error('Failed to load satellites');

    const enriched: SatelliteData[] = data.map((sat: any) => ({
      satellite_name: sat.name,
      satellite_display_name: sat.display_name || sat.name,
      satellite_category: sat.category || 'training',
      satellite_is_development: sat.is_development || false,
      has_explicit_permission: null,
      has_access: true,
      total_accesses: 0,
      last_access_at: null,
      first_access_at: null,
      is_in_development: sat.is_development === true || ['biomechanic', 'performance'].includes(sat.name),
      order: SATELLITE_ORDER[sat.name] || 999,
    }));
    enriched.sort((a, b) => (a.order || 999) - (b.order || 999));
    setSatellites(enriched);
  };

  const fetchSatellites = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('No active session');
      }

      let usedFallback = false;
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/satellite-access`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
          }
        );

        if (!response.ok) {
          usedFallback = true;
        } else {
          const data = await response.json();
          if (data.success && Array.isArray(data.satellites)) {
            const enriched = data.satellites.map((sat: SatelliteData) => ({
              ...sat,
              is_in_development: sat.satellite_is_development === true || ['biomechanic', 'performance'].includes(sat.satellite_name),
              order: SATELLITE_ORDER[sat.satellite_name] || 999,
            }));
            enriched.sort((a: SatelliteData, b: SatelliteData) => (a.order || 999) - (b.order || 999));
            setSatellites(enriched);
          } else {
            usedFallback = true;
          }
        }
      } catch {
        usedFallback = true;
      }

      if (usedFallback) {
        await fetchSatellitesFallback();
      }
    } catch (err: any) {
      console.error('Error fetching satellites:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSatellites();
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return language === 'es' ? 'Nunca' : 'Never';
    return new Date(dateString).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, { es: string; en: string }> = {
      training:  { es: 'Entrenamiento', en: 'Training' },
      nutrition: { es: 'Nutrición',     en: 'Nutrition' },
      education: { es: 'Academia',      en: 'Academy' },
      medical:   { es: 'Laboratorio',   en: 'Lab' },
      analysis:  { es: 'Análisis',      en: 'Analysis' },
    };
    return language === 'es' ? labels[category]?.es || category : labels[category]?.en || category;
  };

  const handleOpenSatellite = async (satelliteName: string) => {
    setLaunchingId(satelliteName);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-session-token`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        }
      );

      if (!response.ok) return;

      const data = await response.json();
      if (!data.success || !data.token) return;

      const satelliteUrl = SATELLITE_URLS[satelliteName];
      if (!satelliteUrl) return;

      window.open(`${satelliteUrl}?session_token=${data.token}`, '_blank');
    } catch (err) {
      console.error('Error opening satellite:', err);
    } finally {
      setLaunchingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-[#fdda36]" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">
            {language === 'es' ? 'Cargando satélites...' : 'Loading satellites...'}
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
          <AlertCircle className="w-6 h-6" />
          <div>
            <p className="font-semibold">
              {language === 'es' ? 'Error al cargar satélites' : 'Error loading satellites'}
            </p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchSatellites}
          className="mt-4 px-4 py-2 bg-[#fdda36] text-gray-900 rounded-lg hover:bg-[#e5c430] transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          {language === 'es' ? 'Reintentar' : 'Retry'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Satellite className="w-5 h-5 text-[#fdda36]" />
              {language === 'es' ? 'Satélites Asciende' : 'Asciende Satellites'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {language === 'es'
                ? 'Accede a cada satélite directamente con tu sesión activa, sin necesidad de iniciar sesión nuevamente'
                : 'Open any satellite directly with your active session — no login required'}
            </p>
          </div>
          <button
            onClick={fetchSatellites}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title={language === 'es' ? 'Actualizar' : 'Refresh'}
          >
            <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {language === 'es' ? 'Acceso con token unificado (SSO)' : 'Unified token access (SSO)'}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                {language === 'es'
                  ? 'Tu perfil, rol y membresía se transfieren automáticamente al satélite. No necesitas iniciar sesión nuevamente.'
                  : 'Your profile, role and membership are automatically transferred to the satellite. No need to log in again.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Satellites grid */}
      <div className="grid grid-cols-1 gap-3">
        {satellites.map((satellite) => {
          const Icon = SATELLITE_ICONS[satellite.satellite_name] || Satellite;
          const colors = CATEGORY_COLORS[satellite.satellite_category] || CATEGORY_COLORS.training;
          const isInDev = satellite.is_in_development;
          const description = SATELLITE_DESCRIPTIONS[satellite.satellite_name];
          const domain = SATELLITE_DOMAINS[satellite.satellite_name];
          const isLaunching = launchingId === satellite.satellite_name;

          return (
            <div
              key={satellite.satellite_name}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 transition-all ${
                isInDev ? 'opacity-60' : 'hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                {/* Left: icon + info */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`p-3 ${colors.bg} rounded-lg flex-shrink-0`}>
                    <Icon className={`w-6 h-6 ${colors.text}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {satellite.satellite_display_name}
                      </h3>
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${colors.bg} ${colors.text}`}>
                        {getCategoryLabel(satellite.satellite_category)}
                      </span>
                      {isInDev && (
                        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                          {language === 'es' ? 'En Desarrollo' : 'In Development'}
                        </span>
                      )}
                    </div>

                    {domain && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{domain}</p>
                    )}

                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                      {isInDev
                        ? (language === 'es' ? 'Próximamente disponible' : 'Coming soon')
                        : (description ? (language === 'es' ? description.es : description.en) : '')
                      }
                    </p>
                  </div>
                </div>

                {/* Right: stats + status + button */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {!isInDev && satellite.has_access && (
                    <div className="hidden lg:flex flex-col items-end gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(satellite.last_access_at)}</span>
                      </div>
                      <span>
                        {satellite.total_accesses || 0}
                        {' '}
                        {language === 'es' ? 'accesos' : 'accesses'}
                      </span>
                    </div>
                  )}

                  {!isInDev && (
                    satellite.has_access
                      ? <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                      : <XCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0" />
                  )}

                  {isInDev ? (
                    <button
                      disabled
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded-lg cursor-not-allowed flex items-center gap-2 text-sm font-medium whitespace-nowrap"
                    >
                      <Clock className="w-4 h-4" />
                      {language === 'es' ? 'Próximamente' : 'Soon'}
                    </button>
                  ) : satellite.has_access ? (
                    <button
                      onClick={() => handleOpenSatellite(satellite.satellite_name)}
                      disabled={isLaunching}
                      className="px-4 py-2 bg-[#fdda36] text-gray-900 rounded-lg hover:bg-[#e5c430] transition-colors flex items-center gap-2 text-sm font-medium whitespace-nowrap disabled:opacity-60"
                    >
                      {isLaunching
                        ? <RefreshCw className="w-4 h-4 animate-spin" />
                        : <ExternalLink className="w-4 h-4" />
                      }
                      {isLaunching
                        ? (language === 'es' ? 'Abriendo...' : 'Opening...')
                        : (language === 'es' ? 'Abrir' : 'Open')
                      }
                    </button>
                  ) : (
                    <button
                      disabled
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded-lg cursor-not-allowed flex items-center gap-2 text-sm font-medium whitespace-nowrap"
                    >
                      <XCircle className="w-4 h-4" />
                      {language === 'es' ? 'Sin acceso' : 'No access'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {satellites.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Satellite className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {language === 'es' ? 'No hay satélites disponibles' : 'No satellites available'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'es'
              ? 'No tienes acceso a ningún satélite en este momento.'
              : 'You do not have access to any satellites at this time.'}
          </p>
        </div>
      )}

      {/* Role info */}
      {profile?.role && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {language === 'es'
              ? `Acceso calculado para rol: `
              : `Access computed for role: `}
            <span className="font-semibold text-gray-700 dark:text-gray-300 capitalize">{profile.role}</span>
            {language === 'es'
              ? `. El token transferido incluye tu rol, membresía y suscripciones activas.`
              : `. The transferred token includes your role, membership and active subscriptions.`}
          </p>
        </div>
      )}
    </div>
  );
}
