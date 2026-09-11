import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export type ServiceType = 'nutrition' | 'training';
export type ServiceAccessStatus = 'active' | 'restricted' | 'blocked' | 'no_service' | 'loading';

interface AccessResult {
  status: ServiceAccessStatus;
  hasActiveService: boolean;
  hasPendingPayment: boolean;
  loading: boolean;
}

export function useProfessionalServiceAccess(serviceType: ServiceType): AccessResult {
  const { profile } = useAuth();
  const [status, setStatus] = useState<ServiceAccessStatus>('loading');
  const [hasPendingPayment, setHasPendingPayment] = useState(false);

  useEffect(() => {
    if (!profile?.id) {
      setStatus('no_service');
      return;
    }

    let cancelled = false;

    const checkAccess = async () => {
      const professionalId = serviceType === 'nutrition'
        ? profile.assigned_nutritionist_id
        : profile.assigned_trainer_id;

      if (!professionalId) {
        if (!cancelled) setStatus('no_service');
        return;
      }

      const { data } = await supabase
        .from('service_enrollments')
        .select('status, payment_status')
        .eq('athlete_id', profile.id)
        .eq('professional_id', professionalId)
        .in('status', ['active', 'restricted', 'blocked', 'pending_payment', 'payment_due', 'overdue'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (cancelled) return;

      if (!data || data.length === 0) {
        setStatus('no_service');
        return;
      }

      const enrollment = data[0];
      setHasPendingPayment(
        enrollment.payment_status === 'pending_confirmation' ||
        enrollment.status === 'pending_payment' ||
        enrollment.status === 'payment_due'
      );

      if (enrollment.status === 'active') {
        setStatus('active');
      } else if (enrollment.status === 'restricted' || enrollment.status === 'blocked') {
        setStatus(enrollment.status as ServiceAccessStatus);
      } else {
        setStatus('restricted');
      }
    };

    checkAccess();
    return () => { cancelled = true; };
  }, [profile?.id, profile?.assigned_nutritionist_id, profile?.assigned_trainer_id, serviceType]);

  return {
    status,
    hasActiveService: status === 'active',
    hasPendingPayment,
    loading: status === 'loading',
  };
}
