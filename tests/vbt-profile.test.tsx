import React, {useState} from 'react';
import type {LV1RMEstimate} from '../src/components/training/barvelocity/LVProfile';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[], chart: vi.fn() }));
vi.mock('../src/contexts/AuthContext', () => { const user = {id:'athlete'}; return {useAuth: () => ({user})}; });
vi.mock('../src/contexts/ThemeContext', () => ({ useTheme: () => ({ isDark: true }) }));
vi.mock('../src/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'es' }) }));
vi.mock('../src/lib/supabase', () => ({ supabase: { from: () => {
 const q = { select: () => q, eq: () => q, ilike: () => q, not: () => q, order: () => q, limit: () => Promise.resolve({ data: state.rows }) }; return q;
} } }));
vi.mock('../src/components/training/barvelocity/LoadVelocityProfileChart', () => ({ default: (props: unknown) => { state.chart(props); return null; } }));
import LVProfilePanel from '../src/components/training/barvelocity/LVProfilePanel';
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const rows = [40, 60, 80, 100].map(load => ({ load_kg: load, mean_concentric_velocity_ms: 1.4 - load * .01, session_date: '2026-10-24', exercise_name: 'squat' }));
it('1: four saved sets become four finite historical points; invalid values are excluded', async () => {
 state.rows = [...rows, { ...rows[0], load_kg: NaN }, { ...rows[0], mean_concentric_velocity_ms: null }];
 render(<LVProfilePanel currentReps={[]} loadKg={0} exerciseName="squat" />);
 await waitFor(() => {
  const props = state.chart.mock.lastCall?.[0] as { points: {loadKg: number; meanVelocityMs: number}[] };
  expect(props?.points).toHaveLength(4);
  expect(props.points.every(p => Number.isFinite(p.loadKg) && Number.isFinite(p.meanVelocityMs))).toBe(true);
 });
});
it('2: equal estimates notify once across parent and equivalent-data rerenders', async () => {
 state.rows = rows;
 const notify = vi.fn();
 const props = { currentReps: [], loadKg: 80, exerciseName: 'squat', onEstimateChange: notify };
 const view = render(<LVProfilePanel {...props} />);
 await waitFor(() => expect(notify.mock.calls.some(([est]) => est !== null)).toBe(true));
 notify.mockClear();
 view.rerender(<LVProfilePanel {...props} currentReps={[]} />);
 expect(notify).not.toHaveBeenCalled();
 view.rerender(<LVProfilePanel {...props} currentReps={[]} onEstimateChange={value => notify(value)} />);
 expect(notify).not.toHaveBeenCalled();
});

it('2 integration: a real parent setter settles at one non-null notification', async()=>{
 state.rows = rows; const notify=vi.fn();
 function Parent() {
  const [estimate,setEstimate]=useState<LV1RMEstimate|null>(null);
  return <><span data-testid="parent-estimate">{estimate?.estimated1RMkg}</span><LVProfilePanel currentReps={[]} loadKg={80} exerciseName="squat" onEstimateChange={value=>{notify(value);setEstimate(value);}}/></>;
 }
 const view=render(<Parent/>);
 await waitFor(()=>expect(view.getByTestId('parent-estimate').textContent).toBe('110'));
 expect(notify.mock.calls.filter(([value])=>value!==null)).toHaveLength(1);
});
