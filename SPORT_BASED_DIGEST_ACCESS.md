# Sport-Based Performance Digest Access System

## 📋 Overview

The Performance Digest now features intelligent sport-based content filtering combined with premium membership requirements. Athletes only see articles relevant to the sports teams they belong to, and premium content requires an active membership.

## 🎯 How It Works

### For Athletes

1. **Join a Team**
   - Athletes must join at least one team to access Performance Digest
   - Each team has a specific sport (e.g., Beach Volleyball, Cycling, Running)
   - Athletes can join multiple teams with different sports

2. **Content Filtering**
   - Athletes automatically see articles matching their team sports
   - Example: If `aguhernandezbk@gmail.com` joins "Beach Volleyball" team
     - ✅ Will see Beach Volleyball articles
     - ❌ Won't see Cycling articles
   - If joined to multiple teams, sees articles from all those sports

3. **Premium Content Access**
   - Articles marked as `is_premium = true` require active membership
   - Without membership:
     - Article images show a lock overlay
     - Premium badge appears grayed out with lock icon
     - Clicking shows beautiful paywall modal
   - With active membership:
     - Full access to all premium content
     - Premium badge shows golden with crown icon

### For Trainers & Admins

- **Full Access**: See all articles regardless of sport
- **No Restrictions**: Can access all premium content
- **Content Management**: Can create, edit, and manage articles

## 🎨 Visual Indicators

### Sports Display
```
┌─────────────────────────────────────────────────┐
│ Viendo contenido de:                            │
│ [👥 Beach Volleyball] [👥 Swimming]             │
│ [🔒 Contenido bloqueado sin membresía]          │
└─────────────────────────────────────────────────┘
```

### Premium Articles (Without Membership)
- Blurred image with lock overlay
- Gray badge: "🔒 Premium"
- Click triggers paywall modal

### Premium Articles (With Membership)
- Clear image
- Golden badge: "👑 Premium"
- Full access to content

### No Teams Joined
```
┌─────────────────────────────────────────────────┐
│              👥                                  │
│        Únete a un equipo                         │
│                                                  │
│  Para acceder al Performance Digest,            │
│  únete primero a un equipo deportivo            │
│                                                  │
│     [Ver equipos disponibles]                    │
└─────────────────────────────────────────────────┘
```

## 🔐 Database Security (RLS)

### Function: `get_athlete_sports()`
Returns array of sports from athlete's team memberships:
```sql
SELECT get_athlete_sports('athlete-uuid');
-- Returns: ['Beach Volleyball', 'Swimming']
```

### RLS Policy
Athletes can only query published articles matching their team sports:
```sql
-- Athletes see only published articles from their team sports
is_published = true
AND sport = ANY(get_athlete_sports(auth.uid()))

-- Trainers and admins see everything
role IN ('trainer', 'admin')
```

## 💰 Paywall Component

### Features
- Beautiful gradient design matching app theme
- Shows article title being unlocked
- Lists premium benefits:
  - Exclusive scientific content
  - Weekly updates per sport
  - Premium community access
  - Complete library access
  - Ad-free experience
- Direct link to membership page
- Respectful "Maybe later" option

### User Flow
1. Athlete clicks premium article
2. Paywall appears with article title
3. Options:
   - "Mejorar a Premium" → Navigate to `/membership`
   - "Tal vez después" → Close modal

## 🧪 Testing Scenarios

### Test 1: Athlete Joins Beach Volleyball Team
```
Given: aguhernandezbk@gmail.com has no active membership
And: User joins "Beach Volleyball" team
When: User navigates to Performance Digest
Then:
  - Shows "Viendo contenido de: Beach Volleyball"
  - Displays Beach Volleyball articles only
  - Premium articles show lock overlay
  - Clicking premium article shows paywall
```

### Test 2: Athlete With Multiple Teams
```
Given: Athlete joins "Beach Volleyball" and "Cycling" teams
When: User navigates to Performance Digest
Then:
  - Shows both sports in header
  - Displays articles from both sports
  - Can filter by category/language
```

### Test 3: Athlete Activates Membership
```
Given: Athlete belongs to Beach Volleyball team
And: User activates premium membership
When: User navigates to Performance Digest
Then:
  - Premium articles show golden crown badge
  - No lock overlays on images
  - Full content access without paywall
```

### Test 4: No Teams Joined
```
Given: Athlete has not joined any teams
When: User navigates to Performance Digest
Then:
  - Shows "Únete a un equipo" message
  - Button to navigate to Teams page
  - No articles displayed
```

## 🎯 Business Logic Summary

| User Type | Team Membership | Active Membership | Access Level |
|-----------|----------------|-------------------|--------------|
| Athlete | ❌ None | ❌ No | No articles (join team prompt) |
| Athlete | ✅ Has team(s) | ❌ No | Free articles only (paywall for premium) |
| Athlete | ✅ Has team(s) | ✅ Yes | All articles from team sports |
| Trainer | N/A | N/A | All articles, all sports |
| Admin | N/A | N/A | All articles, all sports |

## 📊 Console Logging

For debugging, the system logs:
```javascript
console.log('Athlete sports from teams:', uniqueSports);
// Example output: ['Beach Volleyball', 'Swimming']
```

## 🔄 Data Flow

1. **Page Load**
   ```
   loadAthleteSports()
   → Query team_members + teams
   → Extract unique sports
   → Store in athleteSports state
   ```

2. **Load Articles**
   ```
   loadArticles()
   → Filter by athleteSports array
   → Filter by is_published = true
   → Apply category/language filters
   → Check read status
   ```

3. **Article Click**
   ```
   handleArticleClick()
   → Check if external_url → open in new tab
   → Check if premium + no membership → show paywall
   → Otherwise → show full article
   ```

## 🚀 Benefits

✅ **Personalized Content**: Athletes see only relevant sports
✅ **Clear Value Proposition**: Premium content clearly marked
✅ **Secure Access**: Database-level enforcement via RLS
✅ **Beautiful UX**: Professional paywall and indicators
✅ **Team Integration**: Direct connection to team system
✅ **Monetization**: Clear path to membership conversion

## 🔧 Configuration

### To Add New Sport
1. Create team with sport name
2. Add athletes to team
3. Create articles with matching sport value
4. Articles automatically appear for team members

### To Mark Content as Premium
```sql
UPDATE digest_articles
SET is_premium = true
WHERE id = 'article-id';
```

### To Check User Access
```sql
-- Check athlete's sports
SELECT get_athlete_sports('athlete-user-id');

-- Check what articles they can see
SELECT * FROM digest_articles
WHERE is_published = true
AND sport = ANY(get_athlete_sports('athlete-user-id'));
```

## 📝 Notes

- System uses frontend filtering + RLS for double security
- Console logs help debug team/sport assignment issues
- Paywall modal designed to convert without being pushy
- Visual indicators make premium status immediately clear
- No teams = clear call-to-action to join teams
