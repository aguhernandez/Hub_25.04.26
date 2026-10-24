import type { JumpSession } from './JumpTypes';

export const JUMP_CSV_COLUMNS = ['athlete','date','type','mass_kg','load_kg','box_cm','hpo_m','onset_ms','contact_ms','takeoff_ms','landing_ms','flight_ms','height_cm','rsi','rsi_mod','force_n','velocity_ms','power_w','effective_fps','source','algorithm_version','flags'] as const;

function csv(value: unknown): string { const text = value === null || value === undefined ? '' : String(value); return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }

export function jumpSessionToCsv(session: JumpSession): string {
  const rows = session.attempts.map((attempt) => [session.athleteId, session.sessionDate, session.jumpType, session.bodyMassKg, session.loadKg ?? '', session.boxCm ?? '', session.hpoM ?? '', attempt.marks.onsetMs ?? '', attempt.marks.contactMs ?? '', attempt.marks.takeoffMs, attempt.marks.landingMs, attempt.result?.flightMs ?? '', attempt.result?.heightCm ?? '', attempt.result?.contactMs ?? '', attempt.result?.rsi ?? '', attempt.result?.rsiMod ?? '', attempt.result?.samozino?.forceN ?? '', attempt.result?.samozino?.velMs ?? '', attempt.result?.samozino?.powerW ?? '', session.effectiveFps, attempt.source, session.algorithmVersion, (attempt.result?.flags ?? attempt.flags).join('|')]);
  return [JUMP_CSV_COLUMNS.join(','), ...rows.map((row) => row.map(csv).join(','))].join('\n');
}

export function downloadJumpCsv(session: JumpSession): void {
  const blob = new Blob([jumpSessionToCsv(session)], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `jump-${session.sessionDate}-${session.jumpType}.csv`; link.click(); URL.revokeObjectURL(link.href);
}
