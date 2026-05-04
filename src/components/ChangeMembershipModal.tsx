import { useState, useEffect } from 'react';
import { X, Crown, Award, Shield, Users, Check, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useActiveMembership } from '../hooks/useActiveMembership';

interface Membership {
  id: string;
  name: string;
  name_es?: string;
  name_en?: string;
  slug: string;
  description: string;
  description_es?: string;
  description_en?: string;
  price_monthly: number;
  price_annual: number;
  color?: string;
}

interface ChangeMembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string;
  userName: string;
  onSuccess?: () => void;
}

export default function ChangeMembershipModal({
  isOpen,
  onClose,
  userId,
  userEmail,
  userName,
  onSuccess
}: ChangeMembershipModalProps) {
  const { language } = useLanguage();
  const { membership: currentMembership, reload } = useActiveMembership(userId);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedMembershipId, setSelectedMembershipId] = useState<string>('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    if (isOpen) {
      loadMemberships();
      reload();
    }
  }, [isOpen]);

  const loadMemberships = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('memberships')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      if (error) throw error;
      setMemberships(data || []);
    } catch (err) {
      console.error('Error loading memberships:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeMembership = async () => {
    if (!selectedMembershipId) {
      alert(language === 'es' ? 'Selecciona una membresía' : 'Select a membership');
      return;
    }

    const selectedMembership = memberships.find(m => m.id === selectedMembershipId);
    if (!selectedMembership) return;

    const confirmMessage = language === 'es'
      ? `¿Cambiar la membresía de ${userName} a ${selectedMembership.name}?`
      : `Change ${userName}'s membership to ${selectedMembership.name}?`;

    if (!confirm(confirmMessage)) return;

    setProcessing(true);
    try {
      if (currentMembership) {
        const { error: deactivateError } = await supabase
          .from('membership_access')
          .update({
            status: 'expired',
            end_date: new Date().toISOString()
          })
          .eq('id', currentMembership.id);

        if (deactivateError) throw deactivateError;
      }

      const endDate = new Date();
      if (billingCycle === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      const { error: insertError } = await supabase
        .from('membership_access')
        .insert({
          user_id: userId,
          membership_id: selectedMembershipId,
          status: 'active',
          start_date: new Date().toISOString(),
          end_date: endDate.toISOString(),
          assigned_by: (await supabase.auth.getUser()).data.user?.id,
          source: 'manual',
          notes: `Manually assigned by admin/trainer on ${new Date().toLocaleDateString()}`
        });

      if (insertError) throw insertError;

      alert(language === 'es' ? 'Membresía actualizada exitosamente' : 'Membership updated successfully');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Error changing membership:', err);
      alert(language === 'es' ? `Error: ${err.message}` : `Error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveMembership = async () => {
    if (!currentMembership) return;

    const confirmMessage = language === 'es'
      ? `¿Eliminar la membresía actual de ${userName}?`
      : `Remove ${userName}'s current membership?`;

    if (!confirm(confirmMessage)) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('membership_access')
        .update({
          status: 'canceled',
          end_date: new Date().toISOString()
        })
        .eq('id', currentMembership.id);

      if (error) throw error;

      alert(language === 'es' ? 'Membresía removida exitosamente' : 'Membership removed successfully');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Error removing membership:', err);
      alert(language === 'es' ? `Error: ${err.message}` : `Error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const getMembershipIcon = (slug: string) => {
    switch (slug.toLowerCase()) {
      case 'pro':
      case 'pro-elite':
        return Crown;
      case 'intermediate':
      case 'asciende':
        return Award;
      case 'start':
      case 'inicia':
        return Shield;
      default:
        return Users;
    }
  };

  const getMembershipColor = (slug: string) => {
    switch (slug.toLowerCase()) {
      case 'pro':
      case 'pro-elite':
        return 'from-yellow-500 to-yellow-600';
      case 'intermediate':
      case 'asciende':
        return 'from-[#514163] to-[#6d5581]';
      case 'start':
      case 'inicia':
        return 'from-gray-500 to-gray-600';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  if (!isOpen) return null;

  const currentMembershipName = currentMembership?.membership
    ? (language === 'es' ? currentMembership.membership.name_es : currentMembership.membership.name_en) || currentMembership.membership.name
    : 'Asciende Inicia';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {language === 'es' ? 'Cambiar Membresía' : 'Change Membership'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {userName} ({userEmail})
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Current Membership */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-bold text-blue-900 dark:text-blue-300">
                {language === 'es' ? 'Membresía Actual' : 'Current Membership'}
              </h3>
            </div>
            <p className="text-blue-800 dark:text-blue-200">
              <span className="font-semibold">{currentMembershipName}</span>
              {currentMembership?.status === 'active' && (
                <span className="ml-2 text-green-600 dark:text-green-400">
                  (✅ {language === 'es' ? 'Activa' : 'Active'})
                </span>
              )}
            </p>
            {currentMembership && (
              <button
                onClick={handleRemoveMembership}
                disabled={processing}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {language === 'es' ? 'Eliminar Membresía' : 'Remove Membership'}
              </button>
            )}
          </div>

          {/* Billing Cycle Toggle */}
          <div className="mb-6 flex items-center justify-center gap-3">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-[#fdda36] text-[#514163]'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {language === 'es' ? 'Mensual' : 'Monthly'}
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                billingCycle === 'annual'
                  ? 'bg-[#fdda36] text-[#514163]'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {language === 'es' ? 'Anual' : 'Annual'}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-[#fdda36] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                {language === 'es' ? 'Cargando membresías...' : 'Loading memberships...'}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {memberships.map((membership) => {
                  const MembershipIcon = getMembershipIcon(membership.slug);
                  const isSelected = selectedMembershipId === membership.id;
                  const isCurrent = currentMembership?.membership_id === membership.id;
                  const membershipName = (language === 'es' ? membership.name_es : membership.name_en) || membership.name;
                  const membershipDesc = (language === 'es' ? membership.description_es : membership.description_en) || membership.description;

                  return (
                    <button
                      key={membership.id}
                      onClick={() => setSelectedMembershipId(membership.id)}
                      disabled={isCurrent}
                      className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? 'border-[#fdda36] shadow-lg bg-[#fdda36]/10'
                          : isCurrent
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20 cursor-not-allowed opacity-60'
                          : 'border-gray-200 dark:border-gray-700 hover:border-[#514163] hover:shadow-md'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#fdda36] rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-[#514163]" />
                        </div>
                      )}
                      {isCurrent && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div className={`w-12 h-12 bg-gradient-to-br ${getMembershipColor(membership.slug)} rounded-lg flex items-center justify-center text-white mb-3`}>
                        <MembershipIcon className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-gray-900 dark:text-white mb-1">
                        {membershipName}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {membershipDesc}
                      </p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        ${billingCycle === 'monthly' ? membership.price_monthly : membership.price_annual}
                        <span className="text-sm text-gray-600 dark:text-gray-400 font-normal">
                          /{billingCycle === 'monthly'
                            ? language === 'es' ? 'mes' : 'mo'
                            : language === 'es' ? 'año' : 'yr'}
                        </span>
                      </p>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleChangeMembership}
                disabled={!selectedMembershipId || processing}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#fdda36] text-[#514163] rounded-lg font-bold hover:bg-[#ffd51a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {language === 'es' ? 'Procesando...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    <Crown className="w-5 h-5" />
                    {language === 'es' ? 'Cambiar Membresía' : 'Change Membership'}
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
