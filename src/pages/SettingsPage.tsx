import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import {
  User,
  Mail,
  Phone,
  Globe,
  Calendar,
  Camera,
  Save,
  MapPin,
  Briefcase,
  Award,
  Shield,
  Bell,
  Instagram,
  Twitter,
  Activity,
  Users,
  Crown,
  Lock,
  Settings as SettingsIcon,
  Trash2,
  AlertTriangle,
  Heart,
  BookOpen,
  Satellite,
  Receipt,
  Link2,
  Plus,
  UserCheck,
} from 'lucide-react';
import SecuritySection from '../components/settings/SecuritySection';
import AdminSection from '../components/settings/AdminSection';
import SupportMeSection from '../components/settings/SupportMeSectionV2';
import AboutCoachSection from '../components/settings/AboutCoachSection';
import NotificationSettings from '../components/settings/NotificationSettings';
import TrainingPeaksSection from '../components/settings/TrainingPeaksSection';
import { StravaSection } from '../components/settings/StravaSection';
import SatellitesSection from '../components/settings/SatellitesSection';
import PlannerConnectionsSection from '../components/settings/PlannerConnectionsSection';
import MembershipSection from '../components/settings/MembershipSection';
import InvoicesSection from '../components/settings/InvoicesSection';
import CountrySelect from '../components/CountrySelect';
import PhoneInput from '../components/PhoneInput';
import SportSelect from '../components/SportSelect';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { initPushNotifications } from '../services/pushNotificationService';

const TRAINER_ROLE_OPTIONS = [
  { value: 'head_coach',     labelEs: 'Entrenador Principal',              labelEn: 'Head Coach' },
  { value: 'strength_coach', labelEs: 'Entrenador de Fuerza',              labelEn: 'Strength Coach' },
  { value: 'sport_coach',    labelEs: 'Entrenador Específico de Deporte',  labelEn: 'Sport-Specific Coach' },
  { value: 'nutritionist',   labelEs: 'Nutricionista',                     labelEn: 'Nutritionist' },
  { value: 'biomechanist',   labelEs: 'Biomecánico',                       labelEn: 'Biomechanist' },
  { value: 'physiologist',   labelEs: 'Fisiólogo',                         labelEn: 'Physiologist' },
  { value: 'data_analyst',   labelEs: 'Analista de Datos',                 labelEn: 'Data Analyst' },
  { value: 'other',          labelEs: 'Otro',                              labelEn: 'Other' },
];

interface AddTrainerRowProps {
  trainers: any[];
  existingAssignments: Array<{ trainer_id: string; role_type: string }>;
  language: string;
  onAdd: (trainerId: string, roleType: string) => Promise<void>;
}

function AddTrainerRow({ trainers, existingAssignments, language, onAdd }: AddTrainerRowProps) {
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedTrainer, setSelectedTrainer] = useState('');
  const [adding, setAdding] = useState(false);

  const isAlreadyAssigned =
    selectedTrainer && selectedRole
      ? existingAssignments.some(a => a.trainer_id === selectedTrainer && a.role_type === selectedRole)
      : false;

  const handleAdd = async () => {
    if (!selectedTrainer || !selectedRole) return;
    setAdding(true);
    await onAdd(selectedTrainer, selectedRole);
    setSelectedRole('');
    setSelectedTrainer('');
    setAdding(false);
  };

  return (
    <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
        {language === 'es' ? 'Agregar profesional' : 'Add professional'}
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={selectedRole}
          onChange={e => setSelectedRole(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#fdda36]"
        >
          <option value="">{language === 'es' ? 'Tipo de rol...' : 'Role type...'}</option>
          {TRAINER_ROLE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {language === 'es' ? opt.labelEs : opt.labelEn}
            </option>
          ))}
        </select>
        <select
          value={selectedTrainer}
          onChange={e => setSelectedTrainer(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#fdda36]"
        >
          <option value="">{language === 'es' ? 'Seleccionar profesional...' : 'Select professional...'}</option>
          {trainers.map(t => (
            <option key={t.id} value={t.id}>
              {t.full_name || `${t.first_name || ''} ${t.last_name || ''}`.trim() || t.email}
              {t.trainer_role_type ? ` · ${TRAINER_ROLE_OPTIONS.find(o => o.value === t.trainer_role_type)?.[language === 'es' ? 'labelEs' : 'labelEn'] || t.trainer_role_type}` : ''}
            </option>
          ))}
        </select>
        <button
          onClick={handleAdd}
          disabled={!selectedTrainer || !selectedRole || adding || !!isAlreadyAssigned}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#fdda36] text-[#514163] rounded-lg font-semibold text-sm hover:bg-[#ffd51a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          {adding
            ? (language === 'es' ? 'Agregando...' : 'Adding...')
            : (language === 'es' ? 'Agregar' : 'Add')}
        </button>
      </div>
      {isAlreadyAssigned && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
          {language === 'es'
            ? 'Este profesional ya tiene ese rol asignado.'
            : 'This professional already has that role assigned.'}
        </p>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { profile, updateProfile, signOut } = useAuth();
  const { language } = useLanguage();
  const { toast, success, error: showError, hideToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeSection, setActiveSection] = useState<'profile' | 'security' | 'membership' | 'admin' | 'preferences' | 'support' | 'about-coach' | 'notifications' | 'trainingpeaks' | 'strava' | 'satellites' | 'planner-connections'>('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const isAdmin = profile?.role === 'admin';
  const isTrainer = profile?.role === 'trainer';
  const canAccessAdmin = isAdmin || isTrainer;

  // Profile fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [country, setCountry] = useState('');
  const [sport, setSport] = useState('');
  const [secondarySport, setSecondarySport] = useState('');
  const [bio, setBio] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [currentLevel, setCurrentLevel] = useState('');

  // Emergency contact
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('');

  // Social media
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');
  const [strava, setStrava] = useState('');

  // Preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [profileVisibility, setProfileVisibility] = useState('private');
  const [publicProfileSlug, setPublicProfileSlug] = useState('');

  // Multi-trainer assignment
  const [athleteTrainers, setAthleteTrainers] = useState<Array<{ id?: string; trainer_id: string; role_type: string; is_primary: boolean }>>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [trainerRoleType, setTrainerRoleType] = useState('');

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setEmail(profile.email || '');
      setPhone(profile.phone || '');
      setDateOfBirth(profile.date_of_birth || '');
      setGender(profile.gender || '');
      setCountry(profile.country || '');
      setSport(profile.sport || '');
      setSecondarySport(profile.secondary_sport || '');
      setBio(profile.athlete_bio || profile.bio || '');
      setYearsExperience(profile.years_of_experience?.toString() || '');
      setCurrentLevel(profile.current_level || '');
      setEmergencyName(profile.emergency_contact_name || '');
      setEmergencyPhone(profile.emergency_contact_phone || '');
      setEmergencyRelationship(profile.emergency_contact_relationship || '');
      setInstagram(profile.instagram_handle || '');
      setTwitter(profile.twitter_handle || '');
      setStrava(profile.strava_profile || '');
      setEmailNotifications(profile.email_notifications ?? true);
      setPushNotifications(profile.push_notifications ?? true);
      setProfileVisibility(profile.profile_visibility || 'private');
      setPublicProfileSlug(profile.public_profile_slug || '');
      setTrainerRoleType((profile as any).trainer_role_type || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  useEffect(() => {
    loadTrainers();
    if (profile?.role === 'athlete') {
      loadAthleteTrainers();
    }
  }, [profile?.role, profile?.id]);

  const loadTrainers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, full_name, email, trainer_role_type')
        .eq('role', 'trainer')
        .order('full_name');

      if (error) throw error;
      setTrainers(data || []);
    } catch (error) {
      console.error('Error loading trainers:', error);
    }
  };

  const loadAthleteTrainers = async () => {
    if (!profile?.id) return;
    try {
      const { data, error } = await supabase
        .from('athlete_trainers')
        .select('id, trainer_id, role_type, is_primary')
        .eq('athlete_id', profile.id);
      if (error) throw error;
      setAthleteTrainers(data || []);
    } catch (err) {
      console.error('Error loading athlete trainers:', err);
    }
  };

  const getRoleLabel = (value: string) => {
    const opt = TRAINER_ROLE_OPTIONS.find(o => o.value === value);
    if (!opt) return value;
    return language === 'es' ? opt.labelEs : opt.labelEn;
  };

  const handleAddTrainerAssignment = async (trainerId: string, roleType: string) => {
    if (!profile?.id) return;
    const isPrimary = roleType === 'head_coach' && !athleteTrainers.some(at => at.is_primary);
    const { data, error } = await supabase
      .from('athlete_trainers')
      .insert({ athlete_id: profile.id, trainer_id: trainerId, role_type: roleType, is_primary: isPrimary })
      .select('id, trainer_id, role_type, is_primary')
      .single();
    if (error) { showError(error.message); return; }
    setAthleteTrainers(prev => [...prev, data]);
    success(language === 'es' ? 'Profesional asignado' : 'Professional assigned');
  };

  const handleRemoveTrainerAssignment = async (assignmentId: string) => {
    const { error } = await supabase.from('athlete_trainers').delete().eq('id', assignmentId);
    if (error) { showError(error.message); return; }
    setAthleteTrainers(prev => prev.filter(at => at.id !== assignmentId));
    success(language === 'es' ? 'Profesional eliminado' : 'Professional removed');
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !profile) return;

    const file = e.target.files[0];

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError(language === 'es' ? 'La imagen debe ser menor a 5MB' : 'Image must be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError(language === 'es' ? 'Solo se permiten imágenes' : 'Only images are allowed');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/avatar.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setAvatarUrl(data.publicUrl);
      success(language === 'es' ? 'Foto actualizada' : 'Photo updated');
    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      showError(language === 'es' ? `Error: ${err.message}` : `Error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const updates = {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`.trim(),
        phone,
        date_of_birth: dateOfBirth || null,
        gender: gender || null,
        country,
        sport,
        secondary_sport: secondarySport || null,
        athlete_bio: bio,
        years_of_experience: yearsExperience ? parseInt(yearsExperience) : null,
        current_level: currentLevel || null,
        emergency_contact_name: emergencyName || null,
        emergency_contact_phone: emergencyPhone || null,
        emergency_contact_relationship: emergencyRelationship || null,
        instagram_handle: instagram || null,
        twitter_handle: twitter || null,
        strava_profile: strava || null,
        email_notifications: emailNotifications,
        push_notifications: pushNotifications,
        profile_visibility: profileVisibility,
        public_profile_slug: publicProfileSlug || null,
        ...(( isTrainer || isAdmin) && { trainer_role_type: trainerRoleType || null }),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id);

      if (error) throw error;

      success(language === 'es' ? 'Perfil actualizado' : 'Profile updated');
    } catch (err: any) {
      console.error('Error updating profile:', err);
      showError(language === 'es' ? `Error: ${err.message}` : `Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      showError(language === 'es' ? 'Debes escribir DELETE para confirmar' : 'You must type DELETE to confirm');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete account');
      }

      success(language === 'es' ? 'Cuenta eliminada exitosamente' : 'Account deleted successfully');
      await signOut();
    } catch (err: any) {
      console.error('Error deleting account:', err);
      showError(language === 'es' ? `Error: ${err.message}` : `Error: ${err.message}`);
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
    }
  };

  const getMembershipBadge = () => {
    const plan = profile?.membership_plan || 'inicia';
    switch (plan) {
      case 'elite':
        return { icon: Crown, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20', label: 'Elite' };
      case 'pro':
        return { icon: Award, color: 'text-[#514163]', bg: 'bg-[#514163]/10', label: 'Pro' };
      case 'intermediate':
      case 'asciende':
        return { icon: Award, color: 'text-[#514163]', bg: 'bg-[#514163]/10', label: 'Intermediate' };
      case 'inicia':
        return { icon: Users, color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-900/20', label: 'Inicia' };
      default:
        return { icon: Users, color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-900/20', label: 'Inicia' };
    }
  };

  const membershipBadge = getMembershipBadge();
  const MembershipIcon = membershipBadge.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {language === 'es' ? 'Configuración' : 'Settings'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {language === 'es' ? 'Gestiona tu perfil y preferencias' : 'Manage your profile and preferences'}
        </p>
      </div>

      {/* Section Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        <button
          onClick={() => setActiveSection('profile')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeSection === 'profile'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <User className="w-4 h-4" />
          {language === 'es' ? 'Perfil' : 'Profile'}
        </button>
        <button
          onClick={() => setActiveSection('security')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeSection === 'security'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Lock className="w-4 h-4" />
          {language === 'es' ? 'Seguridad' : 'Security'}
        </button>
        <button
          onClick={() => setActiveSection('membership')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeSection === 'membership'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Crown className="w-4 h-4" />
          {language === 'es' ? 'Membresía' : 'Membership'}
        </button>
        <button
          onClick={() => setActiveSection('invoices')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeSection === 'invoices'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Receipt className="w-4 h-4" />
          {language === 'es' ? 'Facturas' : 'Invoices'}
        </button>
        {canAccessAdmin && (
          <button
            onClick={() => setActiveSection('admin')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeSection === 'admin'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            {language === 'es' ? 'Admin' : 'Admin'}
          </button>
        )}
        <button
          onClick={() => setActiveSection('preferences')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeSection === 'preferences'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Bell className="w-4 h-4" />
          {language === 'es' ? 'Preferencias' : 'Preferences'}
        </button>
        <button
          onClick={() => setActiveSection('notifications')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeSection === 'notifications'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Bell className="w-4 h-4" />
          {language === 'es' ? 'Notificaciones' : 'Notifications'}
        </button>
        {profile?.role === 'athlete' && (
          <button
            onClick={() => setActiveSection('support')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeSection === 'support'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Heart className="w-4 h-4" />
            {language === 'es' ? 'Apóyame' : 'Support Me'}
          </button>
        )}
        {(profile?.role === 'trainer' || profile?.role === 'athlete' || profile?.role === 'admin') && (
          <button
            onClick={() => setActiveSection('about-coach')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeSection === 'about-coach'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            {language === 'es' ? 'Tu Entrenador' : 'Your Coach'}
          </button>
        )}
        {profile?.role === 'athlete' && (
          <button
            onClick={() => setActiveSection('trainingpeaks')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeSection === 'trainingpeaks'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            TrainingPeaks
          </button>
        )}
        {profile?.role === 'athlete' && (
          <button
            onClick={() => setActiveSection('strava')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeSection === 'strava'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            Strava
          </button>
        )}
        <button
          onClick={() => setActiveSection('satellites')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeSection === 'satellites'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Satellite className="w-4 h-4" />
          {language === 'es' ? 'Satélites' : 'Satellites'}
        </button>
        {profile?.role === 'admin' && (
          <button
            onClick={() => setActiveSection('planner-connections')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeSection === 'planner-connections'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Link2 className="w-4 h-4" />
            {language === 'es' ? 'Planners externos' : 'Ext. Planners'}
          </button>
        )}
      </div>

      {/* Profile Section */}
      {activeSection === 'profile' && (
        <div className="space-y-6">
          {/* Avatar Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5 text-[#fdda36]" />
              {language === 'es' ? 'Foto de Perfil' : 'Profile Photo'}
            </h2>

            <div className="flex items-center gap-6">
              <div className="relative">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-32 h-32 rounded-full object-cover border-4 border-[#fdda36]"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#514163] to-[#6d5280] flex items-center justify-center border-4 border-[#fdda36]">
                    <User className="w-16 h-16 text-white" />
                  </div>
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-4 py-2 bg-[#fdda36] text-[#514163] rounded-lg font-semibold hover:bg-[#ffd51a] transition-colors disabled:opacity-50"
                >
                  {uploading
                    ? language === 'es'
                      ? 'Subiendo...'
                      : 'Uploading...'
                    : language === 'es'
                    ? 'Cambiar Foto'
                    : 'Change Photo'}
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  {language === 'es'
                    ? 'JPG, PNG o GIF. Máximo 5MB.'
                    : 'JPG, PNG or GIF. Max 5MB.'}
                </p>
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-[#fdda36]" />
              {language === 'es' ? 'Información Personal' : 'Personal Information'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'es' ? 'Nombre' : 'First Name'}
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                  placeholder="Juan"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'es' ? 'Apellido' : 'Last Name'}
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                  placeholder="Pérez"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {language === 'es' ? 'No se puede cambiar el email' : 'Email cannot be changed'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Phone className="w-4 h-4 inline mr-1" />
                  {language === 'es' ? 'Teléfono' : 'Phone'}
                </label>
                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                  language={language}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  {language === 'es' ? 'Fecha de Nacimiento' : 'Date of Birth'}
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <User className="w-4 h-4 inline mr-1" />
                  {language === 'es' ? 'Género' : 'Gender'}
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                >
                  <option value="">{language === 'es' ? 'Seleccionar...' : 'Select...'}</option>
                  <option value="male">{language === 'es' ? 'Masculino' : 'Male'}</option>
                  <option value="female">{language === 'es' ? 'Femenino' : 'Female'}</option>
                  <option value="other">{language === 'es' ? 'Otro' : 'Other'}</option>
                  <option value="prefer_not_to_say">{language === 'es' ? 'Prefiero no decir' : 'Prefer not to say'}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  {language === 'es' ? 'País' : 'Country'}
                </label>
                <CountrySelect
                  value={country}
                  onChange={setCountry}
                  language={language}
                />
              </div>
            </div>
          </div>

          {/* Sports Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#fdda36]" />
              {language === 'es' ? 'Información Deportiva' : 'Sports Information'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'es' ? 'Deporte Principal' : 'Primary Sport'}
                </label>
                <SportSelect
                  value={sport}
                  onChange={setSport}
                  language={language}
                  placeholder={language === 'es' ? 'Vóleibol' : 'Volleyball'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'es' ? 'Deporte Secundario' : 'Secondary Sport'}
                </label>
                <SportSelect
                  value={secondarySport}
                  onChange={setSecondarySport}
                  language={language}
                  placeholder={language === 'es' ? 'Vóley Playa' : 'Beach Volleyball'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'es' ? 'Años de Experiencia' : 'Years of Experience'}
                </label>
                <input
                  type="number"
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                  placeholder="5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'es' ? 'Nivel Actual' : 'Current Level'}
                </label>
                <select
                  value={currentLevel}
                  onChange={(e) => setCurrentLevel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                >
                  <option value="">{language === 'es' ? 'Seleccionar...' : 'Select...'}</option>
                  <option value="beginner">{language === 'es' ? 'Principiante' : 'Beginner'}</option>
                  <option value="intermediate">{language === 'es' ? 'Intermedio' : 'Intermediate'}</option>
                  <option value="advanced">{language === 'es' ? 'Avanzado' : 'Advanced'}</option>
                  <option value="professional">{language === 'es' ? 'Profesional' : 'Professional'}</option>
                  <option value="elite">{language === 'es' ? 'Elite' : 'Elite'}</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'es' ? 'Bio del Atleta' : 'Athlete Bio'}
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                placeholder={
                  language === 'es'
                    ? 'Cuéntanos sobre ti como deportista...'
                    : 'Tell us about yourself as an athlete...'
                }
              />
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {bio.length}/500 {language === 'es' ? 'caracteres' : 'characters'}
              </p>
            </div>
          </div>

          {/* Trainer Role Type — visible only for trainers/admins */}
          {(isTrainer || isAdmin) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#fdda36]" />
                {language === 'es' ? 'Rol como Profesional' : 'Professional Role'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {language === 'es'
                  ? 'Tu especialización principal. Los atletas la verán al asignarte.'
                  : 'Your main specialization. Athletes will see this when assigning you.'}
              </p>
              <select
                value={trainerRoleType}
                onChange={e => setTrainerRoleType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36]"
              >
                <option value="">{language === 'es' ? 'Seleccionar rol...' : 'Select role...'}</option>
                {TRAINER_ROLE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {language === 'es' ? opt.labelEs : opt.labelEn}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Multi-Trainer Team — visible only for athletes */}
          {profile?.role === 'athlete' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#fdda36]" />
                {language === 'es' ? 'Mi Equipo de Profesionales' : 'My Professional Team'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                {language === 'es'
                  ? 'Asigna uno o más profesionales a tu perfil según su rol.'
                  : 'Assign one or more professionals to your profile by their role.'}
              </p>

              {athleteTrainers.length > 0 && (
                <div className="space-y-2 mb-4">
                  {athleteTrainers.map(at => {
                    const tp = trainers.find(t => t.id === at.trainer_id);
                    const name = tp
                      ? tp.full_name || `${tp.first_name || ''} ${tp.last_name || ''}`.trim() || tp.email
                      : at.trainer_id;
                    return (
                      <div key={at.id} className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-[#fdda36]/20 flex items-center justify-center flex-shrink-0">
                            <UserCheck className="w-4 h-4 text-[#514163] dark:text-[#fdda36]" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{name}</p>
                            <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-[#fdda36]/20 text-[#514163] dark:text-[#fdda36] font-medium mt-0.5">
                              {getRoleLabel(at.role_type)}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => at.id && handleRemoveTrainerAssignment(at.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <AddTrainerRow
                trainers={trainers}
                existingAssignments={athleteTrainers}
                language={language}
                onAdd={handleAddTrainerAssignment}
              />
            </div>
          )}

          {/* Emergency Contact */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#fdda36]" />
              {language === 'es' ? 'Contacto de Emergencia' : 'Emergency Contact'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'es' ? 'Nombre' : 'Name'}
                </label>
                <input
                  type="text"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                  placeholder="María López"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'es' ? 'Teléfono' : 'Phone'}
                </label>
                <input
                  type="tel"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                  placeholder="+1 234 567 8900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'es' ? 'Relación' : 'Relationship'}
                </label>
                <input
                  type="text"
                  value={emergencyRelationship}
                  onChange={(e) => setEmergencyRelationship(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                  placeholder={language === 'es' ? 'Madre' : 'Mother'}
                />
              </div>
            </div>
          </div>

          {/* Social Media */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#fdda36]" />
              {language === 'es' ? 'Redes Sociales' : 'Social Media'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Instagram className="w-4 h-4 inline mr-1" />
                  Instagram
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-gray-100 dark:bg-gray-900 border border-r-0 border-gray-300 dark:border-gray-600 rounded-l-lg text-gray-500 dark:text-gray-500 dark:text-gray-400">
                    @
                  </span>
                  <input
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-r-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                    placeholder="tu_usuario"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Twitter className="w-4 h-4 inline mr-1" />
                  Twitter/X
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-gray-100 dark:bg-gray-900 border border-r-0 border-gray-300 dark:border-gray-600 rounded-l-lg text-gray-500 dark:text-gray-500 dark:text-gray-400">
                    @
                  </span>
                  <input
                    type="text"
                    value={twitter}
                    onChange={(e) => setTwitter(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-r-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                    placeholder="tu_usuario"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Activity className="w-4 h-4 inline mr-1" />
                  Strava
                </label>
                <input
                  type="text"
                  value={strava}
                  onChange={(e) => setStrava(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                  placeholder="strava.com/athletes/123"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-[#fdda36] text-[#514163] rounded-lg font-semibold hover:bg-[#ffd51a] transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {loading
                ? language === 'es'
                  ? 'Guardando...'
                  : 'Saving...'
                : language === 'es'
                ? 'Guardar Cambios'
                : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Membership Section */}
      {activeSection === 'membership' && (
        <MembershipSection />
      )}

      {/* Preferences Section */}
      {activeSection === 'preferences' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#fdda36]" />
              {language === 'es' ? 'Notificaciones' : 'Notifications'}
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {language === 'es' ? 'Notificaciones por Email' : 'Email Notifications'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {language === 'es'
                      ? 'Recibe actualizaciones de entrenamientos y mensajes'
                      : 'Receive workout updates and messages'}
                  </p>
                </div>
                <button
                  onClick={() => setEmailNotifications(!emailNotifications)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    emailNotifications ? 'bg-[#fdda36]' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      emailNotifications ? 'translate-x-6' : ''
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {language === 'es' ? 'Notificaciones Push' : 'Push Notifications'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {language === 'es'
                      ? 'Alertas en tiempo real en tu dispositivo'
                      : 'Real-time alerts on your device'}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    const newValue = !pushNotifications;
                    if (newValue) {
                      try {
                        const status = await initPushNotifications();
                        if (status === 'granted') {
                          setPushNotifications(true);
                        } else if (status === 'denied') {
                          setPushNotifications(false);
                        }
                      } catch {
                        // Silently fail - do not crash
                      }
                    } else {
                      setPushNotifications(false);
                    }
                  }}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    pushNotifications ? 'bg-[#fdda36]' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      pushNotifications ? 'translate-x-6' : ''
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#fdda36]" />
              {language === 'es' ? 'Privacidad' : 'Privacy'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'Visibilidad del Perfil' : 'Profile Visibility'}
                </label>
                <select
                  value={profileVisibility}
                  onChange={(e) => setProfileVisibility(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                >
                  <option value="private">
                    {language === 'es' ? 'Privado - Solo yo' : 'Private - Only me'}
                  </option>
                  <option value="team_only">
                    {language === 'es' ? 'Equipo - Mi entrenador y compañeros' : 'Team - My coach and teammates'}
                  </option>
                  <option value="public">
                    {language === 'es' ? 'Público - Todos' : 'Public - Everyone'}
                  </option>
                </select>
              </div>

              {profileVisibility === 'public' && profile?.role === 'athlete' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'es' ? 'URL Personalizada' : 'Custom URL'}
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      hub.asciende.pro/athlete/
                    </span>
                    <input
                      type="text"
                      value={publicProfileSlug}
                      onChange={(e) => {
                        const slug = e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, '-')
                          .replace(/-+/g, '-')
                          .replace(/^-|-$/g, '');
                        setPublicProfileSlug(slug);
                      }}
                      placeholder={profile?.full_name?.toLowerCase().replace(/\s+/g, '-') || 'tu-nombre'}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {language === 'es'
                      ? 'Solo letras, números y guiones. Ej: juan-perez'
                      : 'Only letters, numbers and hyphens. Ex: john-smith'}
                  </p>
                  {publicProfileSlug && (
                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        {language === 'es' ? 'Tu perfil estará disponible en:' : 'Your profile will be available at:'}
                      </p>
                      <p className="text-sm font-mono text-blue-900 dark:text-blue-200 mt-1">
                        {window.location.origin}/athlete/{publicProfileSlug}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-[#fdda36] text-[#514163] rounded-lg font-semibold hover:bg-[#ffd51a] transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {loading
                ? language === 'es'
                  ? 'Guardando...'
                  : 'Saving...'
                : language === 'es'
                ? 'Guardar Preferencias'
                : 'Save Preferences'}
            </button>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50 dark:bg-red-900/10 rounded-xl border-2 border-red-200 dark:border-red-900 p-6 mt-8">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h2 className="text-lg font-bold text-red-900 dark:text-red-200 mb-2">
                  {language === 'es' ? 'Zona de Peligro' : 'Danger Zone'}
                </h2>
                <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                  {language === 'es'
                    ? 'Una vez que elimines tu cuenta, no hay vuelta atrás. Por favor, ten certeza.'
                    : 'Once you delete your account, there is no going back. Please be certain.'}
                </p>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                  {language === 'es' ? 'Eliminar Cuenta Permanentemente' : 'Delete Account Permanently'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-8 h-8" />
              <h2 className="text-xl font-bold">
                {language === 'es' ? 'Confirmar Eliminación' : 'Confirm Deletion'}
              </h2>
            </div>

            <div className="space-y-3">
              <p className="text-gray-700 dark:text-gray-300">
                {language === 'es'
                  ? 'Esta acción NO se puede deshacer. Esto eliminará permanentemente tu cuenta y todos tus datos.'
                  : 'This action CANNOT be undone. This will permanently delete your account and all your data.'}
              </p>

              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {language === 'es'
                  ? 'Escribe DELETE para confirmar:'
                  : 'Type DELETE to confirm:'}
              </p>

              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-2 border-2 border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 font-mono"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={loading || deleteConfirmText !== 'DELETE'}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? (language === 'es' ? 'Eliminando...' : 'Deleting...')
                  : (language === 'es' ? 'Eliminar Cuenta' : 'Delete Account')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Security Section */}
      {activeSection === 'security' && <SecuritySection />}

      {/* Notification Settings Section */}
      {activeSection === 'notifications' && <NotificationSettings />}

      {/* Admin Section */}
      {activeSection === 'admin' && canAccessAdmin && <AdminSection currentProfile={profile} />}

      {/* Support Me Section */}
      {activeSection === 'support' && profile?.role === 'athlete' && <SupportMeSection />}

      {/* About Coach Section */}
      {activeSection === 'about-coach' && <AboutCoachSection />}

      {/* TrainingPeaks Section */}
      {activeSection === 'trainingpeaks' && profile?.role === 'athlete' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <TrainingPeaksSection />
        </div>
      )}

      {/* Strava Section */}
      {activeSection === 'strava' && profile?.role === 'athlete' && <StravaSection />}

      {/* Invoices Section */}
      {activeSection === 'invoices' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {language === 'es' ? 'Facturas' : 'Invoices'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {language === 'es' ? 'Gestiona tus facturas y pagos' : 'Manage your invoices and payments'}
            </p>
          </div>
          <InvoicesSection />
        </div>
      )}

      {/* Satellites Section */}
      {activeSection === 'satellites' && <SatellitesSection />}

      {/* Planner Connections Section */}
      {activeSection === 'planner-connections' && profile?.role === 'admin' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <PlannerConnectionsSection />
        </div>
      )}

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={hideToast}
        />
      )}
    </div>
  );
}
