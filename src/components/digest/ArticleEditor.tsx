import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  X, Save, Eye, Image as ImageIcon, Bold, Italic, List, ListOrdered,
  Heading1, Heading2, Link as LinkIcon, ExternalLink, Calendar, Clock,
  Tag, Target, Globe, Users, FileText, Sparkles
} from 'lucide-react';
import ArticleVersionManager from './ArticleVersionManager';

interface ArticleEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  article?: any;
}

export default function ArticleEditor({ isOpen, onClose, onSaved, article }: ArticleEditorProps) {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'cta' | 'settings' | 'versions'>('content');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    content: '',
    image_url: '',
    category: 'nutrition',
    target_sports: ['all'],
    language: 'en',
    reading_time_minutes: 5,
    is_published: false,
    is_premium: false,
    required_membership_tier: 'inicia' as 'inicia' | 'intermediate' | 'asciende' | 'pro',
    external_url: '',
    cta_text: '',
    cta_url: '',
    cta_type: 'base',
    template_type: 'custom',
    scheduled_publish_at: '',
    target_roles: ['athlete', 'trainer'],
    utm_campaign: '',
    article_type: 'app' as 'landing' | 'base' | 'app',
    visibility_level: 'athletes' as 'public' | 'members' | 'athletes',
    parent_article_id: null as string | null,
    cross_references: {} as any,
  });

  useEffect(() => {
    if (article) {
      // Parse target_sports (array) or fallback to parsing the legacy sport text field (JSON string)
      let targetSports: string[] = ['all'];
      if (Array.isArray(article.target_sports) && article.target_sports.length > 0) {
        targetSports = article.target_sports;
      } else if (article.sport) {
        if (Array.isArray(article.sport)) {
          targetSports = article.sport;
        } else if (typeof article.sport === 'string') {
          try {
            const parsed = JSON.parse(article.sport);
            targetSports = Array.isArray(parsed) && parsed.length > 0 ? parsed : [article.sport];
          } catch {
            targetSports = [article.sport];
          }
        }
      }

      setFormData({
        title: article.title || '',
        subtitle: article.subtitle || '',
        content: article.content || '',
        image_url: article.image_url || '',
        category: article.category || 'nutrition',
        target_sports: targetSports,
        language: article.language || 'en',
        reading_time_minutes: article.reading_time_minutes || 5,
        is_published: article.is_published || false,
        is_premium: article.is_premium || false,
        required_membership_tier: article.required_membership_tier || 'inicia',
        external_url: article.external_url || '',
        cta_text: article.cta_text || '',
        cta_url: article.cta_url || '',
        cta_type: article.cta_type || 'base',
        template_type: article.template_type || 'custom',
        scheduled_publish_at: article.scheduled_publish_at || '',
        target_roles: article.target_roles || ['athlete', 'trainer'],
        utm_campaign: article.utm_campaign || '',
        article_type: article.article_type || 'app',
        visibility_level: article.visibility_level || 'athletes',
        parent_article_id: article.parent_article_id || null,
        cross_references: article.cross_references || {},
      });
    }
  }, [article]);

  const insertFormatting = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formData.content.substring(start, end);
    const newText =
      formData.content.substring(0, start) +
      before +
      selectedText +
      after +
      formData.content.substring(end);

    setFormData({ ...formData, content: newText });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        end + before.length
      );
    }, 0);
  };

  const applyTemplate = (template: string) => {
    const templates: Record<string, string> = {
      tip: `# Quick Tip\n\n## What You Need to Know\n\n[Your main tip here]\n\n## Why It Matters\n\n[Evidence or reasoning]\n\n## Action Step\n\n[One specific action to take today]`,

      deep_dive: `# In-Depth Analysis\n\n## Introduction\n\n[Set the context]\n\n## The Science\n\n[Research and evidence]\n\n## Practical Application\n\n[How to apply this knowledge]\n\n## Key Takeaways\n\n- Point 1\n- Point 2\n- Point 3\n\n## References\n\n[Citations]`,

      weekly_recap: `# Weekly Performance Recap\n\n## This Week's Focus\n\n[Main theme]\n\n## Key Insights\n\n### Training\n[Training highlights]\n\n### Recovery\n[Recovery notes]\n\n### Nutrition\n[Nutrition tips]\n\n## Next Week Preview\n\n[What's coming]`,
    };

    setFormData({ ...formData, content: templates[template] || '', template_type: template });
  };

  const categories = [
    { value: 'nutrition', label: language === 'es' ? 'Nutrición' : 'Nutrition' },
    { value: 'physical', label: language === 'es' ? 'Preparación Física' : 'Physical Prep' },
    { value: 'mental', label: language === 'es' ? 'Preparación Mental' : 'Mental Prep' },
    { value: 'recovery', label: language === 'es' ? 'Recuperación' : 'Recovery' },
    { value: 'biomechanics', label: language === 'es' ? 'Biomecánica' : 'Biomechanics' },
    { value: 'analysis', label: language === 'es' ? 'Análisis' : 'Analysis' },
  ];

  const sports = [
    { value: 'all', label: language === 'es' ? 'Todos los deportes' : 'All Sports' },
    { value: 'beach_volley', label: 'Beach Volleyball' },
    { value: 'cycling', label: language === 'es' ? 'Ciclismo' : 'Cycling' },
    { value: 'running', label: 'Running' },
    { value: 'swimming', label: language === 'es' ? 'Natación' : 'Swimming' },
    { value: 'triathlon', label: 'Triathlon' },
    { value: 'crossfit', label: 'CrossFit' },
    { value: 'weightlifting', label: language === 'es' ? 'Levantamiento' : 'Weightlifting' },
    { value: 'tennis', label: language === 'es' ? 'Tenis' : 'Tennis' },
    { value: 'soccer', label: language === 'es' ? 'Fútbol' : 'Soccer' },
    { value: 'basketball', label: language === 'es' ? 'Básquet' : 'Basketball' },
  ];

  const ctaTypes = [
    { value: 'base', label: language === 'es' ? 'Base (Artículo Completo)' : 'Base (Full Article)' },
    { value: 'app', label: language === 'es' ? 'App (Funcionalidad)' : 'App (Feature)' },
    { value: 'membership', label: language === 'es' ? 'Membresía' : 'Membership' },
    { value: 'external', label: language === 'es' ? 'Externo' : 'External' },
  ];

  const templates = [
    { value: 'custom', label: language === 'es' ? 'Personalizado' : 'Custom' },
    { value: 'tip', label: language === 'es' ? 'Consejo Rápido' : 'Quick Tip' },
    { value: 'deep_dive', label: language === 'es' ? 'Análisis Profundo' : 'Deep Dive' },
    { value: 'weekly_recap', label: language === 'es' ? 'Resumen Semanal' : 'Weekly Recap' },
  ];

  const handleImageUpload = async (file: File) => {
    if (!profile) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('digest-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('digest-images')
        .getPublicUrl(filePath);

      setFormData({ ...formData, image_url: publicUrl });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      alert(language === 'es' ? `Error subiendo imagen: ${error.message}` : `Error uploading image: ${error.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(language === 'es' ? 'Por favor selecciona una imagen' : 'Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert(language === 'es' ? 'La imagen debe ser menor a 5MB' : 'Image must be smaller than 5MB');
      return;
    }

    handleImageUpload(file);
  };

  const handleSave = async (publish: boolean = false) => {
    if (!profile) return;

    setSaving(true);
    try {
      // Sync legacy 'sport' text field with target_sports for backwards compatibility
      const targetSports = formData.target_sports && formData.target_sports.length > 0
        ? formData.target_sports
        : ['all'];

      const articleData = {
        ...formData,
        target_sports: targetSports,
        sport: JSON.stringify(targetSports),
        author_id: profile.id,
        is_published: publish,
        scheduled_publish_at: formData.scheduled_publish_at || null,
        utm_source: 'digest',
        utm_medium: 'app',
      };

      let articleId = article?.id;

      if (article?.id) {
        const { error } = await supabase
          .from('digest_articles')
          .update(articleData)
          .eq('id', article.id);

        if (error) throw error;
      } else {
        const { data: newArticle, error } = await supabase
          .from('digest_articles')
          .insert([articleData])
          .select()
          .single();

        if (error) throw error;
        articleId = newArticle.id;
      }

      if (publish && articleId && !formData.scheduled_publish_at) {
        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

          await fetch(`${supabaseUrl}/functions/v1/notify-new-digest-article`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              article_id: articleId,
              send_email: true,
            }),
          });
        } catch (notifyError) {
          console.error('Error sending notifications:', notifyError);
        }
      }

      onSaved();
      onClose();
    } catch (error: any) {
      console.error('Error saving article:', error);
      alert(language === 'es' ? `Error: ${error.message}` : `Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#514163] to-[#6d5581] p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {article?.id
                  ? language === 'es' ? 'Editar Artículo' : 'Edit Article'
                  : language === 'es' ? 'Nuevo Artículo' : 'New Article'}
              </h2>
              <p className="text-gray-300 mt-1">
                {language === 'es'
                  ? 'Crea contenido científico para tus atletas'
                  : 'Create scientific content for your athletes'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white dark:bg-gray-800 hover:bg-opacity-10 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab('content')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'content'
                  ? 'bg-white dark:bg-gray-800 text-[#514163]'
                  : 'text-white hover:bg-white dark:bg-gray-800 hover:bg-opacity-10'
              }`}
            >
              {language === 'es' ? 'Contenido' : 'Content'}
            </button>
            <button
              onClick={() => setActiveTab('cta')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'cta'
                  ? 'bg-white dark:bg-gray-800 text-[#514163]'
                  : 'text-white hover:bg-white dark:bg-gray-800 hover:bg-opacity-10'
              }`}
            >
              {language === 'es' ? 'CTA & Enlaces' : 'CTA & Links'}
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'bg-white dark:bg-gray-800 text-[#514163]'
                  : 'text-white hover:bg-white dark:bg-gray-800 hover:bg-opacity-10'
              }`}
            >
              {language === 'es' ? 'Configuración' : 'Settings'}
            </button>
            {article?.id && (
              <button
                onClick={() => setActiveTab('versions')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'versions'
                    ? 'bg-white dark:bg-gray-800 text-[#514163]'
                    : 'text-white hover:bg-white dark:bg-gray-800 hover:bg-opacity-10'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                {language === 'es' ? 'Versiones' : 'Versions'}
              </button>
            )}
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'content' && (
            <>
              {/* Template Selector */}
              <div className="bg-[#fdda36] bg-opacity-10 border border-[#fdda36] rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  <Tag className="w-4 h-4 inline mr-1" />
                  {language === 'es' ? 'Plantilla' : 'Template'}
                </label>
                <div className="flex gap-2 flex-wrap">
                  {templates.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => t.value !== 'custom' && applyTemplate(t.value)}
                      className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors ${
                        formData.template_type === t.value
                          ? 'bg-[#514163] text-white border-[#514163]'
                          : 'bg-white dark:bg-gray-800 dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:border-gray-600 hover:border-[#514163]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'Título' : 'Title'} *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={
                    language === 'es'
                      ? 'Ej: Estrategias de Nutrición para Rendimiento Óptimo'
                      : 'e.g., Nutrition Strategies for Peak Performance'
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                  required
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'Subtítulo' : 'Subtitle'}
                </label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder={
                    language === 'es'
                      ? 'Ej: Enfoques basados en evidencia'
                      : 'e.g., Evidence-based approaches'
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  <ImageIcon className="w-4 h-4 inline mr-1" />
                  {language === 'es' ? 'Imagen de Portada' : 'Cover Image'}
                </label>

                <div className="space-y-3">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="flex-1 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg hover:border-[#514163] dark:hover:border-[#fdda36] transition-colors flex items-center justify-center gap-2 bg-white dark:bg-gray-800 dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ImageIcon className="w-5 h-5" />
                      {uploadingImage
                        ? language === 'es' ? 'Subiendo...' : 'Uploading...'
                        : language === 'es' ? 'Subir desde Computadora' : 'Upload from Computer'}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300 dark:border-gray-600 dark:border-gray-600"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white dark:bg-gray-800 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                        {language === 'es' ? 'o pegar URL' : 'or paste URL'}
                      </span>
                    </div>
                  </div>

                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://images.pexels.com/..."
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                  />
                </div>

                {formData.image_url && (
                  <div className="mt-3 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 dark:border-gray-600 relative">
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '';
                        e.currentTarget.alt = 'Invalid URL';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, image_url: '' })}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'Contenido' : 'Content'} *
                </label>

                {/* Formatting Toolbar */}
                <div className="flex flex-wrap gap-1 p-2 bg-gray-100 dark:bg-gray-800 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-t-lg">
                  <button
                    type="button"
                    onClick={() => insertFormatting('**', '**')}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    title={language === 'es' ? 'Negrita' : 'Bold'}
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('*', '*')}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    title={language === 'es' ? 'Cursiva' : 'Italic'}
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1" />
                  <button
                    type="button"
                    onClick={() => insertFormatting('# ', '')}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    title={language === 'es' ? 'Título 1' : 'Heading 1'}
                  >
                    <Heading1 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('## ', '')}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    title={language === 'es' ? 'Título 2' : 'Heading 2'}
                  >
                    <Heading2 className="w-4 h-4" />
                  </button>
                  <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1" />
                  <button
                    type="button"
                    onClick={() => insertFormatting('- ', '')}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    title={language === 'es' ? 'Lista' : 'Bullet List'}
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('1. ', '')}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    title={language === 'es' ? 'Lista Numerada' : 'Numbered List'}
                  >
                    <ListOrdered className="w-4 h-4" />
                  </button>
                  <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1" />
                  <button
                    type="button"
                    onClick={() => insertFormatting('[', '](url)')}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    title={language === 'es' ? 'Enlace' : 'Link'}
                  >
                    <LinkIcon className="w-4 h-4" />
                  </button>
                </div>

                <textarea
                  ref={textareaRef}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder={
                    language === 'es'
                      ? 'Escribe el contenido del artículo...'
                      : 'Write the article content...'
                  }
                  rows={15}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-b-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36] font-mono text-sm border-t-0"
                  required
                />
              </div>
            </>
          )}

          {activeTab === 'cta' && (
            <>
              <div className="bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                  {language === 'es' ? '🎯 Sistema de Embudo' : '🎯 Funnel System'}
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-400">
                  {language === 'es'
                    ? 'Configura el CTA para guiar lectores a Base, tu membresía o contenido externo.'
                    : 'Configure the CTA to guide readers to Base, your membership, or external content.'}
                </p>
              </div>

              {/* CTA Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  <Target className="w-4 h-4 inline mr-1" />
                  {language === 'es' ? 'Tipo de CTA' : 'CTA Type'}
                </label>
                <select
                  value={formData.cta_type}
                  onChange={(e) => setFormData({ ...formData, cta_type: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                >
                  {ctaTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* CTA Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'Texto del Botón CTA' : 'CTA Button Text'}
                </label>
                <input
                  type="text"
                  value={formData.cta_text}
                  onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                  placeholder={
                    language === 'es'
                      ? 'Ej: Lee el artículo completo en Base'
                      : 'e.g., Read the full article on Base'
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                />
              </div>

              {/* CTA URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  <ExternalLink className="w-4 h-4 inline mr-1" />
                  {language === 'es' ? 'URL de Destino' : 'Target URL'}
                </label>
                <input
                  type="url"
                  value={formData.cta_url}
                  onChange={(e) => setFormData({ ...formData, cta_url: e.target.value })}
                  placeholder="https://academy.asciende.pro/article-slug"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                />
              </div>

              {/* External URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  <Globe className="w-4 h-4 inline mr-1" />
                  {language === 'es' ? 'URL Externa (opcional)' : 'External URL (optional)'}
                </label>
                <input
                  type="url"
                  value={formData.external_url}
                  onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 mt-1">
                  {language === 'es'
                    ? 'Si completas esto, el artículo redirigirá a esta URL al hacer clic'
                    : 'If filled, the article will redirect to this URL on click'}
                </p>
              </div>

              {/* UTM Campaign */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'Campaña (para tracking)' : 'Campaign (for tracking)'}
                </label>
                <input
                  type="text"
                  value={formData.utm_campaign}
                  onChange={(e) => setFormData({ ...formData, utm_campaign: e.target.value })}
                  placeholder="nutrition-week-1"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                />
              </div>
            </>
          )}

          {activeTab === 'versions' && article?.id && (
            <ArticleVersionManager
              articleId={article.id}
              articleType={formData.article_type}
              crossReferences={formData.cross_references}
              onVersionCreated={() => {
                onSaved();
              }}
            />
          )}

          {activeTab === 'settings' && (
            <>
              {/* Article Type & Visibility */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-5 dark:from-gray-900 dark:via-gray-900 dark:to-gray-8000 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white dark:text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {language === 'es' ? 'Tipo y Visibilidad del Artículo' : 'Article Type & Visibility'}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                      {language === 'es' ? 'Tipo de Artículo' : 'Article Type'}
                    </label>
                    <select
                      value={formData.article_type}
                      onChange={(e) => setFormData({ ...formData, article_type: e.target.value as any })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                    >
                      <option value="landing">{language === 'es' ? '🌍 Landing (Inspiracional)' : '🌍 Landing (Inspirational)'}</option>
                      <option value="base">{language === 'es' ? '📚 Base (Técnico)' : '📚 Base (Technical)'}</option>
                      <option value="app">{language === 'es' ? '📱 App (Digest)' : '📱 App (Digest)'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                      <Eye className="w-4 h-4 inline mr-1" />
                      {language === 'es' ? 'Nivel de Visibilidad' : 'Visibility Level'}
                    </label>
                    <select
                      value={formData.visibility_level}
                      onChange={(e) => setFormData({ ...formData, visibility_level: e.target.value as any })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                    >
                      <option value="public">{language === 'es' ? '🌍 Público (Landing)' : '🌍 Public (Landing)'}</option>
                      <option value="members">{language === 'es' ? '👥 Solo Miembros (Base)' : '👥 Members Only (Base)'}</option>
                      <option value="athletes">{language === 'es' ? '🏃 Solo Atletas (App)' : '🏃 Athletes Only (App)'}</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">
                    {formData.visibility_level === 'public' && (
                      <>
                        <Globe className="w-4 h-4 inline mr-1" />
                        {language === 'es'
                          ? 'Este artículo será visible para todos en el sitio web público (Landing)'
                          : 'This article will be visible to everyone on the public website (Landing)'}
                      </>
                    )}
                    {formData.visibility_level === 'members' && (
                      <>
                        <Users className="w-4 h-4 inline mr-1" />
                        {language === 'es'
                          ? 'Este artículo solo será visible para miembros con suscripción activa (Base)'
                          : 'This article will only be visible to members with active subscription (Base)'}
                      </>
                    )}
                    {formData.visibility_level === 'athletes' && (
                      <>
                        <Users className="w-4 h-4 inline mr-1" />
                        {language === 'es'
                          ? 'Este artículo solo será visible para atletas en la app (Píldoras de Rendimiento)'
                          : 'This article will only be visible to athletes in the app (Performance Pills)'}
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Category & Sport & Language */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                    {language === 'es' ? 'Categoría' : 'Category'} *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                    required
                  >
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                    {language === 'es' ? 'Deporte' : 'Sport'} * ({language === 'es' ? 'selecciona uno o varios' : 'select one or multiple'})
                  </label>
                  <select
                    multiple
                    value={formData.target_sports}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, (opt) => opt.value);
                      const previous = formData.target_sports || [];
                      // If user just added 'all', set only 'all'
                      if (selected.includes('all') && !previous.includes('all')) {
                        setFormData({ ...formData, target_sports: ['all'] });
                      } else if (selected.includes('all') && selected.length > 1) {
                        // User had 'all' and added another - remove 'all', keep the others
                        setFormData({ ...formData, target_sports: selected.filter((s) => s !== 'all') });
                      } else {
                        setFormData({ ...formData, target_sports: selected.length > 0 ? selected : ['all'] });
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36] min-h-[120px]"
                    required
                  >
                    {sports.map((sport) => (
                      <option key={sport.value} value={sport.value}>
                        {sport.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {language === 'es' ? 'Ctrl/Cmd + Click para seleccionar múltiples' : 'Ctrl/Cmd + Click to select multiple'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                    {language === 'es' ? 'Idioma' : 'Language'} *
                  </label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                    required
                  >
                    <option value="en">En - English</option>
                    <option value="es">Es - Español</option>
                  </select>
                </div>
              </div>

              {/* Reading Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  {language === 'es' ? 'Tiempo de Lectura (minutos)' : 'Reading Time (minutes)'}
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={formData.reading_time_minutes}
                  onChange={(e) =>
                    setFormData({ ...formData, reading_time_minutes: parseInt(e.target.value) || 5 })
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                />
              </div>

              {/* Scheduled Publishing */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  {language === 'es' ? 'Programar Publicación' : 'Schedule Publishing'}
                </label>
                <input
                  type="datetime-local"
                  value={formData.scheduled_publish_at}
                  onChange={(e) => setFormData({ ...formData, scheduled_publish_at: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 mt-1">
                  {language === 'es'
                    ? 'Deja vacío para publicar inmediatamente'
                    : 'Leave empty to publish immediately'}
                </p>
              </div>

              {/* Target Roles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'Audiencia Objetivo' : 'Target Audience'}
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.target_roles.includes('athlete')}
                      onChange={(e) => {
                        const roles = e.target.checked
                          ? [...formData.target_roles, 'athlete']
                          : formData.target_roles.filter((r) => r !== 'athlete');
                        setFormData({ ...formData, target_roles: roles });
                      }}
                      className="w-4 h-4 text-[#514163] border-gray-300 dark:border-gray-600 rounded focus:ring-[#fdda36]"
                    />
                    <span className="text-gray-700 dark:text-gray-300 dark:text-gray-300">
                      {language === 'es' ? 'Atletas' : 'Athletes'}
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.target_roles.includes('trainer')}
                      onChange={(e) => {
                        const roles = e.target.checked
                          ? [...formData.target_roles, 'trainer']
                          : formData.target_roles.filter((r) => r !== 'trainer');
                        setFormData({ ...formData, target_roles: roles });
                      }}
                      className="w-4 h-4 text-[#514163] border-gray-300 dark:border-gray-600 rounded focus:ring-[#fdda36]"
                    />
                    <span className="text-gray-700 dark:text-gray-300 dark:text-gray-300">
                      {language === 'es' ? 'Entrenadores' : 'Trainers'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Membership Tier Selector */}
              <div className="bg-gradient-to-r from-[#514163]/10 to-[#fdda36]/10 border border-[#514163]/30 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#fdda36]" />
                  {language === 'es' ? 'Nivel de Membresía Requerido' : 'Required Membership Tier'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {language === 'es'
                    ? 'Selecciona qué nivel de membresía necesitan tus atletas para leer este artículo'
                    : 'Select which membership tier your athletes need to read this article'}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Inicia */}
                  <label className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
                    formData.required_membership_tier === 'inicia'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }`}>
                    <input
                      type="radio"
                      name="membership_tier"
                      value="inicia"
                      checked={formData.required_membership_tier === 'inicia'}
                      onChange={(e) => setFormData({ ...formData, required_membership_tier: e.target.value as any })}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <div className="font-bold text-lg text-gray-900 dark:text-white">
                        {language === 'es' ? '🌱 Inicia' : '🌱 Inicia'}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {language === 'es' ? 'Todos los usuarios' : 'All users'}
                      </div>
                    </div>
                  </label>

                  {/* Intermediate */}
                  <label className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
                    formData.required_membership_tier === 'intermediate' || formData.required_membership_tier === 'asciende'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }`}>
                    <input
                      type="radio"
                      name="membership_tier"
                      value="intermediate"
                      checked={formData.required_membership_tier === 'intermediate' || formData.required_membership_tier === 'asciende'}
                      onChange={(e) => setFormData({ ...formData, required_membership_tier: e.target.value as any })}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <div className="font-bold text-lg text-gray-900 dark:text-white">
                        Intermediate
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {language === 'es' ? 'Premium' : 'Premium'}
                      </div>
                    </div>
                  </label>

                  {/* Pro */}
                  <label className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
                    formData.required_membership_tier === 'pro'
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }`}>
                    <input
                      type="radio"
                      name="membership_tier"
                      value="pro"
                      checked={formData.required_membership_tier === 'pro'}
                      onChange={(e) => setFormData({ ...formData, required_membership_tier: e.target.value as any })}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <div className="font-bold text-lg text-gray-900 dark:text-white">
                        {language === 'es' ? '⭐ Pro' : '⭐ Pro'}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {language === 'es' ? 'Elite' : 'Elite'}
                      </div>
                    </div>
                  </label>
                </div>

                <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formData.required_membership_tier === 'inicia' && (
                      <>
                        {language === 'es'
                          ? '✅ Este artículo es gratis y estará disponible para todos los usuarios'
                          : '✅ This article is free and will be available to all users'}
                      </>
                    )}
                    {(formData.required_membership_tier === 'intermediate' || formData.required_membership_tier === 'asciende') && (
                      <>
                        {language === 'es'
                          ? '🔒 Solo usuarios con Asciende Intermediate o Pro podrán leer este artículo'
                          : '🔒 Only users with Asciende Intermediate or Pro membership can read this article'}
                      </>
                    )}
                    {formData.required_membership_tier === 'pro' && (
                      <>
                        {language === 'es'
                          ? '💎 Solo usuarios con membresía Pro (nivel más alto) podrán leer este artículo'
                          : '💎 Only users with Pro membership (highest tier) can read this article'}
                      </>
                    )}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-900 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
              disabled={saving}
            >
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleSave(false)}
                disabled={saving || !formData.title || !formData.content}
                className="px-6 py-3 border-2 border-[#514163] dark:border-[#fdda36] text-[#514163] dark:text-[#fdda36] rounded-lg font-semibold hover:bg-[#514163] hover:text-white dark:hover:bg-[#fdda36] dark:hover:text-[#514163] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                {language === 'es' ? 'Guardar Borrador' : 'Save Draft'}
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={saving || !formData.title || !formData.content}
                className="px-6 py-3 bg-[#fdda36] text-[#514163] rounded-lg font-semibold hover:bg-[#ffd51a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Eye className="w-5 h-5" />
                {language === 'es' ? 'Publicar' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
