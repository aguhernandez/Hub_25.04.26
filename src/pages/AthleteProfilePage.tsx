import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { Target, AlertCircle, Activity, Save, Plus, Trash2, CreditCard as Edit2, MoreVertical, Search, Users, Check } from 'lucide-react';
import Toast from '../components/Toast';
import ProfileOptionsModal from '../components/ProfileOptionsModal';
import { useToast } from '../hooks/useToast';

interface ProfileDetails {
  id?: string;
  athlete_id: string;
  old_injuries: string;
  symptoms: string;
  personal_notes: string;
  initial_setup_completed?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface CoachNote {
  id: string;
  coach_id: string;
  notes: string;
  category: string;
  created_at: string;
  profiles: {
    full_name: string;
  };
}

type ProfessionalRole = 'head_coach' | 'trainer' | 'nutritionist';

interface Professional {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  avatar_url: string | null;
}

interface ProfessionalAssignment extends Professional {
  role_type: ProfessionalRole;
}

export default function AthleteProfilePage() {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const { toast, hideToast, success, error: showError } = useToast();
  const [details, setDetails] = useState<ProfileDetails>({
    athlete_id: profile?.id || '',
    old_injuries: '',
    symptoms: '',
    personal_notes: '',
  });
  const [coachNotes, setCoachNotes] = useState<CoachNote[]>([]);
  const [newCoachNote, setNewCoachNote] = useState('');
  const [noteCategory, setNoteCategory] = useState<'mobility' | 'timing' | 'force' | 'coordination' | 'other'>('mobility');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [professionalAssignments, setProfessionalAssignments] = useState<Partial<Record<ProfessionalRole, ProfessionalAssignment>>>({});
  const [professionalOptions, setProfessionalOptions] = useState<Professional[]>([]);
  const [professionalRole, setProfessionalRole] = useState<ProfessionalRole>('head_coach');
  const [professionalSearch, setProfessionalSearch] = useState('');
  const [loadingProfessionals, setLoadingProfessionals] = useState(false);
  const [savingProfessionalRole, setSavingProfessionalRole] = useState<ProfessionalRole | null>(null);

  const isTrainer = profile?.role === 'trainer' || profile?.role === 'admin';
  const isAthlete = profile?.role === 'athlete';

  useEffect(() => {
    if (profile?.id) {
      loadProfileDetails();
      loadCoachNotes();
      if (profile.role === 'athlete') loadProfessionalTeam(profile.id);
    }
  }, [profile?.id]);

  const loadProfileDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('athlete_profile_details')
        .select('*')
        .eq('athlete_id', profile?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setDetails(data);
      }
    } catch (error) {
      console.error('Error loading profile details:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCoachNotes = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('coach_technique_notes')
        .select(`
          id,
          coach_id,
          notes,
          category,
          created_at,
          profiles:coach_id (
            full_name
          )
        `)
        .eq('athlete_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoachNotes(data || []);
    } catch (error) {
      console.error('Error loading coach notes:', error);
    }
  };

  const loadProfessionalTeam = async (athleteId: string) => {
    const { data, error } = await supabase.rpc('get_athlete_professional_team', { p_athlete_id: athleteId });
    if (error) {
      console.error('Error loading professional team:', error);
      return;
    }

    const nextAssignments: Partial<Record<ProfessionalRole, ProfessionalAssignment>> = {};
    (data || []).forEach((assignment: ProfessionalAssignment) => {
      nextAssignments[assignment.role_type] = assignment;
    });
    setProfessionalAssignments(nextAssignments);
  };

  useEffect(() => {
    if (!isAthlete) return;
    let cancelled = false;
    const loadOptions = async () => {
      setLoadingProfessionals(true);
      const { data, error } = await supabase.rpc('search_athlete_professionals', {
        p_role_type: professionalRole,
        p_search: professionalSearch,
      });
      if (!cancelled) {
        if (error) {
          console.error('Error loading professionals:', error);
          setProfessionalOptions([]);
        } else {
          setProfessionalOptions((data || []) as Professional[]);
        }
        setLoadingProfessionals(false);
      }
    };
    loadOptions();
    return () => { cancelled = true; };
  }, [isAthlete, professionalRole, professionalSearch]);

  const handleAssignProfessional = async (professionalId: string, role: ProfessionalRole) => {
    if (!profile?.id) return;
    setSavingProfessionalRole(role);
    const { error } = await supabase.rpc('assign_athlete_professional', {
      p_athlete_id: profile.id,
      p_professional_id: professionalId,
      p_role_type: role,
    });
    if (error) {
      showError(language === 'es' ? 'No se pudo conectar al profesional' : 'The professional could not be connected');
    } else {
      await loadProfessionalTeam(profile.id);
      success(language === 'es' ? 'Profesional conectado' : 'Professional connected');
    }
    setSavingProfessionalRole(null);
  };

  const professionalRoleLabels: Record<ProfessionalRole, { es: string; en: string }> = {
    head_coach: { es: 'Head Coach', en: 'Head Coach' },
    trainer: { es: 'Trainer', en: 'Trainer' },
    nutritionist: { es: 'Nutricionista', en: 'Nutritionist' },
  };

  const handleSaveDetails = async () => {
    if (!profile?.id) return;

    setSaving(true);
    try {
      const dataToSave = {
        athlete_id: profile.id,
        old_injuries: details.old_injuries || '',
        symptoms: details.symptoms || '',
        personal_notes: details.personal_notes || '',
        initial_setup_completed: true,
      };

      const { error } = await supabase
        .from('athlete_profile_details')
        .upsert(dataToSave, { onConflict: 'athlete_id' });

      if (error) throw error;

      // Create notification for trainer
      if (profile.assigned_trainer_id && isAthlete) {
        await supabase.from('notifications').insert({
          user_id: profile.assigned_trainer_id,
          type: 'system',
          title: language === 'es' ? 'Perfil actualizado' : 'Profile updated',
          message: `${profile.full_name} ${language === 'es' ? 'ha actualizado su perfil' : 'has updated their profile'}`,
          link_type: 'athlete_profile',
          link_id: profile.id,
        });
      }

      success(language === 'es' ? 'Perfil guardado' : 'Profile saved');
      await loadProfileDetails();
    } catch (err: any) {
      console.error('Error saving profile:', err);
      showError(language === 'es' ? `Error: ${err.message}` : `Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCoachNote = async () => {
    if (!profile?.id || !newCoachNote.trim() || !isTrainer) return;

    try {
      const { error } = await supabase.from('coach_technique_notes').insert({
        athlete_id: profile.id,
        coach_id: profile.id,
        notes: newCoachNote.trim(),
        category: noteCategory,
      });

      if (error) throw error;

      setNewCoachNote('');
      await loadCoachNotes();

      // Notify athlete
      await supabase.from('notifications').insert({
        user_id: profile.id,
        type: 'system',
        title: language === 'es' ? 'Nueva nota técnica' : 'New technique note',
        message: `${language === 'es' ? 'Tu entrenador agregó una nota sobre' : 'Your coach added a note about'} ${noteCategory}`,
        link_type: 'profile',
        link_id: profile.id,
      });
    } catch (err: any) {
      console.error('Error adding note:', err);
      showError(language === 'es' ? `Error: ${err.message}` : `Error: ${err.message}`);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!window.confirm(language === 'es' ? '¿Eliminar nota?' : 'Delete note?')) return;

    try {
      const { error } = await supabase.from('coach_technique_notes').delete().eq('id', noteId);

      if (error) throw error;
      await loadCoachNotes();
    } catch (err: any) {
      console.error('Error deleting note:', err);
      showError(language === 'es' ? `Error: ${err.message}` : `Error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-12 h-12 border-4 border-[#fdda36] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={hideToast}
        />
      )}
      <ProfileOptionsModal
        isOpen={showOptionsModal}
        onClose={() => setShowOptionsModal(false)}
        athleteId={profile?.id || ''}
        athleteName={profile?.full_name || ''}
        assignedTrainerId={profile?.assigned_trainer_id}
        currentUserId={profile?.id || ''}
        currentUserRole={profile?.role || ''}
        currentUserEmail={profile?.email}
      />
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#fdda36] to-[#ffd51a] rounded-xl p-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#514163] mb-2 flex items-center gap-2">
              <Target className="w-8 h-8" />
              {language === 'es' ? 'Mi Perfil Atlético' : 'My Athletic Profile'}
            </h1>
            <p className="text-[#514163]/80">
              {language === 'es'
                ? 'Mantén actualizada tu información para un mejor seguimiento'
                : 'Keep your information updated for better tracking'}
            </p>
          </div>
          <button
            onClick={() => setShowOptionsModal(true)}
            className="p-2 text-[#514163] hover:bg-white/30 rounded-lg transition-colors"
            title={language === 'es' ? 'Opciones' : 'Options'}
          >
            <MoreVertical className="w-6 h-6" />
          </button>
        </div>

      {/* Health Status Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <AlertCircle className="w-6 h-6 text-red-500" />
          {language === 'es' ? 'Estado de Salud' : 'Health Status'}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {language === 'es' ? 'Lesiones (actuales e historial)' : 'Injuries (current and history)'}
            </label>
            <textarea
              value={details.old_injuries}
              onChange={(e) => setDetails({ ...details, old_injuries: e.target.value })}
              disabled={!isAthlete}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36] disabled:opacity-50"
              placeholder={language === 'es' ? 'Describe lesiones actuales y pasadas relevantes' : 'Describe current and past relevant injuries'}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {language === 'es' ? 'Síntomas Actuales' : 'Current Symptoms'}
            </label>
            <textarea
              value={details.symptoms}
              onChange={(e) => setDetails({ ...details, symptoms: e.target.value })}
              disabled={!isAthlete}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36] disabled:opacity-50"
              placeholder={language === 'es' ? 'Dolor, fatiga, molestias, etc.' : 'Pain, fatigue, discomfort, etc.'}
            />
          </div>
        </div>
      </div>

      {/* Personal Notes Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Activity className="w-6 h-6 text-blue-500" />
          {language === 'es' ? 'Notas Personales' : 'Personal Notes'}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {language === 'es' ? 'Notas adicionales' : 'Additional notes'}
            </label>
            <textarea
              value={details.personal_notes}
              onChange={(e) => setDetails({ ...details, personal_notes: e.target.value })}
              disabled={!isAthlete}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36] disabled:opacity-50"
              placeholder={language === 'es' ? 'Cualquier información adicional relevante...' : 'Any relevant additional information...'}
            />
          </div>
        </div>
      </div>

      {isAthlete && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
            <Users className="w-6 h-6 text-[#fdda36]" />
            {language === 'es' ? 'Mi Equipo Profesional' : 'My Professional Team'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            {language === 'es' ? 'Conecta un profesional para cada área de tu preparación.' : 'Connect one professional for each area of your preparation.'}
          </p>

          <div className="space-y-3 mb-5">
            {(['head_coach', 'trainer', 'nutritionist'] as ProfessionalRole[]).map((role) => {
              const assignment = professionalAssignments[role];
              const label = professionalRoleLabels[role][language === 'es' ? 'es' : 'en'];
              return (
                <div key={role} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {assignment?.full_name || assignment?.email || (language === 'es' ? 'Sin asignar' : 'Not assigned')}
                    </p>
                    {assignment?.full_name && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{assignment.email}</p>}
                  </div>
                  {assignment && <Check className="w-5 h-5 text-green-500 shrink-0" />}
                </div>
              );
            })}
          </div>

          <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-4">
            <div className="flex flex-col sm:flex-row gap-3 mb-3">
              <select
                value={professionalRole}
                onChange={(event) => setProfessionalRole(event.target.value as ProfessionalRole)}
                className="sm:w-44 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {(['head_coach', 'trainer', 'nutritionist'] as ProfessionalRole[]).map((role) => (
                  <option key={role} value={role}>{professionalRoleLabels[role][language === 'es' ? 'es' : 'en']}</option>
                ))}
              </select>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  value={professionalSearch}
                  onChange={(event) => setProfessionalSearch(event.target.value)}
                  placeholder={language === 'es' ? 'Buscar por nombre o correo...' : 'Search by name or email...'}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {loadingProfessionals ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-2">{language === 'es' ? 'Buscando profesionales...' : 'Searching professionals...'}</p>
              ) : professionalOptions.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-2">{language === 'es' ? 'No hay profesionales disponibles.' : 'No professionals available.'}</p>
              ) : professionalOptions.map((professional) => (
                <button
                  key={professional.id}
                  type="button"
                  onClick={() => handleAssignProfessional(professional.id, professionalRole)}
                  disabled={savingProfessionalRole !== null}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left hover:bg-[#fdda36]/15 transition-colors disabled:opacity-50"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">{professional.full_name || professional.email}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{professional.email}</span>
                  </span>
                  <Plus className="w-4 h-4 text-[#514163] dark:text-[#fdda36] shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Coach Notes Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Edit2 className="w-6 h-6 text-purple-500" />
          {language === 'es' ? 'Notas Técnicas del Entrenador' : 'Coach Technical Notes'}
        </h2>

        {isTrainer && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex gap-2 mb-3">
              <select
                value={noteCategory}
                onChange={(e) => setNoteCategory(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36]"
              >
                <option value="mobility">{language === 'es' ? 'Movilidad' : 'Mobility'}</option>
                <option value="timing">{language === 'es' ? 'Timing' : 'Timing'}</option>
                <option value="force">{language === 'es' ? 'Fuerza' : 'Force'}</option>
                <option value="coordination">{language === 'es' ? 'Coordinación' : 'Coordination'}</option>
                <option value="other">{language === 'es' ? 'Otro' : 'Other'}</option>
              </select>
            </div>
            <textarea
              value={newCoachNote}
              onChange={(e) => setNewCoachNote(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36] mb-3"
              placeholder={language === 'es' ? 'Escribe una nota técnica...' : 'Write a technical note...'}
            />
            <button
              onClick={handleAddCoachNote}
              disabled={!newCoachNote.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-[#fdda36] text-[#514163] rounded-lg font-semibold hover:bg-[#ffd51a] transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {language === 'es' ? 'Agregar Nota' : 'Add Note'}
            </button>
          </div>
        )}

        <div className="space-y-3">
          {coachNotes.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              {language === 'es' ? 'No hay notas técnicas' : 'No technical notes'}
            </p>
          ) : (
            coachNotes.map((note) => (
              <div
                key={note.id}
                className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100 text-xs font-semibold rounded">
                      {note.category.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {note.profiles.full_name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                      {new Date(note.created_at).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US')}
                    </span>
                  </div>
                  {isTrainer && (
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-gray-700 dark:text-gray-300">{note.notes}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Save Button */}
      {isAthlete && (
        <div className="flex justify-end">
          <button
            onClick={handleSaveDetails}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-[#fdda36] text-[#514163] rounded-lg font-semibold hover:bg-[#ffd51a] transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving
              ? language === 'es'
                ? 'Guardando...'
                : 'Saving...'
              : language === 'es'
              ? 'Guardar Cambios'
              : 'Save Changes'}
          </button>
        </div>
      )}
      </div>
    </>
  );
}
