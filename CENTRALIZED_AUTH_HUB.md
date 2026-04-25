# Centralized Authentication System - HUB Configuration

This document describes the centralized authentication system where **hub.asciende.pro** acts as the authentication HUB for all satellite applications.

## Architecture Overview

```
┌─────────────────┐
│   Satellite 1   │─┐
└─────────────────┘ │
                    │
┌─────────────────┐ │    ┌──────────────────────┐
│   Satellite 2   │─┼───▶│  HUB (asciende.pro)  │
└─────────────────┘ │    │   Supabase Auth      │
                    │    │   JWT Generation     │
┌─────────────────┐ │    └──────────────────────┘
│   Satellite N   │─┘
└─────────────────┘
```

## How It Works

### 1. Satellite Redirects to HUB
When a user needs to authenticate on a satellite app:

```javascript
// Redirect user to HUB login
const satelliteUrl = 'https://your-satellite-app.asciende.pro';
window.location.href = `https://hub.asciende.pro/login?redirect=${encodeURIComponent(satelliteUrl)}`;
```

### 2. User Logs In at HUB
- User enters credentials on the HUB login page
- HUB validates credentials against Supabase Auth
- HUB generates JWT token with user info
- HUB sets httpOnly cookie on `.asciende.pro` domain

### 3. HUB Redirects Back to Satellite
- After successful login, HUB redirects to the satellite URL
- Cookie is accessible across all `.asciende.pro` subdomains

### 4. Satellite Validates Session
The satellite calls the `/auth/me` endpoint to validate the session:

```javascript
const response = await fetch('https://hub.asciende.pro/auth/me', {
  method: 'GET',
  credentials: 'include', // Important: sends cookies
});

const data = await response.json();

if (data.authenticated) {
  // User is authenticated
  console.log(data.user);
  // { id, email, role, active_plan, issued_at, expires_at }
}
```

## Available Endpoints

### POST /functions/v1/auth-login
Authenticates a user and returns a JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "redirect_url": "https://satellite.asciende.pro" // optional
}
```

**Response (Success):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "athlete",
    "active_plan": ["asciende_pro"]
  },
  "redirect_url": "https://satellite.asciende.pro"
}
```

Sets cookie: `asciende_auth=JWT_TOKEN; Domain=.asciende.pro; HttpOnly; Secure; SameSite=Lax`

---

### POST /functions/v1/auth-signup
Creates a new user account and returns a JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe", // optional
  "redirect_url": "https://satellite.asciende.pro" // optional
}
```

**Response (Success):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "athlete",
    "active_plan": []
  },
  "redirect_url": "https://satellite.asciende.pro"
}
```

Sets cookie: `asciende_auth=JWT_TOKEN; Domain=.asciende.pro; HttpOnly; Secure; SameSite=Lax`

---

### GET /functions/v1/auth-me
Validates the JWT token from the cookie and returns user info.

**Request:**
No body needed. Cookie is sent automatically with `credentials: 'include'`.

**Response (Success):**
```json
{
  "authenticated": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "athlete",
    "active_plan": ["asciende_pro"],
    "issued_at": 1234567890,
    "expires_at": 1234567890
  }
}
```

**Response (Unauthorized):**
```json
{
  "error": "No authentication cookie found"
}
```

---

### POST /functions/v1/auth-logout
Clears the authentication cookie.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## JWT Payload Structure

The JWT token contains the following claims:

```javascript
{
  user_id: "uuid",
  email: "user@example.com",
  role: "athlete", // or "trainer", "admin"
  active_plan: ["asciende_pro"], // array of active subscription plans
  iat: 1234567890, // issued at timestamp
  exp: 1234567890  // expiration timestamp (7 days from iat)
}
```

## Security Features

### ✅ Domain Whitelist
Only approved domains can be used in `redirect_url`:
- `localhost` (dev)
- `127.0.0.1` (dev)
- `asciende.pro` (prod)
- `webcontainer` (dev)

### ✅ CORS Headers
Strict CORS policies allow only:
- `*.asciende.pro` subdomains
- Localhost for development
- Webcontainer for Bolt development

### ✅ HttpOnly Cookies
Cookies cannot be accessed via JavaScript, preventing XSS attacks.

### ✅ Secure Cookies (Production)
Cookies are only sent over HTTPS in production.

### ✅ SameSite Policy
Set to `Lax` to prevent CSRF attacks while allowing redirects.

## Implementation Example for Satellites

Here's a complete example of how to implement authentication in a satellite app:

```typescript
// auth.ts - Satellite Authentication Module

const HUB_URL = 'https://hub.asciende.pro';

export interface User {
  id: string;
  email: string;
  role: string;
  active_plan: string[];
}

export async function redirectToLogin() {
  const currentUrl = window.location.href;
  window.location.href = `${HUB_URL}/login?redirect=${encodeURIComponent(currentUrl)}`;
}

export async function checkAuth(): Promise<User | null> {
  try {
    const response = await fetch(`${HUB_URL}/functions/v1/auth-me`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.authenticated) {
      return data.user;
    }

    return null;
  } catch (error) {
    console.error('Auth check failed:', error);
    return null;
  }
}

export async function logout() {
  try {
    await fetch(`${HUB_URL}/functions/v1/auth-logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.error('Logout failed:', error);
  }

  window.location.href = HUB_URL;
}

// React Hook Example
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  return { user, loading, login: redirectToLogin, logout };
}
```

## Protected Routes Example

```typescript
// ProtectedRoute.tsx
import { useAuth } from './auth';
import { useEffect } from 'react';

export function ProtectedRoute({ children }) {
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
    return null; // Will redirect to login
  }

  return children;
}
```

## Environment Variables

The HUB uses these environment variables (automatically configured in Supabase):

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret
NODE_ENV=production # or development
```

## Testing the Flow

### 1. Test Login Redirect
```bash
# Open in browser:
https://hub.asciende.pro/login?redirect=https://your-satellite.asciende.pro
```

### 2. Test Auth Validation
```bash
curl -X GET https://hub.asciende.pro/functions/v1/auth-me \
  --cookie "asciende_auth=YOUR_JWT_TOKEN"
```

### 3. Test Logout
```bash
curl -X POST https://hub.asciende.pro/functions/v1/auth-logout \
  --cookie "asciende_auth=YOUR_JWT_TOKEN"
```

## Troubleshooting

### Issue: Cookie not being set
**Solution:** Make sure your satellite domain ends with `.asciende.pro` or is `localhost` for development.

### Issue: CORS errors
**Solution:** Verify your satellite origin is whitelisted in the edge function CORS headers.

### Issue: 401 Unauthorized on /auth/me
**Solution:** Check that `credentials: 'include'` is set in the fetch request.

### Issue: Redirect not working
**Solution:** Ensure the redirect URL is properly encoded with `encodeURIComponent()`.

## Notes for Satellite Developers

1. **Never** store or handle passwords in satellite apps
2. **Always** use `credentials: 'include'` when calling HUB endpoints
3. **Never** access the cookie directly in JavaScript
4. **Always** validate redirect URLs before using them
5. **Use** the `/auth/me` endpoint to check authentication status on page load
6. **Handle** the case where `/auth/me` returns 401 by redirecting to login

## Support

For questions or issues with the centralized auth system, contact the HUB administrator or check the Supabase logs at:
https://supabase.com/dashboard/project/YOUR_PROJECT_ID/logs/edge-functions
