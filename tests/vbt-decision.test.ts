import { describe, expect, it } from 'vitest';
import { evaluateSet, repFeedback } from '../src/components/training/barvelocity/VBTLoadPrescription';
import { identifyExercise } from '../src/components/training/barvelocity/LVProfile';
import { getVBTZone } from '../src/components/training/barvelocity/BarVelocityTypes';

describe('VBT decision engine', () => {
  it('applies modifier before deciding and reports adjustment from final load', () => {
    const result = evaluateSet(0.4, 0.4, 0, 100, 150, 'strength', 0.9);
    expect(result.nextLoadKg).toBe(90);
    expect(result.decision).toBe('maintain');
    expect(result.adjustmentPct).toBe(0);
  });

  it('does not impose a 20 kg floor above a small 1RM', () => {
    const result = evaluateSet(0.2, 0.2, 0, 15, 15, 'strength', 1);
    expect(result.nextLoadKg).toBeLessThanOrEqual(15.75);
  });

  it('uses best repetition as the sole loss reference', () => {
    expect(repFeedback([
      { meanConcentricVelocityMs: 0.6, isValid: true },
      { meanConcentricVelocityMs: 0.8, isValid: true },
      { meanConcentricVelocityMs: 0.6, isValid: true },
    ], 'strength', 'es').velocityLossPct).toBeCloseTo(25);
  });

  it('identifies Romanian deadlift before deadlift and returns null out of zone', () => {
    expect(identifyExercise('Romanian Deadlift').exerciseId).toBe('romanian_deadlift');
    expect(identifyExercise('Romanian Deadlift').mvt).toBe(0.14);
    expect(getVBTZone(3)).toBeNull();
  });
});
