import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import AdminLayout from '../components/AdminLayout';
import ChangeMembershipModal from '../components/ChangeMembershipModal';
import ProfileOptionsModal from '../components/ProfileOptionsModal';
import RoleGuard from '../components/RoleGuard';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { ROLE_LABELS, ROLE_LABELS_ES, USER_ROLES, type UserRole } from '../types/roles';
import {
  Users,
  Search,
  Mail,
  Shield,
  Trophy,
  UserCog,
  MoreVertical,
  Crown,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UserX,
  UserCheck,
  AlertTriangle,
  X,
} from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean | null;
  created_at: string;
  updated_at: string | null;
  last_sign_in_at: string | null;
  sport: string | null;
  country: string | null;
  avatar_url: string | null;
  membership?: {
    name: string;
    name_es: string | null;
    name_en: string | null;
    slug: string;
  } | null;
  proSubscription?: {
    status: string;
    billing_cycle: string;
    trial_end: string | null;
    current_period_end: string | null;
    max_athletes: number;
  } | null;
}

const PAGE_SIZE = 20;

function AdminUsersPageContent() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const { toast, showToast, hideToast, success, error } = useToast();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [pendingRoles, setPendingRoles] = useState<Record<string, UserRole>>({});
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showMembershipModal, setShowMembershipModal] = useState(false);
  const [showProfileOptionsModal, setShowProfileOptionsModal] = useState(false);
  const [selectedUserForOptions, setSelectedUserForOptions] = useState<AdminUser | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState('');

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data: profiles, error } = await supabase.rpc('admin_get_users', {
        p_page: page,
        p_page_size: PAGE_SIZE,
        p_search: debouncedSearch || null,
        p_role_filter: roleFilter,
        p_status_filter: statusFilter,
      });

      if (error) throw error;
      if (!profiles || profiles.length === 0) {
        setUsers([]);
        setTotalCount(0);
        return;
      }

      const userIds = profiles.map((p: any) => p.id);

      const { data: memberships } = await supabase
        .from('membership_access')
        .select(`
          user_id,
          membership:memberships (name, name_es, name_en, slug)
        `)
        .in('user_id', userIds)
        .eq('status', 'active')
        .or('end_date.is.null,end_date.gte.' + new Date().toISOString())
        .order('start_date', { ascending: false });

      const membershipByUser = new Map<string, any>();
      memberships?.forEach((m: any) => {
        if (!membershipByUser.has(m.user_id)) {
          membershipByUser.set(m.user_id, m.membership);
        }
      });

      const { data: proSubs } = await supabase
        .from('professional_subscriptions')
        .select('user_id, status, billing_cycle, trial_end, current_period_end, max_athletes')
        .in('user_id', userIds)
        .order('created_at', { ascending: false });

      const proSubByUser = new Map<string, any>();
      proSubs?.forEach((s: any) => {
        if (!proSubByUser.has(s.user_id)) {
          proSubByUser.set(s.user_id, s);
        }
      });

      const usersWithMemberships: AdminUser[] = profiles.map((p: any) => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        role: p.role,
        is_active: p.is_active,
        created_at: p.created_at,
        updated_at: p.updated_at,
        last_sign_in_at: p.last_sign_in_at,
        sport: p.sport,
        country: p.country,
        avatar_url: p.avatar_url,
        membership: membershipByUser.get(p.id) || null,
        proSubscription: proSubByUser.get(p.id) || null,
      }));

      setUsers(usersWithMemberships);

      const { data: countData, error: countError } = await supabase.rpc('admin_get_user_count', {
        p_search: debouncedSearch || null,
        p_role_filter: roleFilter,
        p_status_filter: statusFilter,
      });
      if (countError) throw countError;
      setTotalCount(countData || 0);

      const { data: countsData, error: countsError } = await supabase.rpc('admin_get_role_counts');
      if (countsError) throw countsError;
      const counts: Record<string, number> = {};
      countsData?.forEach((row: { role: string; count: number }) => {
        counts[row.role] = Number(row.count);
      });
      setRoleCounts(counts);
    } catch (err) {
      console.error('Error loading users:', err);
      error(language === 'es' ? 'Error al cargar usuarios' : 'Error loading users');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, roleFilter, statusFilter, language, error]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleRoleChange = async (userId: string) => {
    const role = pendingRoles[userId];
    if (!role) return;
    setSavingRoleId(userId);
    try {
      const { error: rpcError } = await supabase.rpc('admin_set_profile_role', {
        p_user_id: userId,
        p_role: role,
      });
      if (rpcError) throw rpcError;
      setUsers((current) =>
        current.map((u) => (u.id === userId ? { ...u, role } : u))
      );
      setPendingRoles((current) => {
        const next = { ...current };
        delete next[userId];
        return next;
      });
      success(language === 'es' ? 'Rol actualizado correctamente' : 'Role updated successfully');
    } catch (err) {
      console.error('Error changing role:', err);
      error(language === 'es' ? 'Error al cambiar el rol' : 'Error changing role');
    } finally {
      setSavingRoleId(null);
    }
  };

  const handleToggleStatus = async (user: AdminUser) => {
    const newStatus = !(user.is_active ?? true);
    try {
      const { error: rpcError } = await supabase.rpc('admin_set_user_status', {
        p_user_id: user.id,
        p_is_active: newStatus,
      });
      if (rpcError) throw rpcError;
      setUsers((current) =>
        current.map((u) => (u.id === user.id ? { ...u, is_active: newStatus } : u))
      );
      success(
        newStatus
          ? language === 'es' ? 'Usuario activado' : 'User activated'
          : language === 'es' ? 'Usuario desactivado' : 'User deactivated'
      );
    } catch (err) {
      console.error('Error toggling status:', err);
      error(language === 'es' ? 'Error al cambiar el estado' : 'Error toggling status');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeletingUserId(deleteTarget.id);
    try {
      const { error: rpcError } = await supabase.rpc('admin_delete_user', {
        p_user_id: deleteTarget.id,
      });
      if (rpcError) throw rpcError;
      success(language === 'es' ? 'Usuario eliminado' : 'User deleted');
      setDeleteTarget(null);
      loadUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      error(language === 'es' ? 'Error al eliminar usuario' : 'Error deleting user');
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ full_name: editName, updated_at: new Date().toISOString() })
        .eq('id', editTarget.id);
      if (updateError) throw updateError;
      setUsers((current) =>
        current.map((u) => (u.id === editTarget.id ? { ...u, full_name: editName } : u))
      );
      success(language === 'es' ? 'Usuario actualizado' : 'User updated');
      setEditTarget(null);
    } catch (err) {
      console.error('Error updating user:', err);
      error(language === 'es' ? 'Error al actualizar' : 'Error updating user');
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      trainer: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      athlete: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      nutritionist: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      head_coach: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    };
    return colors[role] || colors.athlete;
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="w-4 h-4" />;
      case 'trainer': return <UserCog className="w-4 h-4" />;
      case 'nutritionist': return <UserCog className="w-4 h-4" />;
      case 'head_coach': return <UserCog className="w-4 h-4" />;
      case 'athlete':
      default: return <Trophy className="w-4 h-4" />;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const t = (key: string) => {
    const translations: Record<string, { es: string; en: string }> = {
      title: { es: 'Gestión de Usuarios', en: 'Users Management' },
      subtitle: { es: 'Administra todos los usuarios de la plataforma', en: 'Manage all platform users' },
      search: { es: 'Buscar por nombre o email...', en: 'Search by name or email...' },
      all: { es: 'Todos', en: 'All' },
      active: { es: 'Activo', en: 'Active' },
      inactive: { es: 'Inactivo', en: 'Inactive' },
      athletes: { es: 'Atletas', en: 'Athletes' },
      coaches: { es: 'Entrenadores', en: 'Coaches' },
      nutritionists: { es: 'Nutricionistas', en: 'Nutritionists' },
      headCoaches: { es: 'Head Coaches', en: 'Head Coaches' },
      admins: { es: 'Administradores', en: 'Admins' },
      name: { es: 'Nombre', en: 'Name' },
      email: { es: 'Email', en: 'Email' },
      role: { es: 'Rol', en: 'Role' },
      status: { es: 'Estado', en: 'Status' },
      createdDate: { es: 'Fecha de Creación', en: 'Created Date' },
      lastAccess: { es: 'Último Acceso', en: 'Last Access' },
      actions: { es: 'Acciones', en: 'Actions' },
      membership: { es: 'Membresía', en: 'Membership' },
      noMembership: { es: 'Sin membresía', en: 'No membership' },
      proSub: { es: 'Suscripción Pro', en: 'Pro Subscription' },
      trialing: { es: 'Prueba', en: 'Trialing' },
      active: { es: 'Activo', en: 'Active' },
      pastDue: { es: 'Pago pendiente', en: 'Past Due' },
      canceled: { es: 'Cancelado', en: 'Canceled' },
      unpaid: { es: 'Impagado', en: 'Unpaid' },
      incomplete: { es: 'Incompleto', en: 'Incomplete' },
      noProSub: { es: 'Sin suscripción', en: 'No subscription' },
      loading: { es: 'Cargando usuarios...', en: 'Loading users...' },
      noUsers: { es: 'No se encontraron usuarios', en: 'No users found' },
      page: { es: 'Página', en: 'Page' },
      of: { es: 'de', en: 'of' },
      total: { es: 'Total', en: 'Total' },
      users: { es: 'usuarios', en: 'users' },
      edit: { es: 'Editar', en: 'Edit' },
      delete: { es: 'Eliminar', en: 'Delete' },
      activate: { es: 'Activar', en: 'Activate' },
      deactivate: { es: 'Desactivar', en: 'Deactivate' },
      options: { es: 'Opciones', en: 'Options' },
      change: { es: 'Cambiar', en: 'Change' },
      save: { es: 'Guardar', en: 'Save' },
      cancel: { es: 'Cancelar', en: 'Cancel' },
      confirmDelete: { es: '¿Eliminar usuario?', en: 'Delete user?' },
      confirmDeleteMsg: { es: 'Esta acción no se puede deshacer. Se eliminará el usuario y todos sus datos.', en: 'This action cannot be undone. The user and all their data will be deleted.' },
      editUser: { es: 'Editar Usuario', en: 'Edit User' },
      fullName: { es: 'Nombre completo', en: 'Full name' },
      filterByRole: { es: 'Filtrar por rol', en: 'Filter by role' },
      filterByStatus: { es: 'Filtrar por estado', en: 'Filter by status' },
    };
    return translations[key]?.[language] || key;
  };

  const stats = {
    total: totalCount,
    athletes: roleCounts['athlete'] || 0,
    trainers: roleCounts['trainer'] || 0,
    nutritionists: roleCounts['nutritionist'] || 0,
    headCoaches: roleCounts['head_coach'] || 0,
    admins: roleCounts['admin'] || 0,
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-400" />
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('total')}</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-green-500" />
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('athletes')}</p>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.athletes}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-blue-500" />
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('coaches')}</p>
            </div>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.trainers}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-amber-500" />
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('nutritionists')}</p>
            </div>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.nutritionists}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-purple-500" />
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('headCoaches')}</p>
            </div>
            <p className="text-2xl font-bold text-purple-600 mt-1">{stats.headCoaches}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-500" />
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('admins')}</p>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.admins}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('search')}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36] focus:border-transparent outline-none transition-all"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36] focus:border-transparent outline-none transition-all"
            >
              <option value="all">{t('filterByRole')}: {t('all')}</option>
              {USER_ROLES.map((role) => (
                <option key={role} value={role}>
                  {language === 'es' ? ROLE_LABELS_ES[role] : ROLE_LABELS[role]}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36] focus:border-transparent outline-none transition-all"
            >
              <option value="all">{t('filterByStatus')}: {t('all')}</option>
              <option value="active">{t('active')}</option>
              <option value="inactive">{t('inactive')}</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-[#fdda36]" />
              <p>{t('loading')}</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              {t('noUsers')}
            </div>
          ) : (
            <>
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
                        {t('status')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('createdDate')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('lastAccess')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('membership')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('proSub')}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {users.map((user) => {
                      const isActive = user.is_active ?? true;
                      return (
                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          {/* Name */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {user.avatar_url ? (
                                <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#fdda36] to-[#514163] flex items-center justify-center text-white font-bold text-sm">
                                  {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="ml-3">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {user.full_name || 'N/A'}
                                </p>
                                {user.sport && (
                                  <p className="text-xs text-gray-400">{user.sport}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          {/* Email */}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              {user.email}
                            </div>
                          </td>
                          {/* Role */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <select
                                value={pendingRoles[user.id] || user.role}
                                onChange={(e) =>
                                  setPendingRoles((current) => ({
                                    ...current,
                                    [user.id]: e.target.value as UserRole,
                                  }))
                                }
                                className={`px-2 py-1 rounded-lg text-xs font-medium border-0 cursor-pointer ${getRoleBadge(user.role)}`}
                              >
                                {USER_ROLES.map((role) => (
                                  <option key={role} value={role}>
                                    {language === 'es' ? ROLE_LABELS_ES[role] : ROLE_LABELS[role]}
                                  </option>
                                ))}
                              </select>
                              {pendingRoles[user.id] && pendingRoles[user.id] !== user.role && (
                                <button
                                  onClick={() => handleRoleChange(user.id)}
                                  disabled={savingRoleId === user.id}
                                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 disabled:opacity-50 transition-colors"
                                >
                                  {savingRoleId === user.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    t('save')
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                          {/* Status */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleToggleStatus(user)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                isActive
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                                  : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                              }`}
                            >
                              {isActive ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                              {isActive ? t('active') : t('inactive')}
                            </button>
                          </td>
                          {/* Created Date */}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            {formatDate(user.created_at)}
                          </td>
                          {/* Last Access */}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            {formatDateTime(user.last_sign_in_at)}
                          </td>
                          {/* Membership */}
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
                          {/* Pro Subscription */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            {user.proSubscription ? (
                              <div className="flex flex-col gap-1">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                    user.proSubscription.status === 'active' || user.proSubscription.status === 'trialing'
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                      : user.proSubscription.status === 'past_due' || user.proSubscription.status === 'unpaid'
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                  }`}
                                >
                                  {user.proSubscription.status === 'trialing' ? t('trialing')
                                    : user.proSubscription.status === 'active' ? t('active')
                                    : user.proSubscription.status === 'past_due' ? t('pastDue')
                                    : user.proSubscription.status === 'canceled' ? t('canceled')
                                    : user.proSubscription.status === 'unpaid' ? t('unpaid')
                                    : t('incomplete')}
                                </span>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                  {user.proSubscription.billing_cycle === 'monthly'
                                    ? (language === 'es' ? 'Mensual' : 'Monthly')
                                    : (language === 'es' ? 'Anual' : 'Yearly')}
                                  {' · '}
                                  {user.proSubscription.max_athletes} {language === 'es' ? 'atletas' : 'athletes'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                {t('noProSub')}
                              </span>
                            )}
                          </td>
                          {/* Actions */}
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setEditTarget(user);
                                  setEditName(user.full_name || '');
                                }}
                                className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                title={t('edit')}
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleChangeMembership(user)}
                                className="p-2 text-gray-500 hover:text-amber-600 dark:text-gray-400 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                                title={t('membership')}
                              >
                                <Crown className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(user)}
                                className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title={t('delete')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedUserForOptions(user);
                                  setShowProfileOptionsModal(true);
                                }}
                                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                title={t('options')}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('showing')} {users.length} {t('of')} {totalCount} {t('users')}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400 px-2">
                    {t('page')} <span className="font-semibold text-gray-900 dark:text-white">{page}</span> {t('of')} <span className="font-semibold text-gray-900 dark:text-white">{totalPages}</span>
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || loading}
                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {t('confirmDelete')}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t('confirmDeleteMsg')}
                  </p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-3">
                    {deleteTarget.full_name || 'N/A'} ({deleteTarget.email})
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deletingUserId !== null}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={deletingUserId !== null}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deletingUserId !== null ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {t('delete')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {editTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {t('editUser')}
                </h3>
                <button
                  onClick={() => setEditTarget(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('fullName')}
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36] focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('email')}
                  </label>
                  <input
                    type="text"
                    value={editTarget.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setEditTarget(null)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-[#fdda36] text-[#514163] hover:bg-[#ffd51a] font-medium transition-colors"
                >
                  {t('save')}
                </button>
              </div>
            </div>
          </div>
        )}

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

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={hideToast}
        />
      )}
    </AdminLayout>
  );
}

export default function AdminUsersPage() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <AdminUsersPageContent />
    </RoleGuard>
  );
}
