import { useLanguage } from '../contexts/LanguageContext';
import { Calendar, Clock, Video, ExternalLink } from 'lucide-react';

export default function BookingsPage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('menu.book')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Schedule sessions with professional trainers and coaches
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-[#fdda36] rounded-full flex items-center justify-center">
              <Video className="w-8 h-8 text-[#514163]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                1-on-1 Training Session
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                60 minutes video call
              </p>
            </div>
          </div>

          <ul className="space-y-3 mb-6">
            <li className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Clock className="w-5 h-5 text-[#fdda36]" />
              <span>Personalized coaching session</span>
            </li>
            <li className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Video className="w-5 h-5 text-[#fdda36]" />
              <span>Video analysis and feedback</span>
            </li>
            <li className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Calendar className="w-5 h-5 text-[#fdda36]" />
              <span>Flexible scheduling</span>
            </li>
          </ul>

          <button className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors">
            <Calendar className="w-5 h-5" />
            Book Now
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-[#514163] rounded-full flex items-center justify-center">
              <Calendar className="w-8 h-8 text-[#fdda36]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Nutrition Consultation
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                45 minutes video call
              </p>
            </div>
          </div>

          <ul className="space-y-3 mb-6">
            <li className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Clock className="w-5 h-5 text-[#fdda36]" />
              <span>Complete diet review</span>
            </li>
            <li className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Video className="w-5 h-5 text-[#fdda36]" />
              <span>Personalized meal planning</span>
            </li>
            <li className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Calendar className="w-5 h-5 text-[#fdda36]" />
              <span>Follow-up support included</span>
            </li>
          </ul>

          <button className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#514163] text-[#fdda36] font-medium rounded-lg hover:bg-[#3a2f4a] transition-colors">
            <Calendar className="w-5 h-5" />
            Book Now
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">
          Calendly Integration Coming Soon
        </h3>
        <p className="text-blue-800 dark:text-blue-400">
          We're working on integrating with Calendly to make booking even easier. For now, please contact your trainer directly to schedule a session.
        </p>
      </div>
    </div>
  );
}
