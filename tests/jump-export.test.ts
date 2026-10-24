import { describe, expect, it } from 'vitest';
import { jumpSessionToCsv, JUMP_CSV_COLUMNS } from '../src/components/training/jump/JumpExport';

describe('jump CSV export', () => {
  it('exports one row per attempt and required columns', () => {
    const csv = jumpSessionToCsv({ clientSessionId: 'x', athleteId: 'athlete', sessionDate: '2026-01-01', jumpType: 'dj', bodyMassKg: 75, effectiveFps: 120, source: 'video', algorithmVersion: 'jump-core-1', attempts: [{ index: 0, source: 'video', marks: { contactMs: 100, takeoffMs: 250, landingMs: 750 }, result: null, flags: [], reasons: [] }], saved: false });
    expect(csv.split('\n')).toHaveLength(2); expect(csv).toContain(JUMP_CSV_COLUMNS.join(',')); expect(csv).toContain('dj');
  });
});
