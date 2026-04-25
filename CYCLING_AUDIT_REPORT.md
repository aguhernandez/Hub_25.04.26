# Cycling Feature Audit & Minimal Data Model

**Date:** 2026-01-10
**Status:** Pre-Development Audit
**Goal:** Identify existing cycling features before building satellite app

---

## TASK 1: AUDIT – What Already Exists

| Element | Status | Location | Notes |
|---------|--------|----------|-------|
| **Activity/Session Entity** | ✅ Implemented | `external_activities` table | Stores Strava/Garmin imports |
| **Duration** | ✅ Implemented | `duration_seconds` | Integer field, reliable |
| **Distance** | ✅ Implemented | `distance_meters` | Numeric field, reliable |
| **Average Power** | ✅ Implemented | `average_power` | Numeric field (watts) |
| **Normalized Power** | ❌ Not implemented | N/A | Would need calculation function |
| **Heart Rate (avg)** | ✅ Implemented | `average_heartrate` | Integer field |
| **Heart Rate (max)** | ✅ Implemented | `max_heartrate` | Integer field |
| **Cadence** | ✅ Implemented | `average_cadence` | Numeric field (rpm) |
| **Subjective: RPE** | ✅ Implemented | `user_rpe` (1-10) | Editable by athlete |
| **Subjective: Notes** | ✅ Implemented | `user_notes` | Text field, editable |
| **Subjective: Fatigue/Mood** | 🟡 Partial | `athlete_workouts` only | Not in external_activities |
| **Weekly Summaries** | 🟡 Partial | Performance dashboard | No cycling-specific analytics |
| **FTP Tracking** | ❌ Not implemented | N/A | Critical missing piece |
| **Power Zones** | ❌ Not implemented | N/A | Would derive from FTP |
| **TSS/CTL/ATL** | ❌ Not implemented | N/A | Intentionally excluded (too complex) |

### Key Findings

**✅ STRONG FOUNDATION:**
- Strava integration is production-ready
- `external_activities` table has all essential objective metrics
- Athletes can already add RPE and notes to imported rides
- Performance dashboard shows cycling activities alongside gym work

**🟡 PARTIALLY COVERED:**
- Weekly summaries exist but lack cycling-specific insights
- No automated power analysis (zones, trends)
- Post-training feedback exists for gym workouts but not external activities

**❌ CRITICAL GAPS:**
- **No FTP tracking** → Can't calculate power zones or intensity
- **No normalized power** → Can't assess variability or actual load
- **No cycling-specific analytics** → Just raw data, no insights

---

## TASK 2: MINIMAL CYCLING DATA MODEL

### Design Philosophy
**COROS-style simplicity:**
- Track what matters physiologically
- No CTL/ATL/TSB (too much math, too little value for most users)
- No TSS (requires normalized power, complex)
- Focus: intensity, consistency, progressive overload

---

### Model A: FTP Tracking (NEW TABLE REQUIRED)

**Table:** `cycling_ftp_tests`

| Field | Type | Required | Source | Notes |
|-------|------|----------|--------|-------|
| `id` | uuid | ✓ | Auto | Primary key |
| `athlete_id` | uuid | ✓ | Auth | FK to profiles |
| `test_date` | date | ✓ | Manual | When test was performed |
| `ftp_watts` | integer | ✓ | Manual | Functional Threshold Power |
| `test_type` | text | ✗ | Manual | '20min', 'ramp', '60min' |
| `test_avg_power` | integer | ✗ | Manual | Average power during test |
| `test_duration_minutes` | integer | ✗ | Manual | How long the test was |
| `notes` | text | ✗ | Manual | Conditions, equipment, etc. |
| `created_at` | timestamptz | ✓ | Auto | Audit trail |

**Why this table:**
- FTP is the foundation of all power-based training
- Allows tracking progression over time
- Enables power zone calculations (Z1-Z7)
- Simple to understand and use

---

### Model B: Enhanced Session View (USE EXISTING TABLE)

**Table:** `external_activities` (already exists)

**Current fields we'll use:**

| Field | Type | Required | Source | Usage |
|-------|------|----------|--------|-------|
| `user_id` | uuid | ✓ | Strava/Garmin | Athlete identifier |
| `sport_type` | text | ✓ | Strava/Garmin | 'ride', 'run', 'swim' |
| `name` | text | ✓ | Strava/Garmin | Activity title |
| `start_time` | timestamptz | ✓ | Strava/Garmin | When ride started |
| `duration_seconds` | integer | ✓ | Strava/Garmin | **Core metric** |
| `distance_meters` | numeric | ✓ | Strava/Garmin | **Core metric** |
| `elevation_gain_meters` | numeric | ✗ | Strava/Garmin | Terrain difficulty |
| `average_power` | numeric | ✗ | Strava/Garmin | **Key intensity metric** |
| `average_heartrate` | integer | ✗ | Strava/Garmin | Cardiovascular load |
| `max_heartrate` | integer | ✗ | Strava/Garmin | Peak effort |
| `average_cadence` | numeric | ✗ | Strava/Garmin | Pedaling efficiency |
| `user_rpe` | integer (1-10) | ✗ | Manual | **Subjective intensity** |
| `user_notes` | text | ✗ | Manual | **Subjective feedback** |
| `user_tags` | text[] | ✗ | Manual | 'intervals', 'recovery', etc. |

**No changes needed to this table.**

---

### Model C: Calculated Metrics (NEW FUNCTIONS)

**NOT stored in DB, calculated on-demand:**

| Metric | Formula | Purpose | Prerequisites |
|--------|---------|---------|---------------|
| **Relative Intensity** | `avg_power / current_ftp` | % of threshold | Requires FTP |
| **Power Zone** | Based on FTP zones | Training zone identification | Requires FTP |
| **Power:HR Ratio** | `avg_power / avg_heartrate` | Efficiency indicator | Both power & HR |
| **Average Speed** | `distance / duration` | Pace tracking | Duration + distance |
| **Weekly Volume** | Sum of durations | Training consistency | Activities |
| **Weekly Intensity** | Avg of relative intensities | Load monitoring | Activities + FTP |

**Why calculated, not stored:**
- Always up-to-date when FTP changes
- No data duplication
- Simpler schema
- Easier to iterate on formulas

---

## MINIMAL CYCLING SATELLITE: PHASE 1 SCOPE

### What We'll Build

**1. FTP Management**
- Add FTP tests (manual entry)
- View FTP history
- Set current FTP

**2. Enhanced Activity View**
- Filter by 'ride' activities
- Show power zones (if FTP exists)
- Display relative intensity
- Weekly volume chart
- Weekly intensity distribution

**3. Simple Analytics**
- Rides per week
- Average power trend
- Distance progression
- Power:HR efficiency

**4. Workout Planner (Minimal)**
- Create interval-based workouts
- Define target power zones
- Assign to athletes
- Mark as completed when synced from Strava

### What We'll EXCLUDE (for now)

❌ Normalized Power (complex calculation)
❌ TSS/IF (requires NP)
❌ CTL/ATL/TSB (fitness/fatigue modeling)
❌ Workout library templates
❌ Real-time workout execution
❌ Manual activity entry for cycling (use Strava)

---

## JUSTIFICATION: Why This Model Is Sufficient

**Physiologically meaningful:**
- FTP → foundational metric for all cyclists
- Power zones → guides training intensity
- Volume + Intensity → core indicators of load
- RPE → subjective validation of objective metrics

**Actionable for coaches:**
- Can see if athletes are hitting prescribed intensities
- Can track volume progression
- Can identify overtraining (high RPE + low power)

**Simple for athletes:**
- Connect Strava → activities auto-import
- Add FTP after a test → zones calculated
- View weekly summary → stay consistent

**Scalable:**
- FTP table is small and stable
- Uses existing `external_activities` (no duplication)
- Calculated metrics = no storage bloat
- Easy to add TSS/CTL later if needed

**Internally testable:**
- Real athletes can use this immediately
- Coaches can validate with existing workflows
- Feedback loop is fast

---

## IMPLEMENTATION PRIORITY

**MUST HAVE (Week 1):**
1. Create `cycling_ftp_tests` table
2. FTP entry UI (modal)
3. Power zone calculator
4. Cycling activities page (filter `external_activities` by `sport_type = 'ride'`)

**SHOULD HAVE (Week 2):**
5. Weekly volume chart
6. Intensity distribution histogram
7. FTP progression line chart

**NICE TO HAVE (Week 3+):**
8. Basic workout planner
9. Power:HR efficiency trend
10. Workout assignment to athletes

---

## NEXT STEPS

1. ✅ Audit complete
2. ⏭️ Review this model with coaches/athletes
3. ⏭️ Create `cycling_ftp_tests` migration
4. ⏭️ Build FTP entry UI
5. ⏭️ Build cycling activities dashboard
6. ⏭️ Test with 2-3 real athletes
7. ⏭️ Iterate based on feedback

---

## CONCLUSION

We have **80% of what we need already built** via Strava integration and `external_activities`.

The **20% gap** is:
1. FTP tracking (1 table, simple UI)
2. Power zone calculations (1 function)
3. Cycling-specific UI (filter + charts)

This is a **1-2 week project**, not a 3-month rebuild.

**Start small. Ship fast. Iterate with real users.**
