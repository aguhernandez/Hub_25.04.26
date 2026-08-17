import type { EnduranceWorkout } from '../../components/training/EnduranceWorkoutCard';
import { generateFitFile, fitFilename } from './generateFitFile';

export type ExportResult =
  | { success: true; method: string }
  | { success: false; error: string };

function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}

function isIOS(): boolean {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href          = url;
  link.download      = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Export a FIT workout file with robust cross-platform handling.
 *
 * Priority order:
 *   1. iOS  → Web Share API (opens share sheet reliably)
 *   2. Android → direct download (share API is unreliable for binary files)
 *   3. Desktop → direct download
 *
 * If iOS share throws (not AbortError), falls back to download.
 * Android always uses download — avoids the navigator.share binary file bug.
 */
export async function exportFitWorkout(workout: EnduranceWorkout): Promise<ExportResult> {
  let blob: Blob;
  let filename: string;

  // ── Step 1: Generate FIT file ──────────────────────────────────────────────
  try {
    blob     = generateFitFile(workout);
    filename = fitFilename(workout);
    console.log('[FIT Export] Generation OK —', filename, blob.size, 'bytes');
  } catch (genErr: any) {
    console.error('[FIT Export] Generation FAILED:', genErr);
    return { success: false, error: `FIT generation failed: ${genErr?.message ?? genErr}` };
  }

  // ── Step 2: Build File object ──────────────────────────────────────────────
  let file: File;
  try {
    file = new File([blob], filename, { type: 'application/octet-stream' });
    console.log('[FIT Export] File object created —', file.name, file.size, 'bytes', file.type);
  } catch (fileErr: any) {
    console.warn('[FIT Export] File constructor failed, using Blob fallback:', fileErr);
    // Some old Android WebViews lack File constructor — fall straight to download
    triggerDownload(blob, filename);
    return { success: true, method: 'download-blob-fallback' };
  }

  // ── Step 3: Android → always download, skip share ─────────────────────────
  if (isAndroid()) {
    console.log('[FIT Export] Android detected — using download fallback directly');
    try {
      triggerDownload(file, filename);
      return { success: true, method: 'download-android' };
    } catch (dlErr: any) {
      console.error('[FIT Export] Android download failed:', dlErr);
      return { success: false, error: `Download failed: ${dlErr?.message ?? dlErr}` };
    }
  }

  // ── Step 4: iOS / other mobile → try Web Share API ────────────────────────
  if (isIOS()) {
    const shareAvailable = typeof navigator.share === 'function';
    const canShare       = shareAvailable && typeof navigator.canShare === 'function'
                             ? navigator.canShare({ files: [file] })
                             : false;

    console.log('[FIT Export] iOS — navigator.share:', shareAvailable, '| canShare:', canShare);

    if (canShare) {
      try {
        await navigator.share({ files: [file], title: workout.name });
        console.log('[FIT Export] iOS share succeeded');
        return { success: true, method: 'share-ios' };
      } catch (shareErr: any) {
        if (shareErr?.name === 'AbortError') {
          console.log('[FIT Export] iOS share cancelled by user');
          return { success: true, method: 'share-ios-cancelled' };
        }
        // Share threw unexpectedly — fall through to download
        console.warn('[FIT Export] iOS share threw, falling back to download:', shareErr);
      }
    }

    // iOS download fallback
    triggerDownload(file, filename);
    return { success: true, method: 'download-ios-fallback' };
  }

  // ── Step 5: Desktop → direct download ─────────────────────────────────────
  console.log('[FIT Export] Desktop — triggering download');
  try {
    triggerDownload(file, filename);
    return { success: true, method: 'download-desktop' };
  } catch (dlErr: any) {
    console.error('[FIT Export] Desktop download failed:', dlErr);
    return { success: false, error: `Download failed: ${dlErr?.message ?? dlErr}` };
  }
}
