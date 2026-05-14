import React, { useState, useEffect } from 'react';
import { Play, History } from 'lucide-react';
import ActivityRecorder from './ActivityRecorder';
import { type EnduranceWorkout } from './EnduranceWorkoutCard';
import { type RacePlan } from '../../utils/fuelSchedule';
import { useActivityRecording } from '../../hooks/useActivityRecording';
import { useToast } from '../../hooks/useToast';

export default function ActivityRecordingSection() {
  const [isRecorderOpen, setIsRecorderOpen] = useState(false);
  const [pendingPlannedWorkout, setPendingPlannedWorkout] = useState<EnduranceWorkout | null>(null);
  const [pendingRacePlan, setPendingRacePlan] = useState<RacePlan | null>(null);
  const { saveActivity } = useActivityRecording();
  const { showToast } = useToast();

  useEffect(() => {
    const handleOpenRecorder = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.plannedWorkout) {
        setPendingPlannedWorkout(detail.plannedWorkout);
        setPendingRacePlan(null);
      } else if (detail?.racePlan) {
        setPendingRacePlan(detail.racePlan);
        setPendingPlannedWorkout(null);
      } else {
        setPendingPlannedWorkout(null);
        setPendingRacePlan(null);
      }
      setIsRecorderOpen(true);
    };

    window.addEventListener('openActivityRecorder', handleOpenRecorder);
    return () => window.removeEventListener('openActivityRecorder', handleOpenRecorder);
  }, []);

  const handleSaveActivity = async (data: any) => {
    try {
      await saveActivity(data);
      showToast({
        message: 'Activity saved successfully!',
        type: 'success',
      });
      // Trigger calendar reload so the activity appears immediately
      window.dispatchEvent(new CustomEvent('workout-history-refresh'));
    } catch (err) {
      showToast({
        message: err instanceof Error ? err.message : 'Failed to save activity',
        type: 'error',
      });
      throw err;
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 border border-neutral-200 dark:border-neutral-700 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
              Record Your Activity
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Track your training sessions with GPS, distance, elevation, and more.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsRecorderOpen(true)}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Play className="w-4 h-4" />
              Start Recording
            </button>
            <button
              onClick={() => {
                const event = new Event('navigate');
                (event as any).detail = 'activity-history';
                window.dispatchEvent(event);
              }}
              className="flex items-center gap-2 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-900 dark:text-white font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <History className="w-4 h-4" />
              View History
            </button>
          </div>
        </div>
      </div>

      <ActivityRecorder
        isOpen={isRecorderOpen}
        onClose={() => {
          setIsRecorderOpen(false);
          setPendingPlannedWorkout(null);
          setPendingRacePlan(null);
        }}
        onSave={handleSaveActivity}
        plannedWorkout={pendingPlannedWorkout}
        racePlan={pendingRacePlan}
      />
    </>
  );
}
