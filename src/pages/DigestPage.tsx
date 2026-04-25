import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useMembership } from '../hooks/useMembership';
import ArticleEditor from '../components/digest/ArticleEditor';
import PremiumPaywall from '../components/digest/PremiumPaywall';
import { TrendingUp, Calendar, Clock, CheckCircle, Circle, Plus, Filter, BookOpen, User, Eye, CreditCard as Edit, Trash2, ExternalLink, BarChart3, Globe, Crown, ArrowRight, Share2, GraduationCap, PlayCircle, Lock, Users } from 'lucide-react';

interface Article {
  id: string;
  title: string;
  subtitle: string | null;
  content: string;
  image_url: string | null;
  category: string;
  sport: string;
  language: string;
  author_id: string;
  author_name: string;
  published_date: string;
  is_published: boolean;
  is_premium: boolean;
  week_number: number;
  year: number;
  reading_time_minutes: number;
  view_count: number;
  read_count: number;
  conversion_count: number;
  cta_text: string | null;
  cta_url: string | null;
  cta_type: string | null;
  external_url: string | null;
  template_type: string;
  created_at: string;
  is_read: boolean;
  read_at: string | null;
  article_type: 'landing' | 'base' | 'app';
  visibility_level: 'public' | 'members' | 'athletes';
  parent_article_id: string | null;
  cross_references: {
    landing_id?: string;
    base_id?: string;
    app_id?: string;
  };
  share_count?: number;
}


interface DigestPageProps {
  onNavigate?: (page: string) => void;
}

export default function DigestPage({ onNavigate }: DigestPageProps) {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const { hasAsciende, hasPro, loading: membershipLoading } = useMembership();
  const [articles, setArticles] = useState<Article[]>([]);
const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallArticle, setPaywallArticle] = useState<Article | null>(null);
  const [athleteSports, setAthleteSports] = useState<string[]>([]);

  const isTrainerOrAdmin = profile?.role === 'trainer' || profile?.role === 'admin';
  const hasActiveMembership = hasAsciende || hasPro;

  // Tier hierarchy: inicia(1) < intermediate/asciende(2) < pro(3)
  // Pro sees everything, intermediate sees inicia+intermediate, inicia sees only inicia
  const TIER_LEVEL: Record<string, number> = { inicia: 1, intermediate: 2, asciende: 2, pro: 3, teams_sports: 3 };

  const canAccessArticle = (article: Article): boolean => {
    if (isTrainerOrAdmin) return true;
    const requiredTier = (article as any).required_membership_tier || 'inicia';
    const required = TIER_LEVEL[requiredTier] ?? 1;
    // Pro
    if (hasPro) return true;
    // Intermediate/Asciende
    if (hasAsciende) return required <= 2;
    // Inicia/Free - only inicia content
    return required <= 1;
  };

  useEffect(() => {
    loadAthleteSports();
  }, [profile]);

  useEffect(() => {
    loadArticles();
  }, [profile, selectedCategory, selectedLanguage, athleteSports]);

  const loadAthleteSports = async () => {
    if (!profile || isTrainerOrAdmin) {
      setAthleteSports([]);
      return;
    }

    try {
      const { data: teamMemberships } = await supabase
        .from('team_members')
        .select('team_id, teams(sport)')
        .eq('athlete_id', profile.id);

      const sports = teamMemberships
        ?.map((tm: any) => tm.teams?.sport)
        .filter((sport): sport is string => !!sport) || [];

      const uniqueSports = [...new Set(sports)];
      console.log('Athlete sports from teams:', uniqueSports);
      setAthleteSports(uniqueSports);
    } catch (error) {
      console.error('Error loading athlete sports:', error);
      setAthleteSports([]);
    }
  };

  const loadArticles = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      let query = supabase
        .from('digest_articles')
        .select(`
          *,
          author:profiles!digest_articles_author_id_fkey(full_name)
        `)
        .order('published_date', { ascending: false });

      // Trainers and admins see all articles
      if (!isTrainerOrAdmin) {
        query = query.eq('is_published', true);
      }

      // Apply category filter
      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      // Apply language filter
      if (selectedLanguage !== 'all') {
        query = query.eq('language', selectedLanguage);
      }

      const { data, error } = await query;

      if (error) throw error;

      let filteredArticles = data || [];

      // For athletes: filter by their sports and teams (always filter, even if no sports = show only 'all')
      if (!isTrainerOrAdmin) {
        // Get team IDs for the athlete
        const { data: teamMemberships } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('athlete_id', profile.id);

        const athleteTeamIds = teamMemberships?.map((tm: any) => tm.team_id) || [];

        // Get articles linked to athlete's teams
        const { data: teamArticles } = await supabase
          .from('team_digest_content')
          .select('digest_article_id')
          .in('team_id', athleteTeamIds.length > 0 ? athleteTeamIds : ['00000000-0000-0000-0000-000000000000']);

        const teamArticleIds = new Set(teamArticles?.map((ta: any) => ta.digest_article_id) || []);

        // Helper function: normalize sport names for comparison (case-insensitive, replaces _ with space)
        const normalizeSport = (sport: string) => {
          return sport?.toLowerCase().replace(/_/g, ' ').trim() || '';
        };

        // Normalize athlete sports for comparison
        const normalizedAthleteSports = athleteSports.map(normalizeSport);

        // Parse the sport field - it can be a JSON string like '["all"]' or a plain string 'all'
        const parseSportField = (sport: any): string[] => {
          if (!sport) return [];
          if (Array.isArray(sport)) return sport;
          if (typeof sport === 'string') {
            try {
              const parsed = JSON.parse(sport);
              return Array.isArray(parsed) ? parsed : [sport];
            } catch {
              return [sport];
            }
          }
          return [];
        };

        // Filter articles: always show 'all sports' articles + athlete's specific sport
        filteredArticles = filteredArticles.filter((article: any) => {
          // Article is linked to one of athlete's teams
          if (teamArticleIds.has(article.id)) return true;

          // Parse sport field (handles both JSON string arrays and plain strings)
          const articleSports = parseSportField(article.sport);
          const articleTargetSports = parseSportField(article.target_sports);

          // Article is for 'all' sports - visible to everyone
          if (articleSports.includes('all')) return true;
          if (articleTargetSports.includes('all')) return true;

          // If athlete has no specific sport, only show 'all' articles (already handled above)
          if (athleteSports.length === 0) return false;

          // Check if article sport matches athlete's sports
          const hasMatchInSport = articleSports.some((s: string) =>
            normalizedAthleteSports.includes(normalizeSport(s))
          );
          if (hasMatchInSport) return true;

          const hasMatchInTargetSports = articleTargetSports.some((s: string) =>
            normalizedAthleteSports.includes(normalizeSport(s))
          );
          if (hasMatchInTargetSports) return true;

          return false;
        });
      }

      const articlesWithReadStatus = filteredArticles.map((article: any) => ({
        ...article,
        author_name: article.author?.full_name || 'Unknown',
        is_read: false,
        read_at: null,
      }));

      if (!isTrainerOrAdmin) {
        const { data: reads } = await supabase
          .from('digest_article_reads')
          .select('article_id, read_at')
          .eq('user_id', profile.id);

        const readMap = new Map(reads?.map((r) => [r.article_id, r.read_at]) || []);

        articlesWithReadStatus.forEach((article: any) => {
          article.is_read = readMap.has(article.id);
          article.read_at = readMap.get(article.id) || null;
        });
      }

      console.log(`Loaded ${articlesWithReadStatus.length} articles for athlete with sports:`, athleteSports);
      setArticles(articlesWithReadStatus);
    } catch (error: any) {
      console.error('Error loading articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const incrementViewCount = async (articleId: string) => {
    try {
      const { error } = await supabase.rpc('increment_digest_views', {
        article_uuid: articleId,
      });
      if (error) throw error;
    } catch (error: any) {
      console.error('Error incrementing view count:', error);
    }
  };

  const trackConversion = async (articleId: string, ctaType: string, ctaUrl: string) => {
    if (!profile) return;

    try {
      const { error } = await supabase.from('digest_article_conversions').insert({
        article_id: articleId,
        user_id: profile.id,
        cta_type: ctaType,
        referrer: window.location.href,
        user_agent: navigator.userAgent,
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('Error tracking conversion:', error);
    }
  };

  const handleArticleClick = async (article: Article) => {
    if (article.external_url) {
      await incrementViewCount(article.id);
      window.open(article.external_url, '_blank');
      return;
    }

    await incrementViewCount(article.id);
    setSelectedArticle(article);
  };

  const handleUpgradeClick = () => {
    setShowPaywall(false);
    onNavigate?.('membership');
  };

  const markAsRead = async (articleId: string) => {
    if (!profile) return;

    try {
      const { error } = await supabase.from('digest_article_reads').upsert({
        article_id: articleId,
        user_id: profile.id,
        read_percentage: 100,
      });

      if (error) throw error;

      setArticles((prev) =>
        prev.map((article) =>
          article.id === articleId
            ? { ...article, is_read: true, read_at: new Date().toISOString() }
            : article
        )
      );

      const { data: nextArticle } = await supabase.rpc('mark_digest_read_and_get_next', {
        current_article_id: articleId,
        user_profile_id: profile.id,
      });

      if (nextArticle && nextArticle.length > 0) {
        const next = nextArticle[0];
        setTimeout(() => {
          const article = articles.find((a) => a.id === next.id);
          if (article) {
            setSelectedArticle(article);
          }
        }, 1000);
      }
    } catch (error: any) {
      console.error('Error marking as read:', error);
    }
  };

  const handleCTAClick = async (article: Article) => {
    if (!article.cta_url) return;

    await trackConversion(article.id, article.cta_type || 'external', article.cta_url);
    window.open(article.cta_url, '_blank');
  };

  const handleDelete = async (articleId: string) => {
    if (!confirm(language === 'es' ? '¿Eliminar este artículo?' : 'Delete this article?')) return;

    try {
      const { error } = await supabase.from('digest_articles').delete().eq('id', articleId);

      if (error) throw error;

      setArticles((prev) => prev.filter((a) => a.id !== articleId));
      if (selectedArticle?.id === articleId) {
        setSelectedArticle(null);
      }
    } catch (error: any) {
      console.error('Error deleting article:', error);
      alert(language === 'es' ? `Error: ${error.message}` : `Error: ${error.message}`);
    }
  };

  const handleShare = async (article: Article) => {
    const shareUrl = `${window.location.origin}/digest/${article.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.subtitle || article.title,
          url: shareUrl,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert(language === 'es' ? 'Enlace copiado!' : 'Link copied!');
    }

    try {
      await supabase
        .from('digest_articles')
        .update({ share_count: (article.share_count || 0) + 1 })
        .eq('id', article.id);
    } catch (error) {
      console.error('Error updating share count:', error);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'nutrition':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'physical':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'mental':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'recovery':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'biomechanics':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'analysis':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, { en: string; es: string }> = {
      nutrition: { en: 'Nutrition', es: 'Nutrición' },
      physical: { en: 'Physical Prep', es: 'Preparación Física' },
      mental: { en: 'Mental Prep', es: 'Preparación Mental' },
      recovery: { en: 'Recovery', es: 'Recuperación' },
      biomechanics: { en: 'Biomechanics', es: 'Biomecánica' },
      analysis: { en: 'Analysis', es: 'Análisis' },
    };
    return labels[category]?.[language] || category;
  };

  const renderMarkdown = (text: string) => {
    const isDark = document.documentElement.classList.contains('dark');
    const bodyColor = isDark ? '#e5e7eb' : '#1f2937';
    const headingColor = isDark ? '#ffffff' : '#111827';
    const linkColor = isDark ? '#fdda36' : '#514163';
    const emColor = isDark ? '#e5e7eb' : '#374151';

    const pStyle = `margin:0 0 1rem 0;line-height:1.625;color:${bodyColor};`;
    const h1Style = `font-size:1.5rem;font-weight:700;margin:2rem 0 1rem 0;color:${headingColor};`;
    const h2Style = `font-size:1.25rem;font-weight:700;margin:1.5rem 0 0.75rem 0;color:${headingColor};`;
    const h3Style = `font-size:1.125rem;font-weight:700;margin:1rem 0 0.5rem 0;color:${headingColor};`;
    const strongStyle = `font-weight:700;color:${headingColor};`;
    const emStyle = `font-style:italic;color:${emColor};`;
    const aStyle = `color:${linkColor};text-decoration:underline;font-weight:500;`;
    const liStyle = `margin-left:1.5rem;margin-bottom:0.25rem;color:${bodyColor};`;

    let html = text;
    html = html.replace(/^### (.+)$/gm, `<h3 style="${h3Style}">$1</h3>`);
    html = html.replace(/^## (.+)$/gm, `<h2 style="${h2Style}">$1</h2>`);
    html = html.replace(/^# (.+)$/gm, `<h1 style="${h1Style}">$1</h1>`);
    html = html.replace(/\*\*(.+?)\*\*/g, `<strong style="${strongStyle}">$1</strong>`);
    html = html.replace(/\*(.+?)\*/g, `<em style="${emStyle}">$1</em>`);
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, `<a href="$2" target="_blank" style="${aStyle}">$1</a>`);
    html = html.replace(/^- (.+)$/gm, `<li style="${liStyle};list-style-type:disc;">$1</li>`);
    html = html.replace(/^\d+\. (.+)$/gm, `<li style="${liStyle};list-style-type:decimal;">$1</li>`);
    html = html.replace(/\n\n/g, `</p><p style="${pStyle}">`);
    return `<p style="${pStyle}">${html}</p>`;
  };

  const ArticlePaywall = ({ article, onUpgrade, language: lang }: { article: any; onUpgrade: () => void; language: string }) => {
    const tierName = article.required_membership_tier === 'pro' ? 'Pro' :
                     article.required_membership_tier === 'intermediate' ? 'Intermediate' : 'Asciende';

    // Show first paragraph as preview, then blur + paywall
    const paragraphs = article.content.split(/\n\n+/).filter((p: string) => p.trim());
    const previewText = paragraphs.slice(0, 1).join('\n\n');

    return (
      <div className="relative">
        {/* First paragraph visible */}
        <div
          className="digest-article-content"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(previewText) }}
        />

        {/* Blurred second paragraph */}
        {paragraphs.length > 1 && (
          <div className="relative mt-4">
            <div
              className="digest-article-content select-none pointer-events-none"
              style={{ filter: 'blur(5px)', opacity: 0.6 }}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(paragraphs[1]) }}
            />
            {/* Gradient fade over blurred text */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/60 to-white dark:via-gray-800/60 dark:to-gray-800" />
          </div>
        )}

        {/* Paywall card */}
        <div className="relative mt-2 rounded-2xl border-2 border-[#fdda36] bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 p-8 text-center shadow-xl">
          <div className="w-14 h-14 bg-[#fdda36] rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-[#514163]" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {lang === 'es' ? 'Contenido exclusivo' : 'Exclusive content'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
            {lang === 'es'
              ? `Para leer este artículo completo necesitas la membresía `
              : `To read this full article you need the `}
            <span className="font-bold text-[#514163] dark:text-[#fdda36]">{tierName}</span>
            {lang === 'es' ? ' o superior.' : ' membership or higher.'}
          </p>
          <button
            onClick={onUpgrade}
            className="px-8 py-3 bg-[#514163] text-white rounded-xl font-bold hover:bg-[#6d5581] transition-colors flex items-center gap-2 mx-auto"
          >
            <Crown className="w-5 h-5 text-[#fdda36]" />
            {lang === 'es' ? `Obtener membresía ${tierName}` : `Get ${tierName} membership`}
          </button>
        </div>
      </div>
    );
  };

  const categories = [
    { value: 'all', label: language === 'es' ? 'Todas' : 'All' },
    { value: 'nutrition', label: language === 'es' ? 'Nutrición' : 'Nutrition' },
    { value: 'physical', label: language === 'es' ? 'Preparación Física' : 'Physical Prep' },
    { value: 'mental', label: language === 'es' ? 'Preparación Mental' : 'Mental Prep' },
    { value: 'recovery', label: language === 'es' ? 'Recuperación' : 'Recovery' },
    { value: 'biomechanics', label: language === 'es' ? 'Biomecánica' : 'Biomechanics' },
    { value: 'analysis', label: language === 'es' ? 'Análisis' : 'Analysis' },
  ];

  const readArticles = articles.filter((a) => a.is_read).length;
  const totalArticles = articles.length;
  const readPercentage = totalArticles > 0 ? Math.round((readArticles / totalArticles) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-8000 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#514163] dark:border-[#fdda36] mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{language === 'es' ? 'Cargando...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (selectedArticle) {
    const crossRefs = selectedArticle.cross_references || {};
    const hasOtherVersions = crossRefs.landing_id || crossRefs.base_id || crossRefs.app_id;

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-8000 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-4xl mx-auto p-6">
          <button
            onClick={() => {
              markAsRead(selectedArticle.id);
              setSelectedArticle(null);
            }}
            className="mb-6 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow flex items-center gap-2"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            {language === 'es' ? 'Volver' : 'Back'}
          </button>

          {hasOtherVersions && (
            <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-5 dark:from-gray-900 dark:via-gray-900 dark:to-gray-8000 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Globe className="w-5 h-5" />
                {language === 'es' ? 'Otras Versiones Disponibles' : 'Other Versions Available'}
              </h3>
              <div className="flex flex-wrap gap-2">
                {crossRefs.landing_id && selectedArticle.article_type !== 'landing' && (
                  <button
                    onClick={() => window.open(`/digest/${crossRefs.landing_id}`, '_blank')}
                    className="px-4 py-2 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-2"
                  >
                    <Globe className="w-4 h-4" />
                    <span>{language === 'es' ? 'Ver en Landing' : 'View on Landing'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
                {crossRefs.base_id && selectedArticle.article_type !== 'base' && (
                  <button
                    onClick={() => window.open(`/digest/${crossRefs.base_id}`, '_blank')}
                    className="px-4 py-2 bg-white dark:bg-gray-800 border border-purple-300 dark:border-purple-700 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors flex items-center gap-2"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>{language === 'es' ? 'Investigación Completa en Base' : 'Full Research on Base'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
                {crossRefs.app_id && selectedArticle.article_type !== 'app' && (
                  <button
                    onClick={() => window.open(`/digest/${crossRefs.app_id}`, '_blank')}
                    className="px-4 py-2 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-700 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors flex items-center gap-2"
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span>{language === 'es' ? 'Resumen en App' : 'Summary in App'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          <article className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
            {selectedArticle.image_url && (
              <img
                src={selectedArticle.image_url}
                alt={selectedArticle.title}
                className="w-full h-64 object-cover"
              />
            )}

            <div className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(selectedArticle.category)}`}>
                  {getCategoryLabel(selectedArticle.category)}
                </span>
                {selectedArticle.is_premium && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    Premium
                  </span>
                )}
                <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                  {selectedArticle.language === 'en' ? 'En' : 'Es'}
                </span>
                <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  {selectedArticle.reading_time_minutes} min
                </span>
                <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                  <Eye className="w-4 h-4" />
                  {selectedArticle.view_count}
                </span>
              </div>

              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
                {selectedArticle.title}
              </h1>

              {selectedArticle.subtitle && (
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-6">
                  {selectedArticle.subtitle}
                </p>
              )}

              <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
                <User className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">{selectedArticle.author_name}</span>
                <span className="text-gray-400">•</span>
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">
                  {new Date(selectedArticle.published_date).toLocaleDateString()}
                </span>
              </div>

              {canAccessArticle(selectedArticle) || isTrainerOrAdmin ? (
                <div
                  className="digest-article-content"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedArticle.content) }}
                />
              ) : (
                <ArticlePaywall
                  article={selectedArticle}
                  onUpgrade={handleUpgradeClick}
                  language={language}
                />
              )}

              {selectedArticle.cta_url && selectedArticle.cta_text && (
                <div className="mt-12 p-6 bg-gradient-to-r from-[#514163] to-[#6d5581] rounded-xl">
                  <h3 className="text-xl font-bold text-white mb-3">
                    {language === 'es' ? '¿Quieres saber más?' : 'Want to learn more?'}
                  </h3>
                  <button
                    onClick={() => handleCTAClick(selectedArticle)}
                    className="px-6 py-3 bg-[#fdda36] text-[#514163] rounded-lg font-semibold hover:bg-[#ffd51a] transition-colors flex items-center gap-2"
                  >
                    {selectedArticle.cta_text}
                    <ExternalLink className="w-5 h-5" />
                  </button>
                </div>
              )}

              <div className="mt-8 flex items-center gap-4">
                <button
                  onClick={() => handleShare(selectedArticle)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  {language === 'es' ? 'Compartir' : 'Share'}
                </button>
                <button
                  onClick={() => {
                    markAsRead(selectedArticle.id);
                    setSelectedArticle(null);
                  }}
                  className="px-6 py-3 bg-[#514163] text-white rounded-lg font-semibold hover:bg-[#6d5581] transition-colors flex items-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  {language === 'es' ? 'Marcar como Leído' : 'Mark as Read'}
                </button>
              </div>
            </div>
          </article>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-8000 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-gradient-to-r from-[#514163] to-[#6d5581] rounded-2xl p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <BookOpen className="w-10 h-10" />
                {language === 'es' ? 'Píldoras de Rendimiento' : 'Performance Pills'}
              </h1>
              <p className="text-gray-200 text-lg">
                {language === 'es'
                  ? 'Conocimiento científico para tu deporte, en la dosis mínima efectiva'
                  : 'Scientific Knowledge for your sport, in the minimum effective dose'}
              </p>
            </div>
            {isTrainerOrAdmin && (
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAnalytics(!showAnalytics)}
                  className="px-6 py-3 bg-white bg-opacity-10 hover:bg-opacity-20 rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  <BarChart3 className="w-5 h-5" />
                  {language === 'es' ? 'Analytics' : 'Analytics'}
                </button>
                <button
                  onClick={() => {
                    setEditingArticle(null);
                    setShowEditor(true);
                  }}
                  className="px-6 py-3 bg-[#fdda36] text-[#514163] rounded-lg font-semibold hover:bg-[#ffd51a] transition-colors flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  {language === 'es' ? 'Nuevo Artículo' : 'New Article'}
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-gray-200 mb-1">
                <TrendingUp className="w-4 h-4" />
                {language === 'es' ? 'Artículos Totales' : 'Total Articles'}
              </div>
              <div className="text-3xl font-bold">{totalArticles}</div>
            </div>
            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-gray-200 mb-1">
                <CheckCircle className="w-4 h-4" />
                {language === 'es' ? 'Leídos' : 'Read'}
              </div>
              <div className="text-3xl font-bold">{readArticles}</div>
            </div>
            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-gray-200 mb-1">
                <BookOpen className="w-4 h-4" />
                {language === 'es' ? 'Progreso' : 'Progress'}
              </div>
              <div className="text-3xl font-bold">{readPercentage}%</div>
            </div>
          </div>
        </div>

        {showAnalytics && isTrainerOrAdmin && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-8 shadow-xl">
            <h2 className="text-2xl font-bold mb-4">{language === 'es' ? 'Analytics General' : 'Overall Analytics'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-[#514163] dark:text-[#fdda36]">
                  {articles.reduce((sum, a) => sum + a.view_count, 0)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {language === 'es' ? 'Vistas Totales' : 'Total Views'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {articles.reduce((sum, a) => sum + a.read_count, 0)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {language === 'es' ? 'Lecturas Completas' : 'Full Reads'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {articles.reduce((sum, a) => sum + a.conversion_count, 0)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {language === 'es' ? 'Conversiones' : 'Conversions'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {articles.filter((a) => a.view_count > 0).length > 0
                    ? Math.round(
                        (articles.reduce((sum, a) => sum + a.conversion_count, 0) /
                          articles.reduce((sum, a) => sum + a.view_count, 0)) *
                          100
                      )
                    : 0}
                  %
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {language === 'es' ? 'Tasa de Conversión' : 'Conversion Rate'}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-2 shadow">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-2 shadow">
            <Globe className="w-5 h-5 text-gray-400" />
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white"
            >
              <option value="all">{language === 'es' ? 'Todos los idiomas' : 'All languages'}</option>
              <option value="en">En - English</option>
              <option value="es">Es - Español</option>
            </select>
          </div>
        </div>

        {!isTrainerOrAdmin && athleteSports.length > 0 && (
          <div className="mb-6 p-4 bg-gradient-to-r from-[#fdda36]/10 to-[#fdda36]/5 dark:from-[#fdda36]/20 dark:to-[#fdda36]/10 rounded-xl border border-[#fdda36]/30">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {language === 'es' ? 'Viendo contenido de:' : 'Viewing content from:'}
              </span>
              {athleteSports.map((sport) => (
                <span
                  key={sport}
                  className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-sm font-semibold text-gray-900 dark:text-white border border-[#fdda36] flex items-center gap-2"
                >
                  <Users className="w-4 h-4 text-[#fdda36]" />
                  {sport}
                </span>
              ))}
            </div>
          </div>
        )}

        {!isTrainerOrAdmin && athleteSports.length === 0 && (
          <div className="mb-6 p-4 bg-[#fdda36]/10 dark:bg-[#fdda36]/5 rounded-xl border border-[#fdda36]/30 flex items-center gap-3">
            <Users className="w-7 h-7 text-[#514163] dark:text-[#fdda36] flex-shrink-0" />
            <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">
              {language === 'es'
                ? 'Únete a un equipo deportivo para ver contenido personalizado a tu deporte. Mientras tanto, ves todas las píldoras para todos los deportes.'
                : 'Join a sports team to see content tailored to your sport. In the meantime, you see all pills for all sports.'}
            </p>
            <button
              onClick={() => onNavigate?.('teams')}
              className="flex-shrink-0 px-4 py-2 bg-[#514163] text-white rounded-lg hover:bg-[#6d5581] transition-colors text-sm font-medium"
            >
              {language === 'es' ? 'Ver equipos' : 'View teams'}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <div
              key={article.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer group"
            >
              <div onClick={() => handleArticleClick(article)} className="relative">
                {article.image_url && (
                  <div className="relative overflow-hidden rounded-t-xl">
                    <img
                      src={article.image_url}
                      alt={article.title}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {!canAccessArticle(article) && (
                      <div className="absolute top-3 right-3">
                        <span className="flex items-center gap-1 bg-black/60 text-white text-xs font-semibold px-2 py-1 rounded-full backdrop-blur-sm">
                          <Lock className="w-3 h-3" />
                          {(article as any).required_membership_tier === 'pro' ? 'Pro' : 'Asciende'}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getCategoryColor(article.category)}`}>
                      {getCategoryLabel(article.category)}
                    </span>
                    {((article as any).required_membership_tier && (article as any).required_membership_tier !== 'inicia') && (
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                        !canAccessArticle(article)
                          ? 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          : (article as any).required_membership_tier === 'pro'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                      }`}>
                        {!canAccessArticle(article) ? (
                          <>
                            <Lock className="w-3 h-3" />
                            {(article as any).required_membership_tier === 'pro' ? 'Pro' : 'Asciende'}
                          </>
                        ) : (
                          <>
                            <Crown className="w-3 h-3" />
                            {(article as any).required_membership_tier === 'pro' ? 'Pro' : 'Asciende'}
                          </>
                        )}
                      </span>
                    )}
                    {article.is_read && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-[#514163] dark:group-hover:text-[#fdda36] transition-colors">
                    {article.title}
                  </h3>

                  {article.subtitle && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                      {article.subtitle}
                    </p>
                  )}

                  {article.content && (
                    <p className="text-gray-500 dark:text-gray-400 text-xs mb-4 line-clamp-2 italic">
                      {article.content.replace(/#{1,3} /g, '').replace(/\*\*/g, '').replace(/\*/g, '').substring(0, 120)}...
                    </p>
                  )}

                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {article.reading_time_minutes}m
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {article.view_count}
                      </span>
                    </div>
                    <span className="text-sm font-medium">{article.language === 'en' ? 'En' : 'Es'}</span>
                  </div>
                </div>
              </div>

              {isTrainerOrAdmin && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingArticle(article);
                      setShowEditor(true);
                    }}
                    className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    {language === 'es' ? 'Editar' : 'Edit'}
                  </button>
                  <button
                    onClick={() => handleDelete(article.id)}
                    className="px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {articles.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
              {language === 'es' ? 'No hay artículos disponibles' : 'No articles available'}
            </h3>
            <p className="text-gray-500 dark:text-gray-500 dark:text-gray-400">
              {language === 'es'
                ? 'Los nuevos artículos aparecerán aquí'
                : 'New articles will appear here'}
            </p>
          </div>
        )}

      </div>

      {showEditor && (
        <ArticleEditor
          isOpen={showEditor}
          onClose={() => {
            setShowEditor(false);
            setEditingArticle(null);
          }}
          onSaved={() => {
            setShowEditor(false);
            setEditingArticle(null);
            loadArticles();
          }}
          article={editingArticle}
        />
      )}

      <PremiumPaywall
        isOpen={showPaywall}
        onClose={() => {
          setShowPaywall(false);
          setPaywallArticle(null);
        }}
        onUpgrade={handleUpgradeClick}
        articleTitle={paywallArticle?.title}
        requiredTier={paywallArticle?.required_membership_tier || 'intermediate'}
      />
    </div>
  );
}
