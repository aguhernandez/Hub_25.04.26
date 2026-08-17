import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface DigestData {
  athleteId: string;
  weekStart: string;
  weekEnd: string;
  trainingsCompleted: number;
  trainingsMissed: number;
  avgRpe?: number;
  avgRir?: number;
  totalWeightLifted?: number;
  totalDistance?: number;
  totalCalories?: number;
  goalsUpdated: number;
  measurementsUpdated: number;
  coachNotes?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate last week date range
    const today = new Date();
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() - today.getDay()); // Last Sunday
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6); // Previous Monday

    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    // Get all athletes
    const { data: athletes, error: athletesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, assigned_trainer_id')
      .eq('role', 'athlete');

    if (athletesError) throw athletesError;

    const results = [];

    for (const athlete of athletes || []) {
      // Get training data for the week
      const { data: workouts } = await supabase
        .from('athlete_workouts')
        .select('status')
        .eq('athlete_id', athlete.id)
        .gte('scheduled_date', weekStartStr)
        .lte('scheduled_date', weekEndStr);

      const trainingsCompleted = workouts?.filter(w => w.status === 'completed').length || 0;
      const trainingsMissed = workouts?.filter(w => w.status === 'skipped').length || 0;

      // Get anthropometry measurements
      const { data: measurements } = await supabase
        .from('anthropometry_measurements')
        .select('id')
        .eq('user_id', athlete.id)
        .gte('measurement_date', weekStartStr)
        .lte('measurement_date', weekEndStr);

      const measurementsUpdated = measurements?.length || 0;

      // Get goals updates
      const { data: goalUpdates } = await supabase
        .from('athlete_profile_details')
        .select('updated_at')
        .eq('athlete_id', athlete.id)
        .gte('updated_at', weekStartStr)
        .lte('updated_at', weekEndStr);

      const goalsUpdated = goalUpdates?.length || 0;

      // Get coach notes if available
      let coachNotes = '';
      if (athlete.assigned_trainer_id) {
        const { data: notes } = await supabase
          .from('coach_technique_notes')
          .select('notes')
          .eq('athlete_id', athlete.id)
          .eq('coach_id', athlete.assigned_trainer_id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (notes && notes.length > 0) {
          coachNotes = notes[0].notes;
        }
      }

      // Create digest record
      const { error: digestError } = await supabase
        .from('weekly_performance_digests')
        .insert({
          athlete_id: athlete.id,
          week_start_date: weekStartStr,
          week_end_date: weekEndStr,
          trainings_completed: trainingsCompleted,
          trainings_missed: trainingsMissed,
          goals_updated: goalsUpdated,
          measurements_updated: measurementsUpdated,
          coach_notes: coachNotes,
          digest_data: {
            athlete_name: athlete.full_name,
          },
        });

      if (digestError) {
        console.error(`Error creating digest for ${athlete.id}:`, digestError);
        continue;
      }

      // Get user notification preferences
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('digest_in_app, digest_email, email_consent')
        .eq('user_id', athlete.id)
        .maybeSingle();

      // Create in-app notification if enabled
      if (!prefs || prefs.digest_in_app !== false) {
        const message = `Week ${weekStartStr} to ${weekEndStr}: ${trainingsCompleted} trainings completed, ${trainingsMissed} missed. ${measurementsUpdated} new measurements.`;

        await supabase.from('notifications').insert({
          user_id: athlete.id,
          type: 'system',
          title: 'Weekly Performance Summary',
          message: message,
          delivery_method: 'in_app',
          digest_data: {
            week_start: weekStartStr,
            week_end: weekEndStr,
            trainings_completed: trainingsCompleted,
            trainings_missed: trainingsMissed,
          },
        });
      }

      // Send email if enabled and consented
      if (prefs?.digest_email && prefs?.email_consent && athlete.email) {
        // Call email service (Brevo)
        try {
          await supabase.functions.invoke('brevo-send-email', {
            body: {
              to: athlete.email,
              subject: 'Your Weekly Performance Summary',
              htmlContent: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background: linear-gradient(to right, #fdda36, #ffd51a); padding: 20px; text-align: center;">
                    <h1 style="color: #514163; margin: 0;">Weekly Performance Summary</h1>
                  </div>
                  <div style="padding: 20px; background: #f9f9f9;">
                    <h2 style="color: #514163;">Hello ${athlete.full_name},</h2>
                    <p>Here's your performance summary for ${weekStartStr} to ${weekEndStr}:</p>
                    <ul>
                      <li>✅ Trainings completed: <strong>${trainingsCompleted}</strong></li>
                      <li>❌ Trainings missed: <strong>${trainingsMissed}</strong></li>
                      <li>📊 New measurements: <strong>${measurementsUpdated}</strong></li>
                      <li>🎯 Goals updated: <strong>${goalsUpdated}</strong></li>
                    </ul>
                    ${coachNotes ? `<div style="background: #fff; padding: 15px; border-left: 4px solid #fdda36; margin: 20px 0;">
                      <p style="margin: 0; font-weight: bold; color: #514163;">Coach Notes:</p>
                      <p style="margin: 5px 0 0 0;">${coachNotes}</p>
                    </div>` : ''}
                    <p>Keep up the great work!</p>
                  </div>
                  <div style="background: #514163; color: white; padding: 15px; text-align: center; font-size: 12px;">
                    <p>© Asciende.pro - Your Performance Platform</p>
                  </div>
                </div>
              `,
            },
          });
        } catch (emailError) {
          console.error(`Error sending email to ${athlete.email}:`, emailError);
        }
      }

      results.push({
        athleteId: athlete.id,
        athleteName: athlete.full_name,
        trainingsCompleted,
        trainingsMissed,
        measurementsUpdated,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        weekStart: weekStartStr,
        weekEnd: weekEndStr,
        digestsGenerated: results.length,
        results,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error generating weekly digest:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});