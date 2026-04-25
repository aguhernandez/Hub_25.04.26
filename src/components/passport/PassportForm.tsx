import { useState } from 'react';
import { Save, ChevronDown, ChevronUp, Activity, User, Dumbbell, Wind, Droplets, Flame } from 'lucide-react';
import type {
  CreatePassportPayload, SportContext, AthleteLevel, PassportSource,
  HydrationProfile, HeatAdaptationProfile, ForceVelocityProfile,
  HeatAdaptationClassification, FVImbalanceDirection,
} from '../../types/biologicalPassport.types';

interface PassportFormProps {
  athleteId: string;
  onSubmit: (payload: CreatePassportPayload) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const SPORT_CONTEXTS: { value: SportContext; label: string }[] = [
  { value: 'cycling', label: 'Cycling' },
  { value: 'running', label: 'Running' },
  { value: 'triathlon', label: 'Triathlon' },
  { value: 'strength', label: 'Strength / Power' },
  { value: 'swimming', label: 'Swimming' },
  { value: 'other', label: 'Other' },
];

const ATHLETE_LEVELS: { value: AthleteLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'elite', label: 'Elite' },
];

const SOURCES: { value: PassportSource; label: string }[] = [
  { value: 'lab', label: 'Lab Test' },
  { value: 'manual', label: 'Manual Entry' },
  { value: 'imported', label: 'Imported' },
];

const HEAT_CLASSIFICATIONS: HeatAdaptationClassification[] = [
  'Insufficient Data', 'Minimal', 'Moderate', 'Good', 'Excellent',
];

const FV_DIRECTIONS: { value: FVImbalanceDirection; label: string }[] = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'force_deficit', label: 'Force Deficit' },
  { value: 'velocity_deficit', label: 'Velocity Deficit' },
];

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, icon, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
      >
        <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200 font-semibold text-sm">
          {icon}
          {title}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>
      {open && <div className="p-4 grid grid-cols-2 gap-4">{children}</div>}
    </div>
  );
}

interface FieldProps {
  label: string;
  unit?: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}

function Field({ label, unit, children, fullWidth }: FieldProps) {
  return (
    <div className={fullWidth ? 'col-span-2' : ''}>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
        {label}{unit && <span className="ml-1 text-gray-400">({unit})</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#fdda36]/50 focus:border-[#fdda36] transition-colors';

export default function PassportForm({ athleteId, onSubmit, onCancel, loading }: PassportFormProps) {
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState<Partial<CreatePassportPayload>>({
    athlete_id: athleteId,
    source: 'manual',
    measurement_date: today,
    sport_context: 'cycling',
  });

  const [hydration, setHydration] = useState<Partial<HydrationProfile>>({ evaluation_date: today });
  const [hydrationEnabled, setHydrationEnabled] = useState(false);

  const [heatAdaptation, setHeatAdaptation] = useState<Partial<HeatAdaptationProfile>>({ evaluation_date: today });
  const [heatEnabled, setHeatEnabled] = useState(false);

  const [forceVelocity, setForceVelocity] = useState<Partial<ForceVelocityProfile>>({ evaluation_date: today, exercise: 'squat', fv_imbalance_direction: 'balanced' });
  const [fvEnabled, setFvEnabled] = useState(false);

  const set = (key: keyof CreatePassportPayload, value: unknown) =>
    setForm(f => ({ ...f, [key]: value }));

  const setH = (key: keyof HydrationProfile, value: unknown) =>
    setHydration(h => ({ ...h, [key]: value }));

  const setHeat = (key: keyof HeatAdaptationProfile, value: unknown) =>
    setHeatAdaptation(h => ({ ...h, [key]: value }));

  const setFV = (key: keyof ForceVelocityProfile, value: unknown) =>
    setForceVelocity(f => ({ ...f, [key]: value }));

  const num = (val: string) => (val === '' ? undefined : parseFloat(val));
  const int = (val: string) => (val === '' ? undefined : parseInt(val));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      ...form,
      athlete_id: athleteId,
      hydration: hydrationEnabled ? (hydration as HydrationProfile) : null,
      heat_adaptation: heatEnabled ? (heatAdaptation as HeatAdaptationProfile) : null,
      force_velocity: fvEnabled ? (forceVelocity as ForceVelocityProfile) : null,
    } as CreatePassportPayload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Meta */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Measurement Date</label>
          <input
            type="date"
            className={inputCls}
            value={form.measurement_date || today}
            onChange={e => set('measurement_date', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Source</label>
          <select className={inputCls} value={form.source} onChange={e => set('source', e.target.value as PassportSource)}>
            {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sport Context</label>
          <select className={inputCls} value={form.sport_context} onChange={e => set('sport_context', e.target.value as SportContext)}>
            {SPORT_CONTEXTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Test Type</label>
          <input
            type="text"
            className={inputCls}
            placeholder="e.g. ramp_test, vo2max_direct"
            value={form.source_test_type || ''}
            onChange={e => set('source_test_type', e.target.value || undefined)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Athlete Level</label>
          <select className={inputCls} value={form.athlete_level || ''} onChange={e => set('athlete_level', e.target.value || undefined)}>
            <option value="">-- Select --</option>
            {ATHLETE_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Training Age (years)</label>
          <input
            type="number"
            min="0"
            step="0.5"
            className={inputCls}
            placeholder="e.g. 3.5"
            value={form.training_age_years ?? ''}
            onChange={e => set('training_age_years', num(e.target.value))}
          />
        </div>
      </div>

      {/* Aerobic / Physiological */}
      <Section title="Aerobic Capacity" icon={<Wind className="w-4 h-4 text-sky-500" />}>
        <Field label="VO2max" unit="ml/kg/min">
          <input type="number" step="0.1" className={inputCls} placeholder="e.g. 62.5"
            value={form.vo2max ?? ''} onChange={e => set('vo2max', num(e.target.value))} />
        </Field>
        <Field label="FTP" unit="watts">
          <input type="number" className={inputCls} placeholder="e.g. 280"
            value={form.ftp_watts ?? ''} onChange={e => set('ftp_watts', num(e.target.value))} />
        </Field>
        <Field label="LT1 Power" unit="watts">
          <input type="number" className={inputCls} placeholder="e.g. 180"
            value={form.lt1_power ?? ''} onChange={e => set('lt1_power', num(e.target.value))} />
        </Field>
        <Field label="LT2 Power" unit="watts">
          <input type="number" className={inputCls} placeholder="e.g. 250"
            value={form.lt2_power ?? ''} onChange={e => set('lt2_power', num(e.target.value))} />
        </Field>
        <Field label="LT1 Heart Rate" unit="bpm">
          <input type="number" className={inputCls} placeholder="e.g. 140"
            value={form.lt1_hr ?? ''} onChange={e => set('lt1_hr', int(e.target.value))} />
        </Field>
        <Field label="LT2 Heart Rate" unit="bpm">
          <input type="number" className={inputCls} placeholder="e.g. 165"
            value={form.lt2_hr ?? ''} onChange={e => set('lt2_hr', int(e.target.value))} />
        </Field>
        <Field label="Critical Power" unit="watts">
          <input type="number" className={inputCls} placeholder="e.g. 270"
            value={form.critical_power ?? ''} onChange={e => set('critical_power', num(e.target.value))} />
        </Field>
        <Field label="Anaerobic Capacity (W')" unit="kJ">
          <input type="number" step="0.1" className={inputCls} placeholder="e.g. 18.5"
            value={form.anaerobic_capacity_kj ?? ''} onChange={e => set('anaerobic_capacity_kj', num(e.target.value))} />
        </Field>
        <Field label="Running Threshold Pace" unit="min/km">
          <input type="text" className={inputCls} placeholder="e.g. 4:30"
            value={form.running_threshold_pace || ''} onChange={e => set('running_threshold_pace', e.target.value || undefined)} />
        </Field>
      </Section>

      {/* Anthropometry */}
      <Section title="Anthropometry" icon={<User className="w-4 h-4 text-emerald-500" />}>
        <Field label="Height" unit="cm">
          <input type="number" step="0.1" className={inputCls} placeholder="e.g. 175"
            value={form.height_cm ?? ''} onChange={e => set('height_cm', num(e.target.value))} />
        </Field>
        <Field label="Body Weight" unit="kg">
          <input type="number" step="0.1" className={inputCls} placeholder="e.g. 72"
            value={form.weight_kg ?? ''} onChange={e => set('weight_kg', num(e.target.value))} />
        </Field>
        <Field label="Body Fat" unit="%">
          <input type="number" step="0.1" className={inputCls} placeholder="e.g. 12.5"
            value={form.body_fat_percent ?? ''} onChange={e => set('body_fat_percent', num(e.target.value))} />
        </Field>
        <Field label="Muscle Mass" unit="kg">
          <input type="number" step="0.1" className={inputCls} placeholder="e.g. 38"
            value={form.muscle_mass_kg ?? ''} onChange={e => set('muscle_mass_kg', num(e.target.value))} />
        </Field>
        <Field label="Lean Mass" unit="kg">
          <input type="number" step="0.1" className={inputCls} placeholder="e.g. 63"
            value={form.lean_mass_kg ?? ''} onChange={e => set('lean_mass_kg', num(e.target.value))} />
        </Field>
        <Field label="Bone Mass" unit="kg">
          <input type="number" step="0.1" className={inputCls} placeholder="e.g. 3.2"
            value={form.bone_mass_kg ?? ''} onChange={e => set('bone_mass_kg', num(e.target.value))} />
        </Field>
      </Section>

      {/* Hydration */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setHydrationEnabled(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
        >
          <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200 font-semibold text-sm">
            <Droplets className="w-4 h-4 text-blue-500" />
            Hydration Profile
            <span className="text-xs font-normal text-gray-400">(lab module)</span>
          </div>
          {hydrationEnabled ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </button>
        {hydrationEnabled && (
          <div className="p-4 grid grid-cols-2 gap-4">
            <Field label="Evaluation Date" fullWidth={false}>
              <input type="date" className={inputCls} value={hydration.evaluation_date || today}
                onChange={e => setH('evaluation_date', e.target.value)} />
            </Field>
            <Field label="Temperature" unit="°C">
              <input type="number" step="0.1" className={inputCls} placeholder="32.0"
                value={hydration.temperature_c ?? ''} onChange={e => setH('temperature_c', num(e.target.value))} />
            </Field>
            <Field label="Humidity" unit="%">
              <input type="number" step="0.1" className={inputCls} placeholder="75.0"
                value={hydration.humidity_percent ?? ''} onChange={e => setH('humidity_percent', num(e.target.value))} />
            </Field>
            <Field label="Sweat Rate" unit="L/h">
              <input type="number" step="0.01" className={inputCls} placeholder="1.45"
                value={hydration.sweat_rate_l_h ?? ''} onChange={e => setH('sweat_rate_l_h', num(e.target.value))} />
            </Field>
            <Field label="Avg Sweat Rate" unit="L/h">
              <input type="number" step="0.01" className={inputCls} placeholder="1.30"
                value={hydration.average_sweat_rate_l_h ?? ''} onChange={e => setH('average_sweat_rate_l_h', num(e.target.value))} />
            </Field>
            <Field label="Dehydration" unit="%">
              <input type="number" step="0.1" className={inputCls} placeholder="2.1"
                value={hydration.percent_dehydration ?? ''} onChange={e => setH('percent_dehydration', num(e.target.value))} />
            </Field>
          </div>
        )}
      </div>

      {/* Heat Adaptation */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setHeatEnabled(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
        >
          <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200 font-semibold text-sm">
            <Flame className="w-4 h-4 text-orange-500" />
            Heat Adaptation
            <span className="text-xs font-normal text-gray-400">(lab module)</span>
          </div>
          {heatEnabled ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </button>
        {heatEnabled && (
          <div className="p-4 grid grid-cols-2 gap-4">
            <Field label="Evaluation Date">
              <input type="date" className={inputCls} value={heatAdaptation.evaluation_date || today}
                onChange={e => setHeat('evaluation_date', e.target.value)} />
            </Field>
            <Field label="Adaptation Score" unit="0-100">
              <input type="number" step="0.1" min="0" max="100" className={inputCls} placeholder="72.0"
                value={heatAdaptation.heat_adaptation_score ?? ''} onChange={e => setHeat('heat_adaptation_score', num(e.target.value))} />
            </Field>
            <Field label="Total Sessions">
              <input type="number" min="0" className={inputCls} placeholder="8"
                value={heatAdaptation.total_sessions ?? ''} onChange={e => setHeat('total_sessions', int(e.target.value))} />
            </Field>
            <Field label="Classification">
              <select className={inputCls} value={heatAdaptation.adaptation_classification || ''}
                onChange={e => setHeat('adaptation_classification', e.target.value as HeatAdaptationClassification)}>
                <option value="">-- Select --</option>
                {HEAT_CLASSIFICATIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
        )}
      </div>

      {/* Force-Velocity */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setFvEnabled(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
        >
          <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200 font-semibold text-sm">
            <Dumbbell className="w-4 h-4 text-red-500" />
            Force-Velocity Profile
            <span className="text-xs font-normal text-gray-400">(lab module)</span>
          </div>
          {fvEnabled ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </button>
        {fvEnabled && (
          <div className="p-4 grid grid-cols-2 gap-4">
            <Field label="Evaluation Date">
              <input type="date" className={inputCls} value={forceVelocity.evaluation_date || today}
                onChange={e => setFV('evaluation_date', e.target.value)} />
            </Field>
            <Field label="Exercise">
              <input type="text" className={inputCls} placeholder="squat"
                value={forceVelocity.exercise || ''} onChange={e => setFV('exercise', e.target.value)} />
            </Field>
            <Field label="F0" unit="N">
              <input type="number" step="0.1" className={inputCls} placeholder="2150.0"
                value={forceVelocity.f0_n ?? ''} onChange={e => setFV('f0_n', num(e.target.value))} />
            </Field>
            <Field label="F0 Rel BW" unit="body-weights">
              <input type="number" step="0.01" className={inputCls} placeholder="3.12"
                value={forceVelocity.f0_relative_bw ?? ''} onChange={e => setFV('f0_relative_bw', num(e.target.value))} />
            </Field>
            <Field label="Pmax" unit="W">
              <input type="number" step="0.1" className={inputCls} placeholder="2042.5"
                value={forceVelocity.pmax_w ?? ''} onChange={e => setFV('pmax_w', num(e.target.value))} />
            </Field>
            <Field label="Pmax Rel" unit="W/kg">
              <input type="number" step="0.1" className={inputCls} placeholder="27.2"
                value={forceVelocity.pmax_w_kg ?? ''} onChange={e => setFV('pmax_w_kg', num(e.target.value))} />
            </Field>
            <Field label="Optimal Velocity" unit="m/s">
              <input type="number" step="0.01" className={inputCls} placeholder="1.9"
                value={forceVelocity.optimal_velocity_ms ?? ''} onChange={e => setFV('optimal_velocity_ms', num(e.target.value))} />
            </Field>
            <Field label="F-V Imbalance" unit="%">
              <input type="number" step="0.1" className={inputCls} placeholder="15.3"
                value={forceVelocity.fv_imbalance_percent ?? ''} onChange={e => setFV('fv_imbalance_percent', num(e.target.value))} />
            </Field>
            <Field label="Imbalance Direction" fullWidth>
              <select className={inputCls} value={forceVelocity.fv_imbalance_direction || 'balanced'}
                onChange={e => setFV('fv_imbalance_direction', e.target.value as FVImbalanceDirection)}>
                {FV_DIRECTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </Field>
          </div>
        )}
      </div>

      {/* Notes */}
      <Section title="Notes" icon={<Activity className="w-4 h-4 text-amber-500" />} defaultOpen={false}>
        <Field label="Clinical / Context Notes" fullWidth>
          <textarea
            className={`${inputCls} resize-none`}
            rows={3}
            placeholder="Test conditions, relevant observations, methodological notes..."
            value={form.notes || ''}
            onChange={e => set('notes', e.target.value || undefined)}
          />
        </Field>
      </Section>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#fdda36] hover:bg-[#f5ce20] text-gray-900 text-sm font-semibold transition-colors disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Saving...' : 'Create Passport Version'}
        </button>
      </div>
    </form>
  );
}
