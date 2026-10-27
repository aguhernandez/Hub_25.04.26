import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ session: {} as Record<string, unknown>, reps: [] as Record<string, unknown>[], results: [] as Record<string, unknown>[], saves: 0, failReps: false, headers: 0 }));
vi.mock('../src/contexts/AuthContext', () => { const user = {id:'athlete'}; return {useAuth: () => ({user})}; });
vi.mock('../src/contexts/ThemeContext', () => ({ useTheme: () => ({ isDark: true }) }));
vi.mock('../src/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'es' }) }));
vi.mock('../src/utils/cameraPermission', () => ({ requestCameraPermission: vi.fn() }));
vi.mock('../src/components/training/barvelocity/BarVelocityHistory', () => ({ default: () => null }));
vi.mock('../src/components/training/barvelocity/LVProfilePanel', () => ({ default: ({loadKg}: {loadKg: number}) => <span data-testid="profile-load">{loadKg}</span> }));
vi.mock('../src/components/training/barvelocity/VBTLoadPrescriptionPanel', () => ({ default: ({onLoadChange}: {onLoadChange: (n:number)=>void}) => <button onClick={()=>onLoadChange(85)}>Aplicar 85</button> }));
vi.mock('../src/components/training/barvelocity/BarVelocityResultsPanel', () => ({ default: ({reps}: {reps: Record<string, unknown>[]}) => {state.results = reps; return null;} }));
vi.mock('../src/components/training/barvelocity/BarVideoAnalyzer', () => ({
  analyzeBarVideo: vi.fn(async () => [{
    source: 'video', repNumber: 1, meanConcentricVelocityMs: 0.6,
    peakVelocityMs: 0.72, meanEccentricVelocityMs: 0.35,
    concentricDurationMs: 420, eccentricDurationMs: 510,
    displacementMm: 420, estimatedPowerW: 470,
    velocitySamples: [{ timeMs: 0, velocityMs: 0.6, positionPx: 100 }],
    timestampsMs: [0, 420], isValid: true,
  }]),
  analyzeBarStream: vi.fn(() => () => undefined),
}));
vi.mock('../src/lib/supabase', () => ({ supabase: {
 rpc: async (_name: string, args: {p_session: Record<string, unknown>; p_reps: Record<string, unknown>[]}) => { if(state.failReps) return {data:null,error:new Error('rep insert failed')}; state.headers = 1; state.session = args.p_session; state.reps = args.p_reps; state.saves++; return {data:'saved-id', error:null}; },
 from: (table: string) => ({ insert: (rows: Record<string, unknown> | Record<string, unknown>[]) => {
 if(table.endsWith('sessions')) { state.headers++; state.session = rows as Record<string, unknown>; state.saves++; } else state.reps = rows as Record<string, unknown>[];
 return { select: () => ({single: async () => ({data: {id:'saved-id'}, error: null})}), then: (resolve: (v:unknown)=>void) => resolve({error:state.failReps ? new Error('rep insert failed') : null}) };
 } })
} }));
import BarVelocityTracker from '../src/components/training/barvelocity/BarVelocityTracker';
beforeEach(() => {
 Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:synthetic') });
 Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
 HTMLMediaElement.prototype.load = vi.fn();
 HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
 HTMLMediaElement.prototype.pause = vi.fn();
});
afterEach(() => {cleanup(); localStorage.clear(); state.saves = 0; state.session = {}; state.reps = []; state.results = []; state.failReps = false; state.headers = 0;});
async function start() {
 localStorage.setItem('asciende-vbt-calibration-v1', JSON.stringify({
   barTopY: 100, barBottomY: 110, barDiameterPx: 10, pixelsPerMm: 0.2,
   centerX: 320, centerY: 105, radiusPx: 90, processingWidth: 640, processingHeight: 360,
 }));
 render(<BarVelocityTracker onClose={()=>{}} />);
 fireEvent.change(screen.getByPlaceholderText('ej: 100'), {target: {value:'80'}});
 fireEvent.change(screen.getByPlaceholderText('ej: Sentadilla, Press banca...'), {target: {value:'squat'}});
 const input = document.querySelector('input[type="file"]');
 if (!(input instanceof HTMLInputElement)) throw new Error('video input not found');
 fireEvent.change(input, {target: {files: [new File(['synthetic'], 'rep.mp4', {type: 'video/mp4'})]}});
 fireEvent.click(await screen.findByRole('button', {name: 'Analizar video'}));
 await waitFor(() => expect(screen.getByText('Guardar serie')).toBeTruthy());
}
it('3: applying 85 preserves performed 80 for profile/save; next set starts at 85', async () => {
 await start(); fireEvent.click(screen.getByText('Aplicar 85'));
 expect(screen.getByTestId('profile-load').textContent).toBe('80');
 fireEvent.click(screen.getByText('Guardar serie'));
 await waitFor(()=>expect(screen.getByText('Serie guardada')).toBeTruthy());
 expect(state.session.load_kg).toBe(80);
 fireEvent.click(screen.getByText('Nueva serie'));
 expect((screen.getByPlaceholderText('ej: 100') as HTMLInputElement).value).toBe('85');
});
it('4: video reps persist measured metrics and video provenance', async () => {
 await start(); fireEvent.click(screen.getByRole('button', {name:/Guardar serie/}));
 await waitFor(()=>expect(screen.getByText('Serie guardada')).toBeTruthy());
 expect(state.session.source).toBe('video');
 expect(state.reps[0]).toMatchObject({ source:'video', mean_concentric_velocity_ms:.6, peak_velocity_ms:.72, displacement_mm:420 });
});
it('4b: manual velocity entry is no longer exposed', async () => {
 render(<BarVelocityTracker onClose={()=>{}} />);
 expect(screen.queryByText('Manual')).toBeNull();
 expect(screen.queryByRole('button', {name:/Ingreso manual/i})).toBeNull();
});
it('5 client: edited data is unsaved and a new save keeps the same client session id', async () => {
 await start(); fireEvent.click(screen.getByRole('button', {name:/Guardar serie/}));
 await waitFor(()=>expect(screen.getByText('Serie guardada')).toBeTruthy());
 const id = state.session.client_session_id; expect(id).toBeTruthy();
 fireEvent.change(screen.getByPlaceholderText('Observaciones, RPE, condiciones...'), {target:{value:'edited'}});
 expect(screen.queryByText('Serie guardada')).toBeNull();
 fireEvent.click(screen.getByText('Guardar serie'));
 await waitFor(()=>expect(state.saves).toBe(2));
 expect(state.session.client_session_id).toBe(id);
});

it('5 client: failed rep insert leaves no header and retry does not duplicate', async () => {
 await start();
 state.failReps = true; fireEvent.click(screen.getByText('Guardar serie'));
 await waitFor(()=>expect(screen.getByText('Error al guardar. Intenta de nuevo.')).toBeTruthy());
 expect(state.headers).toBe(0);
 state.failReps = false; fireEvent.click(screen.getByText('Guardar serie'));
 await waitFor(()=>expect(screen.getByText('Serie guardada')).toBeTruthy());
 expect(state.headers).toBe(1);
});
