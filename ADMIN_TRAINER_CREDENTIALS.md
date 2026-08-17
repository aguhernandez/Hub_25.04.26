# Admin & Trainer Credentials

This document contains the credentials for the administrative accounts in the Asciende platform.

---

## 🔐 **Admin Account**

**Email:** `admin@asciende.pro`
**Password:** `Admin_asciende.pro1`

**Permissions:**
- Full access to all platform features
- Can manage all users, trainers, and athletes
- Can create and edit all content (articles, plans, etc.)
- Can view all data and analytics
- Can reassign athletes to different trainers

---

## 👨‍🏫 **Default Trainer Account (Agu)**

**Email:** `agu@asciende.pro`
**Password:** `Agu_asciende.pro1`

**Permissions:**
- Can view and manage assigned athletes
- Can create training plans, meal plans, and workouts
- Can create Performance Digest articles
- Can chat with athletes
- Can view athlete progress and analytics

---

## 🎯 **Auto-Assignment System**

### How It Works

When a new user signs up as an **athlete**, they are **automatically assigned** to the trainer **Agu** (`agu@asciende.pro`).

This is handled by:
1. **Database trigger:** `trigger_auto_assign_trainer`
2. **Function:** `auto_assign_trainer_to_athlete()`
3. **Field:** `profiles.assigned_trainer_id`

### Auto-Assignment Flow

```
User signs up → Profile created with role='athlete' → Trigger executes → assigned_trainer_id set to Agu's ID
```

### Reassigning Athletes

**Admin** can reassign athletes to different trainers:

```sql
SELECT reassign_athlete_trainer(
  'athlete_id_here',
  'new_trainer_id_here'
);
```

Or use the admin dashboard (when implemented).

---

## 📊 **Viewing Assigned Athletes**

Trainers can view their assigned athletes using:

```sql
SELECT * FROM get_trainer_athletes('trainer_id_here');
```

This returns:
- Athlete ID
- Full name
- Email
- Sport
- Country
- Avatar URL
- Created date

---

## 🔄 **Existing Athletes**

All existing athletes without an assigned trainer have been automatically assigned to Agu during migration.

---

## 🛡️ **Security Notes**

1. **Change passwords** in production
2. **Store credentials** securely (use password manager)
3. **Don't commit** credentials to version control
4. **RLS policies** ensure data isolation
5. **Admins** can override most policies

---

## 📝 **Creating Accounts Manually**

If accounts don't exist, run:

```typescript
import { createAdminAndTrainer } from './src/utils/createAdminAndTrainer';
await createAdminAndTrainer();
```

This will:
- Create admin account
- Create trainer (Agu) account
- Set up proper roles and profiles

---

## ✅ **Verification**

To verify accounts exist:

```sql
SELECT au.email, p.role, p.full_name
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE au.email IN ('admin@asciende.pro', 'agu@asciende.pro');
```

Should return:
- admin@asciende.pro → admin → Asciende Admin
- agu@asciende.pro → trainer → Agu Trainer

---

## 🚀 **Next Steps**

1. ✅ Login with admin credentials
2. ✅ Login with trainer credentials
3. ✅ Create a test athlete account
4. ✅ Verify auto-assignment worked
5. ✅ Test trainer dashboard shows new athlete

---

**Last Updated:** 2025-10-06
**System:** Asciende Pro Platform
**Environment:** Development
