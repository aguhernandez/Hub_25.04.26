import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { Scale, Plus, Trash2, CreditCard as Edit3, Save, X, ChevronDown, ChevronUp, Activity, Droplets, Flame, TrendingDown, TrendingUp } from 'lucide-react';

interface BioimpedanceMeasurement {
  id: string;
  user_id: string;
  measurement_date: string;
  weight: number | null;
  height: number | null;
  adipose_tissue_percent: number | null;
  adipose_tissue_kg: number | null;
  muscle_mass_percent: number | null;
  muscle_mass_kg: number | null;
  bone_tissue_percent: number | null;
  bone_tissue_kg: number | null;
  skin_percent: number | null;
  skin_kg: number | null;
  residual_mass_percent: number | null;
  residual_mass_kg: number | null;
  total_body_water_percent: number | null;
  total_body_water_liters: number | null;
  basal_metabolic_rate: number | null;
  visceral_fat_level: number | null;
  device_model: string | null;
  device_brand: string | null;
  notes: string | null;
  created_at: string;
}

const emptyForm = {
  measurement_date: new Date().toISOString().split('T')[0],
  weight: '',
  height: '',
  adipose_tissue_percent: '',
  adipose_tissue_kg: '',
  muscle_mass_percent: '',
  muscle_mass_kg: '',
  bone_tissue_percent: '',
  bone_tissue_kg: '',
  skin_percent: '',
  skin_kg: '',
  residual_mass_percent: '',
  residual_mass_kg: '',
  total_body_water_percent: '',
  total_body_water_liters: '',
  basal_metabolic_rate: '',
  visceral_fat_level: '',
  device_brand: '',
  device_model: '',
  notes: '',
};

type FormState = typeof emptyForm;

export default function BioimpedancePage() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const [measurements, setMeasurements] = useState<BioimpedanceMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const t = (en: string, es: string) => language === 'es' ? es : en;

  useEffect(() => {
    if (profile) loadMeasurements();
  }, [profile]);

  const loadMeasurements = async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase
      .from('bioimpedance_measurements')
      .select('*')
      .eq('user_id', profile.id)
      .order('measurement_date', { ascending: false });
    setMeasurements(data || []);
    setLoading(false);
  };

  const handleEdit = (m: BioimpedanceMeasurement) => {
    setEditingId(m.id);
    setForm({
      measurement_date: m.measurement_date,
      weight: m.weight?.toString() ?? '',
      height: m.height?.toString() ?? '',
      adipose_tissue_percent: m.adipose_tissue_percent?.toString() ?? '',
      adipose_tissue_kg: m.adipose_tissue_kg?.toString() ?? '',
      muscle_mass_percent: m.muscle_mass_percent?.toString() ?? '',
      muscle_mass_kg: m.muscle_mass_kg?.toString() ?? '',
      bone_tissue_percent: m.bone_tissue_percent?.toString() ?? '',
      bone_tissue_kg: m.bone_tissue_kg?.toString() ?? '',
      skin_percent: m.skin_percent?.toString() ?? '',
      skin_kg: m.skin_kg?.toString() ?? '',
      residual_mass_percent: m.residual_mass_percent?.toString() ?? '',
      residual_mass_kg: m.residual_mass_kg?.toString() ?? '',
      total_body_water_percent: m.total_body_water_percent?.toString() ?? '',
      total_body_water_liters: m.total_body_water_liters?.toString() ?? '',
      basal_metabolic_rate: m.basal_metabolic_rate?.toString() ?? '',
      visceral_fat_level: m.visceral_fat_level?.toString() ?? '',
      device_brand: m.device_brand ?? '',
      device_model: m.device_model ?? '',
      notes: m.notes ?? '',
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const toNum = (v: string) => v === '' ? null : parseFloat(v);
  const toInt = (v: string) => v === '' ? null : parseInt(v);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);

    const payload = {
      user_id: profile.id,
      measurement_date: form.measurement_date,
      weight: toNum(form.weight),
      height: toNum(form.height),
      adipose_tissue_percent: toNum(form.adipose_tissue_percent),
      adipose_tissue_kg: toNum(form.adipose_tissue_kg),
      muscle_mass_percent: toNum(form.muscle_mass_percent),
      muscle_mass_kg: toNum(form.muscle_mass_kg),
      bone_tissue_percent: toNum(form.bone_tissue_percent),
      bone_tissue_kg: toNum(form.bone_tissue_kg),
      skin_percent: toNum(form.skin_percent),
      skin_kg: toNum(form.skin_kg),
      residual_mass_percent: toNum(form.residual_mass_percent),
      residual_mass_kg: toNum(form.residual_mass_kg),
      total_body_water_percent: toNum(form.total_body_water_percent),
      total_body_water_liters: toNum(form.total_body_water_liters),
      basal_metabolic_rate: toNum(form.basal_metabolic_rate),
      visceral_fat_level: toInt(form.visceral_fat_level),
      device_brand: form.device_brand || null,
      device_model: form.device_model || null,
      notes: form.notes || null,
    };

    if (editingId) {
      await supabase.from('bioimpedance_measurements').update(payload).eq('id', editingId);
    } else {
      await supabase.from('bioimpedance_measurements').insert(payload);
    }

    setSaving(false);
    handleCancel();
    loadMeasurements();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await supabase.from('bioimpedance_measurements').delete().eq('id', id);
    setDeletingId(null);
    loadMeasurements();
  };

  const latest = measurements[0];

  const field = (
    label: string,
    key: keyof FormState,
    unit?: string,
    step = '0.1'
  ) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
        {label}{unit ? <span className="text-gray-400 ml-1">({unit})</span> : ''}
      </label>
      <input
        type="number"
        step={step}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#fdda36]/50"
      />
    </div>
  );

  const pct = (v: number | null) => v !== null ? `${v.toFixed(1)}%` : '—';
  const kg = (v: number | null) => v !== null ? `${v.toFixed(1)} kg` : '—';
  const num = (v: number | null, suffix = '') => v !== null ? `${v}${suffix}` : '—';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Scale className="w-6 h-6 text-[#fdda36]" />
            {t('Body Composition', 'Composición Corporal')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {t('Bioimpedance measurements', 'Mediciones de bioimpedancia')}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[#fdda36] text-[#0C0D0F] hover:bg-[#f5d030] transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('Add Measurement', 'Agregar Medición')}
          </button>
        )}
      </div>

      {/* Latest Summary Cards */}
      {latest && !showForm && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: t('Body Fat', 'Grasa Corporal'),
              value: pct(latest.adipose_tissue_percent),
              icon: TrendingDown,
              color: 'text-orange-500'
            },
            {
              label: t('Muscle Mass', 'Masa Muscular'),
              value: pct(latest.muscle_mass_percent),
              icon: TrendingUp,
              color: 'text-blue-500'
            },
            {
              label: t('Body Water', 'Agua Corporal'),
              value: pct(latest.total_body_water_percent),
              icon: Droplets,
              color: 'text-cyan-500'
            },
            {
              label: t('BMR', 'TMB'),
              value: latest.basal_metabolic_rate ? `${latest.basal_metabolic_rate} kcal` : '—',
              icon: Flame,
              color: 'text-red-500'
            },
          ].map(card => (
            <div
              key={card.label}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <card.icon className={`w-4 h-4 ${card.color}`} />
                <span className="text-xs text-gray-500 dark:text-gray-400">{card.label}</span>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{card.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(latest.measurement_date).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {editingId
                ? t('Edit Measurement', 'Editar Medición')
                : t('New Measurement', 'Nueva Medición')}
            </h2>
            <button onClick={handleCancel} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Date & Device */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t('Date', 'Fecha')}
              </label>
              <input
                type="date"
                value={form.measurement_date}
                onChange={e => setForm(f => ({ ...f, measurement_date: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#fdda36]/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t('Device Brand', 'Marca del Equipo')}
              </label>
              <input
                type="text"
                value={form.device_brand}
                onChange={e => setForm(f => ({ ...f, device_brand: e.target.value }))}
                placeholder="e.g. Tanita, InBody"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#fdda36]/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t('Device Model', 'Modelo del Equipo')}
              </label>
              <input
                type="text"
                value={form.device_model}
                onChange={e => setForm(f => ({ ...f, device_model: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#fdda36]/50"
              />
            </div>
          </div>

          {/* Basic Measures */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
              {t('Basic Measures', 'Medidas Básicas')}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {field(t('Weight', 'Peso'), 'weight', 'kg')}
              {field(t('Height', 'Talla'), 'height', 'cm', '1')}
            </div>
          </div>

          {/* Body Composition */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
              {t('Body Composition', 'Composición Corporal')}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {field(t('Fat %', 'Grasa %'), 'adipose_tissue_percent', '%')}
              {field(t('Fat', 'Grasa'), 'adipose_tissue_kg', 'kg')}
              {field(t('Muscle %', 'Músculo %'), 'muscle_mass_percent', '%')}
              {field(t('Muscle', 'Músculo'), 'muscle_mass_kg', 'kg')}
              {field(t('Bone %', 'Hueso %'), 'bone_tissue_percent', '%')}
              {field(t('Bone', 'Hueso'), 'bone_tissue_kg', 'kg')}
              {field(t('Skin %', 'Piel %'), 'skin_percent', '%')}
              {field(t('Skin', 'Piel'), 'skin_kg', 'kg')}
              {field(t('Residual %', 'Residual %'), 'residual_mass_percent', '%')}
              {field(t('Residual', 'Residual'), 'residual_mass_kg', 'kg')}
            </div>
          </div>

          {/* Hydration & Metabolism */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
              {t('Hydration & Metabolism', 'Hidratación y Metabolismo')}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {field(t('Body Water %', 'Agua Corporal %'), 'total_body_water_percent', '%')}
              {field(t('Body Water', 'Agua Corporal'), 'total_body_water_liters', 'L')}
              {field(t('BMR', 'TMB'), 'basal_metabolic_rate', 'kcal', '1')}
              {field(t('Visceral Fat Level', 'Grasa Visceral'), 'visceral_fat_level', '', '1')}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {t('Notes', 'Notas')}
            </label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#fdda36]/50 resize-none"
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {t('Cancel', 'Cancelar')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.measurement_date}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-[#fdda36] text-[#0C0D0F] hover:bg-[#f5d030] transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? t('Saving...', 'Guardando...') : t('Save', 'Guardar')}
            </button>
          </div>
        </div>
      )}

      {/* History List */}
      {!showForm && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300">
            {t('Measurement History', 'Historial de Mediciones')}
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : measurements.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
              <Activity className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {t('No measurements yet. Add your first one!', 'Sin mediciones aún. ¡Agrega la primera!')}
              </p>
            </div>
          ) : (
            measurements.map((m, idx) => {
              const isExpanded = expandedId === m.id;
              const isFirst = idx === 0;
              return (
                <div
                  key={m.id}
                  className={`bg-white dark:bg-gray-800 rounded-xl border transition-all ${
                    isFirst
                      ? 'border-[#fdda36]/40 dark:border-[#fdda36]/30'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {/* Row Header */}
                  <div
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : m.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-white text-sm">
                          {new Date(m.measurement_date).toLocaleDateString(
                            language === 'es' ? 'es-ES' : 'en-US',
                            { year: 'numeric', month: 'long', day: 'numeric' }
                          )}
                        </span>
                        {isFirst && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fdda36]/20 text-[#514163] dark:text-[#fdda36]">
                            {t('Latest', 'Reciente')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {m.weight && <span>{m.weight} kg</span>}
                        {m.adipose_tissue_percent && <span>{t('Fat', 'Grasa')}: {pct(m.adipose_tissue_percent)}</span>}
                        {m.muscle_mass_percent && <span>{t('Muscle', 'Músculo')}: {pct(m.muscle_mass_percent)}</span>}
                        {m.device_brand && <span className="text-gray-400">· {m.device_brand}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); handleEdit(m); }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(m.id); }}
                        disabled={deletingId === m.id}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 text-gray-400" />
                        : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                        {[
                          [t('Weight', 'Peso'), kg(m.weight)],
                          [t('Height', 'Talla'), m.height ? `${m.height} cm` : '—'],
                          [t('Body Fat', 'Grasa Corporal'), `${pct(m.adipose_tissue_percent)} · ${kg(m.adipose_tissue_kg)}`],
                          [t('Muscle Mass', 'Masa Muscular'), `${pct(m.muscle_mass_percent)} · ${kg(m.muscle_mass_kg)}`],
                          [t('Bone Mass', 'Masa Ósea'), `${pct(m.bone_tissue_percent)} · ${kg(m.bone_tissue_kg)}`],
                          [t('Skin', 'Piel'), `${pct(m.skin_percent)} · ${kg(m.skin_kg)}`],
                          [t('Residual', 'Residual'), `${pct(m.residual_mass_percent)} · ${kg(m.residual_mass_kg)}`],
                          [t('Body Water', 'Agua Corporal'), `${pct(m.total_body_water_percent)} · ${m.total_body_water_liters ? `${m.total_body_water_liters} L` : '—'}`],
                          [t('BMR', 'TMB'), num(m.basal_metabolic_rate, ' kcal')],
                          [t('Visceral Fat', 'Grasa Visceral'), num(m.visceral_fat_level)],
                          [t('Device', 'Equipo'), [m.device_brand, m.device_model].filter(Boolean).join(' ') || '—'],
                        ].map(([label, value]) => (
                          <div key={label as string}>
                            <span className="block text-xs text-gray-400 dark:text-gray-500">{label}</span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">{value}</span>
                          </div>
                        ))}
                      </div>
                      {m.notes && (
                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                          <span className="text-xs text-gray-400">{t('Notes', 'Notas')}: </span>
                          <span className="text-sm text-gray-600 dark:text-gray-300">{m.notes}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
