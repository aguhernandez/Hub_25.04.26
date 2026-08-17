# Satellite Authentication - Quick Implementation Guide

## What you need to know

Your app (satellite) will authenticate users through the **centralized HUB** at `https://hub.asciende.pro`.

The HUB handles all authentication, you just validate the session.

## Implementation Steps

### Step 1: Redirect to HUB for Login

When user needs to login:

```javascript
const satelliteUrl = window.location.href;
window.location.href = `https://hub.asciende.pro/login?redirect=${encodeURIComponent(satelliteUrl)}`;
```

### Step 2: Check if User is Authenticated

On page load or when needed:

```javascript
async function checkAuth() {
  const response = await fetch('https://hub.asciende.pro/functions/v1/auth-me', {
    method: 'GET',
    credentials: 'include', // CRITICAL: Must include cookies
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.authenticated ? data.user : null;
}
```

### Step 3: Handle User Data

The `auth-me` endpoint returns:

```typescript
{
  authenticated: true,
  user: {
    id: string,           // User UUID
    email: string,        // User email
    role: string,         // "athlete", "trainer", or "admin"
    active_plan: string[], // ["asciende_pro"]
    issued_at: number,    // Token timestamp
    expires_at: number    // Token expiration
  }
}
```

## Complete Example (React)

```typescript
// useAuth.ts
import { useState, useEffect } from 'react';

const HUB_URL = 'https://hub.asciende.pro';

interface User {
  id: string;
  email: string;
  role: string;
  active_plan: string[];
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const response = await fetch(`${HUB_URL}/functions/v1/auth-me`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          setUser(data.user);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  }

  function login() {
    const currentUrl = window.location.href;
    window.location.href = `${HUB_URL}/login?redirect=${encodeURIComponent(currentUrl)}`;
  }

  async function logout() {
    await fetch(`${HUB_URL}/functions/v1/auth-logout`, {
      method: 'POST',
      credentials: 'include',
    });
    window.location.href = HUB_URL;
  }

  return { user, loading, login, logout };
}
```

```tsx
// App.tsx
import { useAuth } from './useAuth';

function App() {
  const { user, loading, login } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return (
      <div>
        <h1>Please log in</h1>
        <button onClick={login}>Login with Asciende</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Welcome, {user.email}</h1>
      <p>Role: {user.role}</p>
      <p>Plan: {user.active_plan.join(', ')}</p>
    </div>
  );
}
```

## Protected Route Component

```tsx
// ProtectedRoute.tsx
import { useAuth } from './useAuth';
import { useEffect } from 'react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, login } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      login();
    }
  }, [user, loading, login]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
```

## Important Notes

1. **Always use** `credentials: 'include'` in fetch requests to send the cookie
2. **Never try** to access the cookie directly in JavaScript (it's httpOnly)
3. **Don't store** user passwords or handle authentication directly
4. The cookie works across all `*.asciende.pro` subdomains
5. Token expires after 7 days

## Available Endpoints

### GET /functions/v1/auth-me
Validates session and returns user data.

**Returns:**
- `200` with user data if authenticated
- `401` if not authenticated

### POST /functions/v1/auth-logout
Clears the session cookie.

## Troubleshooting

**Problem:** Getting 401 from `/auth/me`
**Solution:** Make sure you're using `credentials: 'include'`

**Problem:** CORS errors
**Solution:** Your domain must end with `.asciende.pro` or be `localhost`

**Problem:** Cookie not being sent
**Solution:** Verify you're on a `*.asciende.pro` subdomain or localhost

## Testing

1. Open your satellite app
2. Click login button (redirects to HUB)
3. Enter credentials on HUB
4. HUB redirects back to your app
5. Your app calls `/auth/me` to get user data

That's it! The HUB handles everything else.
