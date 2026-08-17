import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PI = Math.PI;

function sanitizeInput(value: any): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

function calculateSum6Skinfolds(
  triceps: number,
  subscapular: number,
  supraspinale: number,
  abdominal: number,
  frontThigh: number,
  medialCalf: number
): number {
  return triceps + subscapular + supraspinale + abdominal + frontThigh + medialCalf;
}

function calculateSumDiameters(
  biacromial: number,
  biiliocristal: number,
  humerus: number,
  femur: number
): number {
  return biacromial + biiliocristal + (humerus * 2) + (femur * 2);
}

function calculateCorrectedArmGirth(armGirth: number, tricepsSF: number): number {
  return armGirth - (tricepsSF * PI / 10);
}

function calculateCorrectedThighGirth(thighGirth: number, thighSF: number): number {
  return thighGirth - (thighSF * PI / 10);
}

function calculateCorrectedCalfGirth(calfGirth: number, calfSF: number): number {
  return calfGirth - (calfSF * PI / 10);
}

function calculateCorrectedThoraxGirth(chestGirth: number, subscapularSF: number): number {
  return chestGirth - (subscapularSF * PI / 10);
}

function calculateCorrectedWaistGirth(waistGirth: number, abdominalSF: number): number {
  return waistGirth - (abdominalSF * 0.3141);
}

function calculateSumCorrectedPerimeters(
  armCorr: number,
  forearm: number,
  thighCorr: number,
  calfCorr: number,
  thoraxCorr: number
): number {
  return armCorr + forearm + thighCorr + calfCorr + thoraxCorr;
}

function calculateSkinMass(weight: number, height: number, sex: 'male' | 'female', age: number) {
  let kAS: number;
  if (age < 12) {
    kAS = 70.691;
  } else {
    kAS = (sex === 'male') ? 68.308 : 73.074;
  }

  const tSkin = (sex === 'male') ? 2.07 : 1.96;
  const surfaceArea = (kAS * Math.pow(weight, 0.425) * Math.pow(height, 0.725)) / 10000;
  const skinMassKg = surfaceArea * tSkin * 1.05;

  return {
    skinMassKg,
    areaSurface: surfaceArea,
    skinThickness: tSkin,
    constantAS: kAS
  };
}

function calculateAdiposeMass(sum6: number, height: number) {
  const statureFactor = 170.18 / height;
  const scaledSum6 = sum6 * statureFactor;

  // Phantom reference values for adipose
  const PHANTOM_MEAN = 116.41;
  const PHANTOM_SD = 34.79;
  const PHANTOM_MASS = 25.6; // kg at phantom height

  // Calculate Z-score
  const zScore = (scaledSum6 - PHANTOM_MEAN) / PHANTOM_SD;

  // Calculate mass using Phantom formula: (Z * SD + Mean_mass) / factor³
  const fatMassKg = ((zScore * 5.85) + PHANTOM_MASS) / Math.pow(statureFactor, 3);

  return { zScore, fatMassKg };
}

function calculateMuscleMass(sumCorrectedPerims: number, height: number, includeChest: boolean = true) {
  const statureFactor = 170.18 / height;
  const scaledPerims = sumCorrectedPerims * statureFactor;

  // Phantom reference values for muscle
  const PHANTOM_MEAN = includeChest ? 207.21 : 120.46;
  const PHANTOM_SD = 13.74;
  const PHANTOM_MASS = 24.5; // kg at phantom height

  // Calculate Z-score
  const zScore = (scaledPerims - PHANTOM_MEAN) / PHANTOM_SD;

  // Calculate mass using Phantom formula: (Z * SD + Mean_mass) / factor³
  const muscleMassKg = ((zScore * 5.4) + PHANTOM_MASS) / Math.pow(statureFactor, 3);

  return { zScore, muscleMassKg };
}

function calculateResidualMass(
  transverseChestBreadth: number,
  apChestBreadth: number,
  waistCorr: number,
  sittingHeight: number
) {
  if (sittingHeight === 0) {
    return { zScore: 0, residualMassKg: 0 };
  }

  const PHANTOM_SITTING_HEIGHT = 89.92;
  const PHANTOM_MEAN_RESIDUAL = 109.35;
  const PHANTOM_SD_RESIDUAL = 7.08;
  const PHANTOM_MASS = 6.1; // kg at phantom height

  const sumTorso = transverseChestBreadth + apChestBreadth + waistCorr;
  const sittingFactor = PHANTOM_SITTING_HEIGHT / sittingHeight;
  const scaledTorso = sumTorso * sittingFactor;

  // Calculate Z-score
  const zResidual = (scaledTorso - PHANTOM_MEAN_RESIDUAL) / PHANTOM_SD_RESIDUAL;

  // Calculate mass using Phantom formula: (Z * SD + Mean_mass) / factor³
  const residualMassKg = ((zResidual * 1.24) + PHANTOM_MASS) / Math.pow(sittingFactor, 3);

  return { zScore: zResidual, residualMassKg };
}

function calculateBoneMass(
  headGirth: number,
  biacromialBreadth: number,
  biiliocristalBreadth: number,
  humerusBreadth: number,
  femurBreadth: number,
  stature: number
) {
  if (stature === 0) {
    return {
      zHead: 0,
      boneMassHead: 0,
      sumBreadths: 0,
      zBoneBody: 0,
      boneMassBody: 0,
      boneMassTotal: 0
    };
  }

  const statureFactor = 170.18 / stature;

  // Head bone mass (independent of stature scaling)
  const PHANTOM_HEAD_GIRTH = 56;
  const PHANTOM_HEAD_SD = 1.44;
  const PHANTOM_HEAD_MASS = 1.2; // kg
  const zHead = (headGirth - PHANTOM_HEAD_GIRTH) / PHANTOM_HEAD_SD;
  const boneMassHead = (zHead * 0.18) + PHANTOM_HEAD_MASS;

  // Body bone mass
  const sumBreadths = biacromialBreadth + biiliocristalBreadth + (humerusBreadth * 2) + (femurBreadth * 2);
  const scaledBreadths = sumBreadths * statureFactor;

  const PHANTOM_MEAN_BONE = 98.88;
  const PHANTOM_SD_BONE = 5.33;
  const PHANTOM_BONE_MASS = 6.7; // kg at phantom height

  // Calculate Z-score
  const zBoneBody = (scaledBreadths - PHANTOM_MEAN_BONE) / PHANTOM_SD_BONE;

  // Calculate mass using Phantom formula: (Z * SD + Mean_mass) / factor³
  const boneMassBody = ((zBoneBody * 1.34) + PHANTOM_BONE_MASS) / Math.pow(statureFactor, 3);
  const boneMassTotal = boneMassHead + boneMassBody;

  return {
    zHead,
    boneMassHead,
    sumBreadths,
    zBoneBody,
    boneMassBody,
    boneMassTotal
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const body = await req.json();
    const measurementId = body.measurement_id;

    console.log("Calculating Kerr results for measurement:", measurementId);

    const bodyMass = sanitizeInput(body.body_mass_median || body.body_mass);
    const stature = sanitizeInput(body.stature_median || body.stature);
    const sittingHeight = sanitizeInput(body.sitting_height_median || body.sitting_height || stature * 0.52);
    const age = sanitizeInput(body.age);
    const gender = body.sex || body.gender;

    if (bodyMass <= 0 || stature <= 0) {
      throw new Error('Critical measurements missing: body_mass and stature must be greater than 0');
    }

    if (!gender || (gender !== 'male' && gender !== 'female')) {
      throw new Error('Gender must be "male" or "female"');
    }

    const triceps = sanitizeInput(body.triceps_median || body.triceps_skinfold);
    const subscapular = sanitizeInput(body.subscapular_median || body.subscapular_skinfold);
    const supraspinale = sanitizeInput(body.supraspinale_median || body.supraspinale_skinfold);
    const abdominal = sanitizeInput(body.abdominal_median || body.abdominal_skinfold);
    const frontThigh = sanitizeInput(body.front_thigh_median || body.front_thigh_skinfold);
    const medialCalf = sanitizeInput(body.medial_calf_median || body.medial_calf_skinfold);

    const headGirth = sanitizeInput(body.head_median || body.head_girth);
    const armFlexed = sanitizeInput(body.arm_flexed_median || body.arm_flexed_girth);
    const armRelaxed = sanitizeInput(body.arm_relaxed_median || body.arm_relaxed_girth);
    const forearm = sanitizeInput(body.forearm_median || body.forearm_girth);
    const chestGirth = sanitizeInput(body.chest_median || body.chest_girth);
    const waistGirth = sanitizeInput(body.waist_median || body.waist_girth);
    const glutealGirth = sanitizeInput(body.hip_median || body.gluteal_girth);
    const thighUpper = sanitizeInput(body.thigh_1cm_median || body.thigh_upper_girth);
    const thighMid = sanitizeInput(body.mid_thigh_median || body.thigh_mid_girth);
    const calfMax = sanitizeInput(body.calf_max_median || body.calf_max_girth);

    const biacromial = sanitizeInput(body.biacromial_median || body.biacromial_breadth);
    const transverseChest = sanitizeInput(body.transverse_chest_median || body.transverse_chest_breadth);
    const apChest = sanitizeInput(body.ap_chest_depth_median || body.ap_chest_breadth);
    const biiliocristal = sanitizeInput(body.biiliocristal_median || body.biiliocristal_breadth);
    const humerus = sanitizeInput(body.humerus_median || body.humerus_breadth);
    const femur = sanitizeInput(body.femur_median || body.femur_breadth);

    console.log("Input values:", {
      bodyMass,
      stature,
      age,
      gender,
      sum6SF: triceps + subscapular + supraspinale + abdominal + frontThigh + medialCalf
    });

    const bmi = bodyMass / Math.pow(stature / 100, 2);
    const sum6Skinfolds = calculateSum6Skinfolds(triceps, subscapular, supraspinale, abdominal, frontThigh, medialCalf);

    console.log("Sum 6 skinfolds:", sum6Skinfolds);
    console.log("BMI:", bmi);

    const correctedArm = calculateCorrectedArmGirth(armRelaxed, triceps);
    const correctedThigh = calculateCorrectedThighGirth((thighMid || thighUpper), frontThigh);
    const correctedCalf = calculateCorrectedCalfGirth(calfMax, medialCalf);
    const correctedChest = calculateCorrectedThoraxGirth(chestGirth, subscapular);
    const correctedWaist = calculateCorrectedWaistGirth(waistGirth, abdominal);

    const skinData = calculateSkinMass(bodyMass, stature, gender, age);
    console.log("Skin mass:", skinData.skinMassKg);

    const adiposeData = calculateAdiposeMass(sum6Skinfolds, stature);
    console.log("Fat mass:", adiposeData.fatMassKg, "Z-score:", adiposeData.zScore);

    const sumCorrectedPerimeters = calculateSumCorrectedPerimeters(
      correctedArm,
      forearm,
      correctedThigh,
      correctedCalf,
      correctedChest
    );
    const muscleData = calculateMuscleMass(sumCorrectedPerimeters, stature, true);
    console.log("Muscle mass:", muscleData.muscleMassKg, "Z-score:", muscleData.zScore);

    const residualData = calculateResidualMass(transverseChest, apChest, correctedWaist, sittingHeight);
    console.log("Residual mass:", residualData.residualMassKg, "Z-score:", residualData.zScore);

    const boneData = calculateBoneMass(headGirth, biacromial, biiliocristal, humerus, femur, stature);
    const boneMassTotal = boneData.boneMassTotal;
    console.log("Bone mass:", boneMassTotal, "Head:", boneData.boneMassHead, "Body:", boneData.boneMassBody);

    // PASO 1: Masa Ósea es el valor FIJO de referencia (MOR)
    const boneReference = boneMassTotal;

    console.log("Bone mass (fixed reference):", boneReference.toFixed(2));

    // PASO 2: Calcular peso restante después de restar masa ósea
    const remainingWeight = bodyMass - boneReference;

    console.log("Remaining weight to distribute:", remainingWeight.toFixed(2));

    // PASO 3: Sumar las otras 4 masas teóricas
    const sum4Masses = skinData.skinMassKg + adiposeData.fatMassKg + muscleData.muscleMassKg + residualData.residualMassKg;

    console.log("Sum of 4 theoretical masses:", sum4Masses.toFixed(2));

    // PASO 4: Calcular factor de corrección para las 4 masas
    const correctionFactor = remainingWeight / sum4Masses;

    console.log("Correction factor for 4 masses:", correctionFactor);

    // PASO 5: Aplicar factor de corrección SOLO a las 4 masas (piel, grasa, músculo, residual)
    const correctedSkinMass = skinData.skinMassKg * correctionFactor;
    const correctedFatMass = adiposeData.fatMassKg * correctionFactor;
    const correctedMuscleMass = muscleData.muscleMassKg * correctionFactor;
    const correctedResidualMass = residualData.residualMassKg * correctionFactor;
    const correctedBoneMass = boneReference;

    // PASO 6: Verificar que la suma sea exactamente el peso real
    const correctedTotalMass = correctedSkinMass + correctedFatMass + correctedMuscleMass + correctedResidualMass + correctedBoneMass;
    const boneDifference = boneReference - boneMassTotal;

    console.log("Corrected masses (kg):", {
      skin: correctedSkinMass.toFixed(2),
      fat: correctedFatMass.toFixed(2),
      muscle: correctedMuscleMass.toFixed(2),
      residual: correctedResidualMass.toFixed(2),
      bone: correctedBoneMass.toFixed(2),
      total: correctedTotalMass.toFixed(2),
      boneDifference: boneDifference.toFixed(3)
    });

    // PASO 7: Calcular porcentajes basados en masas corregidas
    const skinMassPct = (correctedSkinMass / bodyMass) * 100;
    const fatPct = (correctedFatMass / bodyMass) * 100;
    const muscleMassPct = (correctedMuscleMass / bodyMass) * 100;
    const residualMassPct = (correctedResidualMass / bodyMass) * 100;
    const boneMassPct = (correctedBoneMass / bodyMass) * 100;

    // PASO 8: Calcular índices basados en masas corregidas
    const heightM2 = Math.pow(stature / 100, 2);
    const adiposeIndex = correctedFatMass / heightM2;
    const muscleIndex = correctedMuscleMass / heightM2;
    const boneIndex = correctedBoneMass / heightM2;
    const muscleBoneRatio = correctedMuscleMass / correctedBoneMass;

    const kerrResults = {
      measurement_id: measurementId,
      athlete_id: body.athlete_id,
      measurement_date: body.measurement_date || new Date().toISOString(),

      body_mass_kg: bodyMass,
      height_cm: stature,
      sitting_height_cm: sittingHeight,
      age_years: age,
      sex: gender,
      bmi: bmi,

      sum_6_skf: sum6Skinfolds,

      arm_corr: correctedArm,
      thigh_corr: correctedThigh,
      calf_corr: correctedCalf,
      corrected_chest_perim: correctedChest,
      waist_corr: correctedWaist,
      sum_corr_girths: sumCorrectedPerimeters,

      skin_thickness: skinData.skinThickness,
      body_surface_area: skinData.areaSurface,
      skin_mass_kg: correctedSkinMass,
      skin_mass_pct: skinMassPct,

      z_adipose: adiposeData.zScore,
      fat_mass_kg: correctedFatMass,
      fat_mass_pct: fatPct,

      z_muscle: muscleData.zScore,
      muscle_mass_kg: correctedMuscleMass,
      muscle_mass_pct: muscleMassPct,

      z_residual: residualData.zScore,
      residual_mass_kg: correctedResidualMass,
      residual_mass_pct: residualMassPct,

      z_score_bone_head: boneData.zHead,
      bone_mass_head: boneData.boneMassHead,
      sum_breadths: boneData.sumBreadths,
      z_score_bone_body: boneData.zBoneBody,
      bone_mass_body: boneData.boneMassBody,
      bone_mass_total: correctedBoneMass,
      bone_mass_pct: boneMassPct,

      structured_weight: correctedTotalMass,
      weight_difference: correctedTotalMass - bodyMass,

      adjusted_fat_mass_kg: correctedFatMass,
      adjusted_muscle_mass_kg: correctedMuscleMass,
      adjusted_residual_mass_kg: correctedResidualMass,
      adjusted_skin_mass_kg: correctedSkinMass,

      adipose_index: adiposeIndex,
      muscle_index: muscleIndex,
      bone_index: boneIndex,
      muscle_bone_ratio: muscleBoneRatio,

      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('anthropometry_kerr_results')
      .upsert(kerrResults, { onConflict: 'measurement_id' })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      throw error;
    }

    console.log("Kerr results saved successfully");

    return new Response(
      JSON.stringify({ success: true, results: data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Error calculating Kerr results:", err);
    return new Response(
      JSON.stringify({ error: err.message, stack: err.stack }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});