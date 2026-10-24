import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ session: {} as Record<string, unknown>, reps: [] as Record<string, unknown>[], results: [] as Record<string, unknown>[], saves: 0, failReps: false, headers: 0 }));
vi.mock('../src/contexts/AuthContext', () => { const user = {id:'athlete'}; return {useAuth: () => ({user})}; });
vi.mock('../src/contexts/ThemeContext', () => ({ useTheme: () => ({ isDark: true }) }));
vi.mock('../src/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'es' }) }));
vi.mock('../src/utils/cameraPermission', () => ({ requestCameraPermission: vi.fn() }));
vi.mock('../src/components/training/barvelocity/BarVelocityHistory', () => ({ default: () => null }));
vi.mock('../src/components/training/barvelocity/LVProfilePanel', () => ({ default: ({loadKg}: {loadKg: number}) => <span data-testid="profile-load">{loadKg}</span> }));
vi.mock('../src/components/training/barvelocity/VBTLoadPrescriptionPanel', () => ({ default: ({onLoadChange}: {onLoadChange: (n:number)=>void}) => <button onClick={()=>onLoadChange(85)}>Aplicar 85</button> }));
vi.mock('../src/components/training/barvelocity/BarVelocityResultsPanel', () => ({ default: ({reps}: {reps: Record<string, unknown>[]}) => {state.results = reps; return null;} }));
vi.mock('../src/lib/supabase', () => ({ supabase: {
 rpc: async (_name: string, args: {p_session: Record<string, unknown>; p_reps: Record<string, unknown>[]}) => { if(state.failReps) return {data:null,error:new Error('rep insert failed')}; state.headers = 1; state.session = args.p_session; state.reps = args.p_reps; state.saves++; return {data:'saved-id', error:null}; },
 from: (table: string) => ({ insert: (rows: Record<string, unknown> | Record<string, unknown>[]) => {
 if(table.endsWith('sessions')) { state.headers++; state.session = rows as Record<string, unknown>; state.saves++; } else state.reps = rows as Record<string, unknown>[];
 return { select: () => ({single: async () => ({data: {id:'saved-id'}, error: null})}), then: (resolve: (v:unknown)=>void) => resolve({error:state.failReps ? new Error('rep insert failed') : null}) };
 } })
} }));
import BarVelocityTracker from '../src/components/training/barvelocity/BarVelocityTracker';
afterEach(() => {cleanup(); state.saves = 0; state.session = {}; state.reps = []; state.results = []; state.failReps = false; state.headers = 0;});
function start() {
 render(<BarVelocityTracker onClose={()=>{}} />);
 fireEvent.change(screen.getByPlaceholderText('ej: 100'), {target: {value:'80'}});
 fireEvent.change(screen.getByPlaceholderText('ej: Sentadilla, Press banca...'), {target: {value:'squat'}});
 fireEvent.click(screen.getByText('Manual'));
 fireEvent.click(screen.getByRole('button', {name:'Ingreso manual de velocidades'}));
}
function add() {
 fireEvent.change(screen.getByPlaceholderText('ej: 0.75'), {target: {value:'.6'}});
 fireEvent.click(screen.getByText('Agregar rep'));
}
it('3: applying 85 preserves performed 80 for profile/save; next set starts at 85', async () => {
 start(); add(); fireEvent.click(screen.getByText('Aplicar 85'));
 expect(screen.getByTestId('profile-load').textContent).toBe('80');
 fireEvent.click(screen.getByRole('button', {name:/Finalizar serie/})); fireEvent.click(screen.getByText('Guardar serie'));
 await waitFor(()=>expect(screen.getByText('Serie guardada')).toBeTruthy());
 expect(state.session.load_kg).toBe(80);
 fireEvent.click(screen.getByText('Nueva serie'));
 expect((screen.getByPlaceholderText('ej: 100') as HTMLInputElement).value).toBe('85');
});
it('4: manual reps persist only mean velocity, with provenance and no synthetic metrics/curve', async () => {
 start(); add(); fireEvent.click(screen.getByRole('button', {name:/Finalizar serie/}));
 expect(state.results[0].peakVelocityMs).toBeNull();
 fireEvent.click(screen.getByText('Guardar serie'));
 await waitFor(()=>expect(screen.getByText('Serie guardada')).toBeTruthy());
 expect(state.session.source).toBe('manual'); expect(state.session.peak_velocity_ms).toBeNull();
 expect(state.session.fps).toBeNull();
 expect(state.reps[0]).toMatchObject({ source:'manual', mean_concentric_velocity_ms:.6, peak_velocity_ms:null, mean_eccentric_velocity_ms:null, concentric_duration_ms:null, eccentric_duration_ms:null, displacement_mm:null, estimated_power_w:null, velocity_samples:null, timestamps_ms:null });
});
it('5 client: edited data is unsaved and a new save keeps the same client session id', async () => {
 start(); add(); fireEvent.click(screen.getByRole('button', {name:/Finalizar serie/})); fireEvent.click(screen.getByText('Guardar serie'));
 await waitFor(()=>expect(screen.getByText('Serie guardada')).toBeTruthy());
 const id = state.session.client_session_id; expect(id).toBeTruthy();
 fireEvent.change(screen.getByPlaceholderText('Observaciones, RPE, condiciones...'), {target:{value:'edited'}});
 expect(screen.queryByText('Serie guardada')).toBeNull();
 fireEvent.click(screen.getByText('Guardar serie'));
 await waitFor(()=>expect(state.saves).toBe(2));
 expect(state.session.client_session_id).toBe(id);
});

it('5 client: failed rep insert leaves no header and retry does not duplicate', async () => {
 start(); add(); fireEvent.click(screen.getByRole('button', {name:/Finalizar serie/}));
 state.failReps = true; fireEvent.click(screen.getByText('Guardar serie'));
 await waitFor(()=>expect(screen.getByText('Error al guardar. Intenta de nuevo.')).toBeTruthy());
 expect(state.headers).toBe(0);
 state.failReps = false; fireEvent.click(screen.getByText('Guardar serie'));
 await waitFor(()=>expect(screen.getByText('Serie guardada')).toBeTruthy());
 expect(state.headers).toBe(1);
});
