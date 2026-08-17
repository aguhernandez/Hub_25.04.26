# Weekly Digest Cron Setup Guide

## Overview
The Weekly Performance Digest generates automatic performance summaries every Sunday at 18:00 (6 PM) local time.

## Option 1: Supabase pg_cron (Recommended)

### Prerequisites
- Access to Supabase SQL Editor
- Service role key from Supabase dashboard

### Setup Steps

1. **Enable pg_cron extension** (if not already enabled):
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

2. **Create the cron job**:
```sql
SELECT cron.schedule(
  'generate-weekly-digest',
  '0 18 * * 0', -- Every Sunday at 18:00 (6 PM)
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/generate-weekly-digest',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
      )
    ) as request_id;
  $$
);
```

3. **Replace placeholders**:
   - `YOUR_PROJECT_ID`: Your Supabase project ID
   - `YOUR_SERVICE_ROLE_KEY`: Your Supabase service role key (Settings > API > service_role)

4. **Verify the cron job**:
```sql
SELECT * FROM cron.job;
```

### Manage Cron Jobs

**List all cron jobs:**
```sql
SELECT * FROM cron.job;
```

**Unschedule a job:**
```sql
SELECT cron.unschedule('generate-weekly-digest');
```

**View cron job history:**
```sql
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

---

## Option 2: GitHub Actions

Create `.github/workflows/weekly-digest.yml`:

```yaml
name: Generate Weekly Digest

on:
  schedule:
    - cron: '0 18 * * 0' # Every Sunday at 18:00 UTC
  workflow_dispatch: # Allow manual trigger

jobs:
  generate-digest:
    runs-on: ubuntu-latest
    steps:
      - name: Call Supabase Edge Function
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json" \
            https://YOUR_PROJECT_ID.supabase.co/functions/v1/generate-weekly-digest
```

**Setup:**
1. Add `SUPABASE_SERVICE_ROLE_KEY` to GitHub Secrets
2. Replace `YOUR_PROJECT_ID` with your Supabase project ID
3. Commit the workflow file

---

## Option 3: Vercel Cron

Create `vercel.json` in project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-digest",
      "schedule": "0 18 * * 0"
    }
  ]
}
```

Create `api/cron/weekly-digest.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: NextRequest) {
  const authHeader = req.headers.get('authorization');

  // Verify Vercel Cron Secret
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const response = await fetch(
    `https://${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-weekly-digest`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await response.json();
  return NextResponse.json(data);
}
```

---

## Option 4: Manual Trigger

### Test the edge function manually:

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  https://YOUR_PROJECT_ID.supabase.co/functions/v1/generate-weekly-digest
```

### Or use Supabase Dashboard:
1. Go to Edge Functions
2. Select `generate-weekly-digest`
3. Click "Invoke now"

---

## Monitoring

### Check Edge Function Logs:
1. Supabase Dashboard > Edge Functions
2. Click on `generate-weekly-digest`
3. View "Logs" tab

### Check Database Logs:
```sql
-- View recent digests generated
SELECT
  athlete_id,
  week_start_date,
  week_end_date,
  trainings_completed,
  trainings_missed,
  created_at
FROM weekly_performance_digests
ORDER BY created_at DESC
LIMIT 20;

-- View notification logs
SELECT
  nl.*,
  n.title,
  n.message
FROM notification_logs nl
JOIN notifications n ON n.id = nl.notification_id
WHERE n.type = 'system'
  AND n.digest_data IS NOT NULL
ORDER BY nl.created_at DESC
LIMIT 20;
```

---

## Timezone Considerations

The cron job runs at 18:00 in the server's timezone (typically UTC).

To adjust for your local timezone:
- **UTC+1 (CET)**: Use `0 17 * * 0` (17:00 UTC = 18:00 CET)
- **UTC-5 (EST)**: Use `0 23 * * 0` (23:00 UTC = 18:00 EST)
- **UTC+8 (SGT)**: Use `0 10 * * 0` (10:00 UTC = 18:00 SGT)

---

## Troubleshooting

### Digest not generating?

1. **Check Edge Function is deployed:**
```bash
# List edge functions
supabase functions list
```

2. **Verify service role key permissions**
3. **Check error logs in Supabase Dashboard**
4. **Manually trigger to test:**
```bash
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/generate-weekly-digest \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

### Athletes not receiving notifications?

1. **Check notification preferences:**
```sql
SELECT user_id, digest_in_app, digest_email, email_consent
FROM notification_preferences
WHERE digest_in_app = false OR (digest_email = true AND email_consent = false);
```

2. **Verify athlete has assigned trainer:**
```sql
SELECT id, full_name, assigned_trainer_id
FROM profiles
WHERE role = 'athlete' AND assigned_trainer_id IS NULL;
```

---

## Recommendations

- **Use Option 1 (pg_cron)** for production - it's built into Supabase and most reliable
- **Use Option 2 (GitHub Actions)** if you need external monitoring
- **Use Option 4 (Manual)** for testing and development

---

## Next Steps

1. Choose your preferred cron method
2. Configure the cron job with your credentials
3. Test manually first
4. Monitor logs for the first few weeks
5. Adjust timing based on user feedback
