# ANTHROPOMETRY ISAK MODULE MIGRATION GUIDE
## Hub → Lab Chat Transfer (Complete Architecture Documentation)

**Generated:** 2026-02-17
**Migration Status:** Pre-Migration Planning
**Module:** ISAK Level 2 Anthropometry & Kerr 5-Component Body Composition
**Scope:** Manual Assessment System with Calculations, Measurements, Measurements, and Results

---

## EXECUTIVE SUMMARY

This document provides a complete architectural blueprint for migrating the Anthropometry ISAK Manual Assessment module from Hub to Lab. Since there's no memory between chats, this guide ensures you can reconstruct the entire system without loss.

**Total Files to Migrate:** 24
**Total Lines of Code:** ~12,000
**Database Tables:** 4
**Edge Functions:** 1
**Calculation Complexity:** HIGH (Kerr 5-component model with 42 ISAK variables)

---

## PART 1: CRITICAL FILES CHECKLIST

### A. PAGE FILES (2 files - 2,024 lines)

**1. AnthropometryPage.tsx** (1,398 lines)
- **Location:** `src/pages/AnthropometryPage.tsx`
- **Purpose:** Main athlete/trainer interface for logging measurements
- **Key Features:**
  - Multi-step measurement input (5 sequential steps)
  - Triple measurement protocol (m1, m2, m3) with auto-median calculation
  - Measurement history with edit/delete capabilities
  - Raw data view with export
  - Results dashboard with tabs (current, comparison, population, raw data)
  - PDF export functionality
  - Membership gating for advanced features

**2. AnthropometryDashboard.tsx** (626 lines)
- **Location:** `src/pages/AnthropometryDashboard.tsx`
- **Purpose:** Trainer/admin dashboard for analyzing all athletes
- **Key Features:**
  - Overview KPIs (total athletes, avg metrics)
  - Kerr analysis with beautiful visualizations
  - Presentation-ready dashboard
  - Indices & proportionality analysis
  - Search/filter capabilities
  - Athlete detail modals

### B. COMPONENT FILES (9 files - 5,738 lines)

All located in: `src/components/anthropometry/`

**1. StepByStepMeasurementInput.tsx** (865 lines)
- **Critical:** This component handles the ISAK protocol input
- Supports 42 ISAK variables in 5 categories
- Triple measurement support (required by ISAK)
- Auto-calculates: median, standard deviation, error percentage
- **Data Output Format:**
  ```
  {
    [variable_name]_m1: number,
    [variable_name]_m2: number,
    [variable_name]_m3: number,
    [variable_name]_median: number (auto),
    [variable_name]_stdev: number (auto),
    [variable_name]_error_pct: number (auto)
  }
  ```

**2. KerrPresentationDashboard.tsx** (619 lines)
- Beautiful 5-component visualization
- Shows: masses (kg, %), Z-scores, indices
- Goal calculator with manual adjusters
- Comparison with previous measurements
- Anatomical body map integration

**3. KerrBodyCompositionDashboard.tsx** (628 lines)
- Trainer/admin analysis dashboard
- Cross-athlete comparisons
- Performance metrics tracking

**4. ComparativeAssessment.tsx** (1,052 lines)
- Longitudinal analysis
- Calculates change deltas (kg, %, Z-score)
- Trend analysis and projections
- Time-series visualization

**5. IndicesAndProportionality.tsx** (360 lines)
- Calculates derived indices:
  - Cormic index (sitting height ratio)
  - Leg length
  - Ponderal index
  - BMR (Harris-Benedict, Kleiber)
  - Somatotype components
  - Ballast index

**6. PopulationDataForm.tsx** (606 lines)
- Admin tool for reference population management
- CSV upload/import
- Percentile calculations

**7. BioimpedanceInput.tsx** (541 lines)
- Alternative measurement method
- Simpler than manual ISAK

**8. AnatomicalBodyMap2D.tsx** (512 lines)
- 2D visualization of measurement sites

**9. MorphologicalBodyModel.tsx** (555 lines)
- 3D-like body model visualization

### C. TYPE DEFINITIONS (1 file - 856 lines)

**anthropometry.types.ts** - `src/types/`
- **CRITICAL FILE:** Contains all ISAK variable definitions and calculations
- 42 ISAK Level 2 standard variables
- Interfaces:
  - `AnthropometryVariable` - Metadata for each variable
  - `AnthropometryData` - Complete dataset
  - `ProportionalityIndices` - Derived indices
  - `ComprehensiveIndices` - All indices
  - `KerrResults` - Final 5-component results
- Utility functions for:
  - Input validation and sanitization
  - Median/std dev calculations
  - Category filtering
  - Database adaptation (camelCase → snake_case)

### D. CALCULATION UTILITIES (3 files - 615+ lines)

**1. kerrCalculations.ts** - `src/utils/`
- **CRITICAL:** Contains all Kerr formula implementations
- Functions:
  - `calculateKerrResults()` - Main entry point
  - `calculateSkinMass()` - Kerr component 1
  - `calculateAdiposeMass()` - Kerr component 2
  - `calculateMuscleMass()` - Kerr component 3
  - `calculateResidualMass()` - Kerr component 4
  - `calculateBoneMass()` - Kerr component 5
  - `calculateZScores()` - Phantom reference conversion
  - `calculateBodyCompositionGoals()` - Goal setting
- **Phantom Reference Constants (IMMUTABLE):**
  - Adipose: mean=116.41 kg, SD=34.79 kg
  - Muscle: mean=207.21 kg, SD=13.74 kg
  - Residual: mean=109.35 kg, SD=7.08 kg
  - Bone: mean=98.88 kg, SD=5.33 kg

**2. kerrBodyComposition.ts** - `src/utils/`
- Database integration wrapper
- Maps database columns to Kerr inputs
- Prepares data for calculation

**3. anthropometryPDFExport.ts** - `src/utils/`
- Generates professional PDF reports
- Bilingual support (EN/ES/BILINGUAL)
- Export options for charts, comparisons, somatotype

### E. EDGE FUNCTIONS (1 function - ~150 lines)

**calculate-kerr-results** - `supabase/functions/`
- Endpoint: POST `/calculate-kerr-results`
- Triggered by: Frontend after measurement saved
- Process:
  1. Receives measurement data
  2. Validates inputs
  3. Executes all Kerr calculations
  4. Stores results in `anthropometry_kerr_results` table
- **MUST be deployed before any measurements can be saved**

### F. DATABASE MIGRATIONS (5 critical files)

Located in: `supabase/migrations/`

**Order of Application (MUST follow this order):**

1. `20251005170309_add_anthropometry_tables.sql`
   - Initial tables: `anthropometry_measurements`, `anthropometry_indices`
   - Basic RLS policies

2. `20251217064605_add_complete_isak_level2_measurements.sql`
   - Extends with all 42 ISAK variables
   - Adds median/stdev/error_pct columns

3. `20251217081000_extend_kerr_results_with_complete_calculations.sql`
   - Creates `anthropometry_kerr_results` table
   - Stores: 5 components, Z-scores, indices

4. `20251218064216_restructure_anthropometry_isak_standard.sql`
   - Current production schema
   - CHECK constraints for valid ranges
   - Foreign key relationships

5. `20251220155119_fix_anthropometry_kerr_rls_trainer_access.sql`
   - RLS policies for trainer/athlete/admin access
   - **CRITICAL for security**

### G. LOCALIZATION STRINGS (2 files)

**en.json** - `src/locales/`
- All anthropometry section keys
- Variable labels and descriptions
- Error messages

**es.json** - `src/locales/`
- Spanish mirror of en.json
- Maintains exact key structure

---

## PART 2: DATABASE SCHEMA DETAILED

### Table 1: anthropometry_measurements

**Purpose:** Store raw ISAK Level 2 measurement data

**Key Columns:**
- `id` (uuid, PRIMARY KEY)
- `athlete_id` (uuid, FOREIGN KEY to profiles)
- `measurement_date` (timestamptz)
- `measurement_method` (text: 'manual' | 'bioimpedance')

**ISAK 42 Variables (each with _m1, _m2, _m3, _median, _stdev, _error_pct variants):**

**Basic Measurements (6 variables):**
- `body_mass_kg`
- `stature_cm`
- `sitting_height_cm`
- `arm_span_cm`

**Skinfolds - 8mm (8 variables):**
- `triceps_sf_mm`
- `subscapular_sf_mm`
- `biceps_sf_mm`
- `iliac_crest_sf_mm`
- `supraspinale_sf_mm`
- `abdominal_sf_mm`
- `front_thigh_sf_mm`
- `medial_calf_sf_mm`

**Girths/Perimeters - cm (13 variables):**
- `head_girth_cm`, `neck_girth_cm`, `arm_relaxed_girth_cm`, `arm_flexed_girth_cm`
- `forearm_girth_cm`, `wrist_girth_cm`, `chest_girth_cm`, `waist_girth_cm`
- `gluteal_girth_cm`, `thigh_upper_girth_cm`, `thigh_mid_girth_cm`
- `calf_max_girth_cm`, `ankle_min_girth_cm`

**Lengths - cm (8 variables):**
- `acromiale_radiale_length_cm`, `radiale_stylion_length_cm`
- `midstylion_dactylion_length_cm`, `iliospinale_height_cm`
- `trochanterion_height_cm`, `trochanterion_tibiale_length_cm`
- `tibiale_laterale_height_cm`, `tibiale_mediale_sphyrion_length_cm`

**Breadths/Diameters - cm (7 variables):**
- `biacromial_breadth_cm`, `biiliocristal_breadth_cm`, `foot_length_cm`
- `transverse_chest_diameter_cm`, `ap_chest_diameter_cm`
- `humerus_diameter_cm`, `femur_diameter_cm`

**RLS Policies:**
- Athletes: SELECT/INSERT/UPDATE own records
- Trainers: SELECT/INSERT/UPDATE assigned athletes
- Admins: SELECT/INSERT/UPDATE/DELETE all records

### Table 2: anthropometry_kerr_results

**Purpose:** Store calculated 5-component body composition results

**Component Columns (each with _kg, _pct, _z_score variants):**
- `skin_mass`
- `adipose_mass`
- `muscle_mass`
- `residual_mass`
- `bone_mass`

**Index Columns:**
- `muscle_bone_ratio`
- `adipose_muscle_ratio`
- `ballast_index`
- `bmi`
- `surface_area_m2`
- `somatotype_endomorphy`
- `somatotype_mesomorphy`
- `somatotype_ectomorphy`

### Table 3: anthropometry_indices

**Purpose:** Store derived proportionality indices
- Cormic index
- Leg length index
- Ponderal index
- PHV (Peak Height Velocity) age
- Maturity classification

### Table 4: anthropometry_population_data

**Purpose:** Reference populations for percentile comparisons
- Sport-specific populations
- Age/gender groups
- Population statistics

---

## PART 3: STATE MANAGEMENT & DATA FLOW

### AnthropometryPage State

```typescript
const [viewMode, setViewMode] = useState<'new' | 'history' | 'results' | 'comparison' | 'raw-data'>('new');
const [currentStep, setCurrentStep] = useState<number>(1); // 1-5 steps
const [measurements, setMeasurements] = useState<AnthropometryData>(initialData);
const [savedMeasurements, setSavedMeasurements] = useState<any[]>([]);
const [selectedMeasurement, setSelectedMeasurement] = useState<any>(null);
const [results, setResults] = useState<KerrResults | null>(null);
const [currentKerrResultId, setCurrentKerrResultId] = useState<string>('');
const [showMembershipModal, setShowMembershipModal] = useState<boolean>(false);
```

### Data Flow

1. **User Input** → StepByStepMeasurementInput component
2. **Triple Measurements** → Auto-median calculation
3. **Save Button** → INSERT into `anthropometry_measurements`
4. **Trigger Edge Function** → POST to `calculate-kerr-results`
5. **Backend Calculates** → All Kerr components, Z-scores, indices
6. **Store Results** → INSERT into `anthropometry_kerr_results`
7. **Display Results** → KerrPresentationDashboard component

---

## PART 4: CALCULATION FORMULAS (REFERENCE)

### Surface Area (Skin Component)

```
Surface Area (m²) = (kAS × Weight^0.425 × Height^0.725) / 10000
Where:
  kAS = 70.691 (age <12), 68.308 (male ≥12), 73.074 (female ≥12)
  Weight in kg, Height in cm
```

### Skin Mass

```
Skin Thickness (mm) = 2.07 (male), 1.96 (female)
Skin Mass (kg) = Surface Area × Skin Thickness × 1.05
```

### Adipose Mass

```
Sum6Skinfolds (mm) = triceps + subscapular + supraspinale +
                     abdominal + front thigh + medial calf
Adipose Mass (kg) = 5.85 × Sum6Skinfolds + 25.6
```

### Muscle Mass

```
Corrected Arm (cm) = Arm Flexed - (Triceps SF × π/10)
Corrected Thigh (cm) = Thigh Mid - (Front Thigh SF × π/10)
Corrected Calf (cm) = Calf Max - (Medial Calf SF × π/10)
Corrected Chest (cm) = Chest - (Subscapular SF × π/10)

Sum Corrected Perimeters = Corrected Arm + Corrected Thigh +
                           Corrected Calf + Corrected Chest
Muscle Mass (kg) = 5.4 × Sum Corrected Perimeters + 24.5
```

### Residual Mass

```
Uses: Transverse Chest Diameter, AP Chest Diameter, Waist Girth (corrected)
Based on Sitting Height scaling
Residual Mass (kg) = 1.24 × Z-Score + 6.1
```

### Bone Mass

```
Head Bone (kg) = Z-Score × 0.18 + 1.2
Body Bone (kg) = Sum of Diameters (biacromial, biiliocristal,
                  humerus×2, femur×2) scaled
Bone Mass (kg) = 1.34 × Z-Score + 6.7
```

### Z-Score Calculation (Phantom Reference)

```
Z-Score = (Measured Value - Phantom Mean) / Phantom SD

Phantom Reference Values:
- Adipose: mean=116.41 kg, SD=34.79 kg
- Muscle: mean=207.21 kg, SD=13.74 kg
- Residual: mean=109.35 kg, SD=7.08 kg
- Bone: mean=98.88 kg, SD=5.33 kg
```

---

## PART 5: DEPENDENCIES & CONTEXT

### External Dependencies
- `@supabase/supabase-js` (v2.57.4)
- `react` (v18.3.1)
- `lucide-react` (v0.344.0) - for icons

### Context Dependencies
- **AuthContext** → Provides: `profile.id`, `profile.role`, `profile.sex`, `profile.birth_date`
- **LanguageContext** → Provides: current language (EN/ES)
- **ThemeContext** → Provides: dark mode toggle
- **Custom Hooks:**
  - `useMembership()` → Check premium features access
  - `useToast()` → Display notifications

---

## PART 6: ROUTING & NAVIGATION

### App.tsx Routes

```typescript
case 'anthropometry':
  return <AnthropometryPage />;

case 'anthropometry-dashboard':
  return <AnthropometryDashboard />;
```

### Menu Navigation
- "Anthropometry" appears in main menu
- Access control by role:
  - Athletes: Can view own measurements
  - Trainers: Can view team measurements
  - Admins: Can view all measurements

---

## PART 7: RLS POLICIES (SECURITY CRITICAL)

### anthropometry_measurements Table

**Policy 1: Athletes can view own**
```sql
USING (athlete_id = auth.uid())
```

**Policy 2: Athletes can insert own**
```sql
WITH CHECK (athlete_id = auth.uid())
```

**Policy 3: Trainers can view assigned athletes**
```sql
USING (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = (SELECT team_id FROM teams WHERE owner_id = auth.uid())
    AND team_members.athlete_id = anthropometry_measurements.athlete_id
  )
)
```

**Policy 4: Admins can do anything**
```sql
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
)
```

---

## PART 8: VALIDATION & ERROR HANDLING

### Critical Measurements Validation

```typescript
validateCriticalMeasurements(data: AnthropometryData):
  - body_mass_kg: > 0 && < 300
  - stature_cm: > 50 && < 250
  - age: >= 6 (if provided)
  - sex: 'male' | 'female'
```

### Input Sanitization

```typescript
sanitizeInput(value: any): number
  - Remove whitespace
  - Parse to float
  - Return NaN for invalid
```

---

## PART 9: MIGRATION VERIFICATION CHECKLIST

### Pre-Migration (Verify in Hub)
- [ ] All 24 files present and reviewed
- [ ] Database migrations applied successfully
- [ ] calculate-kerr-results edge function deployed
- [ ] RLS policies active and tested
- [ ] Localization strings complete (EN/ES)

### During Migration (Execute in Lab)
- [ ] Create matching folder structure (`src/pages/`, `src/components/anthropometry/`, etc.)
- [ ] Copy all component files
- [ ] Copy anthropometry.types.ts
- [ ] Copy calculation utilities
- [ ] Apply database migrations in order
- [ ] Deploy edge function
- [ ] Update App.tsx routing
- [ ] Verify context connections (Auth, Language, Theme)

### Post-Migration (Test in Lab)
- [ ] Can input triple measurements
- [ ] Median calculation works correctly
- [ ] Save triggers edge function calculation
- [ ] Kerr results appear in dashboard
- [ ] Comparison analysis shows delta correctly
- [ ] PDF export generates properly
- [ ] RLS policies enforce correctly:
  - [ ] Athlete can only see own
  - [ ] Trainer can see team
  - [ ] Admin can see all
- [ ] Bilingual interface works (EN/ES)
- [ ] Dark mode compatible
- [ ] Mobile responsive

---

## PART 10: CRITICAL WARNINGS

### ⚠️ DO NOT MODIFY

1. **ISAK Variable Names** - All 42 variable names are scientifically standardized. Any change breaks compatibility.
2. **Phantom Reference Values** - These are immutable constants from Ross & Wilson (1988):
   - Adipose: 116.41 ± 34.79 kg
   - Muscle: 207.21 ± 13.74 kg
   - Residual: 109.35 ± 7.08 kg
   - Bone: 98.88 ± 5.33 kg
3. **Kerr Formula Constants** - All multipliers and constants in kerrCalculations.ts are scientifically derived
4. **Triple Measurement Protocol** - ISAK requirement (m1, m2, m3 with median)
5. **RLS Policy Structure** - Any modification creates security vulnerabilities

### ⚠️ DEPENDENCIES REQUIRED IN LAB

1. **@supabase/supabase-js** - Must be v2.57.4+
2. **Database Schema** - All 4 tables with correct columns
3. **Edge Function** - calculate-kerr-results must be deployed
4. **AuthContext** - Must provide user profile data
5. **LanguageContext** - Must provide EN/ES switching

### ⚠️ ORDER MATTERS

1. Apply database migrations in exact order (20251005... → ... 20251220...)
2. Deploy edge function BEFORE saving any measurements
3. Establish RLS policies BEFORE adding data
4. Initialize contexts BEFORE rendering components

---

## PART 11: FILE SUMMARY TABLE

| Category | Filename | Lines | Purpose |
|----------|----------|-------|---------|
| **Pages** | AnthropometryPage.tsx | 1,398 | Main measurement interface |
| | AnthropometryDashboard.tsx | 626 | Trainer dashboard |
| **Components** | StepByStepMeasurementInput.tsx | 865 | Multi-step form |
| | KerrPresentationDashboard.tsx | 619 | Results visualization |
| | KerrBodyCompositionDashboard.tsx | 628 | Analysis dashboard |
| | ComparativeAssessment.tsx | 1,052 | Longitudinal analysis |
| | IndicesAndProportionality.tsx | 360 | Derived indices |
| | PopulationDataForm.tsx | 606 | Population management |
| | BioimpedanceInput.tsx | 541 | Alternative method |
| | AnatomicalBodyMap2D.tsx | 512 | Visualization |
| | MorphologicalBodyModel.tsx | 555 | 3D visualization |
| **Types** | anthropometry.types.ts | 856 | ISAK definitions |
| **Utilities** | kerrCalculations.ts | 415 | Kerr formulas |
| | kerrBodyComposition.ts | 200+ | DB wrapper |
| | anthropometryPDFExport.ts | - | PDF generation |
| **Edge Fn** | calculate-kerr-results/index.ts | ~150 | Backend calculation |
| **Migrations** | 5 SQL files | - | Database schema |
| **Localization** | en.json, es.json | - | i18n strings |
| **TOTAL** | 24 files | ~12,000 | Complete module |

---

## NEXT STEP

Use this guide alongside the JSON snapshot (`PROJECT_ARCHITECTURE_SNAPSHOT_V1.json`) to ensure zero data loss during migration.

**Ready to migrate to Lab chat?** Copy this entire documentation and the JSON snapshot to your next message in Lab.
