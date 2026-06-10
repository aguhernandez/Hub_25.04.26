import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { useLanguage } from '../contexts/LanguageContext';
import { useMembership } from '../hooks/useMembership';
import {
  GraduationCap, ExternalLink, Clock, Filter,
  RefreshCw, BookOpen, Tag, ChevronRight, Zap, Play,
  Search, X, Plus, Pencil, Trash2, BarChart3,
  Dumbbell, CalendarDays, Target, Leaf, Heart,
  CheckCircle, Trophy, Award,
  TrendingUp, Calendar, Circle, User, Eye, CreditCard as Edit,
  Globe, Crown, ArrowRight, Share2, PlayCircle, Lock, Users
} from 'lucide-react';
import TagPill, { CATEGORY_STYLES } from '../components/tags/TagPill';
import TagSelector from '../components/tags/TagSelector';
import ArticleEditor from '../components/digest/ArticleEditor';
import PremiumPaywall from '../components/digest/PremiumPaywall';

interface Course {
  id: string;
  title: string;
  title_es?: string | null;
  description?: string | null;
  description_es?: string | null;
  url?: string;
  external_url?: string | null;
  slug?: string | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  category?: string;
  price?: number;
  duration_hours?: number | null;
  level?: string;
  language?: string;
  sports?: string[];
  is_active?: boolean;
  sort_order?: number;
  external_source?: string | null;
  external_course_id?: string | null;
  external_updated_at?: string | null;
  instructor_name?: string | null;
  tags?: string[];
  is_completed?: boolean;
  completed_at?: string | null;
  progress_percent?: number | null;
}

interface TagItem {
  id: string;
  name: string;
  name_es: string | null;
  slug: string;
  category: string;
  description: string | null;
  color: string;
  usage_count: number;
  source_type: string | null;
  created_at: string;
}

type TagSource = 'workout' | 'atp_plan' | 'program' | 'wellness' | 'habit';

interface AthleteTagEntry {
  tag: TagItem;
  sources: TagSource[];
}

interface SatelliteTag {
  id: string;
  athlete_id: string;
  planner_token_id: string | null;
  planner_name: string;
  planner_type: string;
  name: string;
  name_es: string | null;
  slug: string;
  category: string;
  color: string;
  description: string | null;
  source_context: string | null;
  created_at: string;
  updated_at: string;
}


const CATEGORIES = ['training', 'nutrition', 'recovery', 'performance', 'mindset', 'methodology', 'other'];

const CATEGORY_LABELS: Record<string, { en: string; es: string }> = {
  training: { en: 'Training', es: 'Entrenamiento' },
  nutrition: { en: 'Nutrition', es: 'Nutrición' },
  recovery: { en: 'Recovery', es: 'Recuperación' },
  performance: { en: 'Performance', es: 'Rendimiento' },
  mindset: { en: 'Mindset', es: 'Mentalidad' },
  methodology: { en: 'Methodology', es: 'Metodología' },
  other: { en: 'Other', es: 'Otro' },
};

interface TagCardProps {
  tag: TagItem;
  language: string;
  isAdmin: boolean;
  onEdit: (tag: TagItem) => void;
  onDelete: (id: string) => void;
}

function TagCard({ tag, language, isAdmin, onEdit, onDelete }: TagCardProps) {
  const label = language === 'es' && tag.name_es ? tag.name_es : tag.name;
  const style = CATEGORY_STYLES[tag.category] || CATEGORY_STYLES['other'];

  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-2 ${style}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{label}</p>
          {tag.name_es && language !== 'es' && (
            <p className="text-xs opacity-70 truncate">{tag.name_es}</p>
          )}
          {tag.name && language === 'es' && tag.name_es && (
            <p className="text-xs opacity-70 truncate">{tag.name}</p>
          )}
        </div>
        {isAdmin && (
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => onEdit(tag)}
              className="p-1 rounded-md hover:bg-black/10 transition-colors"
              title={language === 'es' ? 'Editar' : 'Edit'}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(tag.id)}
              className="p-1 rounded-md hover:bg-black/10 transition-colors"
              title={language === 'es' ? 'Eliminar' : 'Delete'}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
      {tag.description && (
        <p className="text-xs opacity-70 line-clamp-2">{tag.description}</p>
      )}
      <div className="flex items-center gap-1.5 mt-auto pt-1">
        <BarChart3 className="w-3 h-3 opacity-60" />
        <span className="text-xs opacity-70">
          {tag.usage_count} {language === 'es' ? 'usos' : 'uses'}
        </span>
        <span className="ml-auto text-xs font-mono opacity-50">#{tag.slug}</span>
      </div>
    </div>
  );
}

const SOURCE_META: Record<TagSource, { icon: React.ReactNode; label: { en: string; es: string }; color: string }> = {
  workout:  { icon: <Dumbbell className="w-3 h-3" />,     label: { en: 'Training',  es: 'Entrenamiento' }, color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
  atp_plan: { icon: <CalendarDays className="w-3 h-3" />, label: { en: 'ATP Plan',  es: 'Plan Anual' },    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  program:  { icon: <Target className="w-3 h-3" />,       label: { en: 'Program',   es: 'Programa' },      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  wellness: { icon: <Heart className="w-3 h-3" />,        label: { en: 'Wellness',  es: 'Bienestar' },     color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20' },
  habit:    { icon: <Leaf className="w-3 h-3" />,         label: { en: 'Habits',    es: 'Hábitos' },       color: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' },
};

interface TrainerTagHubProps {
  language: string;
  allTags: TagItem[];
  satelliteTags: SatelliteTag[];
  tagsLoading: boolean;
  tagSearch: string;
  setTagSearch: (v: string) => void;
  tagCategoryFilter: string;
  setTagCategoryFilter: (v: string) => void;
  filteredTags: TagItem[];
  tagsByCategory: Record<string, TagItem[]>;
  showCreateTag: boolean;
  setShowCreateTag: (v: boolean) => void;
  newTag: { name: string; name_es: string; category: string; description: string };
  setNewTag: (fn: (p: { name: string; name_es: string; category: string; description: string }) => { name: string; name_es: string; category: string; description: string }) => void;
  savingTag: boolean;
  handleCreateTag: () => void;
  setEditingTag: (tag: TagItem) => void;
  handleDeleteTag: (id: string) => void;
}

function TrainerTagHub({
  language, allTags, satelliteTags, tagsLoading, tagSearch, setTagSearch,
  tagCategoryFilter, setTagCategoryFilter, filteredTags, tagsByCategory,
  showCreateTag, setShowCreateTag, newTag, setNewTag, savingTag,
  handleCreateTag, setEditingTag, handleDeleteTag,
}: TrainerTagHubProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-[#fdda36]" />
            {language === 'es' ? 'Repositorio Central de Etiquetas' : 'Central Tag Repository'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {language === 'es'
              ? 'Todas las etiquetas usadas en entrenamientos, planes, programas, wellness y hábitos'
              : 'All tags used across workouts, plans, programs, wellness and habits'}
          </p>
        </div>
        <button
          onClick={() => setShowCreateTag(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#fdda36] text-gray-900 font-semibold rounded-lg hover:bg-[#ffd51a] transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          {language === 'es' ? 'Nueva Etiqueta' : 'New Tag'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {CATEGORIES.slice(0, 4).map(cat => {
          const count = allTags.filter(t => t.category === cat).length;
          return (
            <div key={cat} className={`rounded-xl border p-4 ${CATEGORY_STYLES[cat] || 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs font-medium mt-0.5 opacity-80">{CATEGORY_LABELS[cat][language as 'en' | 'es']}</p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none"
            placeholder={language === 'es' ? 'Buscar etiquetas...' : 'Search tags...'}
            value={tagSearch}
            onChange={e => setTagSearch(e.target.value)}
          />
          {tagSearch && <button onClick={() => setTagSearch('')}><X className="w-3.5 h-3.5 text-gray-400" /></button>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setTagCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${tagCategoryFilter === 'all' ? 'bg-[#fdda36] text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
          >
            {language === 'es' ? 'Todos' : 'All'} ({filteredTags.length})
          </button>
          {CATEGORIES.map(cat => {
            const count = allTags.filter(t => t.category === cat).length;
            if (count === 0) return null;
            return (
              <button
                key={cat}
                onClick={() => setTagCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${tagCategoryFilter === cat ? CATEGORY_STYLES[cat] : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
              >
                {CATEGORY_LABELS[cat][language as 'en' | 'es']} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {showCreateTag && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-[#fdda36]/30 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{language === 'es' ? 'Nueva Etiqueta' : 'New Tag'}</h3>
            <button onClick={() => setShowCreateTag(false)}><X className="w-4 h-4 text-gray-400 hover:text-gray-600" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{language === 'es' ? 'Nombre (EN)' : 'Name (EN)'}</label>
              <input className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-[#fdda36]/60" value={newTag.name} onChange={e => setNewTag(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Speed Work" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{language === 'es' ? 'Nombre (ES)' : 'Name (ES)'}</label>
              <input className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-[#fdda36]/60" value={newTag.name_es} onChange={e => setNewTag(p => ({ ...p, name_es: e.target.value }))} placeholder="ej: Trabajo de Velocidad" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{language === 'es' ? 'Categoría' : 'Category'}</label>
              <select className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none" value={newTag.category} onChange={e => setNewTag(p => ({ ...p, category: e.target.value }))}>
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{CATEGORY_LABELS[cat][language as 'en' | 'es']}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{language === 'es' ? 'Descripción (opcional)' : 'Description (optional)'}</label>
              <input className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-[#fdda36]/60" value={newTag.description} onChange={e => setNewTag(p => ({ ...p, description: e.target.value }))} placeholder={language === 'es' ? 'Breve descripción...' : 'Brief description...'} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleCreateTag} disabled={savingTag || !newTag.name.trim()} className="px-4 py-2 bg-[#fdda36] text-gray-900 font-semibold text-sm rounded-lg hover:bg-[#ffd51a] disabled:opacity-50 transition-colors">
              {savingTag ? '...' : (language === 'es' ? 'Crear' : 'Create')}
            </button>
            <button onClick={() => setShowCreateTag(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {tagsLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#fdda36] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredTags.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Tag className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">{language === 'es' ? 'Sin etiquetas encontradas' : 'No tags found'}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {tagCategoryFilter === 'all'
            ? CATEGORIES.map(cat => {
                const catTags = tagsByCategory[cat];
                if (!catTags || catTags.length === 0) return null;
                return (
                  <div key={cat}>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${CATEGORY_STYLES[cat] || ''}`}>{CATEGORY_LABELS[cat][language as 'en' | 'es']}</h3>
                      <span className="text-xs text-gray-400">{catTags.length}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {catTags.map(tag => <TagCard key={tag.id} tag={tag} language={language} isAdmin onEdit={setEditingTag} onDelete={handleDeleteTag} />)}
                    </div>
                  </div>
                );
              })
            : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredTags.map(tag => <TagCard key={tag.id} tag={tag} language={language} isAdmin onEdit={setEditingTag} onDelete={handleDeleteTag} />)}
              </div>
            )
          }
        </div>
      )}

      {/* ── Satellite Tags (all athletes, grouped by planner) ── */}
      {satelliteTags.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#fdda36]" />
              {language === 'es' ? 'Etiquetas de Satélites' : 'Satellite Tags'}
            </h2>
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full font-medium">{satelliteTags.length}</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
            {language === 'es'
              ? 'Etiquetas enviadas por los satélites conectados a través del X-Planner-Token'
              : 'Tags pushed by connected satellites via the X-Planner-Token'}
          </p>
          {(() => {
            const byPlanner: Record<string, { name: string; type: string; tags: SatelliteTag[] }> = {};
            for (const st of satelliteTags) {
              if (!byPlanner[st.planner_name]) byPlanner[st.planner_name] = { name: st.planner_name, type: st.planner_type, tags: [] };
              byPlanner[st.planner_name].tags.push(st);
            }
            const PLANNER_TYPE_COLORS: Record<string, string> = {
              endurance: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300',
              lab:       'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-300',
              nutrition: 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-300',
              strength:  'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300',
              other:     'bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300',
            };
            return Object.values(byPlanner).map(planner => (
              <div key={planner.name} className="space-y-2">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${PLANNER_TYPE_COLORS[planner.type] || PLANNER_TYPE_COLORS['other']}`}>
                  <Zap className="w-3 h-3" />
                  {planner.name}
                  <span className="opacity-60">· {planner.type}</span>
                </div>
                <div className="flex flex-wrap gap-2 pl-2">
                  {planner.tags.map(st => (
                    <div key={st.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300" title={st.description || st.source_context || ''}>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: st.color }} />
                      {language === 'es' && st.name_es ? st.name_es : st.name}
                    </div>
                  ))}
                </div>
              </div>
            ));
          })()}
        </div>
      )}
    </div>
  );
}

interface AthleteTagHubProps {
  language: string;
  athleteTags: AthleteTagEntry[];
  satelliteTags: SatelliteTag[];
  tagsLoading: boolean;
  tagSearch: string;
  setTagSearch: (v: string) => void;
  tagCategoryFilter: string;
  setTagCategoryFilter: (v: string) => void;
}

function AthleteTagHub({ language, athleteTags, satelliteTags, tagsLoading, tagSearch, setTagSearch, tagCategoryFilter, setTagCategoryFilter }: AthleteTagHubProps) {
  const filtered = athleteTags.filter(entry => {
    const label = language === 'es' && entry.tag.name_es ? entry.tag.name_es : entry.tag.name;
    const matchSearch = label.toLowerCase().includes(tagSearch.toLowerCase());
    const matchCat = tagCategoryFilter === 'all' || entry.tag.category === tagCategoryFilter;
    return matchSearch && matchCat;
  });

  const presentCategories = Array.from(new Set(athleteTags.map(e => e.tag.category)));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-[#fdda36]" />
            {language === 'es' ? 'Mis Etiquetas' : 'My Tags'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {language === 'es'
              ? 'Etiquetas que tu entrenador ha aplicado a tus entrenamientos, planes, programas, wellness y hábitos'
              : 'Tags your trainer has applied to your workouts, plans, programs, wellness and habits'}
          </p>
        </div>
        {athleteTags.length > 0 && (
          <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-[#fdda36]/10 border border-[#fdda36]/30 rounded-lg">
            <Tag className="w-3.5 h-3.5 text-[#fdda36]" />
            <span className="text-sm font-bold text-gray-800 dark:text-white">{athleteTags.length}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{language === 'es' ? 'etiquetas' : 'tags'}</span>
          </div>
        )}
      </div>

      {athleteTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {(['workout', 'atp_plan', 'program', 'wellness', 'habit'] as TagSource[]).map(src => {
            const count = athleteTags.filter(e => e.sources.includes(src)).length;
            if (count === 0) return null;
            const meta = SOURCE_META[src];
            return (
              <div key={src} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${meta.color}`}>
                {meta.icon}
                {meta.label[language as 'en' | 'es']}
                <span className="font-bold">{count}</span>
              </div>
            );
          })}
        </div>
      )}

      {athleteTags.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none"
              placeholder={language === 'es' ? 'Buscar etiquetas...' : 'Search tags...'}
              value={tagSearch}
              onChange={e => setTagSearch(e.target.value)}
            />
            {tagSearch && <button onClick={() => setTagSearch('')}><X className="w-3.5 h-3.5 text-gray-400" /></button>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setTagCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${tagCategoryFilter === 'all' ? 'bg-[#fdda36] text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
              {language === 'es' ? 'Todos' : 'All'} ({filtered.length})
            </button>
            {presentCategories.map(cat => {
              const count = athleteTags.filter(e => e.tag.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setTagCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${tagCategoryFilter === cat ? CATEGORY_STYLES[cat] : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                >
                  {CATEGORY_LABELS[cat]?.[language as 'en' | 'es'] || cat} ({count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {tagsLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#fdda36] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : athleteTags.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto">
            <Tag className="w-8 h-8 text-gray-300 dark:text-gray-600" />
          </div>
          <div>
            <p className="text-gray-700 dark:text-gray-300 font-semibold">
              {language === 'es' ? 'Sin etiquetas aún' : 'No tags yet'}
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1 max-w-xs mx-auto">
              {language === 'es'
                ? 'Cuando tu entrenador aplique etiquetas a tus entrenamientos o planes, aparecerán aquí.'
                : 'When your trainer applies tags to your workouts or plans, they will appear here.'}
            </p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-400 dark:text-gray-500 text-sm">{language === 'es' ? 'Sin resultados' : 'No results'}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {CATEGORIES.map(cat => {
            const catEntries = filtered.filter(e => e.tag.category === cat);
            if (catEntries.length === 0) return null;
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${CATEGORY_STYLES[cat] || ''}`}>
                    {CATEGORY_LABELS[cat]?.[language as 'en' | 'es'] || cat}
                  </h3>
                  <span className="text-xs text-gray-400">{catEntries.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {catEntries.map(entry => {
                    const label = language === 'es' && entry.tag.name_es ? entry.tag.name_es : entry.tag.name;
                    const style = CATEGORY_STYLES[entry.tag.category] || CATEGORY_STYLES['other'];
                    return (
                      <div key={entry.tag.id} className={`rounded-xl border p-4 flex flex-col gap-2 ${style}`}>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{label}</p>
                          {entry.tag.name_es && language !== 'es' && (
                            <p className="text-xs opacity-70">{entry.tag.name_es}</p>
                          )}
                          {entry.tag.description && (
                            <p className="text-xs opacity-70 mt-1 line-clamp-2">{entry.tag.description}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 pt-1 border-t border-current/10">
                          {entry.sources.map(src => {
                            const meta = SOURCE_META[src];
                            return (
                              <span key={src} className="flex items-center gap-1 px-1.5 py-0.5 bg-white/20 dark:bg-black/20 rounded text-xs font-medium">
                                {meta.icon}
                                {meta.label[language as 'en' | 'es']}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Satellite Tags Section ── */}
      {satelliteTags.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#fdda36]" />
              {language === 'es' ? 'Etiquetas de Satélites' : 'Satellite Tags'}
            </h2>
            <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full font-medium">
              {satelliteTags.length}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
            {language === 'es'
              ? 'Etiquetas enviadas por tus satélites conectados (Lab, Endurance, Nutrition...)'
              : 'Tags pushed by your connected satellites (Lab, Endurance, Nutrition...)'}
          </p>

          {/* Group by planner */}
          {(() => {
            const byPlanner: Record<string, { name: string; type: string; tags: SatelliteTag[] }> = {};
            for (const st of satelliteTags) {
              const key = st.planner_name;
              if (!byPlanner[key]) byPlanner[key] = { name: st.planner_name, type: st.planner_type, tags: [] };
              byPlanner[key].tags.push(st);
            }
            const PLANNER_TYPE_COLORS: Record<string, string> = {
              endurance: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300',
              lab:       'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-300',
              nutrition: 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-300',
              strength:  'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300',
              other:     'bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300',
            };
            return Object.values(byPlanner).map(planner => (
              <div key={planner.name} className="space-y-2">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${PLANNER_TYPE_COLORS[planner.type] || PLANNER_TYPE_COLORS['other']}`}>
                  <Zap className="w-3 h-3" />
                  {planner.name}
                  <span className="opacity-60">· {planner.type}</span>
                </div>
                <div className="flex flex-wrap gap-2 pl-2">
                  {planner.tags.map(st => (
                    <div
                      key={st.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                      title={st.description || st.source_context || st.name}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: st.color }} />
                      {language === 'es' && st.name_es ? st.name_es : st.name}
                    </div>
                  ))}
                </div>
              </div>
            ));
          })()}
        </div>
      )}
    </div>
  );
}

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
  cross_references: { landing_id?: string; base_id?: string; app_id?: string };
  share_count?: number;
}

interface AcademyPageProps {
  onNavigate?: (page: string) => void;
}

export default function AcademyPage({ onNavigate }: AcademyPageProps) {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const { hasAsciende, hasPro } = useMembership();
  const [courses, setCourses] = useState<Course[]>([]);
  const [allCoursesRaw, setAllCoursesRaw] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [featuredCourse, setFeaturedCourse] = useState<Course | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'courses' | 'tags'>('courses');
  const [showCompleted, setShowCompleted] = useState(false);

  const [allTags, setAllTags] = useState<TagItem[]>([]);
  const [athleteTags, setAthleteTags] = useState<AthleteTagEntry[]>([]);
  const [satelliteTags, setSatelliteTags] = useState<SatelliteTag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [tagCategoryFilter, setTagCategoryFilter] = useState<string>('all');
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [newTag, setNewTag] = useState({ name: '', name_es: '', category: 'training', description: '' });
  const [savingTag, setSavingTag] = useState(false);

  // --- Digest state ---
  const [articles, setArticles] = useState<Article[]>([]);
  const [digestLoading, setDigestLoading] = useState(true);
  const [digestCategory, setDigestCategory] = useState<string>('all');
  const [digestLanguage, setDigestLanguage] = useState<string>(() => language === 'es' ? 'es' : 'en');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallArticle, setPaywallArticle] = useState<Article | null>(null);
  const [athleteSports, setAthleteSports] = useState<string[]>([]);

  const hasActiveMembership = hasAsciende || hasPro;

  const { error: showError } = useToast();
  const isTrainerOrAdmin = profile?.role === 'trainer' || profile?.role === 'admin';

  const categoryOptions = [
    { id: 'all',         label: { es: 'Todos',          en: 'All' } },
    { id: 'training',    label: { es: 'Entrenamiento',  en: 'Training' } },
    { id: 'nutrition',   label: { es: 'Nutrición',      en: 'Nutrition' } },
    { id: 'recovery',    label: { es: 'Recuperación',   en: 'Recovery' } },
    { id: 'psychology',  label: { es: 'Psicología',     en: 'Psychology' } },
    { id: 'performance', label: { es: 'Rendimiento',    en: 'Performance' } },
    { id: 'mindset',     label: { es: 'Mentalidad',     en: 'Mindset' } },
  ];

  const categoryLabel = (cat: string) => {
    const found = categoryOptions.find(o => o.id === cat);
    if (found) return language === 'es' ? found.label.es : found.label.en;
    return cat;
  };

  const levelColors: Record<string, string> = {
    beginner:     'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    intermediate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    advanced:     'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  };

  const levelLabel = (level: string) => {
    const labels: Record<string, { es: string; en: string }> = {
      beginner:     { es: 'Principiante', en: 'Beginner' },
      intermediate: { es: 'Intermedio',   en: 'Intermediate' },
      advanced:     { es: 'Avanzado',     en: 'Advanced' },
    };
    return language === 'es' ? (labels[level]?.es || level) : (labels[level]?.en || level);
  };

  const buildTagsPayload = useCallback(() => {
    const seen = new Set<string>();
    const result: { tag: string; priority: string; timing: string }[] = [];

    const addTag = (name: string, priority: string, timing: string) => {
      const key = name.trim().toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      result.push({ tag: name.trim(), priority, timing });
    };

    if (isTrainerOrAdmin) {
      for (const t of allTags) addTag(t.name, t.category, 'current');
    } else {
      for (const entry of athleteTags) addTag(entry.tag.name, entry.tag.category, entry.sources.join(','));
    }

    for (const st of satelliteTags) addTag(st.name, st.planner_type, st.source_context || 'current');

    return result;
  }, [isTrainerOrAdmin, allTags, athleteTags, satelliteTags]);

  const syncAndLoad = useCallback(async (showSyncIndicator = false) => {
    if (!profile) return;
    if (showSyncIndicator) setSyncing(true);
    else setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const tags = buildTagsPayload();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-academy-courses`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            action: 'get_courses_by_tags',
            athlete_id: profile.id,
            tags,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      const raw: Course[] = result.courses || [];

      setAllCoursesRaw(raw);
      applyFilters(raw);
      setLastSync(new Date().toISOString());
    } catch (err) {
      console.error('Error loading academy courses:', err);
      if (showSyncIndicator) {
        showError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [profile, language, buildTagsPayload]);

  const applyFilters = (
    data: Course[],
    catOverride?: string,
    tagOverride?: string | null,
  ) => {
    const cat = catOverride !== undefined ? catOverride : selectedCategory;
    const tagId = tagOverride !== undefined ? tagOverride : selectedTagId;

    let filtered = data.filter(c => !c.is_completed);

    if (cat !== 'all') {
      filtered = filtered.filter(c => c.category === cat);
    }

    if (tagId) {
      const hubTag = [...allTags, ...athleteTags.map(e => e.tag)].find(t => t.id === tagId);
      const satTag = satelliteTags.find(t => t.id === tagId);
      const tag = hubTag || satTag;
      if (tag) {
        filtered = filtered.filter(c =>
          c.category === tag.category ||
          c.sports?.includes(tag.slug) ||
          c.sports?.includes(tag.name.toLowerCase())
        );
      }
    }

    const featured = filtered.find(c => c.image_url) || filtered[0] || null;
    setFeaturedCourse(featured);
    setCourses(filtered);
  };

  const loadTags = useCallback(async () => {
    if (!profile) return;
    setTagsLoading(true);

    if (isTrainerOrAdmin) {
      const { data } = await supabase.from('tags').select('*').order('usage_count', { ascending: false });
      if (data) setAllTags(data);
    } else {
      const uid = profile.id;
      const sourceMap: Record<string, TagSource[]> = {};

      const addTagIds = (tagIds: string[], source: TagSource) => {
        for (const id of tagIds) {
          if (!sourceMap[id]) sourceMap[id] = [];
          if (!sourceMap[id].includes(source)) sourceMap[id].push(source);
        }
      };

      const [awRes, atpPlanRes, apRes, wcRes, uhRes] = await Promise.all([
        supabase.from('athlete_workouts').select('workout_id').eq('athlete_id', uid),
        supabase.from('annual_training_plans').select('id').eq('athlete_id', uid),
        supabase.from('athlete_programs').select('program_product_id').eq('athlete_id', uid),
        supabase.from('wellness_checkins').select('id').eq('athlete_id', uid),
        supabase.from('user_habits').select('id').eq('user_id', uid),
      ]);

      const workoutIds = (awRes.data || []).map((r: { workout_id: string }) => r.workout_id).filter(Boolean);
      const planIds = (atpPlanRes.data || []).map((r: { id: string }) => r.id).filter(Boolean);
      const programIds = (apRes.data || []).map((r: { program_product_id: string }) => r.program_product_id).filter(Boolean);
      const checkinIds = (wcRes.data || []).map((r: { id: string }) => r.id).filter(Boolean);
      const habitIds = (uhRes.data || []).map((r: { id: string }) => r.id).filter(Boolean);

      const [wtRes, atRes, ptRes, wellRes, htRes] = await Promise.all([
        workoutIds.length > 0
          ? supabase.from('workout_tags').select('tag_id').in('workout_id', workoutIds)
          : Promise.resolve({ data: [] }),
        planIds.length > 0
          ? supabase.from('atp_plan_tags').select('tag_id').in('plan_id', planIds)
          : Promise.resolve({ data: [] }),
        programIds.length > 0
          ? supabase.from('program_tags').select('tag_id').in('program_id', programIds)
          : Promise.resolve({ data: [] }),
        checkinIds.length > 0
          ? supabase.from('wellness_tags').select('tag_id').in('checkin_id', checkinIds)
          : Promise.resolve({ data: [] }),
        habitIds.length > 0
          ? supabase.from('habit_tags').select('tag_id').in('habit_id', habitIds)
          : Promise.resolve({ data: [] }),
      ]);

      addTagIds((wtRes.data || []).map((r: { tag_id: string }) => r.tag_id), 'workout');
      addTagIds((atRes.data || []).map((r: { tag_id: string }) => r.tag_id), 'atp_plan');
      addTagIds((ptRes.data || []).map((r: { tag_id: string }) => r.tag_id), 'program');
      addTagIds((wellRes.data || []).map((r: { tag_id: string }) => r.tag_id), 'wellness');
      addTagIds((htRes.data || []).map((r: { tag_id: string }) => r.tag_id), 'habit');

      const uniqueIds = Object.keys(sourceMap);
      if (uniqueIds.length > 0) {
        const { data: tagData } = await supabase
          .from('tags')
          .select('*')
          .in('id', uniqueIds)
          .order('category');
        const entries: AthleteTagEntry[] = (tagData || []).map(tag => ({
          tag,
          sources: sourceMap[tag.id] || [],
        }));
        setAthleteTags(entries);
      } else {
        setAthleteTags([]);
      }
    }

    // Always load satellite tags for the current user (all roles)
    const { data: satData, error: satError } = isTrainerOrAdmin
      ? await supabase.from('satellite_tags').select('*').order('planner_name').order('name')
      : await supabase.from('satellite_tags').select('*').eq('athlete_id', profile.id).order('planner_name').order('name');
    if (satError) console.error('satellite_tags error:', satError);
    setSatelliteTags(satData || []);

    setTagsLoading(false);
  }, [profile, isTrainerOrAdmin]);

  const handleCreateTag = async () => {
    if (!newTag.name.trim()) return;
    setSavingTag(true);
    const slug = newTag.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const { error } = await supabase.from('tags').insert({
      name: newTag.name.trim(),
      name_es: newTag.name_es.trim() || null,
      slug,
      category: newTag.category,
      description: newTag.description.trim() || null,
      created_by: profile?.id,
    });
    if (!error) {
      setNewTag({ name: '', name_es: '', category: 'training', description: '' });
      setShowCreateTag(false);
      loadTags();
    }
    setSavingTag(false);
  };

  const handleUpdateTag = async () => {
    if (!editingTag) return;
    setSavingTag(true);
    const { error } = await supabase.from('tags').update({
      name: editingTag.name,
      name_es: editingTag.name_es || null,
      category: editingTag.category,
      description: editingTag.description || null,
    }).eq('id', editingTag.id);
    if (!error) {
      setEditingTag(null);
      loadTags();
    }
    setSavingTag(false);
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm(language === 'es' ? '¿Eliminar esta etiqueta?' : 'Delete this tag?')) return;
    await supabase.from('tags').delete().eq('id', tagId);
    loadTags();
  };

  const filteredTags = allTags.filter(tag => {
    const label = language === 'es' && tag.name_es ? tag.name_es : tag.name;
    const matchSearch = label.toLowerCase().includes(tagSearch.toLowerCase())
      || tag.slug.includes(tagSearch.toLowerCase());
    const matchCat = tagCategoryFilter === 'all' || tag.category === tagCategoryFilter;
    return matchSearch && matchCat;
  });

  const tagsByCategory = CATEGORIES.reduce<Record<string, TagItem[]>>((acc, cat) => {
    acc[cat] = filteredTags.filter(t => t.category === cat);
    return acc;
  }, {});

  useEffect(() => {
    syncAndLoad(false);
    loadTags();
  }, [profile]);

  useEffect(() => {
    if (activeTab === 'tags') loadTags();
  }, [activeTab]);

  useEffect(() => {
    if (allCoursesRaw.length > 0) {
      applyFilters(allCoursesRaw);
    }
  }, [selectedCategory, selectedTagId, language]);

  // --- Digest logic ---
  const canAccessArticle = (article: Article): boolean => {
    if (isTrainerOrAdmin) return true;
    const TIER_LEVEL: Record<string, number> = { inicia: 1, free: 1, intermediate: 2, asciende: 2, pro: 3, teams_sports: 3 };
    const requiredTier = (article as any).required_membership_tier || 'inicia';
    const required = TIER_LEVEL[requiredTier] ?? 1;
    if (hasPro) return true;
    if (hasAsciende) return required <= 2;
    return required <= 1;
  };

  useEffect(() => { loadAthleteSports(); }, [profile]);
  useEffect(() => {
    loadArticles();
  }, [profile, digestCategory, digestLanguage, athleteSports]);

  const loadAthleteSports = async () => {
    if (!profile || isTrainerOrAdmin) { setAthleteSports([]); return; }
    try {
      const sports: string[] = [];
      // From profile.sport
      if ((profile as any).sport) sports.push((profile as any).sport);
      // From teams
      const { data: teamMemberships } = await supabase
        .from('team_members').select('team_id, teams(sport)').eq('athlete_id', profile.id);
      const teamSports = teamMemberships?.map((tm: any) => tm.teams?.sport).filter((s): s is string => !!s) || [];
      sports.push(...teamSports);
      setAthleteSports([...new Set(sports)]);
    } catch { setAthleteSports([]); }
  };

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

  const loadArticles = async () => {
    if (!profile) return;
    setDigestLoading(true);
    try {
      let query = supabase.from('digest_articles').select(`*, author:profiles!digest_articles_author_id_fkey(full_name)`).order('published_date', { ascending: false });
      if (!isTrainerOrAdmin) query = query.eq('is_published', true);
      if (digestCategory !== 'all') query = query.eq('category', digestCategory);
      if (digestLanguage !== 'all') query = query.eq('language', digestLanguage);
      const { data, error } = await query;
      if (error) throw error;
      let filtered = data || [];
      if (!isTrainerOrAdmin) {
        const { data: teamMemberships } = await supabase.from('team_members').select('team_id').eq('athlete_id', profile.id);
        const athleteTeamIds = teamMemberships?.map((tm: any) => tm.team_id) || [];
        const { data: teamArticles } = await supabase.from('team_digest_content').select('digest_article_id').in('team_id', athleteTeamIds.length > 0 ? athleteTeamIds : ['00000000-0000-0000-0000-000000000000']);
        const teamArticleIds = new Set(teamArticles?.map((ta: any) => ta.digest_article_id) || []);
        // Normalize: lowercase, remove underscores/hyphens/spaces → single token for fuzzy matching
        const norm = (s: string) => s?.toLowerCase().replace(/[_\-\s]+/g, '').trim() || '';
        const normSports = athleteSports.map(norm);
        const sportMatches = (articleSport: string, athleteNorm: string): boolean => {
          const an = norm(articleSport);
          // Exact match after normalization
          if (an === athleteNorm) return true;
          // One contains the other (handles "beachvolley" ↔ "beachvolleyball")
          if (an.length >= 4 && (athleteNorm.startsWith(an) || an.startsWith(athleteNorm))) return true;
          return false;
        };
        filtered = filtered.filter((a: any) => {
          if (teamArticleIds.has(a.id)) return true;
          const articleSports = parseSportField(a.sport);
          const articleTargetSports = parseSportField(a.target_sports);
          const allArticleSports = [...new Set([...articleSports, ...articleTargetSports])];
          // No sport specified → show to everyone
          if (allArticleSports.length === 0) return true;
          // Explicitly targets 'all' sports
          if (allArticleSports.some(s => s === 'all' || norm(s) === 'all')) return true;
          // Sport-specific: fuzzy match against athlete sports
          if (allArticleSports.some(as => normSports.some(ns => sportMatches(as, ns)))) return true;
          return false;
        });
      }
      const articlesWithRead = filtered.map((a: any) => ({ ...a, author_name: a.author?.full_name || 'Unknown', is_read: false, read_at: null }));
      if (!isTrainerOrAdmin) {
        const { data: reads } = await supabase.from('digest_article_reads').select('article_id, read_at').eq('user_id', profile.id);
        const readMap = new Map(reads?.map((r) => [r.article_id, r.read_at]) || []);
        articlesWithRead.forEach((a: any) => { a.is_read = readMap.has(a.id); a.read_at = readMap.get(a.id) || null; });
      }
      setArticles(articlesWithRead);
    } catch (err) { console.error('Error loading articles:', err); }
    finally { setDigestLoading(false); }
  };

  const incrementViewCount = async (articleId: string) => {
    try { await supabase.rpc('increment_digest_views', { article_uuid: articleId }); } catch {}
  };

  const trackConversion = async (articleId: string, ctaType: string, ctaUrl: string) => {
    if (!profile) return;
    try { await supabase.from('digest_article_conversions').insert({ article_id: articleId, user_id: profile.id, cta_type: ctaType, referrer: window.location.href, user_agent: navigator.userAgent }); } catch {}
  };

  const handleArticleClick = async (article: Article) => {
    if (article.external_url) { await incrementViewCount(article.id); window.open(article.external_url, '_blank'); return; }
    await incrementViewCount(article.id);
    setSelectedArticle(article);
  };

  const markAsRead = async (articleId: string) => {
    if (!profile) return;
    try {
      await supabase.from('digest_article_reads').upsert({ article_id: articleId, user_id: profile.id, read_percentage: 100 });
      setArticles(prev => prev.map(a => a.id === articleId ? { ...a, is_read: true, read_at: new Date().toISOString() } : a));
      const { data: nextArticle } = await supabase.rpc('mark_digest_read_and_get_next', { current_article_id: articleId, user_profile_id: profile.id });
      if (nextArticle?.length > 0) {
        setTimeout(() => { const a = articles.find(x => x.id === nextArticle[0].id); if (a) setSelectedArticle(a); }, 1000);
      }
    } catch {}
  };

  const handleCTAClick = async (article: Article) => {
    if (!article.cta_url) return;
    await trackConversion(article.id, article.cta_type || 'external', article.cta_url);
    window.open(article.cta_url, '_blank');
  };

  const handleDeleteArticle = async (articleId: string) => {
    if (!confirm(language === 'es' ? '¿Eliminar este artículo?' : 'Delete this article?')) return;
    try {
      await supabase.from('digest_articles').delete().eq('id', articleId);
      setArticles(prev => prev.filter(a => a.id !== articleId));
      if (selectedArticle?.id === articleId) setSelectedArticle(null);
    } catch (err: any) { alert(`Error: ${err.message}`); }
  };

  const handleShare = async (article: Article) => {
    const shareUrl = `https://hub.asciende.pro/digest/${article.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: article.title, text: article.subtitle || article.title, url: shareUrl }); } catch {}
    } else { navigator.clipboard.writeText(shareUrl); alert(language === 'es' ? 'Enlace copiado!' : 'Link copied!'); }
    try { await supabase.from('digest_articles').update({ share_count: (article.share_count || 0) + 1 }).eq('id', article.id); } catch {}
  };

  const getArticleCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      nutrition: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      physical: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      mental: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      recovery: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      biomechanics: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      analysis: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    };
    return colors[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  };

  const getArticleCategoryLabel = (category: string) => {
    const labels: Record<string, { en: string; es: string }> = {
      nutrition: { en: 'Nutrition', es: 'Nutrición' },
      physical: { en: 'Physical Prep', es: 'Preparación Física' },
      mental: { en: 'Mental Prep', es: 'Preparación Mental' },
      recovery: { en: 'Recovery', es: 'Recuperación' },
      biomechanics: { en: 'Biomechanics', es: 'Biomecánica' },
      analysis: { en: 'Analysis', es: 'Análisis' },
    };
    return labels[category]?.[language as 'en' | 'es'] || category;
  };

  const renderMarkdown = (text: string) => {
    const isDark = document.documentElement.classList.contains('dark');
    const bodyColor = isDark ? '#e5e7eb' : '#1f2937';
    const headingColor = isDark ? '#ffffff' : '#111827';
    const linkColor = isDark ? '#fdda36' : '#514163';

    const pStyle = `margin:0 0 1rem 0;line-height:1.7;color:${bodyColor};`;
    const h1Style = `font-size:1.5rem;font-weight:700;margin:2rem 0 1rem 0;color:${headingColor};`;
    const h2Style = `font-size:1.25rem;font-weight:700;margin:1.5rem 0 0.75rem 0;color:${headingColor};`;
    const h3Style = `font-size:1.125rem;font-weight:700;margin:1rem 0 0.5rem 0;color:${headingColor};`;
    const strongStyle = `font-weight:700;color:${headingColor};`;
    const emStyle = `font-style:italic;color:${bodyColor};`;
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

  const digestCategories = [
    { value: 'all', label: language === 'es' ? 'Todas' : 'All' },
    { value: 'nutrition', label: language === 'es' ? 'Nutrición' : 'Nutrition' },
    { value: 'physical', label: language === 'es' ? 'Preparación Física' : 'Physical Prep' },
    { value: 'mental', label: language === 'es' ? 'Preparación Mental' : 'Mental Prep' },
    { value: 'recovery', label: language === 'es' ? 'Recuperación' : 'Recovery' },
    { value: 'biomechanics', label: language === 'es' ? 'Biomecánica' : 'Biomechanics' },
    { value: 'analysis', label: language === 'es' ? 'Análisis' : 'Analysis' },
  ];

  const readArticles = articles.filter(a => a.is_read).length;
  const totalArticles = articles.length;
  const readPercentage = totalArticles > 0 ? Math.round((readArticles / totalArticles) * 100) : 0;

  const getCourseName = (c: Course) =>
    language === 'es' && c.title_es ? c.title_es : c.title;

  const getCourseDesc = (c: Course) =>
    language === 'es' && c.description_es ? c.description_es : c.description;

  const getCourseUrl = (c: Course) => {
    if (c.external_url) return c.external_url;
    if (c.url) return c.url;
    if (c.slug) return `https://xaatkjdbtlptbkdqbmih.supabase.co/courses/${c.slug}`;
    return '#';
  };

  const getCourseImage = (c: Course) => c.image_url || c.thumbnail_url || null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-3 border-[#fdda36] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const completedCourses = allCoursesRaw.filter(c => c.is_completed);
  const activeCourses = courses.filter(c => !c.is_completed);
  const filteredFeatured = activeCourses.find(c => c.image_url) || activeCourses[0] || null;
  const restCourses = activeCourses.filter(c => c.id !== filteredFeatured?.id);

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gray-900 p-8 text-white">
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(ellipse at 80% 40%, #fdda36 0%, transparent 55%)' }}
        />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <GraduationCap className="w-8 h-8 text-[#fdda36]" />
              <h1 className="text-2xl font-bold tracking-tight">
                {language === 'es' ? 'Academia Asciende' : 'Asciende Academy'}
              </h1>
            </div>
            <p className="text-gray-400 text-sm max-w-lg leading-relaxed">
              {language === 'es'
                ? 'Cursos y contenidos del ecosistema Asciende, sincronizados en tiempo real desde academy.asciende.pro'
                : 'Courses and content from the Asciende ecosystem, synced in real time from academy.asciende.pro'}
            </p>
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              {courses.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-[#fdda36]/80">
                  <Zap className="w-3.5 h-3.5" />
                  {courses.length} {language === 'es' ? 'cursos disponibles' : 'courses available'}
                </div>
              )}
              {completedCourses.length > 0 && (
                <button
                  onClick={() => setShowCompleted(true)}
                  className="flex items-center gap-1.5 text-xs text-emerald-400/90 hover:text-emerald-300 transition-colors px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 rounded-full border border-emerald-500/25"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  {completedCourses.length} {language === 'es' ? 'completados' : 'completed'}
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          <button
            onClick={() => syncAndLoad(true)}
            disabled={syncing}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {language === 'es' ? 'Sincronizar' : 'Sync'}
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('courses')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'courses' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
        >
          <BookOpen className="w-4 h-4" />
          {language === 'es' ? 'Cursos' : 'Courses'}
        </button>
        <button
          onClick={() => setActiveTab('tags')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'tags' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
        >
          <Tag className="w-4 h-4" />
          {language === 'es' ? 'Hub de Etiquetas' : 'Tag Hub'}
          {allTags.length > 0 && (
            <span className="px-1.5 py-0.5 bg-[#fdda36]/20 text-[#fdda36] text-xs rounded-full font-bold">
              {allTags.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'tags' ? (
        isTrainerOrAdmin
          ? <TrainerTagHub
              language={language}
              allTags={allTags}
              satelliteTags={satelliteTags}
              tagsLoading={tagsLoading}
              tagSearch={tagSearch}
              setTagSearch={setTagSearch}
              tagCategoryFilter={tagCategoryFilter}
              setTagCategoryFilter={setTagCategoryFilter}
              filteredTags={filteredTags}
              tagsByCategory={tagsByCategory}
              showCreateTag={showCreateTag}
              setShowCreateTag={setShowCreateTag}
              newTag={newTag}
              setNewTag={setNewTag}
              savingTag={savingTag}
              handleCreateTag={handleCreateTag}
              setEditingTag={setEditingTag}
              handleDeleteTag={handleDeleteTag}
            />
          : <AthleteTagHub
              language={language}
              athleteTags={athleteTags}
              satelliteTags={satelliteTags}
              tagsLoading={tagsLoading}
              tagSearch={tagSearch}
              setTagSearch={setTagSearch}
              tagCategoryFilter={tagCategoryFilter}
              setTagCategoryFilter={setTagCategoryFilter}
            />
      ) : (
      <>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
        {categoryOptions.map(opt => (
          <button
            key={opt.id}
            onClick={() => { setSelectedCategory(opt.id); setSelectedTagId(null); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              selectedCategory === opt.id && !selectedTagId
                ? 'bg-[#fdda36] text-gray-900 shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {language === 'es' ? opt.label.es : opt.label.en}
          </button>
        ))}
      </div>

      {/* ── Completed Courses Modal ── */}
      {showCompleted && completedCourses.length > 0 && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
                  <Trophy className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">
                    {language === 'es' ? 'Cursos Completados' : 'Completed Courses'}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {completedCourses.length} {language === 'es' ? 'curso(s) finalizado(s)' : 'course(s) finished'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCompleted(false)}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {completedCourses.map(course => {
                  const title = getCourseName(course);
                  const desc = getCourseDesc(course);
                  return (
                    <a
                      key={course.id}
                      href={getCourseUrl(course)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative bg-white dark:bg-gray-800 rounded-xl border border-emerald-200 dark:border-emerald-800/50 overflow-hidden hover:shadow-lg transition-all duration-200 flex flex-col"
                    >
                      <div className="relative h-32 bg-gray-900 overflow-hidden flex-shrink-0">
                        {getCourseImage(course) ? (
                          <img
                            src={getCourseImage(course)!}
                            alt={title}
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-75 transition-opacity duration-300"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-900/50 to-gray-900">
                            <BookOpen className="w-8 h-8 text-emerald-500/30" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-emerald-500 text-white rounded-full text-xs font-bold">
                          <CheckCircle className="w-3 h-3" />
                          {language === 'es' ? 'Completado' : 'Completed'}
                        </div>
                        {course.completed_at && (
                          <div className="absolute bottom-2 right-2 text-white/60 text-xs">
                            {new Date(course.completed_at).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' })}
                          </div>
                        )}
                      </div>
                      <div className="p-3 flex flex-col flex-1">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-snug mb-1 line-clamp-2">{title}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 flex-1 mb-2">
                          {desc || (language === 'es' ? 'Sin descripción.' : 'No description available.')}
                        </p>
                        <div className="flex items-center justify-between pt-2 border-t border-emerald-100 dark:border-emerald-900/30 mt-auto">
                          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                            <Award className="w-3 h-3" />
                            {language === 'es' ? 'Certificado' : 'Certified'}
                          </div>
                          <span className="flex items-center gap-1 text-gray-400 text-xs">
                            {language === 'es' ? 'Ver de nuevo' : 'View again'}
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {activeCourses.length === 0 && completedCourses.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center space-y-5">
          <BookOpen className="w-14 h-14 text-gray-300 dark:text-gray-600 mx-auto" />
          <div>
            <p className="text-gray-700 dark:text-gray-300 font-semibold text-lg">
              {language === 'es' ? 'Sin cursos sincronizados aún' : 'No courses synced yet'}
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1 max-w-md mx-auto">
              {language === 'es'
                ? 'Los cursos aparecen aquí cuando el Hub se conecta al satélite Academy con tu sesión.'
                : 'Courses appear here when the Hub connects to the Academy satellite with your session.'}
            </p>
          </div>

          {isTrainerOrAdmin && (
            <div className="inline-block text-left bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 max-w-lg mx-auto w-full">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
                {language === 'es' ? 'Conexion con el satélite Academy' : 'Academy satellite connection'}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                {language === 'es'
                  ? 'El Hub consulta los cursos directamente al satélite usando el token del usuario. Academy debe exponer:'
                  : 'The Hub queries courses directly from the satellite using the user token. Academy must expose:'}
              </p>
              <code className="block text-xs bg-gray-900 text-emerald-400 rounded-lg p-3 mb-3 break-all select-all">
                GET /functions/v1/academy-courses-api/courses
              </code>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {language === 'es'
                  ? 'El endpoint verifica el JWT del Hub (mismo JWT_SECRET) y devuelve los cursos publicados.'
                  : 'The endpoint verifies the Hub JWT (same JWT_SECRET) and returns published courses.'}
              </p>
            </div>
          )}

          <button
            onClick={() => syncAndLoad(true)}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#fdda36] text-gray-900 rounded-lg text-sm font-semibold hover:bg-[#ffd51a] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {language === 'es' ? 'Verificar cursos' : 'Check for courses'}
          </button>
        </div>
      ) : activeCourses.length === 0 ? null : (
        <>
          {/* ── MOBILE: horizontal scroll carousel ── */}
          <div className="md:hidden relative">
            <div
              className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 snap-x snap-mandatory scroll-smooth"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {activeCourses.map(course => {
                const title = getCourseName(course);
                const desc = getCourseDesc(course);
                return (
                  <a
                    key={course.id}
                    href={getCourseUrl(course)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex-shrink-0 snap-start bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-all duration-200"
                    style={{ width: 'calc(85vw - 2rem)', maxWidth: '280px' }}
                  >
                    <div className="relative h-36 bg-gray-900 overflow-hidden flex-shrink-0">
                      {getCourseImage(course) ? (
                        <img
                          src={getCourseImage(course)!}
                          alt={title}
                          className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity duration-300"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                          <BookOpen className="w-10 h-10 text-[#fdda36]/20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      {course.level && (
                        <div className={`absolute top-2 left-2 px-1.5 py-0.5 rounded text-xs font-semibold ${levelColors[course.level] || 'bg-gray-700 text-gray-200'}`}>
                          {levelLabel(course.level)}
                        </div>
                      )}
                      <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 bg-[#fdda36]/90 text-gray-900 rounded text-xs font-bold">
                        <Zap className="w-2.5 h-2.5" />
                        Academy
                      </div>
                      {course.duration_hours && (
                        <div className="absolute bottom-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded text-white text-xs">
                          <Clock className="w-2.5 h-2.5" />
                          {course.duration_hours}h
                        </div>
                      )}
                    </div>
                    <div className="p-3 flex flex-col flex-1">
                      {course.category && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-medium rounded w-fit mb-1.5">
                          <Tag className="w-2.5 h-2.5" />
                          {categoryLabel(course.category)}
                        </span>
                      )}
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-snug mb-1 line-clamp-2">{title}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 flex-1 mb-2">
                        {desc || (language === 'es' ? 'Sin descripción.' : 'No description available.')}
                      </p>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700 mt-auto">
                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                          {(course.price ?? 0) > 0
                            ? `€${course.price}`
                            : <span className="text-emerald-600 dark:text-emerald-400">{language === 'es' ? 'Gratis' : 'Free'}</span>
                          }
                        </span>
                        <span className="flex items-center gap-0.5 text-[#fdda36] text-xs font-semibold">
                          {language === 'es' ? 'Ver' : 'View'}
                          <ExternalLink className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
            {/* Translucent right arrow indicator */}
            {activeCourses.length > 1 && (
              <div className="absolute right-0 top-0 bottom-3 w-12 flex items-center justify-end pointer-events-none"
                style={{ background: 'linear-gradient(to right, transparent, rgba(249,250,251,0.92))' }}
              >
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white/80 dark:bg-gray-800/80 shadow-sm border border-gray-200 dark:border-gray-700 mr-1">
                  <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </div>
              </div>
            )}
          </div>

          {/* ── DESKTOP: featured hero + grid ── */}
          <div className="hidden md:block space-y-6">
            {filteredFeatured && (
              <a
                href={getCourseUrl(filteredFeatured)}
                target="_blank"
                rel="noopener noreferrer"
                className="group block relative overflow-hidden rounded-2xl bg-gray-900 min-h-[380px] shadow-lg hover:shadow-2xl transition-shadow duration-300"
              >
                {getCourseImage(filteredFeatured) ? (
                  <img
                    src={getCourseImage(filteredFeatured)!}
                    alt={getCourseName(filteredFeatured)}
                    className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-70 group-hover:scale-[1.02] transition-all duration-500"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                    <BookOpen className="w-24 h-24 text-[#fdda36]/20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-end p-8">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {filteredFeatured.category && (
                      <span className="px-2.5 py-1 bg-[#fdda36] text-gray-900 text-xs font-bold rounded-md uppercase tracking-wide">
                        {categoryLabel(filteredFeatured.category)}
                      </span>
                    )}
                    {filteredFeatured.level && (
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-md ${levelColors[filteredFeatured.level] || 'bg-gray-700 text-gray-300'}`}>
                        {levelLabel(filteredFeatured.level)}
                      </span>
                    )}
                    <span className="flex items-center gap-1 px-2.5 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-md">
                      <Zap className="w-3 h-3" />
                      Academy
                    </span>
                  </div>
                  <h2 className="text-3xl font-bold text-white leading-tight mb-3 max-w-2xl group-hover:text-[#fdda36] transition-colors">
                    {getCourseName(filteredFeatured)}
                  </h2>
                  {getCourseDesc(filteredFeatured) && (
                    <p className="text-gray-300 text-base leading-relaxed mb-4 max-w-xl line-clamp-2">
                      {getCourseDesc(filteredFeatured)}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {(filteredFeatured.price ?? 0) > 0 ? (
                        <span className="text-2xl font-bold text-white">€{filteredFeatured.price}</span>
                      ) : (
                        <span className="text-lg font-bold text-emerald-400">{language === 'es' ? 'Gratis' : 'Free'}</span>
                      )}
                      {filteredFeatured.duration_hours && (
                        <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                          <Clock className="w-4 h-4" />
                          {filteredFeatured.duration_hours}h
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 px-5 py-2.5 bg-[#fdda36] text-gray-900 rounded-xl font-bold text-sm group-hover:bg-white transition-colors">
                      <Play className="w-4 h-4" />
                      {language === 'es' ? 'Ver curso' : 'View course'}
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </a>
            )}

            {restCourses.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                {restCourses.map(course => {
                  const title = getCourseName(course);
                  const desc = getCourseDesc(course);
                  return (
                    <a
                      key={course.id}
                      href={getCourseUrl(course)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col"
                    >
                      <div className="relative h-48 bg-gray-900 overflow-hidden flex-shrink-0">
                        {getCourseImage(course) ? (
                          <img
                            src={getCourseImage(course)!}
                            alt={title}
                            className="w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                            <BookOpen className="w-12 h-12 text-[#fdda36]/25" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        {course.level && (
                          <div className={`absolute top-3 left-3 px-2 py-1 rounded-md text-xs font-semibold ${levelColors[course.level] || 'bg-gray-700 text-gray-200'}`}>
                            {levelLabel(course.level)}
                          </div>
                        )}
                        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-[#fdda36]/90 text-gray-900 rounded-md text-xs font-bold">
                          <Zap className="w-3 h-3" />
                          Academy
                        </div>
                        {course.duration_hours && (
                          <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md text-white text-xs">
                            <Clock className="w-3 h-3" />
                            {course.duration_hours}h
                          </div>
                        )}
                      </div>
                      <div className="p-5 flex flex-col flex-1">
                        {course.category && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-medium rounded-md w-fit mb-3">
                            <Tag className="w-3 h-3" />
                            {categoryLabel(course.category)}
                          </span>
                        )}
                        <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug mb-2 group-hover:text-[#fdda36] transition-colors line-clamp-2">{title}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3 flex-1 mb-4">
                          {desc || (language === 'es' ? 'Sin descripción.' : 'No description available.')}
                        </p>
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700 mt-auto">
                          <span className="font-bold text-gray-900 dark:text-white">
                            {(course.price ?? 0) > 0
                              ? `€${course.price}`
                              : <span className="text-emerald-600 dark:text-emerald-400">{language === 'es' ? 'Gratis' : 'Free'}</span>
                            }
                          </span>
                          <span className="flex items-center gap-1 text-[#fdda36] group-hover:gap-2 transition-all text-sm font-semibold">
                            {language === 'es' ? 'Ver curso' : 'View course'}
                            <ExternalLink className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Footer note ── */}
      {lastSync && (
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 pb-2">
          {language === 'es' ? 'Última sincronización:' : 'Last synced:'}{' '}
          {new Date(lastSync).toLocaleTimeString(language === 'es' ? 'es-ES' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
          {' · '}
          {language === 'es'
            ? 'Los cursos en borrador no se muestran'
            : 'Draft courses are not shown'}
        </p>
      )}
      </>
      )}

      {/* ══════════════════════════════════════════════
          PERFORMANCE PILLS SECTION
      ══════════════════════════════════════════════ */}
      {activeTab === 'courses' && (
        <div className="mt-12">

          {/* Divider */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700">
              <BookOpen className="w-4 h-4 text-[#514163] dark:text-[#fdda36]" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{language === 'es' ? 'Píldoras de Rendimiento' : 'Performance Pills'}</span>
            </div>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* Article detail view */}
          {selectedArticle ? (
            <div className="max-w-4xl mx-auto">
              <button
                onClick={() => { markAsRead(selectedArticle.id); setSelectedArticle(null); }}
                className="mb-6 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow flex items-center gap-2 text-gray-700 dark:text-gray-300"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                {language === 'es' ? 'Volver' : 'Back'}
              </button>

              {(() => {
                const crossRefs = selectedArticle.cross_references || {};
                const hasOtherVersions = crossRefs.landing_id || crossRefs.base_id || crossRefs.app_id;
                return hasOtherVersions ? (
                  <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <Globe className="w-5 h-5" />
                      {language === 'es' ? 'Otras Versiones Disponibles' : 'Other Versions Available'}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {crossRefs.landing_id && selectedArticle.article_type !== 'landing' && (
                        <button onClick={() => window.open(`/digest/${crossRefs.landing_id}`, '_blank')} className="px-4 py-2 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-2 text-sm">
                          <Globe className="w-4 h-4" />{language === 'es' ? 'Ver en Landing' : 'View on Landing'}<ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                      {crossRefs.base_id && selectedArticle.article_type !== 'base' && (
                        <button onClick={() => window.open(`/digest/${crossRefs.base_id}`, '_blank')} className="px-4 py-2 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-2 text-sm">
                          <BookOpen className="w-4 h-4" />{language === 'es' ? 'Investigación Completa' : 'Full Research'}<ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                      {crossRefs.app_id && selectedArticle.article_type !== 'app' && (
                        <button onClick={() => window.open(`/digest/${crossRefs.app_id}`, '_blank')} className="px-4 py-2 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-2 text-sm">
                          <TrendingUp className="w-4 h-4" />{language === 'es' ? 'Resumen en App' : 'Summary in App'}<ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ) : null;
              })()}

              <article className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                {selectedArticle.image_url && (
                  <img src={selectedArticle.image_url} alt={selectedArticle.title} className="w-full h-64 object-cover" />
                )}
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getArticleCategoryColor(selectedArticle.category)}`}>
                      {getArticleCategoryLabel(selectedArticle.category)}
                    </span>
                    {selectedArticle.is_premium && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 flex items-center gap-1">
                        <Crown className="w-3 h-3" />Premium
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                      <Clock className="w-4 h-4" />{selectedArticle.reading_time_minutes} min
                    </span>
                    <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                      <Eye className="w-4 h-4" />{selectedArticle.view_count}
                    </span>
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">{selectedArticle.title}</h1>
                  {selectedArticle.subtitle && (
                    <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">{selectedArticle.subtitle}</p>
                  )}
                  <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
                    <User className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">{selectedArticle.author_name}</span>
                    <span className="text-gray-400">•</span>
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">{new Date(selectedArticle.published_date).toLocaleDateString()}</span>
                  </div>
                  {canAccessArticle(selectedArticle) || isTrainerOrAdmin ? (
                    <div className="digest-article-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedArticle.content) }} />
                  ) : (() => {
                    const paragraphs = selectedArticle.content.split(/\n\n+/).filter((p: string) => p.trim());
                    const previewText = paragraphs.slice(0, 1).join('\n\n');
                    const tierName = (selectedArticle as any).required_membership_tier === 'pro' ? 'Pro' : 'Asciende';
                    return (
                      <div>
                        <div className="digest-article-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(previewText) }} />
                        {paragraphs.length > 1 && (
                          <div className="relative mt-4">
                            <div className="digest-article-content select-none pointer-events-none" style={{ filter: 'blur(5px)', opacity: 0.6 }} dangerouslySetInnerHTML={{ __html: renderMarkdown(paragraphs[1]) }} />
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/60 to-white dark:via-gray-800/60 dark:to-gray-800" />
                          </div>
                        )}
                        <div className="relative mt-2 rounded-2xl border-2 border-[#fdda36] bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 p-8 text-center shadow-xl">
                          <div className="w-14 h-14 bg-[#fdda36] rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock className="w-7 h-7 text-[#514163]" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            {language === 'es' ? 'Contenido exclusivo' : 'Exclusive content'}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                            {language === 'es'
                              ? `Para leer este artículo completo necesitas la membresía ${tierName}.`
                              : `To read this full article you need the ${tierName} membership.`}
                          </p>
                          <button
                            onClick={() => { setPaywallArticle(selectedArticle); setShowPaywall(true); }}
                            className="px-8 py-3 bg-[#fdda36] text-[#514163] rounded-xl font-bold hover:bg-[#ffd51a] transition-colors"
                          >
                            {language === 'es' ? `Obtener ${tierName}` : `Get ${tierName}`}
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                  {selectedArticle.cta_url && selectedArticle.cta_text && (
                    <div className="mt-12 p-6 bg-gradient-to-r from-[#514163] to-[#6d5581] rounded-xl">
                      <h3 className="text-xl font-bold text-white mb-3">{language === 'es' ? '¿Quieres saber más?' : 'Want to learn more?'}</h3>
                      <button onClick={() => handleCTAClick(selectedArticle)} className="px-6 py-3 bg-[#fdda36] text-[#514163] rounded-lg font-semibold hover:bg-[#ffd51a] transition-colors flex items-center gap-2">
                        {selectedArticle.cta_text}<ExternalLink className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                  <div className="mt-8 flex items-center gap-4">
                    <button onClick={() => handleShare(selectedArticle)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <Share2 className="w-4 h-4" />{language === 'es' ? 'Compartir' : 'Share'}
                    </button>
                    <button onClick={() => { markAsRead(selectedArticle.id); setSelectedArticle(null); }} className="px-6 py-3 bg-[#514163] text-white rounded-lg font-semibold hover:bg-[#6d5581] transition-colors flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />{language === 'es' ? 'Marcar como Leído' : 'Mark as Read'}
                    </button>
                  </div>
                </div>
              </article>
            </div>
          ) : (
            <>
              {/* ── Digest header (redesigned) ── */}
              <div className="rounded-2xl overflow-hidden mb-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                {/* Top bar: title + actions */}
                <div className="flex items-center justify-between gap-3 px-5 py-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-900 dark:bg-gray-700 flex-shrink-0">
                      <BookOpen className="w-4 h-4 text-[#fdda36]" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">{language === 'es' ? 'Píldoras de Rendimiento' : 'Performance Pills'}</h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {language === 'es' ? 'Conocimiento científico para tu deporte, en la dosis mínima efectiva' : 'Scientific Knowledge for your sport, in the minimum effective dose'}
                      </p>
                    </div>
                  </div>
                  {isTrainerOrAdmin && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => setShowAnalytics(!showAnalytics)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${showAnalytics ? 'bg-gray-900 dark:bg-gray-200 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{language === 'es' ? 'Analytics' : 'Analytics'}</span>
                      </button>
                      <button
                        onClick={() => { setEditingArticle(null); setShowEditor(true); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#fdda36] text-gray-900 rounded-lg text-xs font-bold hover:bg-[#ffd51a] transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{language === 'es' ? 'Nuevo' : 'New'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Stats row — always 3 columns even on mobile */}
                <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-700 bg-gray-50 dark:bg-gray-800/60">
                  <div className="flex flex-col items-center justify-center py-4 px-2">
                    <span className="text-2xl font-black text-gray-900 dark:text-white leading-none">{totalArticles}</span>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="w-3 h-3 text-gray-400" />
                      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{language === 'es' ? 'Total' : 'Total'}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center py-4 px-2">
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none">{readArticles}</span>
                    <div className="flex items-center gap-1 mt-1">
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{language === 'es' ? 'Leídos' : 'Read'}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center py-4 px-2">
                    <div className="flex items-end gap-0.5">
                      <span className="text-2xl font-black text-gray-900 dark:text-white leading-none">{readPercentage}</span>
                      <span className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-0.5">%</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-3 h-1.5 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden">
                        <div className="h-full bg-[#fdda36] rounded-full" style={{ width: `${readPercentage}%` }} />
                      </div>
                      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{language === 'es' ? 'Progreso' : 'Progress'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Analytics (trainers) */}
              {showAnalytics && isTrainerOrAdmin && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-5">
                  <h3 className="text-sm font-bold mb-3 text-gray-700 dark:text-gray-300 uppercase tracking-wide">{language === 'es' ? 'Analytics General' : 'Overall Analytics'}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="text-xl font-black text-gray-900 dark:text-[#fdda36]">{articles.reduce((s, a) => s + a.view_count, 0)}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{language === 'es' ? 'Vistas' : 'Views'}</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="text-xl font-black text-emerald-600">{articles.reduce((s, a) => s + a.read_count, 0)}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{language === 'es' ? 'Lecturas' : 'Full Reads'}</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="text-xl font-black text-blue-600">{articles.reduce((s, a) => s + a.conversion_count, 0)}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{language === 'es' ? 'Conversiones' : 'Conversions'}</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="text-xl font-black text-gray-700 dark:text-gray-300">{articles.filter(a => a.view_count > 0).length > 0 ? Math.round((articles.reduce((s, a) => s + a.conversion_count, 0) / articles.reduce((s, a) => s + a.view_count, 0)) * 100) : 0}%</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{language === 'es' ? 'Conv. Rate' : 'Conv. Rate'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Filters + sports context — compact single/two-row layout */}
              <div className="flex flex-wrap items-center gap-2 mb-5">
                <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 rounded-lg px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <Filter className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <select value={digestCategory} onChange={e => setDigestCategory(e.target.value)} className="bg-transparent border-none focus:ring-0 text-gray-800 dark:text-white text-xs font-medium min-w-0 outline-none cursor-pointer">
                    {digestCategories.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 rounded-lg px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <Globe className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <select value={digestLanguage} onChange={e => setDigestLanguage(e.target.value)} className="bg-transparent border-none focus:ring-0 text-gray-800 dark:text-white text-xs font-medium min-w-0 outline-none cursor-pointer">
                    <option value="all">{language === 'es' ? 'Todos' : 'All lang'}</option>
                    <option value="en">EN</option>
                    <option value="es">ES</option>
                  </select>
                </div>
                {!isTrainerOrAdmin && athleteSports.length > 0 && (
                  <>
                    <span className="w-px h-4 bg-gray-200 dark:bg-gray-600" />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{language === 'es' ? 'Viendo:' : 'Sport:'}</span>
                      {athleteSports.map(sport => (
                        <span key={sport} className="flex items-center gap-1 px-2 py-0.5 bg-[#fdda36]/15 border border-[#fdda36]/40 rounded-full text-xs font-semibold text-gray-800 dark:text-gray-200">
                          <Users className="w-3 h-3 text-gray-500" />{sport}
                        </span>
                      ))}
                      {!hasActiveMembership && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs text-gray-500 dark:text-gray-400">
                          <Lock className="w-2.5 h-2.5" />{language === 'es' ? 'Sin membresía' : 'No membership'}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* No sport configured message */}
              {!isTrainerOrAdmin && athleteSports.length === 0 && (
                <div className="mb-5 p-4 bg-sky-50 dark:bg-sky-900/20 rounded-xl border border-sky-200 dark:border-sky-800/40 flex items-start gap-3">
                  <Users className="w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-sky-800 dark:text-sky-300">
                    {language === 'es'
                      ? 'Configura tu deporte en tu perfil o únete a un equipo para ver contenido personalizado. Los artículos generales siempre están disponibles.'
                      : 'Set your sport in your profile or join a team to see personalized content. General articles are always available.'}
                  </p>
                </div>
              )}

              {/* Articles loading */}
              {digestLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-[#fdda36] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {articles.map(article => (
                      <div key={article.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer group">
                        <div onClick={() => handleArticleClick(article)} className="relative">
                          {article.image_url && (
                            <div className="relative">
                              <img src={article.image_url} alt={article.title} className="w-full h-48 object-cover group-hover:scale-105 transition-transform" />
                              {!canAccessArticle(article) && (
                                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                                  <div className="bg-white dark:bg-gray-800 rounded-full p-3"><Lock className="w-6 h-6 text-[#514163]" /></div>
                                </div>
                              )}
                            </div>
                          )}
                          <div className="p-6">
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getArticleCategoryColor(article.category)}`}>
                                {getArticleCategoryLabel(article.category)}
                              </span>
                              {(() => {
                                const articleSports = parseSportField((article as any).sport);
                                const articleTargetSports = parseSportField((article as any).target_sports);
                                const allSports = [...new Set([...articleSports, ...articleTargetSports])].filter(s => s && s !== 'all');
                                if (allSports.length === 0) return null;
                                return allSports.slice(0, 2).map(sport => (
                                  <span key={sport} className="px-2 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300 flex items-center gap-1">
                                    <Users className="w-3 h-3" />{sport}
                                  </span>
                                ));
                              })()}
                              {((article as any).required_membership_tier && (article as any).required_membership_tier !== 'inicia') && (
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${!canAccessArticle(article) ? 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400' : (article as any).required_membership_tier === 'pro' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'}`}>
                                  {!canAccessArticle(article) ? <><Lock className="w-3 h-3" />{(article as any).required_membership_tier === 'pro' ? 'Pro' : 'Asciende'}</> : <><Crown className="w-3 h-3" />{(article as any).required_membership_tier === 'pro' ? 'Pro' : 'Asciende'}</>}
                                </span>
                              )}
                              {article.is_read && <CheckCircle className="w-4 h-4 text-green-500" />}
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-[#514163] dark:group-hover:text-[#fdda36] transition-colors">{article.title}</h3>
                            {article.subtitle && <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">{article.subtitle}</p>}
                            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                              <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{article.reading_time_minutes}m</span>
                                <span className="flex items-center gap-1"><Eye className="w-4 h-4" />{article.view_count}</span>
                              </div>
                              <span className="text-sm font-medium">{article.language === 'en' ? 'En' : 'Es'}</span>
                            </div>
                          </div>
                        </div>
                        {isTrainerOrAdmin && (
                          <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex items-center gap-2">
                            <button onClick={() => { setEditingArticle(article); setShowEditor(true); }} className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors flex items-center justify-center gap-2">
                              <Edit className="w-4 h-4" />{language === 'es' ? 'Editar' : 'Edit'}
                            </button>
                            <button onClick={() => handleDeleteArticle(article.id)} className="px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
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
                      <p className="text-gray-500 dark:text-gray-500">
                        {language === 'es' ? 'Los nuevos artículos aparecerán aquí' : 'New articles will appear here'}
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Article Editor Modal */}
      {showEditor && (
        <ArticleEditor
          isOpen={showEditor}
          onClose={() => { setShowEditor(false); setEditingArticle(null); }}
          onSaved={() => { setShowEditor(false); setEditingArticle(null); loadArticles(); }}
          article={editingArticle}
        />
      )}

      {/* Premium Paywall Modal */}
      <PremiumPaywall
        isOpen={showPaywall}
        onClose={() => { setShowPaywall(false); setPaywallArticle(null); }}
        onUpgrade={() => { setShowPaywall(false); onNavigate?.('membership'); }}
        articleTitle={paywallArticle?.title}
        requiredTier={(paywallArticle as any)?.required_membership_tier || 'intermediate'}
      />

      {/* ── Edit Tag Modal ── */}
      {editingTag && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {language === 'es' ? 'Editar Etiqueta' : 'Edit Tag'}
              </h3>
              <button onClick={() => setEditingTag(null)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {language === 'es' ? 'Nombre (EN)' : 'Name (EN)'}
                </label>
                <input
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-[#fdda36]/60"
                  value={editingTag.name}
                  onChange={e => setEditingTag(t => t ? { ...t, name: e.target.value } : null)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {language === 'es' ? 'Nombre (ES)' : 'Name (ES)'}
                </label>
                <input
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-[#fdda36]/60"
                  value={editingTag.name_es || ''}
                  onChange={e => setEditingTag(t => t ? { ...t, name_es: e.target.value } : null)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {language === 'es' ? 'Categoría' : 'Category'}
                </label>
                <select
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none"
                  value={editingTag.category}
                  onChange={e => setEditingTag(t => t ? { ...t, category: e.target.value } : null)}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{CATEGORY_LABELS[cat][language as 'en' | 'es']}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {language === 'es' ? 'Descripción' : 'Description'}
                </label>
                <input
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-[#fdda36]/60"
                  value={editingTag.description || ''}
                  onChange={e => setEditingTag(t => t ? { ...t, description: e.target.value } : null)}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleUpdateTag}
                disabled={savingTag}
                className="flex-1 px-4 py-2 bg-[#fdda36] text-gray-900 font-semibold text-sm rounded-lg hover:bg-[#ffd51a] disabled:opacity-50 transition-colors"
              >
                {savingTag ? '...' : (language === 'es' ? 'Guardar' : 'Save')}
              </button>
              <button
                onClick={() => setEditingTag(null)}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
