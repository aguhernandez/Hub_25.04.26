# Cron Job Setup for Auto-Publishing Articles

## Overview

The Performance Digest system needs a cron job to automatically publish scheduled articles. This document provides step-by-step instructions for setting up the cron job.

---

## Option 1: cron-job.org (Recommended - Free & Easy)

### Step 1: Create Account

1. Go to [https://cron-job.org](https://cron-job.org)
2. Click "Sign Up" (free)
3. Verify your email

### Step 2: Add Cron Job

1. Click "Create cronjob"
2. Fill in the following:

**Title:**
```
Asciende - Auto Publish Digest Articles
```

**URL:**
```
https://YOUR_PROJECT_ID.supabase.co/functions/v1/auto-publish-scheduled-articles
```
Replace `YOUR_PROJECT_ID` with your actual Supabase project ID

**Schedule:**
- **Every:** 1 hour
- **Advanced:** `0 */1 * * *` (runs at minute 0 of every hour)

**Request Method:**
- POST

**Request Headers:**
Add header:
```
Key: Authorization
Value: Bearer YOUR_CRON_SECRET
```

### Step 3: Generate CRON_SECRET

Generate a random secret for security:

```bash
# On Mac/Linux
openssl rand -base64 32

# Or use online generator
https://www.random.org/passwords/?num=1&len=32&format=plain&rnd=new
```

Copy the generated secret.

### Step 4: Add Secret to Supabase

1. Go to your Supabase Dashboard
2. Navigate to: **Project Settings** → **Edge Functions** → **Secrets**
3. Add new secret:
   - **Name:** `CRON_SECRET`
   - **Value:** [paste the secret you generated]
4. Click "Save"

### Step 5: Test the Cron Job

In cron-job.org:
1. Click "Execute now" to test
2. Check "Execution history" tab
3. Should see status code 200

Verify in Supabase:
1. Go to **Database** → **Table Editor** → `digest_articles`
2. Check if any scheduled articles were published
3. Look for `auto_published = true`

---

## Option 2: EasyCron (Alternative Free Option)

### Step 1: Create Account

1. Go to [https://www.easycron.com](https://www.easycron.com)
2. Sign up (free tier: 1 cron job)

### Step 2: Add Cron Job

**Cron Job Name:**
```
Asciende Digest Auto-Publish
```

**URL:**
```
https://YOUR_PROJECT_ID.supabase.co/functions/v1/auto-publish-scheduled-articles
```

**Cron Expression:**
```
0 */1 * * *
```

**HTTP Method:**
```
POST
```

**HTTP Headers:**
```
Authorization: Bearer YOUR_CRON_SECRET
```

Follow Step 3-5 from Option 1 above.

---

## Option 3: GitHub Actions (Free for Public Repos)

### Create Workflow File

In your repository, create `.github/workflows/auto-publish-digest.yml`:

```yaml
name: Auto Publish Digest Articles

on:
  schedule:
    # Runs every hour at minute 0
    - cron: '0 */1 * * *'
  workflow_dispatch: # Allows manual trigger

jobs:
  auto-publish:
    runs-on: ubuntu-latest
    steps:
      - name: Call Auto-Publish Edge Function
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://YOUR_PROJECT_ID.supabase.co/functions/v1/auto-publish-scheduled-articles
```

### Add Secret to GitHub:

1. Go to your GitHub repository
2. Navigate to: **Settings** → **Secrets and variables** → **Actions**
3. Click "New repository secret"
4. Name: `CRON_SECRET`
5. Value: [your generated secret]
6. Click "Add secret"

### Test:

1. Go to **Actions** tab in GitHub
2. Select "Auto Publish Digest Articles"
3. Click "Run workflow"
4. Check run results

---

## Option 4: Vercel Cron Jobs (If Using Vercel)

### Create API Route

Create `pages/api/cron/auto-publish.ts`:

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verify cron secret
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/auto-publish-scheduled-articles`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        },
      }
    );

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
```

### Configure Vercel Cron

In `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/auto-publish",
      "schedule": "0 */1 * * *"
    }
  ]
}
```

### Add Environment Variables:

In Vercel Dashboard:
1. Go to **Settings** → **Environment Variables**
2. Add `CRON_SECRET`
3. Add other Supabase vars if needed

---

## Testing Your Cron Job

### Manual Test:

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://YOUR_PROJECT_ID.supabase.co/functions/v1/auto-publish-scheduled-articles
```

**Expected Response:**
```json
{
  "success": true,
  "published": 2,
  "results": [
    {
      "id": "uuid",
      "title": "Article Title",
      "success": true,
      "notified": true
    }
  ]
}
```

### Create Test Article:

1. Go to Performance Digest
2. Create new article
3. Set "Schedule Publishing" to 1 minute in the future
4. Save as Draft
5. Wait 1 hour (or trigger cron manually)
6. Verify article is published

---

## Monitoring

### Check Cron Execution:

**cron-job.org:**
- View "Execution history" tab
- Check status codes (200 = success)
- View response body

**GitHub Actions:**
- View workflow runs
- Check logs for errors

**Vercel:**
- View Functions → Logs
- Check execution times

### Check Supabase Logs:

1. Go to Supabase Dashboard
2. Navigate to **Edge Functions** → **Logs**
3. Filter by `auto-publish-scheduled-articles`
4. Check for errors or successful runs

### Database Verification:

Query recently auto-published articles:

```sql
SELECT
  id,
  title,
  scheduled_publish_at,
  published_date,
  auto_published
FROM digest_articles
WHERE auto_published = true
ORDER BY published_date DESC
LIMIT 10;
```

---

## Troubleshooting

### Cron Job Not Running:

1. **Check cron schedule:** Verify cron expression is correct
2. **Check URL:** Ensure Supabase URL is correct
3. **Check secret:** Verify CRON_SECRET matches in both places
4. **Check quota:** Free tiers have limits (cron-job.org: unlimited, EasyCron: 1 job)

### Articles Not Publishing:

1. **Check scheduled_publish_at:**
   ```sql
   SELECT id, title, scheduled_publish_at, is_published
   FROM digest_articles
   WHERE scheduled_publish_at IS NOT NULL
   AND is_published = false;
   ```

2. **Check timezone:** Ensure `scheduled_publish_at` is in UTC

3. **Check Edge Function logs:** Look for errors in Supabase dashboard

4. **Test Edge Function directly:**
   ```bash
   curl -X POST \
     -H "Authorization: Bearer YOUR_CRON_SECRET" \
     https://YOUR_PROJECT_ID.supabase.co/functions/v1/auto-publish-scheduled-articles
   ```

### Notifications Not Sending:

1. Verify `notify-new-digest-article` Edge Function is deployed
2. Check Brevo API key is set
3. Check user notification preferences
4. Review Brevo logs in dashboard

---

## Best Practices

1. **Run every hour:** Hourly is sufficient for most use cases
2. **Use a secret:** Always protect the endpoint with CRON_SECRET
3. **Monitor regularly:** Check logs weekly to ensure smooth operation
4. **Test before prod:** Create test articles to verify setup
5. **Keep backups:** Document your cron setup in case you need to recreate it

---

## FAQ

**Q: Can I run the cron job more frequently?**
A: Yes, but hourly is recommended. Every 15 minutes: `*/15 * * * *`

**Q: What if I miss a scheduled time?**
A: No problem! The next cron run will publish all overdue articles.

**Q: Can I schedule articles weeks in advance?**
A: Yes! No limit on how far in the future you can schedule.

**Q: Do I need to redeploy anything when I schedule an article?**
A: No, everything is automatic once cron is set up.

**Q: Can I disable auto-publishing temporarily?**
A: Yes, just pause the cron job in your cron service dashboard.

---

## Summary

✅ Choose a cron service (cron-job.org recommended)
✅ Generate CRON_SECRET
✅ Add secret to Supabase
✅ Configure cron job with correct URL and secret
✅ Test with manual trigger
✅ Verify with test article
✅ Monitor regularly

**Setup Time:** 10-15 minutes

Your articles will now publish automatically at their scheduled times, with notifications sent to users automatically!
