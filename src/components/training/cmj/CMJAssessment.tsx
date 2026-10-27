import { useState, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { supabase } from '../../../lib/supabase';
import {
  ArrowLeft,
  History,
  Settings,
  Save,
  Trash2,
  Plus,
  CheckCircle,
  X,
} from 'lucide-react';
import CMJVideoCapture from './CMJVideoCapture';
import CMJResultsPanel from './CMJResultsPanel';
import CMJHistory from './CMJHistory';
import {
  CMJJump,
  VideoFrameAnalysis,
  calculateJumpHeight,
} from './CMJTypes';
import { computeAttempt } from '../jumpCore';
import { JumpType } from '../jumpCore';
import { downloadJumpCsv } from '../jump/JumpExport';

type Tab = 'assess' | 'history';

interface CMJAssessmentProps {
  onClose: () => void;
}

const MAX_JUMPS = 6;

export default function CMJAssessment({ onClose }: CMJAssessmentProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { isDark } = useTheme();

  const [tab, setTab] = useState<Tab>('assess');
  const [jumps, setJumps] = useState<CMJJump[]>([]);
  const [bodyMassKg, setBodyMassKg] = useState<string>('');
  const [jumpType, setJumpType] = useState<JumpType>('cmj');
  const [loadKg, setLoadKg] = useState('');
  const [boxCm, setBoxCm] = useState('');
  const [hpoM, setHpoM] = useState('');
  const [side, setSide] = useState<'left' | 'right' | ''>('');
  const [clientSessionId] = useState(() => crypto.randomUUID());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const txt = {
    title: 'Jump Assessment',
    subtitle: 'CMJ — Countermovement Jump',
    assessment: language === 'es' ? 'Evaluacion' : 'Assessment',
    history: language === 'es' ? 'Historial' : 'History',
    sessionConfig: language === 'es' ? 'Configuracion de sesion' : 'Session configuration',
    bodyMass: language === 'es' ? 'Masa corporal (kg)' : 'Body mass (kg)',
    bodyMassPlaceholder: language === 'es' ? 'ej: 75' : 'e.g. 75',
    recordingInstructions: language === 'es' ? 'Instrucciones de grabacion:' : 'Recording instructions:',
    instructions: language === 'es' ? [
      'Coloca el telefono en vista lateral al atleta',
      'Asegurate de que los pies sean visibles en el tercio inferior',
      'Usa buena iluminacion y fondo contrastante',
      'Usa la cámara en vivo o sube un video slow-motion',
    ] : [
      'Position the phone with a lateral view of the athlete',
      'Ensure feet are visible in the lower third of the frame',
      'Use good lighting and a contrasting background',
      'Use the live camera or upload a slow-motion video',
    ],
    videoPrivacy: language === 'es'
      ? 'El video se procesa en este dispositivo para obtener los resultados y no se guarda en la base de datos.'
      : 'The video is processed on this device to produce results and is not stored in the database.',
    maxJumps: language === 'es'
      ? `Maximo de ${MAX_JUMPS} saltos por sesion alcanzado.`
      : `Maximum of ${MAX_JUMPS} jumps per session reached.`,
    jumpsRecorded: (n: number) => language === 'es' ? `Saltos registrados (${n})` : `Recorded jumps (${n})`,
    clear: language === 'es' ? 'Limpiar' : 'Clear',
    sessionNotes: language === 'es' ? 'Notas de sesion' : 'Session notes',
    sessionNotesPlaceholder: language === 'es' ? 'Condiciones, observaciones...' : 'Conditions, observations...',
    saveSession: language === 'es' ? 'Guardar sesion' : 'Save session',
    saving: language === 'es' ? 'Guardando...' : 'Saving...',
    sessionSaved: language === 'es' ? 'Sesion guardada' : 'Session saved',
    viewHistory: language === 'es' ? 'Ver en historial' : 'View in history',
    newSession: language === 'es' ? 'Nueva sesion' : 'New session',
    saveError: language === 'es' ? 'Error al guardar. Intenta de nuevo.' : 'Error saving. Please try again.',
  };

  const handleJumpDetectedFromVideo = useCallback(
    (flightTimeMs: number, analysis: VideoFrameAnalysis) => {
      if (jumps.length >= MAX_JUMPS) return;
      const mass = parseFloat(bodyMassKg);
      const result = analysis.takeoffMs !== undefined && analysis.landingMs !== undefined
        ? computeAttempt(jumpType, { takeoffMs: analysis.takeoffMs, landingMs: analysis.landingMs }, { massKg: mass, fps: analysis.effectiveFps ?? analysis.fps, loadKg: Number(loadKg) || undefined, boxCm: Number(boxCm) || undefined, hpoM: Number(hpoM) || undefined })
        : null;
      const height = result?.heightCm ?? calculateJumpHeight(flightTimeMs);

      const jump: CMJJump = {
        jumpNumber: jumps.length + 1,
        flightTimeMs,
        jumpHeightCm: height,
        estimatedPowerW: result?.samozino?.powerW,
        takeoffFrame: analysis.takeoffFrameIndex,
        landingFrame: analysis.landingFrameIndex,
        fps: analysis.fps,
        source: 'video',
        marks: { takeoffMs: analysis.takeoffMs, landingMs: analysis.landingMs },
        result: result ?? undefined,
        flags: result?.flags ?? [],
        reasons: result?.reasons ?? [],
        isValid: result?.ok ?? false,
      };

      setJumps((prev) => [...prev, jump]);
    },
    [jumps.length, bodyMassKg, jumpType, loadKg, boxCm, hpoM]
  );

  const resetSession = () => {
    setJumps([]);
    setSaved(false);
    setError('');
  };

  const saveSession = async () => {
    if (!user || jumps.length === 0) return;
    setSaving(true);
    setError('');

    try {
      const validJumps = jumps.filter((j) => j.isValid);
      const mass = parseFloat(bodyMassKg);
      if (!(mass > 0)) throw new Error('Masa corporal inválida');
      const { error: saveError } = await supabase.rpc('save_jump_session', { p_session: {
        client_session_id: clientSessionId, athlete_id: user.id, session_date: new Date().toISOString().split('T')[0], jump_type: jumpType,
        body_mass_kg: mass, load_kg: Number(loadKg) || null, box_cm: Number(boxCm) || null, hpo_m: Number(hpoM) || null, side: side || null,
        effective_fps: validJumps.find((jump) => jump.fps)?.fps ?? 0, source: 'video', algorithm_version: 'jump-core-1', notes: notes.trim() || null,
        attempts: validJumps.map((jump) => ({ index: jump.jumpNumber, marks: jump.marks ?? {}, source: 'video', flight_ms: jump.result?.flightMs ?? jump.flightTimeMs, height_cm: jump.result?.heightCm ?? jump.jumpHeightCm, takeoff_vel_ms: jump.result?.takeoffVelMs ?? null, contact_ms: jump.result?.contactMs ?? null, rsi: jump.result?.rsi ?? null, rsi_mod: jump.result?.rsiMod ?? null, flags: jump.result?.flags ?? jump.flags ?? [], reasons: jump.result?.reasons ?? jump.reasons ?? [] })),
      } });
      if (saveError) throw saveError;

      setSaved(true);
    } catch {
      setError(txt.saveError);
    } finally {
      setSaving(false);
    }
  };

  const validJumps = jumps.filter((j) => j.isValid);
  const canAddMore = jumps.length < MAX_JUMPS;

  return (
    <div className={`fixed inset-0 z-50 flex flex-col overflow-hidden font-body ${isDark ? 'bg-gray-950' : 'bg-white'}`}>
      {/* Header */}
      <div className={`flex items-center gap-3 px-4 py-3 border-b shrink-0 ${isDark ? 'border-gray-800/80 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
        <button
          onClick={onClose}
          className={`transition-colors p-1 rounded-lg ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className={`text-base font-heading leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{txt.title}</h2>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>{txt.subtitle}</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setTab('assess')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              tab === 'assess'
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            {txt.assessment}
          </button>
          <button
            onClick={() => setTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              tab === 'history'
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            {txt.history}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'history' ? (
          <div className="p-4">
            <CMJHistory />
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Session config */}
            <div className={`rounded-2xl p-4 border space-y-3 ${isDark ? 'bg-gray-900 border-gray-800/60' : 'bg-gray-50 border-gray-200'}`}>
              <h3 className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                <Settings className="w-3.5 h-3.5 text-primary" />
                {txt.sessionConfig}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs mb-1.5 ${isDark ? 'text-gray-500' : 'text-gray-700'}`}>{txt.bodyMass}</label>
                  <input
                    type="number"
                    value={bodyMassKg}
                    onChange={(e) => setBodyMassKg(e.target.value)}
                    placeholder={txt.bodyMassPlaceholder}
                    min="30"
                    max="200"
                    className={`w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/50 transition-colors border ${isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-600' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs mb-1.5 ${isDark ? 'text-gray-500' : 'text-gray-700'}`}>Tipo de salto</label>
                  <select value={jumpType} onChange={(event) => { setJumpType(event.target.value as JumpType); setSaved(false); }} className={`w-full rounded-xl px-3 py-2 text-sm border ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}>
                    <option value="cmj">CMJ</option><option value="cmj_free_arms">CMJ brazos libres</option><option value="sj">SJ</option><option value="dj">DJ</option><option value="rj">RJ</option><option value="cmj_unilateral">CMJ unilateral</option>
                  </select>
                </div>
                {(jumpType === 'cmj' || jumpType === 'sj') && <div><label className="block text-xs mb-1.5 text-gray-500">Carga externa (kg)</label><input type="number" value={loadKg} onChange={(event) => { setLoadKg(event.target.value); setSaved(false); }} className="w-full rounded-xl px-3 py-2 text-sm bg-gray-800 border border-gray-700 text-white" /></div>}
                {jumpType === 'dj' && <div><label className="block text-xs mb-1.5 text-gray-500">Altura del cajón (cm)</label><input type="number" value={boxCm} onChange={(event) => { setBoxCm(event.target.value); setSaved(false); }} className="w-full rounded-xl px-3 py-2 text-sm bg-gray-800 border border-gray-700 text-white" /></div>}
                {jumpType === 'cmj_unilateral' && <div><label className="block text-xs mb-1.5 text-gray-500">Lado</label><select value={side} onChange={(event) => setSide(event.target.value as 'left' | 'right' | '')} className="w-full rounded-xl px-3 py-2 text-sm bg-gray-800 border border-gray-700 text-white"><option value="">Seleccionar</option><option value="left">Izquierdo</option><option value="right">Derecho</option></select></div>}
                <div><label className="block text-xs mb-1.5 text-gray-500">hPO (m, opcional)</label><input type="number" step="0.01" value={hpoM} onChange={(event) => { setHpoM(event.target.value); setSaved(false); }} className="w-full rounded-xl px-3 py-2 text-sm bg-gray-800 border border-gray-700 text-white" /></div>
              </div>
            </div>

            <div className="space-y-3">
              <CMJVideoCapture
                onJumpDetected={handleJumpDetectedFromVideo}
                onError={(msg) => setError(msg)}
                isActive={tab === 'assess'}
              />
              <div className={`border rounded-2xl p-3 space-y-1.5 ${isDark ? 'bg-gray-900 border-gray-800/60' : 'bg-gray-50 border-gray-200'}`}>
                <p className={`text-xs font-semibold ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{txt.recordingInstructions}</p>
                <ol className="space-y-1">
                  {txt.instructions.map((step, i) => (
                    <li key={i} className={`flex items-start gap-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-700'}`}>
                      <span className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
              <p className="text-xs text-gray-500">{txt.videoPrivacy}</p>
            </div>

            {!canAddMore && (
              <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-xs text-yellow-300">
                {txt.maxJumps}
              </div>
            )}

            {/* Results */}
            {jumps.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {txt.jumpsRecorded(jumps.length)}
                  </h3>
                  <button
                    onClick={resetSession}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    {txt.clear}
                  </button>
                </div>

                <CMJResultsPanel
                  jumps={validJumps}
                  bodyMassKg={bodyMassKg ? parseFloat(bodyMassKg) : undefined}
                />
                <button onClick={() => downloadJumpCsv({ clientSessionId, athleteId: user?.id ?? '', sessionDate: new Date().toISOString().split('T')[0], jumpType, bodyMassKg: Number(bodyMassKg), loadKg: Number(loadKg) || null, boxCm: Number(boxCm) || null, hpoM: Number(hpoM) || null, side: side || null, effectiveFps: validJumps.find((jump) => jump.fps)?.fps ?? 0, source: 'video', algorithmVersion: 'jump-core-1', attempts: validJumps.map((jump) => ({ index: jump.jumpNumber, marks: { takeoffMs: 0, landingMs: jump.flightTimeMs }, result: null, source: 'video', flags: [], reasons: [] })), saved })} className="w-full rounded-xl border border-gray-700 text-gray-300 py-2 text-xs">Exportar CSV</button>

                <div>
                  <label className={`block text-xs mb-1.5 ${isDark ? 'text-gray-500' : 'text-gray-700'}`}>{txt.sessionNotes}</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={txt.sessionNotesPlaceholder}
                    rows={2}
                    className={`w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none border ${isDark ? 'bg-gray-900 border-gray-800 text-white placeholder-gray-600' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <X className="w-4 h-4 text-red-400 shrink-0" />
                    <p className="text-xs text-red-300">{error}</p>
                  </div>
                )}

                {saved ? (
                  <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
                    <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-green-400">{txt.sessionSaved}</p>
                      <p className="text-xs text-green-400/60 mt-0.5">{txt.viewHistory}</p>
                    </div>
                    <button
                      onClick={resetSession}
                      className="text-xs text-gray-400 hover:text-white flex items-center gap-1 py-1.5 px-3 bg-gray-800 rounded-lg transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {txt.newSession}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={saveSession}
                    disabled={saving || validJumps.length === 0}
                    className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:bg-gray-800 disabled:text-gray-600 text-gray-900 font-semibold py-3.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-primary/20"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? txt.saving : txt.saveSession}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
