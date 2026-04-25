# 🚀 LAB Satélite - Quick Start

## Variables de Entorno

```env
VITE_SUPABASE_URL=https://ngkcbygyoobqhlmlnuvl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5na2NieWd5b29icWhsbWxudXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc4MTM2ODcsImV4cCI6MjA0MzM4OTY4N30.vHSLU6eFN_Hg69xlJxGTdNcH3wS7zJSfHWXAHfUQwKA
VITE_HUB_URL=https://hub.asciende.pro
VITE_SATELLITE_NAME=lab
```

## Código Esencial

### 1. Capturar Token
```typescript
const token = new URLSearchParams(window.location.search).get('session_token');
if (token) {
  localStorage.setItem('hub_session_token', token);
  // Limpiar URL
  window.history.replaceState({}, '', window.location.pathname);
}
```

### 2. Validar Token
```typescript
const response = await fetch(
  'https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/auth-me',
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  }
);

const data = await response.json();
// data.user contiene: id, email, role, active_plan
```

### 3. Redirigir si No Autenticado
```typescript
if (!token || !data.authenticated) {
  window.location.href = `https://hub.asciende.pro/auth?redirect=${window.location.origin}`;
}
```

### 4. Logout
```typescript
localStorage.removeItem('hub_session_token');
window.location.href = 'https://hub.asciende.pro';
```

## URLs Clave

- HUB: `https://hub.asciende.pro`
- LAB: `https://lab.asciende.pro`
- Auth: `/functions/v1/auth-me`
- Token Generator: `/functions/v1/get-session-token`

## Flujos

**Directo**: `lab.asciende.pro` → redirige a HUB → login → vuelve con token

**Desde HUB**: Click "Abrir LAB" → genera token → abre `lab.asciende.pro?session_token=...`

Para más detalles ver: `SATELLITE_LAB_INTEGRATION_GUIDE.md`
