import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { Bell, X, Check, MessageSquare, MessageCircle, Settings as SettingsIcon } from 'lucide-react';

interface Notification {
  id: string;
  type: 'chat' | 'comment' | 'system' | 'announcement';
  title: string;
  message: string;
  link_type: string | null;
  link_id: string | null;
  is_read: boolean;
  created_at: string;
}

export default function NotificationCenter() {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'chat' | 'comment' | 'system'>('all');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!profile?.id) return;

    loadNotifications();

    const channelName = `realtime:notifications:${profile.id}:${Math.random()}`;
    const channel = supabase.channel(channelName);

    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${profile.id}`,
      },
      () => {
        loadNotifications();
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const loadNotifications = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter((n) => !n.is_read).length || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      await loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!profile?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', profile.id)
        .eq('is_read', false);

      if (error) throw error;

      await loadNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', notificationId);

      if (error) throw error;

      await loadNotifications();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'chat':
        return <MessageSquare className="w-5 h-5 text-[#fdda36]" />;
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'announcement':
        return <Bell className="w-5 h-5 text-purple-500" />;
      default:
        return <SettingsIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return language === 'es' ? 'Ahora' : 'Now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  const filteredNotifications =
    filter === 'all'
      ? notifications
      : notifications.filter((n) => n.type === filter || (filter === 'comment' && n.type === 'comment'));

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 dark:text-gray-400 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 dark:border-gray-700 z-50 max-h-[600px] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white dark:text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 text-[#fdda36]" />
                  {t('notifications.title')}
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Filters */}
              <div className="flex gap-2 text-xs">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 rounded-full transition-colors ${
                    filter === 'all'
                      ? 'bg-[#fdda36] text-[#514163] font-semibold'
                      : 'bg-gray-100 dark:bg-gray-800 dark:bg-gray-700 text-gray-600 dark:text-gray-400 dark:text-gray-400'
                  }`}
                >
                  {t('notifications.all')}
                </button>
                <button
                  onClick={() => setFilter('chat')}
                  className={`px-3 py-1 rounded-full transition-colors ${
                    filter === 'chat'
                      ? 'bg-[#fdda36] text-[#514163] font-semibold'
                      : 'bg-gray-100 dark:bg-gray-800 dark:bg-gray-700 text-gray-600 dark:text-gray-400 dark:text-gray-400'
                  }`}
                >
                  {t('notifications.chatNotifications')}
                </button>
                <button
                  onClick={() => setFilter('comment')}
                  className={`px-3 py-1 rounded-full transition-colors ${
                    filter === 'comment'
                      ? 'bg-[#fdda36] text-[#514163] font-semibold'
                      : 'bg-gray-100 dark:bg-gray-800 dark:bg-gray-700 text-gray-600 dark:text-gray-400 dark:text-gray-400'
                  }`}
                >
                  {t('notifications.comments')}
                </button>
                <button
                  onClick={() => setFilter('system')}
                  className={`px-3 py-1 rounded-full transition-colors ${
                    filter === 'system'
                      ? 'bg-[#fdda36] text-[#514163] font-semibold'
                      : 'bg-gray-100 dark:bg-gray-800 dark:bg-gray-700 text-gray-600 dark:text-gray-400 dark:text-gray-400'
                  }`}
                >
                  {t('notifications.system')}
                </button>
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="mt-3 w-full text-xs text-[#fdda36] hover:underline font-semibold"
                >
                  {t('notifications.markAllAsRead')}
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 dark:text-gray-400 dark:text-gray-400">{t('notifications.noNotifications')}</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors ${
                        !notification.is_read ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0">{getNotificationIcon(notification.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white dark:text-white">
                              {notification.title}
                            </p>
                            <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 whitespace-nowrap">
                              {formatTimeAgo(notification.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex gap-2 mt-2">
                            {!notification.is_read && (
                              <button
                                onClick={() => handleMarkAsRead(notification.id)}
                                className="text-xs text-[#fdda36] hover:underline font-semibold flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                {t('notifications.markAsRead')}
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteNotification(notification.id)}
                              className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 hover:underline flex items-center gap-1"
                            >
                              <X className="w-3 h-3" />
                              {t('buttons.delete')}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
