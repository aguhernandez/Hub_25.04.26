import { supabase } from '../lib/supabase';

/**
 * Updates ATP weekly aggregates when a workout is completed
 * This should be called after any training session is logged
 */
export async function updateATPComplianceForWorkout(
  athleteId: string,
  workoutDate: string
): Promise<void> {
  try {
    // Find active ATP for this athlete
    const { data: atps, error: atpError } = await supabase
      .from('annual_training_plans')
      .select('id, start_date')
      .eq('athlete_id', athleteId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (atpError) throw atpError;
    if (!atps || atps.length === 0) return; // No active ATP

    const atp = atps[0];
    const workoutDateObj = new Date(workoutDate);
    const atpStartDate = new Date(atp.start_date);

    // Calculate week number
    const diffTime = workoutDateObj.getTime() - atpStartDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(diffDays / 7) + 1;

    if (weekNumber < 1 || weekNumber > 52) return; // Outside ATP range

    // Call the compliance calculation function
    const { error: calcError } = await supabase.rpc('calculate_weekly_compliance', {
      p_atp_id: atp.id,
      p_week_number: weekNumber
    });

    if (calcError) {
      console.error('Error calculating compliance:', calcError);
      return;
    }

    // Generate alerts if needed
    const { error: alertError } = await supabase.rpc('generate_compliance_alerts', {
      p_atp_id: atp.id,
      p_week_number: weekNumber
    });

    if (alertError) {
      console.error('Error generating alerts:', alertError);
    }

  } catch (error) {
    console.error('Error updating ATP compliance:', error);
  }
}

/**
 * Recalculates all weeks for an ATP
 * Useful when ATP is modified or for batch updates
 */
export async function recalculateATPCompliance(
  atpId: string,
  startWeek: number = 1,
  endWeek: number = 52
): Promise<void> {
  try {
    for (let week = startWeek; week <= endWeek; week++) {
      await supabase.rpc('calculate_weekly_compliance', {
        p_atp_id: atpId,
        p_week_number: week
      });

      await supabase.rpc('generate_compliance_alerts', {
        p_atp_id: atpId,
        p_week_number: week
      });

      // Small delay to avoid rate limiting
      if (week % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  } catch (error) {
    console.error('Error recalculating ATP compliance:', error);
    throw error;
  }
}

/**
 * Gets ATP alerts for an athlete
 */
export async function getATPAlerts(
  athleteId: string,
  unreadOnly: boolean = false
): Promise<any[]> {
  try {
    let query = supabase
      .from('atp_compliance_alerts')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('created_at', { ascending: false });

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting ATP alerts:', error);
    return [];
  }
}

/**
 * Marks an alert as read
 */
export async function markAlertAsRead(alertId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('atp_compliance_alerts')
      .update({ read: true })
      .eq('id', alertId);

    if (error) throw error;
  } catch (error) {
    console.error('Error marking alert as read:', error);
  }
}

/**
 * Gets compliance summary for ATP
 */
export async function getATPComplianceSummary(atpId: string): Promise<{
  totalWeeks: number;
  completedWeeks: number;
  avgCompliance: number;
  onTrackWeeks: number;
  underPerformingWeeks: number;
  overPerformingWeeks: number;
}> {
  try {
    const { data, error } = await supabase
      .from('atp_weekly_aggregates')
      .select('*')
      .eq('atp_id', atpId);

    if (error) throw error;
    if (!data || data.length === 0) {
      return {
        totalWeeks: 0,
        completedWeeks: 0,
        avgCompliance: 0,
        onTrackWeeks: 0,
        underPerformingWeeks: 0,
        overPerformingWeeks: 0
      };
    }

    const completedWeeks = data.filter(w => w.actual_sessions > 0);
    const avgCompliance = completedWeeks.length > 0
      ? completedWeeks.reduce((sum, w) => sum + w.compliance_percentage, 0) / completedWeeks.length
      : 0;

    const onTrackWeeks = data.filter(w =>
      w.compliance_percentage >= 95 && w.compliance_percentage <= 105
    ).length;

    const underPerformingWeeks = data.filter(w =>
      w.compliance_percentage < 70 && w.actual_sessions > 0
    ).length;

    const overPerformingWeeks = data.filter(w =>
      w.compliance_percentage > 140
    ).length;

    return {
      totalWeeks: data.length,
      completedWeeks: completedWeeks.length,
      avgCompliance: Math.round(avgCompliance),
      onTrackWeeks,
      underPerformingWeeks,
      overPerformingWeeks
    };
  } catch (error) {
    console.error('Error getting ATP compliance summary:', error);
    return {
      totalWeeks: 0,
      completedWeeks: 0,
      avgCompliance: 0,
      onTrackWeeks: 0,
      underPerformingWeeks: 0,
      overPerformingWeeks: 0
    };
  }
}
