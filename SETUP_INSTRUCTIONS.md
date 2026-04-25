# 🚀 Setup Instructions - Asciende Platform

## Quick Start Guide

Follow these steps to set up your Asciende platform with admin and trainer accounts.

---

## ✅ **Step 1: Initialize Official Accounts**

1. Open your browser and navigate to the **Login page**
2. At the bottom of the login form, you'll see a button:
   - **"Inicializar Cuentas Oficiales"** (Spanish)
   - **"Initialize Official Accounts"** (English)

3. Click this button once

4. You'll see a confirmation message with the credentials:

```
✅ Process completed!

Admin: Created
Trainer (Agu): Created

📧 admin@asciende.pro
🔒 Admin_asciende.pro1

📧 agu@asciende.pro
🔒 Agu_asciende.pro1

You can now login.
```

5. **IMPORTANT:** This button can be clicked multiple times safely. If accounts already exist, it will show "Already exists" instead of "Created"

---

## 🔐 **Step 2: Login with Admin Account**

**Email:** `admin@asciende.pro`
**Password:** `Admin_asciende.pro1`

**Admin Capabilities:**
- ✅ Full access to all features
- ✅ Manage all users (athletes, trainers)
- ✅ Create Performance Digest articles
- ✅ View all analytics
- ✅ Reassign athletes to different trainers
- ✅ Manage system settings

---

## 👨‍🏫 **Step 3: Login with Trainer Account (Agu)**

**Email:** `agu@asciende.pro`
**Password:** `Agu_asciende.pro1`

**Trainer Capabilities:**
- ✅ View assigned athletes
- ✅ Create training plans
- ✅ Create meal plans
- ✅ Create Performance Digest articles
- ✅ Chat with athletes
- ✅ View athlete progress

---

## 🏃 **Step 4: Test Athlete Auto-Assignment**

1. Click **"Sign Up"** on the auth page
2. Create a new athlete account (any email/password)
3. Complete the registration
4. **The athlete will be automatically assigned to Agu** (agu@asciende.pro)
5. You'll see a message during signup:

```
🎯 Entrenador Asignado

Serás automáticamente asignado a tu entrenador personal Agu,
quien te guiará en tu camino al rendimiento óptimo.
```

---

## 🔄 **Verification Steps**

### Verify Accounts Created:

1. Login with admin account
2. Check that both accounts exist in the system

### Verify Auto-Assignment Works:

1. Create a test athlete account
2. Login with trainer account (Agu)
3. Go to trainer dashboard
4. Verify the new athlete appears in the list

---

## 🛠️ **Troubleshooting**

### Problem: Button doesn't appear

**Solution:** Make sure you're on the **Login** page (not signup). The button appears at the bottom of the login form.

### Problem: "Error creating accounts"

**Solution:**
1. Check your internet connection
2. Verify Supabase environment variables are set
3. Try clicking the button again
4. Check browser console for errors

### Problem: Can't login after creating accounts

**Solution:**
1. Verify you're using the correct credentials:
   - Admin: `admin@asciende.pro` / `Admin_asciende.pro1`
   - Trainer: `agu@asciende.pro` / `Agu_asciende.pro1`
2. Make sure email confirmation is not required
3. Wait 30 seconds and try again

### Problem: Athlete not assigned to Agu

**Solution:**
1. Login with admin account
2. Run this SQL to manually assign:
   ```sql
   UPDATE profiles
   SET assigned_trainer_id = (
     SELECT id FROM profiles WHERE role = 'trainer' LIMIT 1
   )
   WHERE role = 'athlete' AND assigned_trainer_id IS NULL;
   ```

---

## 📊 **Database Verification**

You can verify the accounts in Supabase:

```sql
-- Check accounts exist
SELECT au.email, p.role, p.full_name
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE au.email IN ('admin@asciende.pro', 'agu@asciende.pro');

-- Check athletes assigned to Agu
SELECT
  p.full_name,
  p.sport,
  trainer.full_name as trainer_name
FROM profiles p
LEFT JOIN profiles trainer ON trainer.id = p.assigned_trainer_id
WHERE p.role = 'athlete';

-- Count Agu's athletes
SELECT COUNT(*) as total_athletes
FROM profiles
WHERE assigned_trainer_id = (
  SELECT id FROM profiles
  WHERE role = 'trainer'
  LIMIT 1
);
```

---

## 🔒 **Security Notes**

1. **Change passwords in production:**
   - Use strong, unique passwords
   - Store in a password manager
   - Don't share credentials

2. **Environment Variables:**
   - Verify `.env` file has correct Supabase credentials
   - Never commit `.env` to version control

3. **RLS Policies:**
   - All data is protected by Row Level Security
   - Athletes can only see their own data
   - Trainers see only their assigned athletes
   - Admins have full access

---

## ✨ **Features Included**

### Auto-Assignment System:
- ✅ New athletes automatically assigned to Agu
- ✅ Database trigger handles assignment
- ✅ Existing athletes migrated to Agu
- ✅ Visible notification during signup

### Account Management:
- ✅ One-click account initialization
- ✅ Prevents duplicate accounts
- ✅ Shows creation status
- ✅ Provides credentials in alert

### User Experience:
- ✅ Clean UI with clear instructions
- ✅ Bilingual support (ES/EN)
- ✅ Error handling
- ✅ Success confirmation

---

## 📝 **Next Steps After Setup**

1. ✅ Login as admin and explore dashboard
2. ✅ Login as trainer (Agu) and familiarize with interface
3. ✅ Create a test athlete account
4. ✅ Verify athlete shows in Agu's dashboard
5. ✅ Create a sample training plan
6. ✅ Create a Performance Digest article
7. ✅ Test chat functionality
8. ✅ Explore analytics

---

## 🎯 **Quick Test Checklist**

- [ ] Click "Initialize Official Accounts" button
- [ ] See success message with credentials
- [ ] Login as admin@asciende.pro
- [ ] Logout and login as agu@asciende.pro
- [ ] Create test athlete account (signup)
- [ ] See auto-assignment message during signup
- [ ] Login as athlete
- [ ] Verify athlete sees Agu as trainer
- [ ] Login back as Agu
- [ ] Verify athlete appears in dashboard

---

## 📞 **Support**

If you encounter issues:

1. Check browser console for errors
2. Verify Supabase connection
3. Check environment variables
4. Review this document again
5. Check the ADMIN_TRAINER_CREDENTIALS.md file

---

**Platform:** Asciende Pro
**Version:** 1.0
**Last Updated:** 2025-10-06
**Status:** Production Ready ✅
