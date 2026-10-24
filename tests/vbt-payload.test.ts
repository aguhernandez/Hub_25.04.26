import {expect, it} from 'vitest';
import {buildBarSessionPayload} from '../src/components/training/barvelocity/BarSessionPersistence';
import type {BarRep} from '../src/components/training/barvelocity/BarVelocityTypes';
it('video payload preserves measured data and converts durations to integer milliseconds',()=>{
 const rep: BarRep={source:'video',repNumber:1,meanConcentricVelocityMs:.6,peakVelocityMs:.9,meanEccentricVelocityMs:.4,concentricDurationMs:600.42,eccentricDurationMs:900.7,displacementMm:400,estimatedPowerW:470,velocitySamples:[{timeMs:1,velocityMs:.6,positionPx:10}],timestampsMs:[1],isValid:true};
 const payload=buildBarSessionPayload({clientSessionId:'test',sessionDate:'2026-10-24',exerciseName:'squat',loadKg:80,notes:'',fps:59.94,source:'video',reps:[rep]});
 expect(payload.p_session).toMatchObject({source:'video',load_kg:80,peak_velocity_ms:.9,fps:60});
 expect(payload.p_reps[0]).toMatchObject({source:'video',peak_velocity_ms:.9,concentric_duration_ms:600,eccentric_duration_ms:901,velocity_samples:rep.velocitySamples});
});
