import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import AdminLayout from '../components/AdminLayout';
import ChangeMembershipModal from '../components/ChangeMembershipModal';
import ProfileOptionsModal from '../components/ProfileOptionsModal';
import {
  Users,
  Search,
  Filter,
  Mail,
  Shield,
  Trophy,
  UserCog,
  MoreVertical,
  Key,
  Ban,
  CheckCircle2,
  Crown
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  sport: string | null;
  country: string | null;
  created_at: string;
  membership?: {
    name: string;
    slug: string;
  } | null;
}

export default function AdminUsersPage() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showMembershipModal, setShowMembershipModal] = useState(false);
  const [showProfileOptionsModal, setShowProfileOptionsModal] = useState(false);
  const [selectedUserForOptions, setSelectedUserForOptions] = useState<User | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter]);

  const loadUsers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const { data: memberships } = await supabase
        .from('membership_access')
        .select(`
          user_id,
          start_date,
          end_date,
          membership:memberships (
            name,
            name_es,
            name_en,
            slug
          )
        `)
        .eq('status', 'active')
        .or('end_date.is.null,end_date.gte.' + new Date().toISOString())
        .order('start_date', { ascending: false });

      // Group memberships by user_id and get the most recent one
      const membershipByUser = new Map();
      memberships?.forEach((m: any) => {
        if (!membershipByUser.has(m.user_id)) {
          membershipByUser.set(m.user_id, m.membership);
        }
      });

      const usersWithMemberships = profiles.map(user => {
        return {
          ...user,
          membership: membershipByUser.get(user.id) || null
        };
      });

      setUsers(usersWithMemberships as any);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeMembership = (user: User) => {
    setSelectedUser(user);
    setShowMembershipModal(true);
  };

  const filterUsers = () => {
    let filtered = users;

    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(u =>
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.country?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-4 h-4" />;
      case 'trainer':
        return <UserCog className="w-4 h-4" />;
      case 'athlete':
      default:
        return <Trophy className="w-4 h-4" />;
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      trainer: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      athlete: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    };

    return colors[role as keyof typeof colors] || colors.athlete;
  };

  const t = (key: string) => {
    const translations: Record<string, { es: string; en: string }> = {
      title: { es: 'Gestión de Usuarios', en: 'Users Management' },
      subtitle: { es: 'Administra todos los usuarios de la plataforma', en: 'Manage all platform users' },
      search: { es: 'Buscar usuarios...', en: 'Search users...' },
      all: { es: 'Todos', en: 'All' },
      athletes: { es: 'Atletas', en: 'Athletes' },
      coaches: { es: 'Entrenadores', en: 'Coaches' },
      admins: { es: 'Administradores', en: 'Admins' },
      name: { es: 'Nombre', en: 'Name' },
      email: { es: 'Email', en: 'Email' },
      role: { es: 'Rol', en: 'Role' },
      sport: { es: 'Deporte', en: 'Sport' },
      country: { es: 'País', en: 'Country' },
      joinedDate: { es: 'Fecha de Registro', en: 'Joined Date' },
      lastLogin: { es: 'Último Acceso', en: 'Last Login' },
      actions: { es: 'Acciones', en: 'Actions' },
      membership: { es: 'Membresía', en: 'Membership' },
      changeMembership: { es: 'Cambiar Membresía', en: 'Change Membership' },
      noMembership: { es: 'Sin membresía', en: 'No membership' }
    };
    return translations[key]?.[language] || key;
  };

  const stats = {
    total: users.length,
    athletes: users.filter(u => u.role === 'athlete').length,
    trainers: users.filter(u => u.role === 'trainer').length,
    admins: users.filter(u => u.role === 'admin').length
  };

  return (
    <AdminLayout currentPage="admin-users">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('subtitle')}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('all')}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('athletes')}</p>
            <p className="text-2xl font-bold text-green-600">{stats.athletes}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('coaches')}</p>
            <p className="text-2xl font-bold text-blue-600">{stats.trainers}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('admins')}</p>
            <p className="text-2xl font-bold text-red-600">{stats.admins}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('search')}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">{t('all')}</option>
              <option value="athlete">{t('athletes')}</option>
              <option value="trainer">{t('coaches')}</option>
              <option value="admin">{t('admins')}</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              {language === 'es' ? 'Cargando usuarios...' : 'Loading users...'}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              {language === 'es' ? 'No se encontraron usuarios' : 'No users found'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('name')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('email')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('role')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('sport')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('country')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('joinedDate')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('membership')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center text-white font-bold">
                            {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.full_name || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                          {getRoleIcon(user.role)}
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {user.sport || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {user.country || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.membership ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#514163]/10 text-[#514163] dark:text-[#fdda36] rounded-full text-xs font-medium">
                            <Crown className="w-3 h-3" />
                            {(language === 'es' ? user.membership.name_es : user.membership.name_en) || user.membership.name}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {t('noMembership')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleChangeMembership(user)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-[#fdda36] text-[#514163] rounded-lg hover:bg-[#ffd51a] transition-colors font-medium"
                          >
                            <Crown className="w-4 h-4" />
                            {language === 'es' ? 'Cambiar' : 'Change'}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUserForOptions(user);
                              setShowProfileOptionsModal(true);
                            }}
                            className="inline-flex items-center justify-center p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title={language === 'es' ? 'Opciones' : 'Options'}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Membership Modal */}
        {selectedUser && (
          <ChangeMembershipModal
            isOpen={showMembershipModal}
            onClose={() => {
              setShowMembershipModal(false);
              setSelectedUser(null);
            }}
            userId={selectedUser.id}
            userEmail={selectedUser.email}
            userName={selectedUser.full_name || selectedUser.email}
            onSuccess={loadUsers}
          />
        )}

        {/* Profile Options Modal */}
        {selectedUserForOptions && profile && (
          <ProfileOptionsModal
            isOpen={showProfileOptionsModal}
            onClose={() => {
              setShowProfileOptionsModal(false);
              setSelectedUserForOptions(null);
            }}
            athleteId={selectedUserForOptions.id}
            athleteName={selectedUserForOptions.full_name || ''}
            assignedTrainerId={selectedUserForOptions.role === 'athlete' ? undefined : selectedUserForOptions.id}
            currentUserId={profile.id || ''}
            currentUserRole={profile.role || ''}
            currentUserEmail={profile.email}
          />
        )}
      </div>
    </AdminLayout>
  );
}
