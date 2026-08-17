# 🚨 CORS Configuration Required in Supabase Dashboard

## Problem

The application is showing CORS errors:
```
Access to fetch at 'https://ngkcbygyoobqhlmlnuvl.supabase.co/auth/v1/token'
from origin 'https://hub.asciende.pro' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Root Cause

**This is NOT a code issue.** The Supabase project is not configured to accept requests from your production domain `https://hub.asciende.pro`.

## Verification

✅ **Database works:** Successfully queried memberships table (3 records found)
✅ **API Keys valid:** Environment variables are correct
✅ **RLS policies work:** Policies are properly configured
❌ **CORS blocked:** Supabase is rejecting browser requests from your domain

## Solution: Configure CORS in Supabase Dashboard

### Step 1: Access Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/ngkcbygyoobqhlmlnuvl
2. Login with your Supabase account

### Step 2: Navigate to Settings

1. Click on **Settings** (gear icon) in the left sidebar
2. Click on **API** section

### Step 3: Configure Allowed Origins

Look for one of these sections (depends on Supabase version):
- **"Allowed Origins"**
- **"CORS Configuration"**
- **"Site URL Configuration"**

### Step 4: Add Your Domain

Add the following origin:
```
https://hub.asciende.pro
```

**For development, you may also want to add:**
```
http://localhost:5173
http://localhost:3000
```

### Step 5: Alternative - Check Site URL

Sometimes the issue is in the **Authentication** settings:

1. Go to **Settings** → **Authentication**
2. Find **"Site URL"** field
3. Set it to: `https://hub.asciende.pro`
4. Find **"Additional Redirect URLs"** (if present)
5. Add: `https://hub.asciende.pro/**`

### Step 6: Save and Wait

1. Click **Save**
2. Wait 2-3 minutes for changes to propagate
3. Clear browser cache (Ctrl+Shift+R)
4. Try logging in again

## Alternative: Use Supabase CLI (if you have access)

If you have Supabase CLI configured:

```bash
# Check current config
supabase status

# Update CORS settings (if supported in your version)
supabase settings update --cors-origin "https://hub.asciende.pro"
```

## Temporary Workaround (Development Only)

If you need to test immediately and can't access Supabase Dashboard:

1. Use a CORS proxy extension in your browser (NOT for production)
2. Or test locally with `npm run dev` (localhost usually has less strict CORS)

## What This Error Means

- **CORS (Cross-Origin Resource Sharing)** is a security feature
- Browsers block requests from one domain to another unless explicitly allowed
- Your app (`hub.asciende.pro`) is trying to access Supabase (`ngkcbygyoobqhlmlnuvl.supabase.co`)
- Supabase needs to explicitly allow requests from `hub.asciende.pro`

## After Fixing

Once CORS is configured:

✅ Login will work
✅ All API requests will work
✅ Memberships will load
✅ All features will function normally

## Still Having Issues?

If after configuring CORS you still have issues:

1. **Check Supabase Status:** https://status.supabase.com
2. **Verify API Keys:** Make sure anon key hasn't expired
3. **Check Browser Console:** Look for any other error messages
4. **Try incognito mode:** Rules out cache/extension issues

## Current Environment Variables (Verified)

```
VITE_SUPABASE_URL=https://ngkcbygyoobqhlmlnuvl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M...
```

These are **correct** and **don't need to be changed**.

## Summary

**Required Action:** Configure CORS in Supabase Dashboard to allow `https://hub.asciende.pro`

**This is a 2-minute fix** that can only be done by someone with access to the Supabase project dashboard.

---

**Last checked:** 2025-11-24
**Project ID:** ngkcbygyoobqhlmlnuvl
**Domain:** hub.asciende.pro
