import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { User, Mail, MapPin, Trophy, Instagram, Linkedin, Save } from 'lucide-react';

interface TrainerAbout {
  biography: string;
  philosophy: string;
  country: string;
  sport_specialization: string;
  contact_email: string;
  instagram: string;
  linkedin: string;
}

export default function AboutCoachSection() {
  const { profile, user } = useAuth();
  const { t } = useLanguage();
  const [aboutData, setAboutData] = useState<TrainerAbout>({
    biography: '',
    philosophy: '',
    country: '',
    sport_specialization: '',
    contact_email: '',
    instagram: '',
    linkedin: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const isTrainer = profile?.role === 'trainer' || profile?.role === 'admin';

  useEffect(() => {
    loadAboutData();
  }, [user]);

  const loadAboutData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const trainerId = isTrainer ? user.id : profile?.assigned_trainer_id;

      if (!trainerId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('trainer_about')
        .select('*')
        .eq('trainer_id', trainerId)
        .maybeSingle();

      if (data) {
        setAboutData({
          biography: data.biography || '',
          philosophy: data.philosophy || '',
          country: data.country || '',
          sport_specialization: data.sport_specialization || '',
          contact_email: data.contact_email || '',
          instagram: data.instagram || '',
          linkedin: data.linkedin || ''
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !isTrainer) return;

    setSaving(true);
    setMessage('');

    try {
      const { data: existing } = await supabase
        .from('trainer_about')
        .select('id')
        .eq('trainer_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('trainer_about')
          .update(aboutData)
          .eq('trainer_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('trainer_about')
          .insert([{
            trainer_id: user.id,
            ...aboutData
          }]);

        if (error) throw error;
      }

      setMessage(t('about.coach.updated'));
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage('Error: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">
            {t('about.coach.title')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 mt-1">
            {isTrainer ? t('about.coach.edit') : t('about.coach.subtitle')}
          </p>
        </div>
        {isTrainer && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : t('about.coach.save')}
          </button>
        )}
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.includes('Error') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
          {message}
        </div>
      )}

      {!isTrainer && !profile?.assigned_trainer_id && (
        <div className="p-6 bg-gray-100 dark:bg-gray-800 dark:bg-gray-800 rounded-lg text-center">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400">
            {t('about.coach.noInfo')}
          </p>
        </div>
      )}

      {(isTrainer || profile?.assigned_trainer_id) && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              {t('about.coach.biography')}
            </label>
            {isTrainer ? (
              <textarea
                value={aboutData.biography}
                onChange={(e) => setAboutData({ ...aboutData, biography: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-900 text-gray-900 dark:text-white dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
                placeholder="Share your background and experience..."
              />
            ) : (
              <p className="text-gray-700 dark:text-gray-300 dark:text-gray-300 whitespace-pre-wrap">
                {aboutData.biography || t('about.coach.noInfo')}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              {t('about.coach.philosophy')}
            </label>
            {isTrainer ? (
              <textarea
                value={aboutData.philosophy}
                onChange={(e) => setAboutData({ ...aboutData, philosophy: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-900 text-gray-900 dark:text-white dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
                placeholder="What is your coaching philosophy?"
              />
            ) : (
              <p className="text-gray-700 dark:text-gray-300 dark:text-gray-300 whitespace-pre-wrap">
                {aboutData.philosophy || t('about.coach.noInfo')}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {t('about.coach.country')}
              </label>
              {isTrainer ? (
                <input
                  type="text"
                  value={aboutData.country}
                  onChange={(e) => setAboutData({ ...aboutData, country: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-900 text-gray-900 dark:text-white dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
                  placeholder="e.g., Colombia"
                />
              ) : (
                <p className="text-gray-700 dark:text-gray-300 dark:text-gray-300">
                  {aboutData.country || t('about.coach.noInfo')}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                {t('about.coach.sport')}
              </label>
              {isTrainer ? (
                <input
                  type="text"
                  value={aboutData.sport_specialization}
                  onChange={(e) => setAboutData({ ...aboutData, sport_specialization: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-900 text-gray-900 dark:text-white dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
                  placeholder="e.g., Track & Field"
                />
              ) : (
                <p className="text-gray-700 dark:text-gray-300 dark:text-gray-300">
                  {aboutData.sport_specialization || t('about.coach.noInfo')}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {t('about.coach.contactEmail')}
              </label>
              {isTrainer ? (
                <input
                  type="email"
                  value={aboutData.contact_email}
                  onChange={(e) => setAboutData({ ...aboutData, contact_email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-900 text-gray-900 dark:text-white dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
                  placeholder="coach@example.com"
                />
              ) : (
                <p className="text-gray-700 dark:text-gray-300 dark:text-gray-300">
                  {aboutData.contact_email || t('about.coach.noInfo')}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Instagram className="w-4 h-4" />
                {t('about.coach.instagram')}
              </label>
              {isTrainer ? (
                <input
                  type="text"
                  value={aboutData.instagram}
                  onChange={(e) => setAboutData({ ...aboutData, instagram: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-900 text-gray-900 dark:text-white dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
                  placeholder="@username"
                />
              ) : aboutData.instagram ? (
                <a
                  href={`https://instagram.com/${aboutData.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#fdda36] hover:underline flex items-center gap-1"
                >
                  {aboutData.instagram}
                </a>
              ) : (
                <p className="text-gray-700 dark:text-gray-300 dark:text-gray-300 dark:text-gray-300">{t('about.coach.noInfo')}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Linkedin className="w-4 h-4" />
                {t('about.coach.linkedin')}
              </label>
              {isTrainer ? (
                <input
                  type="text"
                  value={aboutData.linkedin}
                  onChange={(e) => setAboutData({ ...aboutData, linkedin: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-900 text-gray-900 dark:text-white dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
                  placeholder="linkedin.com/in/username"
                />
              ) : aboutData.linkedin ? (
                <a
                  href={aboutData.linkedin.startsWith('http') ? aboutData.linkedin : `https://${aboutData.linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#fdda36] hover:underline"
                >
                  LinkedIn Profile
                </a>
              ) : (
                <p className="text-gray-700 dark:text-gray-300 dark:text-gray-300 dark:text-gray-300">{t('about.coach.noInfo')}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
