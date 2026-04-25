import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAthlete } from '../../contexts/AthleteContext';
import { supabase } from '../../lib/supabase';
import { User, Save, ChevronRight, ChevronLeft } from 'lucide-react';
import Section1BasicHealth from './anamnesis/Section1BasicHealth';
import Section2Training from './anamnesis/Section2Training';
import Section3Nutrition from './anamnesis/Section3Nutrition';
import Section4Goals from './anamnesis/Section4Goals';

interface Athlete {
  id: string;
  full_name: string;
  email: string;
}

interface Props {
  onSaveComplete?: () => void;
}

export default function NutritionAnamnesis({ onSaveComplete }: Props) {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const { selectedAthleteId, selectedAthleteName, setSelectedAthlete, setCalculatedMacros } = useAthlete();
  const [loading, setLoading] = useState(false);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [currentSection, setCurrentSection] = useState(1);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculation, setCalculation] = useState<any>(null);
  const [customMacros, setCustomMacros] = useState<any>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isEditingMacros, setIsEditingMacros] = useState(false);
  const [formData, setFormData] = useState<any>({
    age: 25,
    sex: 'male',
    height_cm: 175,
    weight_kg: 70,
    occupation: '',
    activity_level: 'active',
    work_hours: 'mixed',
    medical_conditions: '',
    medications_supplements: '',
    allergies_intolerances: '',
    sleep_hours: 7,
    sleep_quality: 'good',
    energy_levels: 'stable',
    low_energy_duration: '',
    low_energy_times: '',
    stress_level: 3,
    stress_management: '',
    alcohol_frequency: '',
    smoking_frequency: '',
    recreational_drugs: '',
    sport: '',
    training_frequency: '4-5x',
    training_hours_weekly: 5,
    training_time: 'afternoon',
    pre_workout_nutrition: '',
    during_workout_nutrition: '',
    post_workout_nutrition: '',
    eating_pattern: 'structured',
    dietary_preferences: 'omnivore',
    dietary_restrictions: '',
    breakfast_description: '',
    lunch_description: '',
    dinner_description: '',
    snacks_description: '',
    beverages_description: '',
    food_likes: '',
    food_dislikes: '',
    food_allergies: '',
    cooking_frequency: 'often',
    eating_out_frequency: 'sometimes',
    appetite_changes: '',
    relationship_with_food: 'healthy',
    relationship_food_notes: '',
    main_goal: 'performance',
    nutrition_goals: '',
    performance_expectations: '',
    upcoming_events: '',
    additional_notes: ''
  });

  // Determine user role
  const isTrainerOrAdmin = profile?.role === 'trainer' || profile?.role === 'admin';
  const isAthlete = profile?.role === 'athlete';

  useEffect(() => {
    // Only load athletes list if user is trainer/admin
    if (isTrainerOrAdmin) {
      loadAthletes();
    }
  }, [profile, isTrainerOrAdmin]);

  // Auto-select athlete's own profile if they're an athlete
  useEffect(() => {
    if (isAthlete && profile?.id && !selectedAthleteId) {
      setSelectedAthlete(profile.id, profile.full_name || '');
    }
  }, [isAthlete, profile, selectedAthleteId]);

  useEffect(() => {
    if (selectedAthleteId) {
      loadExistingAnamnesis();
    }
  }, [selectedAthleteId]);

  const loadAthletes = async () => {
    if (!profile?.id) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('assigned_trainer_id', profile.id)
        .order('full_name');
      if (data) setAthletes(data);
    } catch (error) {
      console.error('Error loading athletes:', error);
    }
  };

  const loadExistingAnamnesis = async () => {
    if (!selectedAthleteId) return;
    try {
      const { data } = await supabase
        .from('nutrition_anamnesis')
        .select('*')
        .eq('athlete_id', selectedAthleteId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setFormData(data);
    } catch (error) {
      console.error('Error loading anamnesis:', error);
    }
  };

  const handleSave = async () => {
    if (!selectedAthleteId || !profile?.id) {
      alert(language === 'es' ? 'Selecciona un atleta primero' : 'Select an athlete first');
      return;
    }
    setLoading(true);
    try {
      const dataToSave = {
        ...formData,
        athlete_id: selectedAthleteId,
        trainer_id: profile.id,
        section_progress: currentSection,
        is_complete: currentSection === 4,
        updated_at: new Date().toISOString()
      };

      const { data: existing } = await supabase
        .from('nutrition_anamnesis')
        .select('id')
        .eq('athlete_id', selectedAthleteId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let anamnesisError;
      if (existing) {
        const { error } = await supabase
          .from('nutrition_anamnesis')
          .update(dataToSave)
          .eq('id', existing.id);
        anamnesisError = error;
      } else {
        const { error } = await supabase
          .from('nutrition_anamnesis')
          .insert(dataToSave);
        anamnesisError = error;
      }

      if (anamnesisError) throw anamnesisError;

      const macrosToSave = customMacros || calculation;
      if (macrosToSave && formData.weight_kg) {
        setCalculatedMacros(macrosToSave);

        const { error: targetsError } = await supabase
          .from('nutrition_targets')
          .upsert({
            athlete_id: selectedAthleteId,
            weight_kg: formData.weight_kg,
            height_cm: formData.height_cm,
            bmr: macrosToSave.bmr,
            activity_factor: getActivityFactor(formData.activity_level || 'active', formData.training_frequency || '4-5x'),
            tdee: macrosToSave.tdee,
            target_calories: macrosToSave.tdee,
            protein_g: macrosToSave.protein_g,
            protein_g_per_kg: macrosToSave.protein_g / formData.weight_kg,
            carbs_g: macrosToSave.carbs_g,
            carbs_g_per_kg: macrosToSave.carbs_g / formData.weight_kg,
            fat_g: macrosToSave.fat_g,
            fat_g_per_kg: macrosToSave.fat_g / formData.weight_kg,
            protein_percent: macrosToSave.protein_percent,
            carbs_percent: macrosToSave.carbs_percent,
            fat_percent: macrosToSave.fat_percent
          }, { onConflict: 'athlete_id' });

        if (targetsError) {
          console.error('Error saving targets:', targetsError);
        }
      }

      setLoading(false);
      setShowSuccessMessage(true);

      setTimeout(() => {
        if (onSaveComplete) {
          onSaveComplete();
        }
      }, 1500);
    } catch (error: any) {
      console.error('Error saving:', error);
      setLoading(false);
      alert(language === 'es' ? `Error al guardar: ${error.message}` : `Error saving: ${error.message}`);
    }
  };

  const calculateBMR = (sex: string, weight: number, height: number, age: number): number => {
    if (sex === 'male') {
      return 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
    }
    return 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
  };

  const getActivityFactor = (activityLevel: string, trainingFrequency: string): number => {
    const baseFactors: Record<string, number> = {
      desk_job: 1.2,
      active: 1.55,
      manual_labor: 1.725
    };
    let factor = baseFactors[activityLevel] || 1.55;
    if (trainingFrequency === '6+') {
      factor = Math.max(factor, 1.9);
    } else if (trainingFrequency === '4-5x') {
      factor = Math.max(factor, 1.725);
    }
    return factor;
  };

  const calculateMacros = (tdee: number, weight: number, goal: string) => {
    let proteinMultiplier = 2.0;
    let carbsMultiplier = 5.0;
    let fatMultiplier = 1.0;

    switch (goal) {
      case 'muscle_gain':
        proteinMultiplier = 2.2;
        carbsMultiplier = 6.0;
        fatMultiplier = 1.0;
        break;
      case 'fat_loss':
        proteinMultiplier = 2.4;
        carbsMultiplier = 3.0;
        fatMultiplier = 0.8;
        break;
      case 'performance':
        proteinMultiplier = 2.0;
        carbsMultiplier = 6.0;
        fatMultiplier = 1.0;
        break;
      case 'recovery':
        proteinMultiplier = 1.8;
        carbsMultiplier = 5.0;
        fatMultiplier = 1.2;
        break;
    }

    const protein_g = weight * proteinMultiplier;
    const carbs_g = weight * carbsMultiplier;
    const fat_g = weight * fatMultiplier;
    const totalCalories = (protein_g * 4) + (carbs_g * 4) + (fat_g * 9);

    return {
      protein_g,
      carbs_g,
      fat_g,
      protein_percent: (protein_g * 4 / totalCalories) * 100,
      carbs_percent: (carbs_g * 4 / totalCalories) * 100,
      fat_percent: (fat_g * 9 / totalCalories) * 100
    };
  };

  const handleCalculate = async () => {
    if (!formData.age || !formData.weight_kg || !formData.height_cm) {
      alert(language === 'es' ? 'Completa edad, peso y altura primero' : 'Complete age, weight and height first');
      return;
    }
    const bmr = calculateBMR(formData.sex || 'male', formData.weight_kg, formData.height_cm, formData.age);
    const activityFactor = getActivityFactor(formData.activity_level || 'active', formData.training_frequency || '4-5x');
    const tdee = bmr * activityFactor;
    const macros = calculateMacros(tdee, formData.weight_kg, formData.main_goal || 'performance');
    const result = { bmr, tdee, ...macros };
    setCalculation(result);
    setCustomMacros(result);
    setShowCalculator(true);
    setIsEditingMacros(false);
  };

  const handleMacroChange = (macro: 'protein' | 'carbs' | 'fat', value: number) => {
    if (!customMacros) return;
    const newMacros = { ...customMacros };
    if (macro === 'protein') newMacros.protein_g = value;
    else if (macro === 'carbs') newMacros.carbs_g = value;
    else if (macro === 'fat') newMacros.fat_g = value;

    const totalCalories = (newMacros.protein_g * 4) + (newMacros.carbs_g * 4) + (newMacros.fat_g * 9);
    newMacros.tdee = totalCalories;
    newMacros.protein_percent = (newMacros.protein_g * 4 / totalCalories) * 100;
    newMacros.carbs_percent = (newMacros.carbs_g * 4 / totalCalories) * 100;
    newMacros.fat_percent = (newMacros.fat_g * 9 / totalCalories) * 100;
    setCustomMacros(newMacros);
  };

  const resetToSuggested = () => {
    setCustomMacros(calculation);
    setIsEditingMacros(false);
  };

  const t = (key: string) => {
    const translations: Record<string, string> = {
      'anamnesis.title': language === 'es' ? 'Anamnesis Nutricional' : 'Nutritional Anamnesis',
      'anamnesis.select_athlete': language === 'es' ? 'Seleccionar Atleta' : 'Select Athlete',
      'anamnesis.save': language === 'es' ? 'Guardar' : 'Save',
      'anamnesis.calculate': language === 'es' ? 'Calcular Requerimientos' : 'Calculate Requirements',
      'section.1': language === 'es' ? 'Información Básica y Salud' : 'Basic & Health Info',
      'section.2': language === 'es' ? 'Entrenamiento y Actividad' : 'Training & Activity',
      'section.3': language === 'es' ? 'Hábitos Nutricionales' : 'Nutrition Habits',
      'section.4': language === 'es' ? 'Objetivos y Expectativas' : 'Goals & Expectations',
    };
    return translations[key] || key;
  };

  return (
    <div className="space-y-6">
      {/* Success Message Toast */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in">
          <div className="w-6 h-6 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center">
            <span className="text-green-500 font-bold">✓</span>
          </div>
          <div>
            <p className="font-semibold">{language === 'es' ? 'Anamnesis Guardada' : 'Anamnesis Saved'}</p>
            <p className="text-sm opacity-90">{language === 'es' ? 'Datos guardados correctamente.' : 'Data saved successfully.'}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <User className="w-6 h-6 text-[#fdda36]" />
          {t('anamnesis.title')}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {language === 'es' ? 'Anamnesis nutricional completa y personalizada para cada atleta' : 'Complete and personalized nutritional anamnesis for each athlete'}
        </p>
      </div>

      {/* Athlete Selector - Only show for trainers/admins */}
      {isTrainerOrAdmin && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('anamnesis.select_athlete')} *
          </label>
          <select
            value={selectedAthleteId || ''}
            onChange={(e) => {
              const athleteId = e.target.value;
              const athlete = athletes.find(a => a.id === athleteId);
              if (athlete) {
                setSelectedAthlete(athleteId, athlete.full_name);
              }
            }}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36]"
          >
            <option value="">{language === 'es' ? 'Selecciona un atleta...' : 'Select an athlete...'}</option>
            {athletes.map((athlete) => (
              <option key={athlete.id} value={athlete.id}>{athlete.full_name} ({athlete.email})</option>
            ))}
          </select>
        </div>
      )}

      {selectedAthleteId && (
        <>
          {/* Progress */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {language === 'es' ? 'Sección' : 'Section'} {currentSection}/4: {t(`section.${currentSection}`)}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">{Math.round((currentSection / 4) * 100)}%</span>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((section) => (
                <button
                  key={section}
                  onClick={() => setCurrentSection(section)}
                  className={`flex-1 h-2 rounded-full transition-colors ${section <= currentSection ? 'bg-[#fdda36]' : 'bg-gray-200 dark:bg-gray-700'}`}
                  title={t(`section.${section}`)}
                />
              ))}
            </div>
          </div>

          {/* Section Content */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            {currentSection === 1 && <Section1BasicHealth formData={formData} setFormData={setFormData} language={language} />}
            {currentSection === 2 && <Section2Training formData={formData} setFormData={setFormData} language={language} />}
            {currentSection === 3 && <Section3Nutrition formData={formData} setFormData={setFormData} language={language} />}
            {currentSection === 4 && (
              <Section4Goals
                formData={formData}
                setFormData={setFormData}
                language={language}
                calculation={calculation}
                customMacros={customMacros}
                isEditingMacros={isEditingMacros}
                showCalculator={showCalculator}
                onCalculate={handleCalculate}
                onMacroChange={handleMacroChange}
                onResetToSuggested={resetToSuggested}
                setIsEditingMacros={setIsEditingMacros}
              />
            )}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            {currentSection > 1 && (
              <button
                onClick={() => setCurrentSection(currentSection - 1)}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
                {language === 'es' ? 'Anterior' : 'Previous'}
              </button>
            )}
            <button onClick={handleSave} disabled={loading} className="flex-1 px-6 py-3 bg-[#fdda36] hover:bg-[#ffd51a] text-[#514163] font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              <Save className="w-5 h-5" />
              {t('anamnesis.save')}
            </button>
            {currentSection < 4 && (
              <button
                onClick={() => setCurrentSection(currentSection + 1)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {language === 'es' ? 'Siguiente' : 'Next'}
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
