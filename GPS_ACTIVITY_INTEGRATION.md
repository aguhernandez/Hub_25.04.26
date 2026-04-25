# GPS Activity Integration - Complete Guide

## What Was Done

When you record a GPS activity using the Asciende PWA, the system now automatically integrates it into your training dashboard, appearing alongside your Strava activities and gym workouts.

---

## Data Saved When Recording Activity

When you record an activity (run, bike, swim, etc.), the system saves:

### 1. **Activity Table** (`activities`)
```
- ID: Unique identifier
- Sport Type: run, trail_run, road_bike, mountain_bike, gravel_bike, open_water_swim
- Title: Activity name (optional)
- Notes: User notes
- Distance: In kilometers
- Duration: In seconds
- Elevation Gain: In meters
- Start Time: When activity started
- End Time: When activity ended
- Public/Private: Visibility status
- GPS Points Count: Number of GPS data points recorded
```

### 2. **GPS Points Table** (`activity_gps_points`)
```
For each second of your activity:
- Latitude & Longitude: Your exact location
- Altitude: Elevation at that point (if available)
- Timestamp: Time of that data point
- Sequence Order: Position in the route (for drawing the map)
```

### 3. **External Activities Table** (`external_activities`)
```
A unified entry is created automatically with:
- Source: "asciende_gps" (to identify it came from your recording)
- Sport Type: Normalized (same format as Strava)
- Name: Activity title
- Distance: In meters (from km converted)
- Duration: In seconds
- Elevation: In meters
- Start Time: ISO timestamp
- Device Name: "Asciende GPS"
- Link to original activity_id: Stored in raw_data
- User notes: Editable
- GPS Points Count: How many data points
```

---

## Where Your GPS Activities Appear

### 1. **Training Page** (Main Dashboard)
📍 **Location:** `src/pages/TrainingPage.tsx`

Your GPS activities appear in the **calendar view** alongside:
- ✅ Scheduled workouts
- ✅ Gym training logs
- ✅ Strava activities
- ✅ Extra training logs

**Indicator:** Shows "Asciende GPS" as the source

---

### 2. **Performance Dashboard**
📍 **Location:** `src/pages/PerformanceDashboard.tsx`

Your GPS activities contribute to:
- **Workout Frequency Heatmap** (84-day calendar): Shows days you trained
- **Week Totals**: Counts activities per week
- **Color Coding**: Intensity based on number of activities that day

**The heatmap loads data from:**
```typescript
external_activities (includes your GPS recordings)
athlete_workouts (scheduled workouts)
extra_training_logs (other training)
```

---

### 3. **Activity History Page**
📍 **Location:** `src/pages/ActivityHistoryPage.tsx`

Your GPS activities appear here with:
- 📅 Date and time
- 🏃 Sport type icon
- 📏 Distance (km)
- ⏱️ Duration (formatted hours:minutes)
- 📈 Elevation gain
- 📝 Notes
- 🔒 Public/Private status
- 🗺️ Route map (clickable)

**Filters available:**
- By sport type (Run, Bike, Swim, etc.)
- By date range (Week, Month, All time)

---

### 4. **Athlete Dashboard (Today's Activities)**
📍 **Location:** `src/pages/AthleteDashboard.tsx`

Shows your GPS activities from today:
- Recent activities card
- Quick stats (distance, time, elevation)
- Activity type badge

---

## Technical Integration Points

### How It Works End-to-End

```
1. Recording Phase (ActivityRecorder.tsx)
   ├─ User grants GPS permission
   ├─ GPS data collected every second
   ├─ Real-time display of distance/time/elevation
   └─ User saves activity

2. Storage Phase (save-activity edge function)
   ├─ Create entry in 'activities' table
   ├─ Store all GPS points in 'activity_gps_points'
   └─ Create summary in 'external_activities' (NEW!)

3. Display Phase (Various pages)
   ├─ TrainingPage queries external_activities
   ├─ Performance Dashboard aggregates all activities
   ├─ ActivityHistory shows only local activities
   └─ Maps display route from GPS points

4. Analysis Phase
   ├─ Heatmap calculates frequency per day
   ├─ Stats calculate totals and averages
   └─ Charts compare with Strava data
```

---

## Data Fields Available for Display

When your GPS activity is saved, you can display:

| Field | Example | Use Case |
|-------|---------|----------|
| `sport_type` | "run" | Filter by activity type |
| `name` | "Morning Run" | Display activity title |
| `distance_meters` | 5200 | Show distance (5.2 km) |
| `duration_seconds` | 1800 | Show time (30 min) |
| `elevation_gain_meters` | 120 | Show elevation |
| `start_time` | "2024-02-14T08:30:00Z" | Show when it started |
| `average_speed_mps` | 2.89 | Calculate avg speed |
| `device_name` | "Asciende GPS" | Show recording method |
| `user_notes` | "Felt strong" | Show user comments |
| `raw_data.activity_id` | (uuid) | Link to original activity |
| `raw_data.gps_points_count` | 1800 | Show data quality |

---

## How to View Your GPS Activities

### ✅ Quick Access Routes

1. **See all your GPS activities:**
   - Go to Training → Calendar view → Scroll to see activities

2. **View detailed stats:**
   - Go to Performance Dashboard → Scroll down to heatmap
   - Activities counted in the calendar grid

3. **View activity history:**
   - Go to Activity History → Filter by sport type
   - Click on an activity to see its route on the map

4. **Check today's activities:**
   - Go to Dashboard → See "Recent Activities" section

---

## SQL Query Example

If you want to query your GPS activities directly:

```sql
-- Get all GPS activities
SELECT
  id,
  name,
  sport_type,
  distance_meters / 1000 as distance_km,
  duration_seconds,
  elevation_gain_meters,
  start_time,
  device_name,
  user_notes
FROM external_activities
WHERE user_id = 'YOUR_USER_ID'
  AND source = 'asciende_gps'
  AND deleted_at IS NULL
ORDER BY start_time DESC;

-- Get GPS points for a specific activity
SELECT
  latitude,
  longitude,
  altitude_m,
  timestamp,
  sequence_order
FROM activity_gps_points
WHERE activity_id = 'ACTIVITY_ID'
ORDER BY sequence_order;
```

---

## Statistics Available

For each GPS activity, you get:

- **Distance**: Calculated from GPS points
- **Duration**: From start to end time
- **Elevation Gain**: Calculated from altitude differences
- **Average Speed**: Distance ÷ Duration
- **Heart Rate**: If your device has HR sensor (stored in raw_data)
- **Cadence**: If available from device
- **Power**: If available from device (cycling)

---

## Privacy & Sharing

- **Public/Private**: Each activity can be marked as public or private
- **Visibility**: Only you and trainers assigned to you can see private activities
- **Strava Comparison**: GPS activities appear alongside Strava activities in analytics
- **Notes**: Can add custom notes to any activity

---

## Troubleshooting

### Activity not appearing?

1. ✅ Check if saved successfully (you got "Activity saved" confirmation)
2. ✅ Refresh the page (especially Training page)
3. ✅ Verify activity has at least 2 GPS points
4. ✅ Check internet connection during recording

### GPS points not showing on map?

1. ✅ Ensure you have at least 5 GPS points for reliable route
2. ✅ Check if location permission was granted during recording
3. ✅ Verify GPS accuracy (accuracy circle visible during recording)

### Activity count mismatch?

- The heatmap aggregates: GPS activities + Strava + Gym training
- Each activity type is counted once per day
- If you did the same activity on Strava and locally, it may appear twice

---

## Performance Impact

- ✅ GPS data stored efficiently (indexed by activity + sequence)
- ✅ Heatmap calculations optimized (84-day rolling window)
- ✅ External activities query includes soft-delete check
- ✅ No impact on other users' data (RLS enforced)

---

## What's Next?

Potential enhancements:
- 📊 Weekly summary stats from GPS activities
- 🗺️ Interactive heatmap showing activity density by zone
- 📈 Trend analysis comparing GPS + Strava + Gym training
- 🔔 Notifications when activity saved
- 📤 Export GPS activities to GPX format

