import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  FileText, Sparkles, Eye, Users, Globe,
  ArrowRight, Loader, CheckCircle, ExternalLink
} from 'lucide-react';

interface ArticleVersionManagerProps {
  articleId: string;
  articleType: 'landing' | 'base' | 'app';
  crossReferences: {
    landing_id?: string;
    base_id?: string;
    app_id?: string;
  };
  onVersionCreated: () => void;
}

export default function ArticleVersionManager({
  articleId,
  articleType,
  crossReferences,
  onVersionCreated
}: ArticleVersionManagerProps) {
  const { language } = useLanguage();
  const [creating, setCreating] = useState<string | null>(null);
  const [summary, setSummary] = useState<string>('');
  const [showSummaryPreview, setShowSummaryPreview] = useState(false);

  const hasLandingVersion = !!crossReferences.landing_id;
  const hasBaseVersion = !!crossReferences.base_id;
  const hasAppVersion = !!crossReferences.app_id;

  const generateSummary = async (content: string) => {
    try {
      const { data, error } = await supabase.rpc('generate_article_summary', {
        article_content: content
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error generating summary:', error);
      return content.substring(0, 500) + '...';
    }
  };

  const createVersion = async (
    targetType: 'landing' | 'base' | 'app',
    visibility: 'public' | 'members' | 'athletes',
    isSummary: boolean = false
  ) => {
    setCreating(targetType);
    try {
      const { data: article } = await supabase
        .from('digest_articles')
        .select('*')
        .eq('id', articleId)
        .single();

      if (!article) throw new Error('Article not found');

      let contentToUse = article.content;

      if (isSummary) {
        const generatedSummary = await generateSummary(article.content);
        setSummary(generatedSummary);
        setShowSummaryPreview(true);
        contentToUse = generatedSummary;
      }

      const { data: newVersionId, error } = await supabase.rpc('create_article_version', {
        source_article_id: articleId,
        target_type: targetType,
        target_visibility: visibility,
        is_summary_version: isSummary
      });

      if (error) throw error;

      if (isSummary && newVersionId) {
        await supabase
          .from('digest_articles')
          .update({
            content: contentToUse,
            ai_summary: contentToUse
          })
          .eq('id', newVersionId);
      }

      onVersionCreated();
    } catch (error: any) {
      console.error('Error creating version:', error);
      alert(language === 'es' ? `Error: ${error.message}` : `Error: ${error.message}`);
    } finally {
      setCreating(null);
      setShowSummaryPreview(false);
    }
  };

  const getVersionButton = (
    type: 'landing' | 'base' | 'app',
    label: string,
    icon: React.ReactNode,
    visibility: 'public' | 'members' | 'athletes',
    isSummary: boolean = false,
    hasVersion: boolean = false
  ) => {
    if (type === articleType || hasVersion) return null;

    return (
      <button
        onClick={() => createVersion(type, visibility, isSummary)}
        disabled={creating !== null}
        className={`flex-1 p-4 rounded-lg border-2 transition-all ${
          creating === type
            ? 'border-[#514163] bg-[#514163] bg-opacity-10'
            : 'border-gray-300 dark:border-gray-600 dark:border-gray-600 hover:border-[#514163] dark:hover:border-[#fdda36] bg-white dark:bg-gray-800 dark:bg-gray-800'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#514163] bg-opacity-10 rounded-lg">
            {creating === type ? (
              <Loader className="w-5 h-5 text-[#514163] dark:text-[#fdda36] animate-spin" />
            ) : (
              icon
            )}
          </div>
          <div className="flex-1 text-left">
            <h4 className="font-semibold text-gray-900 dark:text-white dark:text-white">
              {label}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">
              {visibility === 'public' && (language === 'es' ? 'Público' : 'Public')}
              {visibility === 'members' && (language === 'es' ? 'Solo Miembros' : 'Members Only')}
              {visibility === 'athletes' && (language === 'es' ? 'Solo Atletas' : 'Athletes Only')}
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400" />
        </div>
      </button>
    );
  };

  const getExistingVersionLink = (
    type: 'landing' | 'base' | 'app',
    versionId: string | undefined,
    label: string
  ) => {
    if (!versionId || type === articleType) return null;

    return (
      <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
        <span className="flex-1 text-sm text-green-900 dark:text-green-300 font-medium">
          {label} {language === 'es' ? 'creada' : 'created'}
        </span>
        <button
          onClick={() => window.open(`/digest/${versionId}`, '_blank')}
          className="p-1 hover:bg-green-100 dark:hover:bg-green-800 rounded transition-colors"
        >
          <ExternalLink className="w-4 h-4 text-green-600 dark:text-green-400" />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          {language === 'es' ? 'Sistema de Publicación Unificado' : 'Unified Publishing System'}
        </h3>
        <p className="text-sm text-blue-800 dark:text-blue-400">
          {language === 'es'
            ? 'Crea versiones de este artículo para Landing (inspiracional), Base (técnico) o App (resumen)'
            : 'Create versions of this article for Landing (inspirational), Base (technical), or App (digest)'}
        </p>
      </div>

      <div className="grid gap-3">
        {getExistingVersionLink(
          'landing',
          crossReferences.landing_id,
          language === 'es' ? 'Versión Landing' : 'Landing Version'
        )}
        {getExistingVersionLink(
          'base',
          crossReferences.base_id,
          language === 'es' ? 'Versión Base' : 'Base Version'
        )}
        {getExistingVersionLink(
          'app',
          crossReferences.app_id,
          language === 'es' ? 'Versión App' : 'App Version'
        )}
      </div>

      <div className="grid gap-3">
        {getVersionButton(
          'landing',
          language === 'es' ? 'Crear Versión Landing' : 'Create Landing Version',
          <Globe className="w-5 h-5 text-[#514163] dark:text-[#fdda36]" />,
          'public',
          false,
          hasLandingVersion
        )}

        {getVersionButton(
          'base',
          language === 'es' ? 'Crear Versión Técnica' : 'Create Technical Version',
          <FileText className="w-5 h-5 text-[#514163] dark:text-[#fdda36]" />,
          'members',
          false,
          hasBaseVersion
        )}

        {getVersionButton(
          'app',
          language === 'es' ? 'Crear Versión Digest (con IA)' : 'Create Digest Version (AI)',
          <Sparkles className="w-5 h-5 text-[#514163] dark:text-[#fdda36]" />,
          'athletes',
          true,
          hasAppVersion
        )}
      </div>

      {showSummaryPreview && summary && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <h4 className="font-semibold text-purple-900 dark:text-purple-300 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {language === 'es' ? 'Resumen Generado por IA' : 'AI Generated Summary'}
          </h4>
          <p className="text-sm text-purple-800 dark:text-purple-400 mb-3">
            {summary}
          </p>
          <p className="text-xs text-purple-700 dark:text-purple-500">
            {language === 'es'
              ? 'Podrás editar este resumen antes de publicar'
              : 'You can edit this summary before publishing'}
          </p>
        </div>
      )}

      <div className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 dark:text-white dark:text-white mb-2 flex items-center gap-2">
          <Eye className="w-4 h-4" />
          {language === 'es' ? 'Niveles de Visibilidad' : 'Visibility Levels'}
        </h4>
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span><strong>{language === 'es' ? 'Público' : 'Public'}:</strong> {language === 'es' ? 'Visible en Landing' : 'Visible in Landing'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span><strong>{language === 'es' ? 'Miembros' : 'Members'}:</strong> {language === 'es' ? 'Visible en Base' : 'Visible in Base'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span><strong>{language === 'es' ? 'Atletas' : 'Athletes'}:</strong> {language === 'es' ? 'Visible en App' : 'Visible in App'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
