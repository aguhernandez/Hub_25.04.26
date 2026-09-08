import { useEffect, useState } from 'react';
import { Calendar, Edit3, FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { deleteDraft, listDrafts, type WorkoutDraft } from '../../utils/workoutDrafts';

interface MyDraftsPanelProps {
  onOpen: (draft: WorkoutDraft) => void;
  onPublish: (draft: WorkoutDraft) => void;
  refreshKey: number;
}

export default function MyDraftsPanel({ onOpen, onPublish, refreshKey }: MyDraftsPanelProps) {
  const { language } = useLanguage();
  const [drafts, setDrafts] = useState<WorkoutDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadDrafts = async () => {
    setLoading(true);
    try {
      setDrafts(await listDrafts());
    } catch (err) {
      console.error('Error loading workout drafts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrafts();
  }, [refreshKey]);

  const handleDelete = async (draft: WorkoutDraft) => {
    if (!window.confirm(language === 'es' ? `¿Eliminar el borrador "${draft.name}"?` : `Delete draft "${draft.name}"?`)) return;
    setDeletingId(draft.id);
    try {
      await deleteDraft(draft.id);
      setDrafts(current => current.filter(item => item.id !== draft.id));
    } catch (err) {
      console.error('Error deleting workout draft:', err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#514163] dark:text-[#fdda36]" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {language === 'es' ? 'Mis borradores' : 'My Drafts'}
            </h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {language === 'es' ? 'Hasta 10 borradores guardados indefinidamente' : 'Up to 10 drafts saved indefinitely'}
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-semibold">
          {drafts.length}/10
        </span>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-gray-500 dark:text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : drafts.length === 0 ? (
          <p className="py-4 text-sm text-center text-gray-500 dark:text-gray-400">
            {language === 'es' ? 'Todavía no tienes borradores.' : 'You do not have any drafts yet.'}
          </p>
        ) : (
          <div className="space-y-3">
            {drafts.map(draft => (
              <div key={draft.id} className="rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-900/10 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wide">
                        {language === 'es' ? 'Borrador' : 'Draft'}
                      </span>
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">{draft.name}</h3>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                      <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{draft.date || (language === 'es' ? 'Sin fecha' : 'No date')}</span>
                      <span>{language === 'es' ? 'Modificado' : 'Modified'} {new Date(draft.updated_at).toLocaleString(language === 'es' ? 'es-ES' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => onOpen(draft)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#514163] hover:bg-[#3d3149] text-white text-xs font-semibold transition-colors">
                      <Edit3 className="w-3.5 h-3.5" />{language === 'es' ? 'Editar' : 'Edit'}
                    </button>
                    <button onClick={() => onPublish(draft)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-colors">
                      <Upload className="w-3.5 h-3.5" />{language === 'es' ? 'Publicar' : 'Publish'}
                    </button>
                    <button onClick={() => handleDelete(draft)} disabled={deletingId === draft.id} className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50" aria-label={language === 'es' ? 'Eliminar borrador' : 'Delete draft'}>
                      {deletingId === draft.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
