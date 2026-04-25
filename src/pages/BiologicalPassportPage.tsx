import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getActivePassport,
  getPassportHistory,
  createPassport,
  updateVisibilityFlags,
  getAthleteList,
  previewLabProfile,
  importLabProfile,
} from '../lib/biologicalPassportService';
import type { BiologicalPassport, CreatePassportPayload, SportContext } from '../types/biologicalPassport.types';
import PassportCard from '../components/passport/PassportCard';
import PassportForm from '../components/passport/PassportForm';
import {
  Fingerprint, Plus, ChevronDown, Users, Search,
  ClipboardList, Clock, Layers, AlertCircle, RefreshCw,
  FlaskConical, Download, X, CheckCircle2, Zap, Heart,
  Activity, User, Mountain,
} from 'lucide-react';

interface Athlete {
  id: string;
  full_name: string;
  avatar_url: string;
  email: string;
}

interface LabPreview {
  vo2max?: number;
  lt1_power?: number;
  lt2_power?: number;
  lt1_hr?: number;
  lt2_hr?: number;
  height_cm?: number;
  weight_kg?: number;
  body_fat_percent?: number;
  muscle_mass_kg?: number;
  bone_mass_kg?: number;
  skinfold_sum_6?: number;
  muscle_bone_index?: number;
  z_adipose?: number;
  z_muscle?: number;
  z_bone?: number;
  test_protocol?: string;
  measurement_date?: string;
  power_zones_json?: unknown;
  hr_zones_json?: unknown;
  notes?: string;
}

const SPORT_OPTIONS: { value: SportContext; label: string }[] = [
  { value: 'cycling', label: 'Cycling' },
  { value: 'running', label: 'Running' },
  { value: 'triathlon', label: 'Triathlon' },
  { value: 'swimming', label: 'Swimming' },
  { value: 'strength', label: 'Strength' },
  { value: 'other', label: 'Other' },
];

function PreviewRow({ icon, label, value, unit }: { icon: React.ReactNode; label: string; value?: number | string | null; unit?: string }) {
  if (value == null) return null;
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
        {icon}
        {label}
      </span>
      <span className="text-xs font-semibold text-gray-900 dark:text-white">
        {typeof value === 'number' ? value.toFixed(value % 1 === 0 ? 0 : 1) : value}
        {unit && <span className="font-normal text-gray-400 ml-1">{unit}</span>}
      </span>
    </div>
  );
}

export default function BiologicalPassportPage() {
  const { profile } = useAuth();
  const isTrainerOrAdmin = profile?.role === 'trainer' || profile?.role === 'admin';

  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
  const [athleteSearch, setAthleteSearch] = useState('');
  const [showAthleteDropdown, setShowAthleteDropdown] = useState(false);

  const [activePassport, setActivePassport] = useState<BiologicalPassport | null>(null);
  const [history, setHistory] = useState<BiologicalPassport[]>([]);
  const [loadingPassport, setLoadingPassport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [labPreview, setLabPreview] = useState<LabPreview | null>(null);
  const [showLabModal, setShowLabModal] = useState(false);
  const [loadingLabPreview, setLoadingLabPreview] = useState(false);
  const [importingSport, setImportingSport] = useState<SportContext>('cycling');
  const [importingLab, setImportingLab] = useState(false);
  const [labError, setLabError] = useState<string | null>(null);

  useEffect(() => {
    if (!isTrainerOrAdmin) return;
    getAthleteList().then(setAthletes).catch(console.error);
  }, [isTrainerOrAdmin]);

  useEffect(() => {
    if (!isTrainerOrAdmin && profile?.id) {
      setSelectedAthleteId(profile.id);
    }
  }, [profile, isTrainerOrAdmin]);

  const loadPassport = useCallback(async (athleteId: string) => {
    if (!athleteId) return;
    setLoadingPassport(true);
    setError(null);
    try {
      const [active, hist] = await Promise.all([
        getActivePassport(athleteId),
        getPassportHistory(athleteId),
      ]);
      setActivePassport(active);
      setHistory(hist);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load passport');
    } finally {
      setLoadingPassport(false);
    }
  }, []);

  useEffect(() => {
    if (selectedAthleteId) loadPassport(selectedAthleteId);
  }, [selectedAthleteId, loadPassport]);

  const handleCreate = async (payload: CreatePassportPayload) => {
    setSaving(true);
    try {
      await createPassport(payload);
      await loadPassport(selectedAthleteId);
      setShowForm(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create passport');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateVisibility = async (flags: {
    public_visible: boolean;
    share_vo2: boolean;
    share_zones: boolean;
    share_body_comp: boolean;
  }) => {
    if (!activePassport) return;
    await updateVisibilityFlags(activePassport.id, flags);
    await loadPassport(selectedAthleteId);
  };

  const handleOpenLabPreview = async () => {
    if (!selectedAthleteId) return;
    setLoadingLabPreview(true);
    setLabError(null);
    setLabPreview(null);
    setShowLabModal(true);
    try {
      const data = await previewLabProfile(selectedAthleteId);
      setLabPreview(data as LabPreview | null);
    } catch (e: unknown) {
      setLabError(e instanceof Error ? e.message : 'Could not reach the lab');
    } finally {
      setLoadingLabPreview(false);
    }
  };

  const handleImportFromLab = async () => {
    if (!selectedAthleteId) return;
    setImportingLab(true);
    setLabError(null);
    try {
      await importLabProfile(selectedAthleteId, importingSport);
      await loadPassport(selectedAthleteId);
      setShowLabModal(false);
      setLabPreview(null);
    } catch (e: unknown) {
      setLabError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImportingLab(false);
    }
  };

  const filteredAthletes = athletes.filter(a => {
    const q = athleteSearch.toLowerCase();
    return (
      a.full_name?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q)
    );
  });

  const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);
  const archivedVersions = history.filter(p => p.status === 'archived');

  const stats = [
    { label: 'Total Versions', value: history.length, icon: <Layers className="w-4 h-4" /> },
    { label: 'Archived', value: archivedVersions.length, icon: <Clock className="w-4 h-4" /> },
    {
      label: 'Last Updated',
      value: activePassport
        ? new Date(activePassport.measurement_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '—',
      icon: <ClipboardList className="w-4 h-4" />,
    },
  ];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-screen-2xl mx-auto">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-[#fdda36]/20 border border-[#fdda36]/30">
            <Fingerprint className="w-5 h-5 text-[#514163] dark:text-[#fdda36]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Biological Passport</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Master physiological &amp; anthropometric profile</p>
          </div>
        </div>

        {isTrainerOrAdmin && selectedAthleteId && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleOpenLabPreview}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-semibold transition-colors shadow-sm border border-gray-200 dark:border-gray-600"
            >
              <FlaskConical className="w-4 h-4 text-red-500 dark:text-red-400" />
              Import from Lab
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#fdda36] hover:bg-[#f5ce20] text-gray-900 rounded-xl text-sm font-semibold transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Version
            </button>
          </div>
        )}
      </div>

      {/* Top bar: athlete selector + stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

        {/* Athlete selector */}
        {isTrainerOrAdmin && (
          <div className="lg:col-span-1 relative">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Athlete
            </label>
            <button
              onClick={() => setShowAthleteDropdown(d => !d)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-left hover:border-[#fdda36] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                {selectedAthlete?.avatar_url ? (
                  <img src={selectedAthlete.avatar_url} className="w-7 h-7 rounded-full object-cover shrink-0" alt="" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center shrink-0">
                    <Users className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                )}
                <span className={`text-sm truncate ${selectedAthlete ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-400'}`}>
                  {selectedAthlete?.full_name || 'Choose athlete...'}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
            </button>

            {showAthleteDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-20 overflow-hidden">
                <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search athletes..."
                      className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 rounded-lg border-0 focus:outline-none text-gray-900 dark:text-white"
                      value={athleteSearch}
                      onChange={e => setAthleteSearch(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {filteredAthletes.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">No athletes found</p>
                  ) : filteredAthletes.map(a => (
                    <button
                      key={a.id}
                      onClick={() => {
                        setSelectedAthleteId(a.id);
                        setShowAthleteDropdown(false);
                        setAthleteSearch('');
                        setShowForm(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        selectedAthleteId === a.id ? 'bg-[#fdda36]/10' : ''
                      }`}
                    >
                      {a.avatar_url ? (
                        <img src={a.avatar_url} className="w-7 h-7 rounded-full object-cover" alt="" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                          <Users className="w-3.5 h-3.5 text-gray-500" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white truncate">{a.full_name}</p>
                        {a.email && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{a.email}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        {selectedAthleteId && !loadingPassport && history.length > 0 && (
          <div className={`${isTrainerOrAdmin ? 'lg:col-span-3' : 'lg:col-span-4'} grid grid-cols-3 gap-3`}>
            {stats.map(s => (
              <div key={s.label} className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <div className="text-gray-400">{s.icon}</div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p className="text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-xs underline">Dismiss</button>
        </div>
      )}

      {/* Loading */}
      {loadingPassport && (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      )}

      {/* No athlete selected */}
      {isTrainerOrAdmin && !selectedAthleteId && !loadingPassport && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <Users className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Select an athlete to view their Biological Passport</p>
        </div>
      )}

      {/* Main content area — wide two-column on large screens */}
      {!loadingPassport && selectedAthleteId && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Left column: Active passport + form */}
          <div className="xl:col-span-2 space-y-4">

            {/* Create form */}
            {showForm && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[#fdda36]/40 p-5 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-900 dark:text-white">
                    New Passport Version
                    {selectedAthlete && (
                      <span className="font-normal text-gray-500 dark:text-gray-400 ml-2">— {selectedAthlete.full_name}</span>
                    )}
                  </h2>
                </div>
                <PassportForm
                  athleteId={selectedAthleteId}
                  onSubmit={handleCreate}
                  onCancel={() => setShowForm(false)}
                  loading={saving}
                />
              </div>
            )}

            {/* Active passport */}
            {activePassport ? (
              <>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Active Passport</h2>
                <PassportCard
                  passport={activePassport}
                  isActive
                  canEdit={isTrainerOrAdmin || activePassport.athlete_id === profile?.id}
                  onUpdateVisibility={handleUpdateVisibility}
                />
              </>
            ) : !showForm && (
              <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600">
                <div className="w-14 h-14 rounded-2xl bg-[#fdda36]/10 flex items-center justify-center mb-4">
                  <Fingerprint className="w-7 h-7 text-[#fdda36]" />
                </div>
                <p className="text-gray-700 dark:text-gray-300 font-semibold mb-1">No passport yet</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                  {isTrainerOrAdmin
                    ? 'Create a new passport manually or import from the Lab.'
                    : 'Your trainer has not created a Biological Passport for you yet.'}
                </p>
                {isTrainerOrAdmin && (
                  <div className="flex items-center gap-3 flex-wrap justify-center">
                    <button
                      onClick={handleOpenLabPreview}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-semibold transition-colors border border-gray-200 dark:border-gray-600"
                    >
                      <FlaskConical className="w-4 h-4 text-red-500" />
                      Import from Lab
                    </button>
                    <button
                      onClick={() => setShowForm(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-[#fdda36] hover:bg-[#f5ce20] text-gray-900 rounded-xl text-sm font-semibold transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Create Manually
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right column: Version history sidebar on large screens */}
          <div className="xl:col-span-1 space-y-4">

            {/* Passport info card */}
            {activePassport && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Passport Info</h3>
                <div className="space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Version</span>
                    <span className="font-semibold text-gray-900 dark:text-white">v{activePassport.version_number}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Source</span>
                    <span className="font-semibold text-gray-900 dark:text-white capitalize">{activePassport.source}</span>
                  </div>
                  {activePassport.source_test_type && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Protocol</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{activePassport.source_test_type}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Sport</span>
                    <span className="font-semibold text-gray-900 dark:text-white capitalize">{activePassport.sport_context}</span>
                  </div>
                  {activePassport.athlete_level && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Level</span>
                      <span className="font-semibold text-gray-900 dark:text-white capitalize">{activePassport.athlete_level}</span>
                    </div>
                  )}
                  {activePassport.training_age_years != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Training Age</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{activePassport.training_age_years} years</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Measured</span>
                    <span className="font-semibold text-gray-900 dark:text-white text-right">
                      {new Date(activePassport.measurement_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  {activePassport.source_satellite && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Lab</span>
                      <span className="font-semibold text-gray-900 dark:text-white truncate max-w-[120px]">{activePassport.source_satellite}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Version history */}
            {archivedVersions.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <button
                  onClick={() => setShowHistory(h => !h)}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <Clock className="w-4 h-4 text-gray-400" />
                    Version History
                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-400">
                      {archivedVersions.length}
                    </span>
                  </div>
                  {showHistory ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400 -rotate-90" />}
                </button>

                {showHistory && (
                  <div className="border-t border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 max-h-96 overflow-y-auto">
                    {archivedVersions.map(p => (
                      <div key={p.id} className="px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300">
                              v{p.version_number}
                            </span>
                            <div>
                              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                                {new Date(p.measurement_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                              <p className="text-xs text-gray-400 capitalize">{p.source} · {p.sport_context}</p>
                            </div>
                          </div>
                          <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">{p.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* No history yet */}
            {archivedVersions.length === 0 && activePassport && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 text-center">
                <Layers className="w-6 h-6 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-xs text-gray-400 dark:text-gray-500">No previous versions</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Lab Import Modal */}
      {showLabModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">

            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
                  <FlaskConical className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">Import from Lab</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedAthlete?.full_name || 'Selected athlete'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowLabModal(false); setLabPreview(null); setLabError(null); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="p-5 max-h-[70vh] overflow-y-auto">
              {loadingLabPreview && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Fetching latest profile from Lab...</p>
                </div>
              )}

              {labError && !loadingLabPreview && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-700 dark:text-red-300">Lab unreachable</p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{labError}</p>
                  </div>
                </div>
              )}

              {!loadingLabPreview && !labError && labPreview === null && (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                  <FlaskConical className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">No active profile in Lab</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    This athlete doesn't have a completed test profile in the Lab satellite yet.
                  </p>
                </div>
              )}

              {!loadingLabPreview && labPreview && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                      Active lab profile found
                      {labPreview.measurement_date && (
                        <span className="font-semibold ml-1">
                          — {new Date(labPreview.measurement_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                    </p>
                    {labPreview.test_protocol && (
                      <span className="ml-auto text-xs text-emerald-600 dark:text-emerald-400 font-medium">{labPreview.test_protocol}</span>
                    )}
                  </div>

                  {(labPreview.vo2max || labPreview.lt1_hr || labPreview.lt2_hr || labPreview.lt1_power || labPreview.lt2_power) && (
                    <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-sky-50 dark:bg-sky-900/20 border-b border-gray-100 dark:border-gray-800">
                        <Zap className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                        <span className="text-xs font-semibold text-sky-700 dark:text-sky-300 uppercase tracking-wide">Physiological</span>
                      </div>
                      <div className="px-4 py-2">
                        <PreviewRow icon={<Activity className="w-3 h-3" />} label="VO2max" value={labPreview.vo2max} unit="ml/kg/min" />
                        <PreviewRow icon={<Heart className="w-3 h-3" />} label="LT1 HR" value={labPreview.lt1_hr} unit="bpm" />
                        <PreviewRow icon={<Heart className="w-3 h-3" />} label="LT2 HR" value={labPreview.lt2_hr} unit="bpm" />
                        <PreviewRow icon={<Mountain className="w-3 h-3" />} label="LT1 Power" value={labPreview.lt1_power} unit="W" />
                        <PreviewRow icon={<Mountain className="w-3 h-3" />} label="LT2 Power" value={labPreview.lt2_power} unit="W" />
                      </div>
                    </div>
                  )}

                  {(labPreview.weight_kg || labPreview.body_fat_percent || labPreview.skinfold_sum_6) && (
                    <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border-b border-gray-100 dark:border-gray-800">
                        <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">Anthropometry</span>
                      </div>
                      <div className="px-4 py-2">
                        <PreviewRow icon={<Activity className="w-3 h-3" />} label="Height" value={labPreview.height_cm} unit="cm" />
                        <PreviewRow icon={<Activity className="w-3 h-3" />} label="Weight" value={labPreview.weight_kg} unit="kg" />
                        <PreviewRow icon={<Activity className="w-3 h-3" />} label="Body Fat" value={labPreview.body_fat_percent} unit="%" />
                        <PreviewRow icon={<Activity className="w-3 h-3" />} label="Muscle Mass" value={labPreview.muscle_mass_kg} unit="kg" />
                        <PreviewRow icon={<Activity className="w-3 h-3" />} label="Bone Mass" value={labPreview.bone_mass_kg} unit="kg" />
                        <PreviewRow icon={<Activity className="w-3 h-3" />} label="Sum 6 Skinfolds" value={labPreview.skinfold_sum_6} unit="mm" />
                        <PreviewRow icon={<Activity className="w-3 h-3" />} label="Muscle/Bone Index" value={labPreview.muscle_bone_index} />
                      </div>
                      {(labPreview.z_adipose != null || labPreview.z_muscle != null || labPreview.z_bone != null) && (
                        <div className="px-4 pb-3">
                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                            {labPreview.z_adipose != null && (
                              <div className="text-center">
                                <p className="text-xs text-gray-400">Z Adipose</p>
                                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{labPreview.z_adipose.toFixed(2)}</p>
                              </div>
                            )}
                            {labPreview.z_muscle != null && (
                              <div className="text-center">
                                <p className="text-xs text-gray-400">Z Muscle</p>
                                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{labPreview.z_muscle.toFixed(2)}</p>
                              </div>
                            )}
                            {labPreview.z_bone != null && (
                              <div className="text-center">
                                <p className="text-xs text-gray-400">Z Bone</p>
                                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{labPreview.z_bone.toFixed(2)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                      Sport Context for this version
                    </label>
                    <select
                      value={importingSport}
                      onChange={e => setImportingSport(e.target.value as SportContext)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
                    >
                      {SPORT_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {!loadingLabPreview && labPreview && (
              <div className="flex items-center gap-3 px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <button
                  onClick={() => { setShowLabModal(false); setLabPreview(null); setLabError(null); }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportFromLab}
                  disabled={importingLab}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#fdda36] hover:bg-[#f5ce20] text-gray-900 text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  {importingLab ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {importingLab ? 'Importing...' : 'Import & Create Version'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
