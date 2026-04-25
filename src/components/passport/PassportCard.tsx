import { useState } from 'react';
import {
  Wind, User, Activity, ChevronDown, ChevronUp,
  Globe, Share2, FlaskConical, FileText, Download,
  Zap, Heart, Mountain, Timer, BarChart3, TrendingUp,
  Droplets, Flame, Dumbbell,
} from 'lucide-react';
import type { BiologicalPassport, PowerZone, HRZone, RPEZone, TrainingZones } from '../../types/biologicalPassport.types';

interface PassportCardProps {
  passport: BiologicalPassport;
  isActive?: boolean;
  canEdit?: boolean;
  onUpdateVisibility?: (flags: {
    public_visible: boolean;
    share_vo2: boolean;
    share_zones: boolean;
    share_body_comp: boolean;
  }) => Promise<void>;
}

const SPORT_LABELS: Record<string, string> = {
  cycling: 'Cycling',
  running: 'Running',
  triathlon: 'Triathlon',
  strength: 'Strength',
  swimming: 'Swimming',
  other: 'Other',
};

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  lab: <FlaskConical className="w-3.5 h-3.5" />,
  manual: <FileText className="w-3.5 h-3.5" />,
  imported: <Download className="w-3.5 h-3.5" />,
};

const LEVEL_COLORS: Record<string, string> = {
  beginner: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  intermediate: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  advanced: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  elite: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

function MetricCell({
  icon, label, value, unit,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number | string | null;
  unit?: string;
}) {
  const hasValue = value != null && value !== '';
  return (
    <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs">
        {icon}
        <span>{label}</span>
      </div>
      {hasValue ? (
        <div className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
          {typeof value === 'number' ? value.toFixed(value % 1 === 0 ? 0 : 1) : value}
          {unit && <span className="text-xs font-normal text-gray-500 ml-1">{unit}</span>}
        </div>
      ) : (
        <div className="text-sm font-medium text-gray-300 dark:text-gray-600 leading-tight italic">
          No data
        </div>
      )}
    </div>
  );
}

function SectionHeader({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <div className={`flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wide ${color}`}>
      {icon}
      {label}
    </div>
  );
}

function parseJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed as T[] : [];
    } catch { return []; }
  }
  return [];
}

export default function PassportCard({ passport, isActive, canEdit, onUpdateVisibility }: PassportCardProps) {
  const [expanded, setExpanded] = useState(isActive);
  const [showVisibility, setShowVisibility] = useState(false);
  const [visFlags, setVisFlags] = useState({
    public_visible: passport.public_visible,
    share_vo2: passport.share_vo2,
    share_zones: passport.share_zones,
    share_body_comp: passport.share_body_comp,
  });
  const [savingVis, setSavingVis] = useState(false);

  const measDate = new Date(passport.measurement_date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const handleSaveVisibility = async () => {
    if (!onUpdateVisibility) return;
    setSavingVis(true);
    try {
      await onUpdateVisibility(visFlags);
      setShowVisibility(false);
    } finally {
      setSavingVis(false);
    }
  };

  const trainingZones: TrainingZones | null = (() => {
    const tz = passport.training_zones;
    if (!tz) return null;
    if (typeof tz === 'string') {
      try { return JSON.parse(tz) as TrainingZones; } catch { return null; }
    }
    return tz as TrainingZones;
  })();

  const hasZones5 = !!(trainingZones?.zones5?.hr?.length || trainingZones?.zones5?.power?.length);
  const hasZones7 = !!(trainingZones?.zones7?.hr?.length || trainingZones?.zones7?.power?.length);
  const hasNewZones = hasZones5 || hasZones7;

  const defaultDisplay: '5' | '7' = trainingZones?.default_display === '7' ? '7' : '5';
  const [zoneDisplay, setZoneDisplay] = useState<'5' | '7'>(defaultDisplay);

  const activeZoneSet = zoneDisplay === '7' && hasZones7
    ? trainingZones?.zones7
    : trainingZones?.zones5;

  const powerZones = hasNewZones
    ? parseJsonArray<PowerZone>(activeZoneSet?.power)
    : parseJsonArray<PowerZone>(passport.power_zones_json);
  const hrZones = hasNewZones
    ? parseJsonArray<HRZone>(activeZoneSet?.hr)
    : parseJsonArray<HRZone>(passport.hr_zones_json);
  const rpeZones = hasNewZones
    ? parseJsonArray<RPEZone>(activeZoneSet?.rpe)
    : parseJsonArray<RPEZone>(passport.rpe_zones_json);

  return (
    <div className={`rounded-2xl border transition-all ${
      isActive
        ? 'border-[#fdda36] bg-white dark:bg-gray-800 shadow-lg'
        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40'
    }`}>
      {/* Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        <div className={`flex items-center justify-center w-10 h-10 rounded-xl font-bold text-sm ${
          isActive
            ? 'bg-[#fdda36] text-gray-900'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
        }`}>
          v{passport.version_number}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 dark:text-white text-sm">
              {measDate}
            </span>
            {isActive && (
              <span className="px-2 py-0.5 rounded-full bg-[#fdda36]/20 text-[#514163] dark:text-[#fdda36] text-xs font-semibold">
                Active
              </span>
            )}
            {passport.athlete_level && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${LEVEL_COLORS[passport.athlete_level] || ''}`}>
                {passport.athlete_level}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1 capitalize">
              {SOURCE_ICONS[passport.source]}
              {passport.source}
              {passport.source_test_type && ` · ${passport.source_test_type}`}
            </span>
            <span>·</span>
            <span className="capitalize">{SPORT_LABELS[passport.sport_context] || passport.sport_context}</span>
            {passport.training_age_years != null && (
              <>
                <span>·</span>
                <span>{passport.training_age_years}y training age</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && isActive && (
            <button
              onClick={e => { e.stopPropagation(); setShowVisibility(v => !v); }}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
              title="Visibility settings"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {/* Visibility Panel */}
      {showVisibility && canEdit && isActive && (
        <div className="mx-4 mb-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
            Public Visibility Controls
          </p>
          <div className="space-y-2">
            {[
              { key: 'public_visible' as const, label: 'Make passport publicly visible', icon: <Globe className="w-3.5 h-3.5" /> },
              { key: 'share_vo2' as const, label: 'Share VO2max, FTP & thresholds', icon: <Wind className="w-3.5 h-3.5" /> },
              { key: 'share_zones' as const, label: 'Share training zones', icon: <BarChart3 className="w-3.5 h-3.5" /> },
              { key: 'share_body_comp' as const, label: 'Share body composition', icon: <User className="w-3.5 h-3.5" /> },
            ].map(({ key, label, icon }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visFlags[key]}
                  onChange={e => setVisFlags(f => ({ ...f, [key]: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-[#fdda36] focus:ring-[#fdda36]"
                />
                <span className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                  {icon}{label}
                </span>
              </label>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setShowVisibility(false)}
              className="flex-1 px-3 py-2 rounded-lg text-xs border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveVisibility}
              disabled={savingVis}
              className="flex-1 px-3 py-2 rounded-lg text-xs bg-[#fdda36] hover:bg-[#f5ce20] text-gray-900 font-semibold transition-colors disabled:opacity-60"
            >
              {savingVis ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-5 border-t border-gray-100 dark:border-gray-700 pt-4">

          {/* ── Aerobic Capacity ── */}
          <div>
            <SectionHeader
              icon={<Wind className="w-3.5 h-3.5" />}
              label="Aerobic Capacity"
              color="text-sky-600 dark:text-sky-400"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              <MetricCell icon={<Wind className="w-3 h-3" />} label="VO2max" value={passport.vo2max} unit="ml/kg/min" />
              <MetricCell icon={<Zap className="w-3 h-3" />} label="FTP" value={passport.ftp_watts} unit="W" />
              <MetricCell icon={<Zap className="w-3 h-3" />} label="Critical Power" value={passport.critical_power} unit="W" />
              <MetricCell icon={<Activity className="w-3 h-3" />} label="W' Anaerobic" value={passport.anaerobic_capacity_kj} unit="kJ" />
              <MetricCell icon={<Heart className="w-3 h-3" />} label="LT1 HR" value={passport.lt1_hr} unit="bpm" />
              <MetricCell icon={<Heart className="w-3 h-3" />} label="LT2 HR" value={passport.lt2_hr} unit="bpm" />
              <MetricCell icon={<Mountain className="w-3 h-3" />} label="LT1 Power" value={passport.lt1_power} unit="W" />
              <MetricCell icon={<Mountain className="w-3 h-3" />} label="LT2 Power" value={passport.lt2_power} unit="W" />
              <MetricCell icon={<Timer className="w-3 h-3" />} label="Threshold Pace" value={passport.running_threshold_pace} unit="/km" />
              <MetricCell icon={<TrendingUp className="w-3 h-3" />} label="VAM" value={passport.vam} unit="m/h" />
              <MetricCell icon={<TrendingUp className="w-3 h-3" />} label="PAM" value={passport.pam} unit="W/kg" />
            </div>
          </div>

          {/* ── Body Composition ── */}
          <div>
            <SectionHeader
              icon={<User className="w-3.5 h-3.5" />}
              label="Body Composition"
              color="text-emerald-600 dark:text-emerald-400"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              <MetricCell icon={<Activity className="w-3 h-3" />} label="Height" value={passport.height_cm} unit="cm" />
              <MetricCell icon={<Activity className="w-3 h-3" />} label="Weight" value={passport.weight_kg} unit="kg" />
              <MetricCell icon={<Activity className="w-3 h-3" />} label="Body Fat" value={passport.body_fat_percent} unit="%" />
              <MetricCell icon={<Activity className="w-3 h-3" />} label="Muscle Mass" value={passport.muscle_mass_kg} unit="kg" />
              <MetricCell icon={<Activity className="w-3 h-3" />} label="Lean Mass" value={passport.lean_mass_kg} unit="kg" />
              <MetricCell icon={<Activity className="w-3 h-3" />} label="Bone Mass" value={passport.bone_mass_kg} unit="kg" />
              <MetricCell icon={<Activity className="w-3 h-3" />} label="Sum 6 Skinfolds" value={passport.skinfold_sum_6} unit="mm" />
              <MetricCell icon={<Activity className="w-3 h-3" />} label="Muscle/Bone Ratio" value={passport.muscle_bone_index} />
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <MetricCell icon={<Activity className="w-3 h-3" />} label="Z Adipose" value={passport.z_adipose} />
              <MetricCell icon={<Activity className="w-3 h-3" />} label="Z Muscle" value={passport.z_muscle} />
              <MetricCell icon={<Activity className="w-3 h-3" />} label="Z Bone" value={passport.z_bone} />
            </div>
            {passport.test_protocol && (
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                Protocol: <span className="font-medium text-gray-600 dark:text-gray-300">{passport.test_protocol}</span>
              </p>
            )}
          </div>

          {/* ── Training Zones ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                <BarChart3 className="w-3.5 h-3.5" />
                Training Zones
                {trainingZones?.base_method && (
                  <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-xs font-medium normal-case tracking-normal">
                    {trainingZones.base_method.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
              {hasNewZones && (hasZones5 || hasZones7) && (
                <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden text-xs font-semibold">
                  {hasZones5 && (
                    <button
                      onClick={() => setZoneDisplay('5')}
                      className={`px-3 py-1.5 transition-colors ${
                        zoneDisplay === '5'
                          ? 'bg-amber-500 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      5 Zones
                    </button>
                  )}
                  {hasZones7 && (
                    <button
                      onClick={() => setZoneDisplay('7')}
                      className={`px-3 py-1.5 transition-colors border-l border-gray-200 dark:border-gray-600 ${
                        zoneDisplay === '7'
                          ? 'bg-amber-500 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      7 Zones
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {/* Power Zones */}
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-amber-500" />
                  Power Zones
                </p>
                {powerZones.length > 0 ? (
                  <div className="space-y-1">
                    {powerZones.map(z => (
                      <div key={z.zone} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded flex items-center justify-center bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-bold text-[10px]">
                            Z{z.zone}
                          </span>
                          <span className="text-gray-700 dark:text-gray-300">{z.name}</span>
                        </span>
                        <span className="font-mono text-gray-500 dark:text-gray-400">{z.min_watts}–{z.max_watts} W</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-300 dark:text-gray-600 italic">No data</p>
                )}
              </div>

              {/* HR Zones */}
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                  <Heart className="w-3 h-3 text-red-500" />
                  HR Zones
                </p>
                {hrZones.length > 0 ? (
                  <div className="space-y-1">
                    {hrZones.map(z => (
                      <div key={z.zone} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded flex items-center justify-center bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-bold text-[10px]">
                            Z{z.zone}
                          </span>
                          <span className="text-gray-700 dark:text-gray-300">{z.name}</span>
                        </span>
                        <span className="font-mono text-gray-500 dark:text-gray-400">{z.min_bpm}–{z.max_bpm} bpm</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-300 dark:text-gray-600 italic">No data</p>
                )}
              </div>

              {/* RPE Zones */}
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-sky-500" />
                  RPE Zones
                </p>
                {rpeZones.length > 0 ? (
                  <div className="space-y-1">
                    {rpeZones.map(z => (
                      <div key={z.zone} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded flex items-center justify-center bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 font-bold text-[10px]">
                            Z{z.zone}
                          </span>
                          <span className="text-gray-700 dark:text-gray-300">{z.name}</span>
                        </span>
                        <span className="font-mono text-gray-500 dark:text-gray-400">RPE {z.rpe_min}–{z.rpe_max}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-300 dark:text-gray-600 italic">No data</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Hydration ── */}
          {passport.hydration && (
            <div>
              <SectionHeader
                icon={<Droplets className="w-3.5 h-3.5" />}
                label="Hydration Profile"
                color="text-blue-600 dark:text-blue-400"
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                <MetricCell icon={<Droplets className="w-3 h-3" />} label="Sweat Rate" value={passport.hydration.sweat_rate_l_h} unit="L/h" />
                <MetricCell icon={<Droplets className="w-3 h-3" />} label="Avg Sweat Rate" value={passport.hydration.average_sweat_rate_l_h} unit="L/h" />
                <MetricCell icon={<Activity className="w-3 h-3" />} label="Dehydration" value={passport.hydration.percent_dehydration} unit="%" />
                <MetricCell icon={<Flame className="w-3 h-3" />} label="Temperature" value={passport.hydration.temperature_c} unit="°C" />
                <MetricCell icon={<Droplets className="w-3 h-3" />} label="Humidity" value={passport.hydration.humidity_percent} unit="%" />
                <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700 col-span-1">
                  <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs">
                    <Activity className="w-3 h-3" />
                    <span>Eval Date</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                    {passport.hydration.evaluation_date}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Heat Adaptation ── */}
          {passport.heat_adaptation && (
            <div>
              <SectionHeader
                icon={<Flame className="w-3.5 h-3.5" />}
                label="Heat Adaptation"
                color="text-orange-600 dark:text-orange-400"
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                <MetricCell icon={<Flame className="w-3 h-3" />} label="Adaptation Score" value={passport.heat_adaptation.heat_adaptation_score} unit="/100" />
                <MetricCell icon={<Activity className="w-3 h-3" />} label="Sessions" value={passport.heat_adaptation.total_sessions} />
                <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs">
                    <Flame className="w-3 h-3" />
                    <span>Classification</span>
                  </div>
                  <div className={`text-sm font-bold leading-tight ${
                    passport.heat_adaptation.adaptation_classification === 'Excellent' ? 'text-emerald-600 dark:text-emerald-400' :
                    passport.heat_adaptation.adaptation_classification === 'Good' ? 'text-green-600 dark:text-green-400' :
                    passport.heat_adaptation.adaptation_classification === 'Moderate' ? 'text-amber-600 dark:text-amber-400' :
                    passport.heat_adaptation.adaptation_classification === 'Minimal' ? 'text-orange-600 dark:text-orange-400' :
                    'text-gray-500 dark:text-gray-400'
                  }`}>
                    {passport.heat_adaptation.adaptation_classification}
                  </div>
                </div>
                <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs">
                    <Activity className="w-3 h-3" />
                    <span>Eval Date</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                    {passport.heat_adaptation.evaluation_date}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Force-Velocity Profile ── */}
          {passport.force_velocity && (
            <div>
              <SectionHeader
                icon={<Dumbbell className="w-3.5 h-3.5" />}
                label={`Force-Velocity Profile${passport.force_velocity.exercise ? ` · ${passport.force_velocity.exercise}` : ''}`}
                color="text-red-600 dark:text-red-400"
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                <MetricCell icon={<Dumbbell className="w-3 h-3" />} label="F0" value={passport.force_velocity.f0_n} unit="N" />
                <MetricCell icon={<Dumbbell className="w-3 h-3" />} label="F0 Rel BW" value={passport.force_velocity.f0_relative_bw} unit="BW" />
                <MetricCell icon={<Zap className="w-3 h-3" />} label="Pmax" value={passport.force_velocity.pmax_w} unit="W" />
                <MetricCell icon={<Zap className="w-3 h-3" />} label="Pmax Rel" value={passport.force_velocity.pmax_w_kg} unit="W/kg" />
                <MetricCell icon={<TrendingUp className="w-3 h-3" />} label="Optimal Velocity" value={passport.force_velocity.optimal_velocity_ms} unit="m/s" />
                <MetricCell icon={<Activity className="w-3 h-3" />} label="F-V Imbalance" value={passport.force_velocity.fv_imbalance_percent} unit="%" />
                <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs">
                    <TrendingUp className="w-3 h-3" />
                    <span>Imbalance Type</span>
                  </div>
                  <div className={`text-sm font-bold leading-tight capitalize ${
                    passport.force_velocity.fv_imbalance_direction === 'balanced' ? 'text-emerald-600 dark:text-emerald-400' :
                    passport.force_velocity.fv_imbalance_direction === 'force_deficit' ? 'text-amber-600 dark:text-amber-400' :
                    'text-sky-600 dark:text-sky-400'
                  }`}>
                    {passport.force_velocity.fv_imbalance_direction.replace('_', ' ')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Notes ── */}
          {passport.notes && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Notes</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{passport.notes}</p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
