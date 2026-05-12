/**
 * Export/download helpers for .FIT workout files.
 *
 * Handles:
 * - Desktop: direct anchor download
 * - Mobile (iOS/Android): Web Share API with File object (opens share sheet)
 * - Fallback: object URL download for browsers without Share API
 */

import type { EnduranceWorkout } from '../../components/training/EnduranceWorkoutCard';
import { generateFitFile, fitFilename } from './generateFitFile';

export type ExportResult =
  | { success: true }
  | { success: false; error: string };

function isMobile(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function canShareFiles(): boolean {
  return (
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function'
  );
}

/**
 * Export a FIT workout file.
 * - On mobile with Web Share API: opens native share/export sheet
 * - Otherwise: triggers browser download
 */
export async function exportFitWorkout(workout: EnduranceWorkout): Promise<ExportResult> {
  try {
    const blob     = generateFitFile(workout);
    const filename = fitFilename(workout);

    // ── Mobile share sheet ─────────────────────────────────────────────────
    if (isMobile() && canShareFiles()) {
      const file = new File([blob], filename, { type: 'application/octet-stream' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: workout.name,
        });
        return { success: true };
      }
    }

    // ── Desktop / fallback download ────────────────────────────────────────
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Revoke after a short delay to allow download to start
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    return { success: true };
  } catch (err: any) {
    // User cancelled share sheet – not an error
    if (err?.name === 'AbortError') return { success: true };
    return { success: false, error: err?.message ?? 'FIT export failed' };
  }
}
