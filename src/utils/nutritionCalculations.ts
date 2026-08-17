export interface NutritionProfile {
  age: number;
  sex: 'male' | 'female';
  weight_kg: number;
  height_cm: number;
  activity_factor?: number;
  goal_type?: 'maintain' | 'gain_muscle' | 'lose_fat' | 'recomp';
  lean_mass_kg?: number;
  fat_mass_kg?: number;
}

export interface TrainingLoad {
  duration_minutes: number;
  intensity: 'low' | 'moderate' | 'high' | 'very_high';
  type: 'strength' | 'endurance' | 'mixed' | 'rest';
}

export interface FuelDayResult {
  fuel_day_type: 'green' | 'yellow' | 'red';
  total_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  protein_percent: number;
  carbs_percent: number;
  fat_percent: number;
  training_load_score: number;
}

export function calculateBMR(profile: NutritionProfile): number {
  const { age, sex, weight_kg, height_cm } = profile;

  if (sex === 'male') {
    return 10 * weight_kg + 6.25 * height_cm - 5 * age + 5;
  } else {
    return 10 * weight_kg + 6.25 * height_cm - 5 * age - 161;
  }
}

export function calculateTDEE(bmr: number, activityFactor: number = 1.2): number {
  return bmr * activityFactor;
}

export function calculateProteinTarget(profile: NutritionProfile): number {
  if (profile.lean_mass_kg) {
    return profile.lean_mass_kg * 2.2;
  }

  return profile.weight_kg * 2.0;
}

export function calculateTrainingLoadScore(training: TrainingLoad): number {
  const intensityScores = {
    'low': 1,
    'moderate': 2,
    'high': 3,
    'very_high': 4
  };

  const typeMultipliers = {
    'rest': 0,
    'strength': 1.0,
    'endurance': 1.2,
    'mixed': 1.1
  };

  if (training.type === 'rest') return 0;

  const baseScore = intensityScores[training.intensity];
  const durationFactor = Math.min(training.duration_minutes / 60, 3);
  const typeMultiplier = typeMultipliers[training.type];

  return baseScore * durationFactor * typeMultiplier;
}

export function determineFuelDayType(trainingLoadScore: number): 'green' | 'yellow' | 'red' {
  if (trainingLoadScore >= 3.5) return 'green';
  if (trainingLoadScore >= 1.5) return 'yellow';
  return 'red';
}

export function calculateDailyMacros(
  profile: NutritionProfile,
  trainingLoad: TrainingLoad
): FuelDayResult {
  const bmr = calculateBMR(profile);
  const activityFactor = profile.activity_factor || 1.2;
  const tdee = calculateTDEE(bmr, activityFactor);

  const trainingLoadScore = calculateTrainingLoadScore(trainingLoad);
  const fuelDayType = determineFuelDayType(trainingLoadScore);

  const proteinTarget = calculateProteinTarget(profile);

  let totalKcal: number;
  let carbsPercent: number;
  let proteinPercent: number;
  let fatPercent: number;

  const goalMultipliers = {
    'maintain': 1.0,
    'gain_muscle': 1.15,
    'lose_fat': 0.85,
    'recomp': 0.95
  };

  const goalMultiplier = goalMultipliers[profile.goal_type || 'maintain'];

  switch (fuelDayType) {
    case 'green':
      totalKcal = Math.round(tdee * goalMultiplier * 1.2);
      carbsPercent = 55;
      proteinPercent = 20;
      fatPercent = 25;
      break;

    case 'yellow':
      totalKcal = Math.round(tdee * goalMultiplier);
      carbsPercent = 45;
      proteinPercent = 25;
      fatPercent = 30;
      break;

    case 'red':
      totalKcal = Math.round(tdee * goalMultiplier * 0.85);
      carbsPercent = 35;
      proteinPercent = 30;
      fatPercent = 35;
      break;
  }

  const proteinKcal = proteinTarget * 4;
  const proteinKcalFromPercent = (totalKcal * proteinPercent) / 100;
  const finalProteinG = Math.max(proteinTarget, proteinKcalFromPercent / 4);

  const remainingKcal = totalKcal - (finalProteinG * 4);
  const carbsG = Math.round((remainingKcal * (carbsPercent / (carbsPercent + fatPercent))) / 4);
  const fatG = Math.round((remainingKcal * (fatPercent / (carbsPercent + fatPercent))) / 9);

  return {
    fuel_day_type: fuelDayType,
    total_kcal: totalKcal,
    protein_g: Math.round(finalProteinG),
    carbs_g: carbsG,
    fat_g: fatG,
    protein_percent: Math.round((finalProteinG * 4 / totalKcal) * 100),
    carbs_percent: Math.round((carbsG * 4 / totalKcal) * 100),
    fat_percent: Math.round((fatG * 9 / totalKcal) * 100),
    training_load_score: trainingLoadScore
  };
}

export function adjustMacrosForAnthropometry(
  currentMacros: FuelDayResult,
  previousLeanMass: number,
  currentLeanMass: number,
  previousFatMass: number,
  currentFatMass: number
): FuelDayResult {
  const leanMassChange = currentLeanMass - previousLeanMass;
  const fatMassChange = currentFatMass - previousFatMass;

  let kcalAdjustment = 0;
  let carbsAdjustment = 0;

  if (leanMassChange > 0.3) {
    kcalAdjustment = Math.round(currentMacros.total_kcal * 0.05);
    carbsAdjustment = 1.1;
  } else if (leanMassChange < -0.3) {
    kcalAdjustment = Math.round(currentMacros.total_kcal * -0.05);
    carbsAdjustment = 0.9;
  }

  if (fatMassChange > 0.5) {
    kcalAdjustment -= Math.round(currentMacros.total_kcal * 0.05);
  }

  const newTotalKcal = currentMacros.total_kcal + kcalAdjustment;
  const newProteinG = Math.round(currentLeanMass * 2.2);
  const newCarbsG = Math.round(currentMacros.carbs_g * carbsAdjustment);

  const proteinKcal = newProteinG * 4;
  const carbsKcal = newCarbsG * 4;
  const fatKcal = newTotalKcal - proteinKcal - carbsKcal;
  const newFatG = Math.round(fatKcal / 9);

  return {
    ...currentMacros,
    total_kcal: newTotalKcal,
    protein_g: newProteinG,
    carbs_g: newCarbsG,
    fat_g: Math.max(30, newFatG),
    protein_percent: Math.round((newProteinG * 4 / newTotalKcal) * 100),
    carbs_percent: Math.round((newCarbsG * 4 / newTotalKcal) * 100),
    fat_percent: Math.round((newFatG * 9 / newTotalKcal) * 100)
  };
}

export function calculateAdherenceScore(
  targetKcal: number,
  actualKcal: number,
  targetProtein: number,
  actualProtein: number,
  targetCarbs: number,
  actualCarbs: number,
  targetFat: number,
  actualFat: number
): number {
  const kcalDiff = Math.abs(targetKcal - actualKcal);
  const kcalScore = Math.max(0, 100 - (kcalDiff / targetKcal * 100));

  const proteinDiff = Math.abs(targetProtein - actualProtein);
  const proteinScore = Math.max(0, 100 - (proteinDiff / targetProtein * 100));

  const carbsDiff = Math.abs(targetCarbs - actualCarbs);
  const carbsScore = Math.max(0, 100 - (carbsDiff / targetCarbs * 100));

  const fatDiff = Math.abs(targetFat - actualFat);
  const fatScore = Math.max(0, 100 - (fatDiff / targetFat * 100));

  return Math.round(
    kcalScore * 0.4 +
    proteinScore * 0.3 +
    carbsScore * 0.2 +
    fatScore * 0.1
  );
}

export function calculateNutritionScore(adherenceScores: number[]): number {
  if (adherenceScores.length === 0) return 0;

  const avg = adherenceScores.reduce((sum, score) => sum + score, 0) / adherenceScores.length;

  const consistency = 100 - (Math.max(...adherenceScores) - Math.min(...adherenceScores));

  return Math.round(avg * 0.7 + consistency * 0.3);
}

export function getFuelDayColor(type: 'green' | 'yellow' | 'red'): {
  bg: string;
  text: string;
  border: string;
  badge: string;
} {
  switch (type) {
    case 'green':
      return {
        bg: 'bg-gradient-to-br from-green-50 to-emerald-100',
        text: 'text-green-700',
        border: 'border-green-300',
        badge: 'bg-green-500'
      };
    case 'yellow':
      return {
        bg: 'bg-gradient-to-br from-yellow-50 to-amber-100',
        text: 'text-yellow-700',
        border: 'border-yellow-300',
        badge: 'bg-yellow-500'
      };
    case 'red':
      return {
        bg: 'bg-gradient-to-br from-red-50 to-orange-100',
        text: 'text-red-700',
        border: 'border-red-300',
        badge: 'bg-red-500'
      };
  }
}

export function getMealTypeIcon(mealType: string): string {
  const icons: Record<string, string> = {
    'breakfast': '🌅',
    'morning_snack': '☕',
    'lunch': '🍽️',
    'afternoon_snack': '🍎',
    'pre_training': '⚡',
    'during_training': '💧',
    'post_training': '💪',
    'dinner': '🌙',
    'evening_snack': '🌃'
  };
  return icons[mealType] || '🍴';
}

export function getMealTypeLabel(mealType: string): string {
  const labels: Record<string, string> = {
    'breakfast': 'Breakfast',
    'morning_snack': 'Morning Snack',
    'lunch': 'Lunch',
    'afternoon_snack': 'Afternoon Snack',
    'pre_training': 'Pre-Training',
    'during_training': 'During Training',
    'post_training': 'Post-Training',
    'dinner': 'Dinner',
    'evening_snack': 'Evening Snack'
  };
  return labels[mealType] || mealType;
}
